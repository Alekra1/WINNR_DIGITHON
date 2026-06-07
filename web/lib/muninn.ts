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

/** Read a required env var, throwing a clear error if unset. */
function getEnv(key: "MUNINN_URL" | "MUNINN_TOKEN"): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not set`);
  return value;
}

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
  const url = getEnv("MUNINN_URL");
  const token = getEnv("MUNINN_TOKEN");

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

/**
 * Call a Muninn tool, handle session retry, parse the response, and return the
 * text payload from `.result.content[0].text`. Throws on RPC-level errors.
 */
async function callMuninnTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const url = getEnv("MUNINN_URL");
  const token = getEnv("MUNINN_TOKEN");

  let sid = await ensureSession();
  const id = nextId();

  const requestBody = JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name, arguments: args },
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
      body: requestBody,
    });

  let res = await doRequest(sid);

  // If the server signals an invalid/expired session, re-initialize once and retry.
  if (res.status === 404 || res.status === 401) {
    sessionId = null;
    sid = await ensureSession();
    res = await doRequest(sid);
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Muninn tool call "${name}" failed: ${res.status} ${res.statusText} ${errBody.slice(0, 300)}`,
    );
  }

  const rpcResponse = await parseResponse(res);
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

/** Pull a memory id (ULID) out of muninn_remember's text payload. Returns null if absent. */
function parseMemoryId(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  // Sometimes the payload is the bare ULID.
  if (/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(trimmed)) return trimmed;
  // Otherwise it's a JSON object — look for common id fields.
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    for (const key of ["id", "memory_id", "engram_id", "memoryId"]) {
      if (typeof obj[key] === "string") return obj[key] as string;
    }
  } catch {
    // not JSON
  }
  return null;
}

/**
 * Store a memory in Muninn. Returns the created memory id (or null if the id
 * could not be parsed — non-fatal). Throws on hard RPC failure so callers
 * (e.g. ingest) can log it.
 */
export async function rememberMemory(args: {
  content: string;
  type?: string;
  summary?: string;
  entities?: { name: string; type: string }[];
}): Promise<string | null> {
  const toolArgs: Record<string, unknown> = { vault: VAULT, content: args.content };
  if (args.type !== undefined) toolArgs.type = args.type;
  if (args.summary !== undefined) toolArgs.summary = args.summary;
  if (args.entities !== undefined) toolArgs.entities = args.entities;

  const text = await callMuninnTool("muninn_remember", toolArgs);
  return parseMemoryId(text);
}

/** Forget (soft-delete, excluded from recall) a single memory by id. Fail-soft. */
export async function forgetMemory(id: string): Promise<void> {
  try {
    await callMuninnTool("muninn_forget", { vault: VAULT, id });
  } catch (e) {
    console.error(`[muninn forget failed] ${id}:`, e instanceof Error ? e.message : e);
  }
}

/**
 * Fallback for meetings with no stored memory ids: find every memory mentioning
 * an entity (e.g. the meeting title) and forget each. Fail-soft.
 */
export async function forgetMemoriesByEntity(entityName: string): Promise<void> {
  try {
    const text = await callMuninnTool("muninn_find_by_entity", {
      vault: VAULT,
      entity_name: entityName,
      limit: 50,
    });
    if (!text) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }
    const items: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object"
      ? ((parsed as Record<string, unknown>).memories as unknown[]) ??
        ((parsed as Record<string, unknown>).results as unknown[]) ??
        []
      : [];
    const ids = items
      .map((it) =>
        it && typeof it === "object" ? (it as Record<string, unknown>).id : undefined,
      )
      .filter((v): v is string => typeof v === "string");
    for (const id of ids) await forgetMemory(id);
  } catch (e) {
    console.error(
      `[muninn forget-by-entity failed] ${entityName}:`,
      e instanceof Error ? e.message : e,
    );
  }
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

    const text = await callMuninnTool("muninn_recall", toolArgs);

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
          const snippet =
            (typeof m.summary === "string" && m.summary) ||
            (typeof m.content === "string" && m.content) ||
            Object.values(m).find((v) => typeof v === "string") as string | undefined;
          return snippet ? [snippet] : [];
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
