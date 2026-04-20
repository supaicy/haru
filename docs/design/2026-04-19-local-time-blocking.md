# Local Time Blocking — Design Spec (v1, Phase 1)

- **Date:** 2026-04-19
- **Status:** Approved (user confirmed 2026-04-19)
- **Scope:** Phase 1 of the "Calendar sync + time blocking" roadmap. Local-only time blocking. Google Calendar / iCal sync is out of scope (deferred to Phase 2).

## Context

haru is a local-first macOS productivity app (Electron + React + Zustand). The current task model supports `dueDate` (deadline) and `dueTime` (optional time-of-deadline), but has no concept of "when I plan to work on this task." Users cannot block out time on their calendar for specific tasks.

This spec introduces **local time blocking**: optional `scheduledStart` and `scheduledEnd` datetimes on a task, rendered as draggable blocks in Daily and Weekly calendar views. No external calendar integration.

Goal: match the TickTick "drag task onto time slot" experience, locally, with solid edge-case handling.

## Goals

- A user can drag any task from TaskList onto a time slot in Daily or Weekly calendar to schedule it.
- A user can move or resize the scheduled block inside the calendar.
- Recurring tasks propagate their block's time-of-day to every occurrence.
- Overlapping blocks render side by side (Google Calendar style).
- Existing task data is untouched; migration is additive.

## Non-goals (v1)

- Google Calendar, iCal, CalDAV sync — Phase 2.
- Natural-language scheduling ("tue 3pm" in task title).
- Smart suggestions ("best time to do this task").
- Pomodoro / focus-mode integration with blocks.
- Keyboard-only scheduling shortcuts.
- Blocks that span midnight (v1 clamps to 23:59; v1.1 may extend).
- Mobile / touch DnD (macOS desktop only).

## Data model

