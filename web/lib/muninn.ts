/**
 * Muninn memory client — MCP JSON-RPC 2.0 over HTTPS.
 *
 * Verified call shape:
 *   Endpoint : process.env.MUNINN_URL  (e.g. https://winnr.tailf82123.ts.net/mcp)
 *   Auth     : Authorization: Bearer <MUNINN_TOKEN>
 *   Headers  : Content-Type: application/json, Accept: application/json, text/event-stream
 *
 *   Step 1 — initialize (POST, no session id yet):
 *     body: { jsonrpc:"2.0", id:1, method:"initialize",
 *             params:{ protocolVersion:"2024-11-05", capabilities:{},
 *                      clientInfo:{ name:"winnr-app", version:"1.0" } } }
 *     → response header "mcp-session-id" is captured and reused for all subsequent calls.
 *
 *   Step 2 — tool call (POST with mcp-session-id header):
 *     body: { jsonrpc:"2.0", id:N, method:"tools/call",
 *             params:{ name:"<tool>", arguments:{...} } }
 *     → response may be plain JSON (content-type: application/json)
 *       OR Server-Sent-Events (content-type: text/event-stream, lines: "data: {...}").
 *     Tool result is at .result.content[0].text (a JSON or plain-text string).
 */

const VAULT = process.env.MUNINN_VAULT ?? "winnr-hack";

// Module-level session cache — lazily initialized, re-inited on session error.
let sessionId: string | null = null;
let initInFlight: Promise<string> | null = null;
let callCounter = 1;

function nextId(): number {
  return ++callCounter;
}

/** Parse a response body that may be plain JSON or SSE. Returns the parsed object. */
async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  const ct = res.headers.get("content-type") ?? "";

  if (ct.includes("text/event-stream")) {
    // SSE: find the last "data: ..." line that contains a JSON object/array.
    const lines = text.split("\n");
    let last: string | null = null;
    for (const line of lines) {
      if (line.startsWith("data:")) {
        const payload = line.slice(5).trim();
        if (payload && payload !== "[DONE]") last = payload;
      }
    }
    if (last === null) throw new Error("No data line found in SSE response");
    return JSON.parse(last);
  }

  return JSON.parse(text);
}

/** Perform the initialize handshake and cache the session id. */
async function initialize(): Promise<string> {
  const url = process.env.MUNINN_URL;
  if (!url) throw new Error("MUNINN_URL is not set");

  const token = process.env.MUNINN_TOKEN;
  if (!token) throw new Error("MUNINN_TOKEN is not set");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "winnr-app", version: "1.0" },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Muninn initialize failed: ${res.status} ${res.statusText}`);
  }

  const sid = res.headers.get("mcp-session-id");
  if (!sid) throw new Error("Muninn initialize: no mcp-session-id in response");

  // Drain response body (may be SSE or JSON — we don't need the init result body).
  await res.text().catch(() => undefined);

  return sid;
}

/** Ensure we have a valid session id (lazy init, race-safe via shared promise). */
async function ensureSession(): Promise<string> {
  if (sessionId) return sessionId;
  if (!initInFlight) {
    initInFlight = initialize()
      .then((sid) => {
        sessionId = sid;
        return sid;
      })
      .finally(() => {
        initInFlight = null;
      });
  }
  return initInFlight;
}

/** Call a Muninn tool. Re-initializes session on session-related errors. */
async function callTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const url = process.env.MUNINN_URL!;
  const token = process.env.MUNINN_TOKEN!;

  let sid = await ensureSession();
  const id = nextId();

  const body = JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name: toolName, arguments: args },
  });

  const doRequest = async (sessionIdToUse: string): Promise<Response> =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${token}`,
        "mcp-session-id": sessionIdToUse,
      },
      body,
    });

  let res = await doRequest(sid);

  // If the server signals an invalid/expired session, re-initialize once and retry.
  if (res.status === 404 || res.status === 401) {
    sessionId = null;
    sid = await ensureSession();
    res = await doRequest(sid);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Muninn tool call "${toolName}" failed: ${res.status} ${res.statusText} ${body.slice(0, 300)}`,
    );
  }

  return parseResponse(res);
}

/** Extract the text payload from a tool-call JSON-RPC result. */
function extractResultText(rpcResponse: unknown): string {
  const r = rpcResponse as {
    result?: { content?: { text?: string }[] };
    error?: { message?: string };
  };
  if (r.error) throw new Error(`Muninn RPC error: ${r.error.message ?? JSON.stringify(r.error)}`);
  return r.result?.content?.[0]?.text ?? "";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Store a memory in Muninn.
 * Throws on hard failure so callers (e.g. ingest) can log it.
 */
export async function rememberMemory(args: {
  content: string;
  type?: string;
  summary?: string;
  entities?: { name: string; type: string }[];
}): Promise<void> {
  const toolArgs: Record<string, unknown> = { vault: VAULT, content: args.content };
  if (args.type !== undefined) toolArgs.type = args.type;
  if (args.summary !== undefined) toolArgs.summary = args.summary;
  if (args.entities !== undefined) toolArgs.entities = args.entities;

  const result = await callTool("muninn_remember", toolArgs);
  // We don't need the return value — just ensure no RPC-level error.
  extractResultText(result);
}

/**
 * Recall memories relevant to the given context strings.
 * Fail-soft: returns [] on any network or parse error.
 */
export async function recallMemories(
  context: string[],
  opts?: { limit?: number; mode?: "recent" | "deep" }
): Promise<string[]> {
  try {
    const toolArgs: Record<string, unknown> = {
      vault: VAULT,
      context,
      limit: opts?.limit ?? 8,
    };
    if (opts?.mode !== undefined) toolArgs.mode = opts.mode;

    const result = await callTool("muninn_recall", toolArgs);
    const text = extractResultText(result);

    if (!text) return [];

    // The result text is a JSON string. Parse it defensively.
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Not JSON — return the raw text as a single item if non-empty.
      return text.trim() ? [text.trim()] : [];
    }

    // Expected shape: an array of memory objects with content/summary fields.
    if (Array.isArray(parsed)) {
      return parsed.flatMap((item: unknown) => {
        if (typeof item === "string") return [item];
        if (item && typeof item === "object") {
          const m = item as Record<string, unknown>;
          // Prefer summary, fall back to content, then any string field.
          const text =
            (typeof m.summary === "string" && m.summary) ||
            (typeof m.content === "string" && m.content) ||
            Object.values(m).find((v) => typeof v === "string") as string | undefined;
          return text ? [text] : [];
        }
        return [];
      });
    }

    // Wrapped shape: { memories: [...] } or similar.
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      for (const key of ["memories", "results", "items", "data"]) {
        if (Array.isArray(obj[key])) {
          return (obj[key] as unknown[]).flatMap((item) => {
            if (typeof item === "string") return [item];
            if (item && typeof item === "object") {
              const m = item as Record<string, unknown>;
              const snippet =
                (typeof m.content === "string" && m.content) ||
                (typeof m.summary === "string" && m.summary) ||
                Object.values(m).find((v) => typeof v === "string") as string | undefined;
              return snippet ? [snippet] : [];
            }
            return [];
          });
        }
      }
      // Recall envelope with no matches (e.g. { memories: null, total: 0, hint }) → empty.
      if ("memories" in obj || "results" in obj || "total" in obj) return [];
      // Fallback: stringify the whole object as a single snippet.
      return [JSON.stringify(parsed)];
    }

    return [];
  } catch {
    // Fail-soft for recall.
    return [];
  }
}
