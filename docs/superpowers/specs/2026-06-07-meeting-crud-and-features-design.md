# Meeting CRUD + Feature Roadmap — Design

**Date:** 2026-06-07
**Project:** WINNR Digithon — AI Meeting Intelligence MVP
**Scope:** Complete meeting CRUD (build now) + design specs for the three "Soon" sidebar features (Insights, Task Tracker, Recordings).

## Context

Current CRUD state:

| Op | Status |
|----|--------|
| Create | `POST /api/ingest` (upload) |
| Read | `GET /api/meetings` (list), `GET /api/meetings/[id]` (detail) |
| Update | Partial — `PATCH /api/meetings/[id]` handles speaker-rename + task edits only |
| Delete | None — no endpoint, no `store.deleteMeeting`, no Muninn cleanup, no UI |

The sidebar shows three disabled "Soon" items: Insights, Task Tracker, Recordings.

Decisions made during brainstorming:
- Build full meeting CRUD now; spec the three features for later.
- Delete is a user choice at delete-time: **Archive** (soft, FE filter) or **Delete + forget memories** (hard).
- Recordings = transcript archive, no audio (audio deletion privacy decision stays).
- Insights covers all four facets: per-employee, per-project/department, company overview, AI narrative.
- Hard-delete forgets memories by **stored memory IDs** captured at write time; legacy meetings (no stored IDs) fall back to entity-based forget.

---

## Section 1 — Meeting CRUD (BUILD NOW)

### Type changes (`lib/types.ts`)
- `Meeting.archived?: boolean` — soft-delete flag. Separate from `status` (which stays `processing` | `ready` | `error`).
- `Meeting.memoryIds?: string[]` — IDs of Muninn memories this meeting wrote, for forget-on-delete.

### Store (`lib/store.ts`)
- `deleteMeeting(id: string): Promise<boolean>` — hard remove from array, mutex-serialized. Returns whether a record was removed.
- `listMeetings(opts?: { includeArchived?: boolean })` — default excludes archived.

### Muninn (`lib/muninn.ts`)
- `rememberMemory` returns the created memory **id** (parse from the `muninn_remember` response payload). Return type changes from `Promise<void>` to `Promise<string | null>` (null if id not parseable — non-fatal).
- New `forgetMemory(id: string): Promise<void>` → `callMuninnTool("muninn_forget", { vault, id })`. Fail-soft.
- New `forgetMemoriesByEntity(entityName: string): Promise<void>` — fallback for legacy meetings: `muninn_find_by_entity` → forget each id. Fail-soft.

### Pipeline (`lib/pipeline.ts`)
- `writeMemories` collects each returned id into the report (`MemoryWriteReport.ids: string[]`).
- After a successful run, `processMeeting` persists `memoryIds` onto the meeting via `updateMeeting`.
- `reindex` endpoint likewise refreshes `memoryIds`.

### API (`app/api/meetings/[id]/route.ts`)
- `PATCH` — extend the accepted body to also include `archived?: boolean` and metadata (`title?`, `type?`, `project?`, `department?`). Metadata edits do **not** recompute metrics. Existing speakerMap/tasks behavior unchanged.
- `DELETE` — hard delete: forget memories (by `memoryIds`; fallback to entity-based forget by title if absent) → `deleteMeeting(id)`. Fail-soft on the forget step (never block record deletion on a memory error). Returns 404 if not found, 200 on success.
- `GET /api/meetings?archived=1` (in `app/api/meetings/route.ts`) — returns archived meetings for the restore view.

### UI
- **Dashboard meeting cards**: overflow (⋮) menu → Edit / Archive / Delete.
- **Edit**: modal with title, type (select), project, department. Saves via `PATCH`.
- **Archive**: instant toggle (`PATCH { archived: true }`); card leaves the active list. An "Archived" filter view lists archived meetings with a **Restore** action (`PATCH { archived: false }`).
- **Delete**: confirm modal — "Permanently delete this meeting and remove it from the Knowledge Vault memory. This can't be undone." On confirm → `DELETE`.

### Error handling
- Delete forget step is fail-soft and logged; record deletion proceeds regardless.
- 404 on missing meeting for PATCH/DELETE.
- UI surfaces API errors inline (existing pattern).

### Verification
- Create → archive → confirm hidden from default list, visible in archived view → restore → reappears.
- Edit metadata → persists, metrics unchanged.
- Hard delete → record gone from store; corresponding memories forgotten in vault (verify via recall returning nothing for that meeting).
- Legacy meeting (no `memoryIds`) hard delete → entity-fallback forget runs.

---

## Section 2 — Task Tracker (`/tasks`) — SPEC ONLY

Cheapest feature; tasks already live inside each meeting.

- **Data**: aggregate `tasks` across all non-archived meetings, attaching `meetingId` + `meetingTitle` to each task.
- **API**: `GET /api/tasks` → flat list of `{ ...Task, meetingId, meetingTitle }`. Toggle done reuses existing `PATCH /api/meetings/[id]` tasks path (writes back to owning meeting, re-groups snapshots).
- **UI**: single table — assignee, task text, source meeting (link), done checkbox. Filters: assignee, status (open/done), project. Optimistic done toggle.
- **No new pipeline.** Pure aggregation + reuse of existing PATCH.

---

## Section 3 — Insights (`/insights`) — SPEC ONLY

All four facets.

- **Lib** `lib/insights.ts` (pure, unit-testable): folds over all meetings →
  - **Per-employee**: time series of talkPct, avg sentiment, task count across meetings (sorted by `createdAt`).
  - **Per-project / department**: rollups — avg participation, avg sentiment, open-task count.
  - **Company overview**: meeting count, total/open tasks, sentiment distribution, most/least active people.
- **AI narrative**: feed aggregates to `lib/llm.ts` → short "what's trending" brief; optionally ground with a `recallMemories` call.
- **API**: `GET /api/insights` → `{ perEmployee, perProject, company }`. Narrative either in the same call or `POST /api/insights/narrative`.
- **UI**: stat cards (company), Recharts line/area (per-employee trends — Recharts already a dep), bar charts (rollups), narrative card. Scope switch (employee / project / company).

---

## Section 4 — Recordings (`/recordings`) — SPEC ONLY

Transcript archive, no audio. Audio stays deleted post-processing.

- **Data**: reuse meetings; no new store.
- **Search**: full-text over `transcriptText` + speaker names + title. Client-side filter for MVP (small N); server-side search noted as the scale path.
- **UI**: search bar + result list → transcript read view (speaker-labeled; reuse the detail page's transcript rendering). Filters: speaker, project, date range.
- **Overlap note**: differs from Dashboard by being transcript/search-centric rather than upload/status-centric.

---

## Build order

1. Section 1 (Meeting CRUD) — now.
2. Section 2 (Task Tracker) — next, cheapest.
3. Section 3 (Insights).
4. Section 4 (Recordings).