Two nullable fields added, following the existing naming convention (snake_case in the JSON DB rows, camelCase in the TypeScript `Task` type, mapped in the store's row→object converter around `useStore.ts:136`):

```
DB row:      scheduled_start, scheduled_end   // string | null
TS Task:     scheduledStart,  scheduledEnd    // string | null
```

Both hold ISO 8601 local datetime strings, e.g. `"2026-04-22T14:00:00"`. No timezone suffix. Example row:

```json
{ "id": "...", "title": "보고서", "due_date": "2026-04-24", "due_time": null,
  "scheduled_start": "2026-04-22T14:00:00", "scheduled_end": "2026-04-22T14:30:00" }
```

### Invariants

1. Both null (unscheduled) **or** both set (scheduled block). One-set-one-null is invalid and must be rejected at the store layer.
2. `scheduledEnd > scheduledStart`.
3. Minimum block duration: 15 minutes.
4. Both values are in **local time** (single-device desktop app; no UTC conversion needed). Strings are stored without timezone suffix to make that explicit.
5. Block may not span midnight in v1: if drag/resize would push `scheduledEnd` past 23:59 of the start day, clamp to `23:59`.

### Migration

Extend the existing JSON-file migration in `src/main/database.ts` (around `initDatabase()` where other `undefined → null` defaults live, near line 75):

```ts
data.tasks.forEach((t) => {
  if (t.scheduled_start === undefined) t.scheduled_start = null
  if (t.scheduled_end === undefined) t.scheduled_end = null
})
```

Additive only. No reads of existing fields are affected. Existing tasks with neither field set render the same as before (no block).

### Recurring tasks

For a recurring task, `scheduledStart` / `scheduledEnd` on the **base task** act as a **time-of-day + duration template**, not an absolute occurrence. The **date portion** of the stored datetime is whatever date was active when the user first scheduled it, and should be treated as don't-care by consumers — only `hour`, `minute`, and the `end - start` duration matter.

- Base task with recurrence "every Tuesday": user drags block onto Tuesday 2026-04-21 14:00. Stored `scheduledStart = "2026-04-21T14:00:00"`, `scheduledEnd = "2026-04-21T15:00:00"`.
- Rendering for the week of 2026-04-27: we derive the block for Tuesday 2026-04-28 using the template's 14:00 start and 1-hour duration. No separate storage per instance.
- On completion of the current instance, the base task's `dueDate` (and any other recurrence state) advances to the next occurrence. The stored `scheduledStart/End` are NOT updated — the template is stable across completions.

Implementation detail: the store exposes a helper

```ts
getScheduledForOccurrence(task: Task, occurrenceDate: string): { start: string; end: string } | null
```

that returns a block for a specific occurrence date by combining the date with the base record's hour/minute/duration. Returns `null` if the task has no template. Non-recurring tasks just use their raw `scheduledStart/End`.

Skipping or editing a single instance's time is NOT supported in v1. Either all instances share the block or none do. (User answered "반복 모두에 적용" during brainstorming.)

## UX flows

### Drag to schedule

1. `TaskItem` in TaskList sets `draggable="true"` and on `dragstart` writes the taskId to `dataTransfer` with type `application/haru-task-id`.
2. `DailyCalendar` and `WeeklyCalendar` time slots are drop targets.
3. On `dragover`, compute the hovered slot's time (based on pointer Y relative to column top) and show a 30-minute ghost block as a visual preview.
4. On `drop`, read the taskId, compute `scheduledStart` = hovered time snapped to the 15-minute grid, `scheduledEnd` = `scheduledStart + 30 minutes`. Call `updateTask(id, { scheduledStart, scheduledEnd })`.

### Move and resize

- Inside the calendar, each rendered block (`TimeBlock` component) is itself `draggable="true"`. On `dragstart`, it writes the taskId to `dataTransfer` with the type `application/haru-task-block` (distinct from the TaskList type so the calendar can detect "this is a move from an existing block" vs "this is a new schedule from the list").
  - Dragging the block body: both `scheduledStart` and `scheduledEnd` shift by the same delta (duration preserved).
  - Dragging the 6px-tall bottom edge ("resize handle"): only `scheduledEnd` changes.
- Both operations snap `end` (and where relevant `start`) to a 15-minute grid.
- During drag, visually render the proposed position optimistically. On mouse up, commit via `updateTask`. On escape / cancelled drop, revert.

### Unschedule

Two paths:
1. Right-click a block → context menu item "일정 해제". Calls `updateTask(id, { scheduledStart: null, scheduledEnd: null })`.
2. Drag a block back onto the TaskList pane (reverse drop). TaskList's outer container accepts drops of `application/haru-task-block` and unschedules. Dropping on an individual task row is a no-op — only the empty area around the list accepts this.

### TaskDetail panel

Read-only display only. If `scheduledStart` is set, show a line: "📅 수 2026-04-22 14:00–14:30". Clicking does nothing in v1 (no inline editing). Future: "편집" button opens a picker.

## Overlap rendering algorithm

For each day column, compute layout columns so that overlapping blocks sit side by side and non-overlapping blocks use full width.

```
function layoutOverlappingBlocks(blocks: Block[]): LayoutEntry[]
```

Input: list of `{ id, start: Date, end: Date }`.
Output: list of `{ id, column: number, columns: number }` per block.

Algorithm:
1. Sort by `start` ascending, tie-break by `end` descending.
2. Sweep through blocks, maintaining a list of "active columns" (each column holds the end time of the last block assigned to it).
3. For each block, find the lowest-index column whose last `end <= block.start` → reuse that column. If none, add a new column.
4. Group blocks into clusters: consecutive blocks that share at least one active column form a cluster.
5. For each cluster, set `columns = max column index used + 1` for every block in it.

Render each block: `left = (column / columns) * 100%`, `width = (1 / columns) * 100%`. Same algorithm Google Calendar uses.

Complexity: O(n log n) sort + O(n·k) sweep where k = simultaneous columns.

File: `src/renderer/src/lib/timeBlockLayout.ts`. Pure function, unit-tested, no React deps.

## Components to change

| Path | Change |
|------|--------|
| `src/main/database.ts` | Add 2-line migration (`scheduled_start` / `scheduled_end` default to null). |
| `src/renderer/src/store/useStore.ts` | Add fields to `Task` type; extend `addTask` / `updateTask` options; add `getScheduledForOccurrence` helper; add invariant validation on write (reject one-set-one-null). |
| `src/renderer/src/components/tasks/TaskItem.tsx` | Set `draggable="true"` and `onDragStart` to write taskId. |
| `src/renderer/src/components/tasks/TaskList.tsx` | Accept reverse drop (block → list) to unschedule. |
| `src/renderer/src/components/calendar/DailyCalendar.tsx` | Render blocks using the layout algorithm; drop targets per time slot. |
| `src/renderer/src/components/calendar/WeeklyCalendar.tsx` | Same as DailyCalendar, but one column per weekday. |
| `src/renderer/src/components/tasks/TaskDetail.tsx` | Read-only display of scheduled time. |
| **new** `src/renderer/src/components/calendar/TimeBlock.tsx` | Single block component: draggable body, resize handle, context menu. |
| **new** `src/renderer/src/lib/timeBlockLayout.ts` | Pure overlap layout function. |
| **new** `src/renderer/src/lib/timeBlockLayout.test.ts` | Unit tests for the layout function. |

No new npm dependencies. All DnD is native HTML5 (same pattern as existing Kanban).

## Edge cases

- **Cross-midnight**: clamp `scheduledEnd` to `23:59` of the start day. Flag for v1.1 reconsideration.
- **Completed tasks**: render the block with a diagonal stripe overlay and 60% opacity. Still occupies its slot; shows work history.
- **Past-dated scheduling**: allowed. Useful for retroactive time logging.
- **`dueDate` ≠ `scheduledStart` date**: allowed. "금요일 마감, 수요일에 함" is explicit user intent.
- **Block < 15 min** (from resize): clamp to 15 min minimum on mouse-up commit.
- **Dropping a task that is already scheduled**: treated as a move; replaces existing `scheduledStart` / `scheduledEnd`.
- **Deleted task with a scheduled block**: soft-delete already removes it from calendar rendering (existing behavior via `deleted_at`).
- **Recurring instance completion**: advance date as today, keep time-of-day. If the recurrence ends (finite pattern), the last completion leaves no future blocks.
- **Store write with only one of `{start, end}` set**: rejected with a dev-only console warning and no-op. Should be unreachable from UI; guards against future bugs.

## Testing

Unit tests (vitest):
1. `timeBlockLayout.test.ts`
   - Empty input → empty output.
   - Single block → `{column: 0, columns: 1}`.
   - Two non-overlapping → both `columns: 1`.
   - Two overlapping → `columns: 2`, columns 0 and 1.
   - Three-way overlap → `columns: 3`.
   - Two clusters (AA…BB) with gap → each cluster computed independently.
   - Tie-break: equal `start`, longer block first.
2. Migration test: existing task row without `scheduled_start` / `scheduled_end` keys → after migration, both `null`.
3. `getScheduledForOccurrence`: given base task with pattern "every Tue 14:00–15:00" and occurrence date 2026-04-28, returns 2026-04-28 14:00 / 15:00.
4. Invariant validation: `updateTask(id, { scheduledStart: '...', scheduledEnd: null })` is rejected / no-op.
5. Snap-to-15-min utility: 14:07 → 14:00, 14:08 → 14:15, 14:22 → 14:15, 14:23 → 14:30.

Manual QA checklist (post-implementation):
- Drag a task from TaskList onto Wednesday 14:00 in Weekly view → block appears at 14:00–14:30.
- Resize the block's bottom edge down → `scheduledEnd` extends; 15-min snap honored.
- Move block to Thursday 10:00 → both fields update, day and time shift.
- Schedule a 2-hour block overlapping an existing 1-hour block → render side by side; widths sum to column width.
- Mark the task complete → block shows striped overlay.
- Unschedule via right-click → block disappears; task stays in TaskList.
- Create a "매주 화요일 14:00–15:00" recurring task → block appears on every Tuesday of the visible week.
- App restart → all blocks persist (JSON round-trip).

## Risks and open questions

- **Drag handle discoverability**: the 6px resize handle on the block bottom may be hard to grab. Mitigation: on hover, expand the hit area to 10px, show a cursor-hint.
- **Timezone shifts via macOS setting**: since we store local time without offset, travelling across timezones would shift all blocks. Accepted in v1 (single-desktop app; rare case).
- **Scale**: users with thousands of blocks in a week — layout algorithm is fine (O(n log n)), but React rendering could lag. If it becomes an issue in practice, virtualize by visible hour range.
- **Recurring + partial completion**: TickTick allows "skip this week" for a recurring task. v1 doesn't. If users complain, revisit for v1.1.

## Deferred to Phase 2 (Calendar Sync)

Captured here so the Phase 2 designer has context:
- OAuth flow for Google Calendar; or CalDAV for iCloud/Fastmail; or ICS subscription for read-only.
- Mapping `scheduledStart` / `scheduledEnd` → Google Calendar event `start` / `end`.
- Conflict resolution when both sides edit (last-write-wins vs prompt).
- External events render in calendar views alongside haru blocks, visually distinguished (e.g., striped border for "read-only external").
