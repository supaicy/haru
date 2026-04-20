# Local Time Blocking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local time blocking to haru — drag tasks onto Daily/Weekly calendar to schedule when you plan to work on them. No external calendar sync.

**Architecture:** Two nullable datetime fields on `Task` (`scheduledStart`, `scheduledEnd`). JSON DB migration is additive (one-line per field in the existing `initDatabase()` migration loop). Pure utility functions for snap-to-15-min and overlap layout — unit-tested first. UI reuses the existing native HTML5 DnD pattern (same as Kanban). New `TimeBlock` component renders a single draggable block with a bottom resize handle.

**Tech Stack:** React 19, Zustand, Electron, Vitest, native HTML5 DnD. **No new npm dependencies.**

**Spec:** [`docs/design/2026-04-19-local-time-blocking.md`](../design/2026-04-19-local-time-blocking.md)

---

## File Structure

**Create:**
- `src/renderer/src/utils/timeBlockLayout.ts` — pure overlap-layout function (Google-Calendar style columns).
- `src/renderer/src/utils/timeBlockLayout.test.ts`
- `src/renderer/src/utils/scheduledTime.ts` — snap-to-15-min utility + `getScheduledForOccurrence` helper for recurring tasks.
- `src/renderer/src/utils/scheduledTime.test.ts`
- `src/renderer/src/components/calendar/TimeBlock.tsx` — single-block component: body drag to move, bottom edge drag to resize, right-click context menu.

**Modify:**
- `src/renderer/src/types/index.ts` — add `scheduledStart`/`scheduledEnd` to `Task`.
- `src/main/database.ts` — one migration block (`undefined → null`).
- `src/renderer/src/store/useStore.ts` — extend row-to-object mapper (`mapTask` ~line 130); add invariant validation in `updateTask`.
- `src/renderer/src/components/tasks/TaskItem.tsx` — `draggable="true"` + `onDragStart` writes taskId with type `application/haru-task-id`.
- `src/renderer/src/components/tasks/TaskList.tsx` — accept reverse drop (`application/haru-task-block`) on outer container → unschedule.
- `src/renderer/src/components/calendar/DailyCalendar.tsx` — render blocks with layout utility; drop target per slot.
- `src/renderer/src/components/calendar/WeeklyCalendar.tsx` — same pattern, one column per weekday.
- `src/renderer/src/components/tasks/TaskDetail.tsx` — read-only display line for scheduled time.

---

## Tasks

### Task 1: Extend `Task` type + DB migration

**Files:**
- Modify: `src/renderer/src/types/index.ts:3-22`
- Modify: `src/main/database.ts:74-80` (migration loop)
- Modify: `src/renderer/src/store/useStore.ts:130-149` (`mapTask`)

- [ ] **Step 1: Add fields to `Task` interface**

In `src/renderer/src/types/index.ts`, after the `attachments: string[]` line in the `Task` interface:

```ts
  attachments: string[]
  scheduledStart: string | null
  scheduledEnd: string | null
}
```

- [ ] **Step 2: Add migration defaults**

In `src/main/database.ts`, inside the existing `data.tasks.forEach((t) => {...})` migration block around line 75:

```ts
  data.tasks.forEach((t) => {
    if (t.deleted_at === undefined) t.deleted_at = null
    if (t.due_time === undefined) t.due_time = null
    if (t.reminder_at === undefined) t.reminder_at = null
    if (t.attachments === undefined) t.attachments = '[]'
    if (t.scheduled_start === undefined) t.scheduled_start = null
    if (t.scheduled_end === undefined) t.scheduled_end = null
  })
```

- [ ] **Step 3: Add mapping in `mapTask`**

In `src/renderer/src/store/useStore.ts` inside the `mapTask` function around line 130, after `recurringPattern`:

```ts
    isRecurring: Boolean(row.is_recurring),
    recurringPattern: (row.recurring_pattern as string) || null,
    scheduledStart: (row.scheduled_start as string) || null,
    scheduledEnd: (row.scheduled_end as string) || null
  }
}
```

- [ ] **Step 4: Verify type checks and existing tests pass**

Run: `npx tsc --noEmit && npm test`
Expected: no errors, 27 tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/types/index.ts src/main/database.ts src/renderer/src/store/useStore.ts
git commit -m "feat(tasks): add scheduledStart/End fields with migration"
```

---

### Task 2: Snap-to-15-min utility (TDD)

**Files:**
- Create: `src/renderer/src/utils/scheduledTime.ts`
- Create: `src/renderer/src/utils/scheduledTime.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/renderer/src/utils/scheduledTime.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { snapTo15Min } from './scheduledTime'

describe('snapTo15Min', () => {
  it('snaps 14:07 down to 14:00', () => {
    expect(snapTo15Min('2026-04-22T14:07:00')).toBe('2026-04-22T14:00:00')
  })
  it('snaps 14:08 up to 14:15', () => {
    expect(snapTo15Min('2026-04-22T14:08:00')).toBe('2026-04-22T14:15:00')
  })
  it('snaps 14:22 down to 14:15', () => {
    expect(snapTo15Min('2026-04-22T14:22:00')).toBe('2026-04-22T14:15:00')
  })
  it('snaps 14:23 up to 14:30', () => {
    expect(snapTo15Min('2026-04-22T14:23:00')).toBe('2026-04-22T14:30:00')
  })
  it('snaps 14:52 up to 15:00 (hour rollover)', () => {
    expect(snapTo15Min('2026-04-22T14:52:00')).toBe('2026-04-22T15:00:00')
  })
  it('leaves 14:00 unchanged', () => {
    expect(snapTo15Min('2026-04-22T14:00:00')).toBe('2026-04-22T14:00:00')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/utils/scheduledTime.test.ts`
Expected: FAIL with module not found for `./scheduledTime`.

- [ ] **Step 3: Implement the function**

Create `src/renderer/src/utils/scheduledTime.ts`:

```ts
/**
 * Snap an ISO local datetime string to the nearest 15-minute grid point
 * (round-half-up). Input format: "YYYY-MM-DDTHH:mm:ss".
 */
export function snapTo15Min(iso: string): string {
  const d = new Date(iso)
  const minutes = d.getMinutes()
  const snapped = Math.round(minutes / 15) * 15
  d.setMinutes(snapped, 0, 0)
  return toLocalIso(d)
}

function toLocalIso(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/utils/scheduledTime.test.ts`
Expected: PASS — 6/6.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/utils/scheduledTime.ts src/renderer/src/utils/scheduledTime.test.ts
git commit -m "feat(utils): add snapTo15Min for time-block grid snapping"
```

---

### Task 3: Overlap layout algorithm (TDD)

**Files:**
- Create: `src/renderer/src/utils/timeBlockLayout.ts`
- Create: `src/renderer/src/utils/timeBlockLayout.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/renderer/src/utils/timeBlockLayout.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { layoutOverlappingBlocks } from './timeBlockLayout'

// Helper: build a block with minute-level precision on 2026-04-22
const b = (id: string, startMin: number, endMin: number) => ({
  id,
  start: new Date(2026, 3, 22, 0, startMin),
  end: new Date(2026, 3, 22, 0, endMin)
})

describe('layoutOverlappingBlocks', () => {
  it('empty input → empty output', () => {
    expect(layoutOverlappingBlocks([])).toEqual([])
  })

  it('single block → column 0 of 1', () => {
    const out = layoutOverlappingBlocks([b('a', 0, 30)])
    expect(out).toEqual([{ id: 'a', column: 0, columns: 1 }])
  })

  it('two non-overlapping blocks → each columns:1', () => {
    const out = layoutOverlappingBlocks([b('a', 0, 30), b('b', 30, 60)])
    expect(out).toEqual([
      { id: 'a', column: 0, columns: 1 },
      { id: 'b', column: 0, columns: 1 }
    ])
  })

  it('two overlapping blocks → columns:2', () => {
    const out = layoutOverlappingBlocks([b('a', 0, 60), b('b', 30, 90)])
    expect(out).toContainEqual({ id: 'a', column: 0, columns: 2 })
    expect(out).toContainEqual({ id: 'b', column: 1, columns: 2 })
  })

  it('three-way overlap → columns:3', () => {
    const out = layoutOverlappingBlocks([
      b('a', 0, 60),
      b('b', 10, 50),
      b('c', 20, 40)
    ])
    expect(out.every((e) => e.columns === 3)).toBe(true)
    const cols = out.map((e) => e.column).sort()
    expect(cols).toEqual([0, 1, 2])
  })

  it('two separated clusters → each cluster sized independently', () => {
    const out = layoutOverlappingBlocks([
      b('a', 0, 30), b('b', 10, 40),      // cluster 1: 2-wide
      b('c', 60, 90), b('d', 70, 100), b('e', 80, 95)   // cluster 2: 3-wide
    ])
    expect(out.find((e) => e.id === 'a')!.columns).toBe(2)
    expect(out.find((e) => e.id === 'c')!.columns).toBe(3)
  })

  it('tie-break: equal start, longer block first in column 0', () => {
    const out = layoutOverlappingBlocks([b('short', 0, 30), b('long', 0, 60)])
    expect(out.find((e) => e.id === 'long')!.column).toBe(0)
    expect(out.find((e) => e.id === 'short')!.column).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/utils/timeBlockLayout.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement the layout function**

Create `src/renderer/src/utils/timeBlockLayout.ts`:

```ts
export interface LayoutInput {
  id: string
  start: Date
  end: Date
}

export interface LayoutEntry {
  id: string
  column: number  // 0-indexed column within the cluster
  columns: number // total columns in the cluster
}

/**
 * Compute column layout for overlapping time blocks.
 * Same algorithm Google Calendar uses: pack into the lowest-index free column,
 * then resize every block in a cluster to match the cluster's column count.
 */
export function layoutOverlappingBlocks(blocks: LayoutInput[]): LayoutEntry[] {
  if (blocks.length === 0) return []

  // Sort: start ascending, then end descending (tie-break: longer first)
  const sorted = [...blocks].sort((a, b) => {
    const s = a.start.getTime() - b.start.getTime()
    if (s !== 0) return s
    return b.end.getTime() - a.end.getTime()
  })

  // Sweep: assign columns, group into clusters
  type Assigned = LayoutInput & { column: number; clusterId: number }
  const assigned: Assigned[] = []
  const activeColumnEnds: number[] = [] // end time of last block per column
  let clusterId = 0
  let clusterEnd = 0 // max end time within the current cluster

  for (const block of sorted) {
    // Start a new cluster if this block starts at or after clusterEnd
    if (block.start.getTime() >= clusterEnd && assigned.length > 0) {
      clusterId++
      activeColumnEnds.length = 0
      clusterEnd = 0
    }

    // Find lowest-index column whose last end <= block.start
    let col = activeColumnEnds.findIndex((e) => e <= block.start.getTime())
    if (col === -1) {
      col = activeColumnEnds.length
      activeColumnEnds.push(block.end.getTime())
    } else {
      activeColumnEnds[col] = block.end.getTime()
    }

    assigned.push({ ...block, column: col, clusterId })
    if (block.end.getTime() > clusterEnd) clusterEnd = block.end.getTime()
  }

  // Per-cluster column counts
  const clusterCols = new Map<number, number>()
  for (const a of assigned) {
    const cur = clusterCols.get(a.clusterId) ?? 0
    if (a.column + 1 > cur) clusterCols.set(a.clusterId, a.column + 1)
  }

  return assigned.map((a) => ({
    id: a.id,
    column: a.column,
    columns: clusterCols.get(a.clusterId)!
  }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/src/utils/timeBlockLayout.test.ts`
Expected: PASS — 7/7.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/utils/timeBlockLayout.ts src/renderer/src/utils/timeBlockLayout.test.ts
git commit -m "feat(utils): add layoutOverlappingBlocks for calendar rendering"
```

---

### Task 4: `getScheduledForOccurrence` helper (TDD)

**Files:**
- Modify: `src/renderer/src/utils/scheduledTime.ts`
- Modify: `src/renderer/src/utils/scheduledTime.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/renderer/src/utils/scheduledTime.test.ts`:

```ts
import { getScheduledForOccurrence } from './scheduledTime'
import type { Task } from '../types'

const baseTask: Task = {
  id: 't1', title: 'weekly sync', description: '', completed: false, priority: 'none',
  dueDate: null, dueTime: null, reminderAt: null, listId: 'inbox', parentId: null,
  tags: [], createdAt: '2026-04-21T00:00:00', completedAt: null, deletedAt: null,
  sortOrder: 0, isRecurring: true, recurringPattern: 'weekly',
  attachments: [],
  scheduledStart: '2026-04-21T14:00:00',
  scheduledEnd: '2026-04-21T15:00:00'
}

describe('getScheduledForOccurrence', () => {
  it('returns null when task has no scheduledStart', () => {
    const t = { ...baseTask, scheduledStart: null, scheduledEnd: null }
    expect(getScheduledForOccurrence(t, '2026-04-28')).toBeNull()
  })

  it('projects template time onto the occurrence date', () => {
    const result = getScheduledForOccurrence(baseTask, '2026-04-28')
    expect(result).toEqual({
      start: '2026-04-28T14:00:00',
      end: '2026-04-28T15:00:00'
    })
  })

  it('preserves duration across occurrences', () => {
    const t = {
      ...baseTask,
      scheduledStart: '2026-04-21T09:30:00',
      scheduledEnd:   '2026-04-21T11:15:00'  // 1h 45m duration
    }
    const result = getScheduledForOccurrence(t, '2026-05-05')
    expect(result).toEqual({
      start: '2026-05-05T09:30:00',
      end: '2026-05-05T11:15:00'
    })
  })

  it('non-recurring task: returns raw start/end regardless of date arg', () => {
    const t = { ...baseTask, isRecurring: false, recurringPattern: null }
    const result = getScheduledForOccurrence(t, '2026-05-05')
    expect(result).toEqual({
      start: '2026-04-21T14:00:00',
      end:   '2026-04-21T15:00:00'
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/src/utils/scheduledTime.test.ts`
Expected: FAIL — `getScheduledForOccurrence` not exported.

- [ ] **Step 3: Implement the helper**

Append to `src/renderer/src/utils/scheduledTime.ts`:

```ts
import type { Task } from '../types'

/**
 * Compute the scheduled block for a specific occurrence of a task.
 *
 * - Non-recurring tasks: returns {start, end} verbatim from task.scheduledStart/End.
 * - Recurring tasks: treats task.scheduledStart/End as a time-of-day + duration
 *   template. The date portion is ignored; the occurrence date is combined with
 *   the template's time-of-day and duration.
 *
 * Returns null if the task has no scheduled template.
 */
export function getScheduledForOccurrence(
  task: Pick<Task, 'scheduledStart' | 'scheduledEnd' | 'isRecurring'>,
  occurrenceDate: string  // "YYYY-MM-DD"
): { start: string; end: string } | null {
  if (!task.scheduledStart || !task.scheduledEnd) return null
  if (!task.isRecurring) {
    return { start: task.scheduledStart, end: task.scheduledEnd }
  }
  const startTimePart = task.scheduledStart.slice(11) // "HH:mm:ss"
  const endTimePart = task.scheduledEnd.slice(11)
  return {
    start: `${occurrenceDate}T${startTimePart}`,
    end: `${occurrenceDate}T${endTimePart}`
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/src/utils/scheduledTime.test.ts`
Expected: PASS — 10/10 (6 previous + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/utils/scheduledTime.ts src/renderer/src/utils/scheduledTime.test.ts
git commit -m "feat(utils): getScheduledForOccurrence for recurring task blocks"
```

---

### Task 5: Invariant validation in `updateTask`

**Files:**
- Modify: `src/renderer/src/store/useStore.ts:301-306` (`updateTask`)
- Extend: `src/renderer/src/utils/scheduledTime.ts` (+ `isValidSchedulePair`)

- [ ] **Step 1: Write failing test for validator**

Append to `src/renderer/src/utils/scheduledTime.test.ts`:

```ts
import { isValidSchedulePair } from './scheduledTime'

describe('isValidSchedulePair', () => {
  it('accepts both null', () => {
    expect(isValidSchedulePair(null, null)).toBe(true)
  })
  it('accepts both set with end > start', () => {
    expect(isValidSchedulePair('2026-04-22T14:00:00', '2026-04-22T14:30:00')).toBe(true)
  })
  it('rejects one set, one null', () => {
    expect(isValidSchedulePair('2026-04-22T14:00:00', null)).toBe(false)
    expect(isValidSchedulePair(null, '2026-04-22T14:30:00')).toBe(false)
  })
  it('rejects end <= start', () => {
    expect(isValidSchedulePair('2026-04-22T14:00:00', '2026-04-22T14:00:00')).toBe(false)
    expect(isValidSchedulePair('2026-04-22T14:30:00', '2026-04-22T14:00:00')).toBe(false)
  })
  it('rejects block shorter than 15 min', () => {
    expect(isValidSchedulePair('2026-04-22T14:00:00', '2026-04-22T14:10:00')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/utils/scheduledTime.test.ts`
Expected: FAIL — `isValidSchedulePair` not exported.

- [ ] **Step 3: Implement validator**

Append to `src/renderer/src/utils/scheduledTime.ts`:

```ts
const MIN_BLOCK_MS = 15 * 60 * 1000

export function isValidSchedulePair(
  start: string | null,
  end: string | null
): boolean {
  if (start === null && end === null) return true
  if (start === null || end === null) return false
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (!Number.isFinite(s) || !Number.isFinite(e)) return false
  return e - s >= MIN_BLOCK_MS
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/utils/scheduledTime.test.ts`
Expected: PASS — 15/15.

- [ ] **Step 5: Wire validator into `updateTask`**

In `src/renderer/src/store/useStore.ts`, modify `updateTask` (around line 301):

```ts
updateTask: async (task) => {
  // Validate schedule pair if either field is being updated
  if ('scheduledStart' in task || 'scheduledEnd' in task) {
    const current = get().tasks.find((t) => t.id === task.id)
    if (!current) return
    const nextStart = 'scheduledStart' in task ? task.scheduledStart ?? null : current.scheduledStart
    const nextEnd = 'scheduledEnd' in task ? task.scheduledEnd ?? null : current.scheduledEnd
    if (!isValidSchedulePair(nextStart, nextEnd)) {
      console.warn('[updateTask] rejected invalid schedule pair', { nextStart, nextEnd })
      return
    }
  }
  set((s) => ({
    tasks: s.tasks.map((t) => t.id === task.id ? { ...t, ...task } : t)
  }))
  window.api.updateTask(task)
},
```

Also add the import at the top of `useStore.ts`:

```ts
import { isValidSchedulePair } from '../utils/scheduledTime'
```

- [ ] **Step 6: Verify existing tests still pass**

Run: `npx tsc --noEmit && npm test`
Expected: no errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/utils/scheduledTime.ts src/renderer/src/utils/scheduledTime.test.ts src/renderer/src/store/useStore.ts
git commit -m "feat(store): invariant guard on scheduled time pair updates"
```

---

### Task 6: Make `TaskItem` draggable

**Files:**
- Modify: `src/renderer/src/components/tasks/TaskItem.tsx`

- [ ] **Step 1: Find the root row element and add drag props**

Open `src/renderer/src/components/tasks/TaskItem.tsx`. Locate the outermost `<div>` (the clickable task row). Add `draggable` and `onDragStart`:

```tsx
<div
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('application/haru-task-id', task.id)
    e.dataTransfer.effectAllowed = 'copy'
  }}
  // ... existing className, onClick, etc.
>
```

If the existing file already uses drag-drop for reordering (check the Kanban pattern), co-exist: the row can fire `dragstart` with multiple data types if needed. In our case, a simple `application/haru-task-id` payload is enough — the calendar will look for this specific type and the list-reorder (if any) uses a different type.

- [ ] **Step 2: Manual verification**

Run: `npm run dev` — open the app.

Drag a task row. Confirm the OS drag ghost appears. No visible change yet (calendar doesn't handle drops until Task 8). Compile errors would surface in the dev server output.

Stop the dev server with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/tasks/TaskItem.tsx
git commit -m "feat(tasks): make TaskItem draggable with haru-task-id payload"
```

---

### Task 7: `TimeBlock` component

**Files:**
- Create: `src/renderer/src/components/calendar/TimeBlock.tsx`

- [ ] **Step 1: Create the component**

Create `src/renderer/src/components/calendar/TimeBlock.tsx`:

```tsx
import React, { useRef, useState } from 'react'
import type { Task } from '../../types'
import { useStore } from '../../store/useStore'
import { snapTo15Min } from '../../utils/scheduledTime'

interface Props {
  task: Task
  /** Start time of the block for this occurrence. */
  start: Date
  /** End time of the block for this occurrence. */
  end: Date
  /** Pixels per minute for the calendar (e.g. Weekly=1, Daily=2). */
  pxPerMin: number
  /** Column layout from layoutOverlappingBlocks. */
  column: number
  columns: number
  isDark: boolean
}

const MIN_BLOCK_MIN = 15

export function TimeBlock({
  task, start, end, pxPerMin, column, columns, isDark
}: Props): React.ReactElement {
  const { updateTask } = useStore()
  const elRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const durationMin = (end.getTime() - start.getTime()) / 60000
  const topPx = (start.getHours() * 60 + start.getMinutes()) * pxPerMin
  const heightPx = durationMin * pxPerMin
  const widthPct = 100 / columns
  const leftPct = column * widthPct

  // Serialize Date → local ISO "YYYY-MM-DDTHH:mm:00"
  const toIso = (d: Date): string => {
    const pad = (n: number): string => String(n).padStart(2, '0')
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
      `T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
    )
  }

  const onDragStart = (e: React.DragEvent): void => {
    e.dataTransfer.setData('application/haru-task-block', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  // Resize handle
  const onResizeStart = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const startEnd = new Date(end)
    const onMove = (ev: MouseEvent): void => {
      const deltaMin = (ev.clientY - startY) / pxPerMin
      const newEnd = new Date(startEnd.getTime() + deltaMin * 60000)
      // Clamp to at least 15 min after start and not past 23:59 same day
      const minEnd = new Date(start.getTime() + MIN_BLOCK_MIN * 60000)
      const dayEnd = new Date(start)
      dayEnd.setHours(23, 59, 0, 0)
      const clampedEnd = new Date(
        Math.max(minEnd.getTime(), Math.min(newEnd.getTime(), dayEnd.getTime()))
      )
      if (elRef.current) {
        elRef.current.style.height = `${((clampedEnd.getTime() - start.getTime()) / 60000) * pxPerMin}px`
      }
    }
    const onUp = (ev: MouseEvent): void => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      const deltaMin = (ev.clientY - startY) / pxPerMin
      const newEnd = new Date(startEnd.getTime() + deltaMin * 60000)
      const minEnd = new Date(start.getTime() + MIN_BLOCK_MIN * 60000)
      const dayEnd = new Date(start)
      dayEnd.setHours(23, 59, 0, 0)
      const clampedEnd = new Date(
        Math.max(minEnd.getTime(), Math.min(newEnd.getTime(), dayEnd.getTime()))
      )
      const snapped = snapTo15Min(toIso(clampedEnd))
      void updateTask({ id: task.id, scheduledEnd: snapped })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // Context menu
  const onContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    setMenuOpen(true)
  }

  const unschedule = (): void => {
    void updateTask({ id: task.id, scheduledStart: null, scheduledEnd: null })
    setMenuOpen(false)
  }

  const completedStripe = task.completed
    ? 'bg-stripes opacity-60'
    : ''

  return (
    <div
      ref={elRef}
      draggable
      onDragStart={onDragStart}
      onContextMenu={onContextMenu}
      style={{
        position: 'absolute',
        top: `${topPx}px`,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        height: `${heightPx}px`
      }}
      className={`rounded-md border-l-4 px-2 py-1 text-xs overflow-hidden cursor-grab select-none ${
        isDark ? 'bg-blue-500/20 border-l-blue-400 text-gray-100' : 'bg-blue-100 border-l-blue-400 text-gray-800'
      } ${completedStripe}`}
    >
      <div className="font-medium truncate">{task.title}</div>
      <div className="text-[10px] opacity-70">
        {start.getHours()}:{String(start.getMinutes()).padStart(2, '0')}
        –
        {end.getHours()}:{String(end.getMinutes()).padStart(2, '0')}
      </div>
      {/* Resize handle (bottom 6px) */}
      <div
        onMouseDown={onResizeStart}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6px', cursor: 'ns-resize' }}
      />
      {menuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-1 top-1 rounded shadow-md z-10 ${
            isDark ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
          }`}
        >
          <button className="px-3 py-1 text-xs hover:bg-gray-500/20 block w-full text-left" onClick={unschedule}>
            일정 해제
          </button>
          <button className="px-3 py-1 text-xs hover:bg-gray-500/20 block w-full text-left" onClick={() => setMenuOpen(false)}>
            취소
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/calendar/TimeBlock.tsx
git commit -m "feat(calendar): add TimeBlock component with drag, resize, context menu"
```

---

### Task 8: Integrate blocks into `DailyCalendar`

**Files:**
- Modify: `src/renderer/src/components/calendar/DailyCalendar.tsx`

- [ ] **Step 1: Import the new pieces at the top of the file**

Add imports near the existing imports:

```ts
import { TimeBlock } from './TimeBlock'
import { layoutOverlappingBlocks } from '../../utils/timeBlockLayout'
import { getScheduledForOccurrence, snapTo15Min } from '../../utils/scheduledTime'
```

Also, reach for `updateTask` when destructuring the store. Around line 48:

```ts
const { theme, tasks, selectTask, selectedTaskId, toggleTask, updateTask } = useStore()
```

- [ ] **Step 2: Compute blocks for the visible day inside `DailyCalendar`**

Add a `useMemo` that collects all scheduled blocks that fall on `dateStr`:

```tsx
const blocks = useMemo(() => {
  const items: { task: Task; start: Date; end: Date }[] = []
  for (const t of tasks) {
    if (t.deletedAt) continue
    const sch = getScheduledForOccurrence(t, dateStr)
    if (!sch) continue
    // For non-recurring, only include if start date matches dateStr
    if (!t.isRecurring && sch.start.slice(0, 10) !== dateStr) continue
    items.push({ task: t, start: new Date(sch.start), end: new Date(sch.end) })
  }
  return items
}, [tasks, dateStr])

const layout = useMemo(
  () => layoutOverlappingBlocks(blocks.map((b) => ({ id: b.task.id, start: b.start, end: b.end }))),
  [blocks]
)
```

- [ ] **Step 3: Add a drop target column parallel to the time slots**

The `DailyCalendar` uses 30-minute slots starting at hour 6. Pixel-per-minute is implicit from slot height. Inspect the rendered slot markup to determine the column container. Wrap the slot column with `onDragOver`/`onDrop`:

```tsx
<div
  className="relative flex-1"
  style={{ height: `${(23 - 6 + 1) * 60 * PX_PER_MIN}px` }}
  onDragOver={(e) => {
    if (
      e.dataTransfer.types.includes('application/haru-task-id') ||
      e.dataTransfer.types.includes('application/haru-task-block')
    ) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }}
  onDrop={(e) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const yPx = e.clientY - rect.top
    const minutesFromTop = yPx / PX_PER_MIN
    const totalMin = 6 * 60 + minutesFromTop // column starts at hour 6
    const hour = Math.floor(totalMin / 60)
    const minute = Math.floor(totalMin % 60)
    const pad = (n: number): string => String(n).padStart(2, '0')
    const rawStart = `${dateStr}T${pad(hour)}:${pad(minute)}:00`
    const snappedStart = snapTo15Min(rawStart)
    const startMs = new Date(snappedStart).getTime()
    const endMs = startMs + 30 * 60000
    const dayEnd = new Date(dateStr + 'T23:59:00').getTime()
    const endMsClamped = Math.min(endMs, dayEnd)
    const toIso = (ms: number): string => {
      const d = new Date(ms)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
    }

    const taskId =
      e.dataTransfer.getData('application/haru-task-id') ||
      e.dataTransfer.getData('application/haru-task-block')
    if (!taskId) return
    const existing = tasks.find((t) => t.id === taskId)
    if (!existing) return

    // For "block move" with preserved duration: keep original duration when moving existing block
    let finalEnd = toIso(endMsClamped)
    if (e.dataTransfer.types.includes('application/haru-task-block') && existing.scheduledStart && existing.scheduledEnd) {
      const origDur = new Date(existing.scheduledEnd).getTime() - new Date(existing.scheduledStart).getTime()
      finalEnd = toIso(Math.min(startMs + origDur, dayEnd))
    }

    void updateTask({ id: taskId, scheduledStart: snappedStart, scheduledEnd: finalEnd })
  }}
>
  {/* existing time slots render inside */}
  {/* Render blocks absolutely positioned on top of slots */}
  {blocks.map((b) => {
    const entry = layout.find((l) => l.id === b.task.id)!
    return (
      <TimeBlock
        key={b.task.id}
        task={b.task}
        start={b.start}
        end={b.end}
        pxPerMin={PX_PER_MIN}
        column={entry.column}
        columns={entry.columns}
        isDark={isDark}
      />
    )
  })}
</div>
```

Define `PX_PER_MIN` as a module-level constant matching the existing slot heights. Example for 30-min slots rendered at 48px tall:

```ts
const PX_PER_MIN = 48 / 30  // 1.6px per minute
```

Adjust to match the actual slot height used in the existing markup.

- [ ] **Step 4: Manual QA**

Run: `npm run dev`.

1. Create a new task titled "테스트 블록". Leave dueDate empty.
2. Open DailyCalendar view.
3. Drag the task from TaskList onto a slot around 2pm.
4. Expected: a 30-minute block appears from 2:00 to 2:30 labeled "테스트 블록".
5. Drag the bottom edge of the block down → it should extend with 15-min snap.
6. Right-click the block → "일정 해제" → block disappears; task remains in list.

Close the app and restart to confirm block persists across restarts.

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/calendar/DailyCalendar.tsx
git commit -m "feat(calendar): render and drop-target time blocks in DailyCalendar"
```

---

### Task 9: Integrate blocks into `WeeklyCalendar`

**Files:**
- Modify: `src/renderer/src/components/calendar/WeeklyCalendar.tsx`

- [ ] **Step 1: Import the utilities**

Same imports as Task 8 at the top of the file:

```ts
import { TimeBlock } from './TimeBlock'
import { layoutOverlappingBlocks } from '../../utils/timeBlockLayout'
import { getScheduledForOccurrence, snapTo15Min } from '../../utils/scheduledTime'
```

Destructure `updateTask` from `useStore()`.

- [ ] **Step 2: Compute per-day block arrays**

`WeeklyCalendar` uses hour slots from 8 to 22. It renders 7 day columns. For each of the 7 days (`days[0..6]` as `Date` objects), build a block list and a layout:

```tsx
const PX_PER_MIN = 40 / 60  // WeeklyCalendar uses ~40px per hour

const perDay = useMemo(() => {
  return days.map((date) => {
    const dayStr = dateToStr(date)
    const items: { task: Task; start: Date; end: Date }[] = []
    for (const t of tasks) {
      if (t.deletedAt) continue
      const sch = getScheduledForOccurrence(t, dayStr)
      if (!sch) continue
      if (!t.isRecurring && sch.start.slice(0, 10) !== dayStr) continue
      items.push({ task: t, start: new Date(sch.start), end: new Date(sch.end) })
    }
    const layout = layoutOverlappingBlocks(
      items.map((b) => ({ id: b.task.id, start: b.start, end: b.end }))
    )
    return { dayStr, items, layout }
  })
}, [tasks, days])
```

Adjust `PX_PER_MIN` once you've confirmed the actual slot heights in the existing render.

- [ ] **Step 3: Add the drop target and block rendering per day column**

Inside the loop rendering each day column, wrap the column body:

```tsx
{perDay.map(({ dayStr, items, layout }, idx) => (
  <div
    key={dayStr}
    className="relative flex-1 border-r"
    style={{ height: `${(22 - 8 + 1) * 60 * PX_PER_MIN}px` }}
    onDragOver={(e) => {
      if (
        e.dataTransfer.types.includes('application/haru-task-id') ||
        e.dataTransfer.types.includes('application/haru-task-block')
      ) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }
    }}
    onDrop={(e) => {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
      const yPx = e.clientY - rect.top
      const minutesFromTop = yPx / PX_PER_MIN
      const totalMin = 8 * 60 + minutesFromTop
      const hour = Math.floor(totalMin / 60)
      const minute = Math.floor(totalMin % 60)
      const pad = (n: number): string => String(n).padStart(2, '0')
      const rawStart = `${dayStr}T${pad(hour)}:${pad(minute)}:00`
      const snappedStart = snapTo15Min(rawStart)
      const startMs = new Date(snappedStart).getTime()
      const dayEnd = new Date(dayStr + 'T23:59:00').getTime()
      const toIso = (ms: number): string => {
        const d = new Date(ms)
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
      }
      const taskId =
        e.dataTransfer.getData('application/haru-task-id') ||
        e.dataTransfer.getData('application/haru-task-block')
      if (!taskId) return
      const existing = tasks.find((t) => t.id === taskId)
      if (!existing) return
      let endMs = startMs + 30 * 60000
      if (e.dataTransfer.types.includes('application/haru-task-block') && existing.scheduledStart && existing.scheduledEnd) {
        const origDur = new Date(existing.scheduledEnd).getTime() - new Date(existing.scheduledStart).getTime()
        endMs = startMs + origDur
      }
      const endMsClamped = Math.min(endMs, dayEnd)
      void updateTask({ id: taskId, scheduledStart: snappedStart, scheduledEnd: toIso(endMsClamped) })
    }}
  >
    {/* render hour lines here (existing markup) */}
    {items.map((b) => {
      const entry = layout.find((l) => l.id === b.task.id)!
      return (
        <TimeBlock
          key={b.task.id}
          task={b.task}
          start={b.start}
          end={b.end}
          pxPerMin={PX_PER_MIN}
          column={entry.column}
          columns={entry.columns}
          isDark={isDark}
        />
      )
    })}
  </div>
))}
```

- [ ] **Step 4: Manual QA**

Run: `npm run dev`.

1. WeeklyCalendar view.
2. Drag 3 separate tasks onto Wednesday at 10:00, 10:30, and 10:45 — each 30-minute block overlapping.
3. Expected: 3 blocks side by side within the Wednesday column (widths ~33%).
4. Drag a block from Wednesday 10:00 → Thursday 14:00. Expected: block moves, duration preserved.
5. Create a "매주 화요일" recurring task → drag onto Tuesday 14:00 — 2h block. Switch week → Tuesday next week shows the same 14:00–16:00 block.

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/calendar/WeeklyCalendar.tsx
git commit -m "feat(calendar): render and drop-target time blocks in WeeklyCalendar"
```

---

### Task 10: Reverse drop in `TaskList` (unschedule)

**Files:**
- Modify: `src/renderer/src/components/tasks/TaskList.tsx`

- [ ] **Step 1: Add drop handler to the list container**

Find the outermost `TaskList` container (the scrollable column). Add:

```tsx
<div
  onDragOver={(e) => {
    if (e.dataTransfer.types.includes('application/haru-task-block')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }}
  onDrop={(e) => {
    const id = e.dataTransfer.getData('application/haru-task-block')
    if (!id) return
    void useStore.getState().updateTask({ id, scheduledStart: null, scheduledEnd: null })
  }}
  // ...existing props
>
```

The drop fires on the container background only when an existing block is dragged — `application/haru-task-id` (which is what TaskItem rows emit) is deliberately ignored so dragging within the list doesn't trigger unschedule.

- [ ] **Step 2: Manual QA**

Run: `npm run dev`.

1. Schedule a task via drag onto WeeklyCalendar.
2. Drag the block from the calendar back onto an empty area of TaskList.
3. Expected: block disappears from calendar, task remains in list.

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/tasks/TaskList.tsx
git commit -m "feat(tasks): TaskList accepts reverse drop to unschedule a block"
```

---

### Task 11: Read-only scheduled display in `TaskDetail`

**Files:**
- Modify: `src/renderer/src/components/tasks/TaskDetail.tsx`

- [ ] **Step 1: Find the detail panel's info section and add a conditional line**

Where the file renders task metadata (dueDate, priority, tags), append a block after the existing time/date line:

```tsx
{task.scheduledStart && task.scheduledEnd && (
  <div className="flex items-center gap-2 text-sm text-gray-500">
    <Clock size={14} />
    <span>
      예정:{' '}
      {formatScheduledRange(task.scheduledStart, task.scheduledEnd)}
    </span>
  </div>
)}
```

Add the helper at the top of the file or inline:

```tsx
function formatScheduledRange(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
  const s = `${pad(start.getHours())}:${pad(start.getMinutes())}`
  const e = `${pad(end.getHours())}:${pad(end.getMinutes())}`
  return `${date} ${s}–${e}`
}
```

`Clock` is already imported from `lucide-react` at the top of the file (verify and add to the import list if missing).

- [ ] **Step 2: Manual QA**

Run: `npm run dev`. Open a scheduled task in the detail panel. Confirm "예정: 2026-04-22 14:00–14:30" line appears. Unschedule via the calendar; confirm the line disappears.

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/tasks/TaskDetail.tsx
git commit -m "feat(tasks): show scheduled block in TaskDetail (read-only)"
```

---

### Task 12: Completed-task visual treatment

**Files:**
- Modify: `src/renderer/src/components/calendar/TimeBlock.tsx`

- [ ] **Step 1: Ensure completed blocks render with a striped overlay**

The Task 7 component already applies `bg-stripes opacity-60` when `task.completed`. Add the CSS for `bg-stripes` to `src/renderer/src/index.css`:

```css
.bg-stripes {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 6px,
    rgba(0, 0, 0, 0.08) 6px,
    rgba(0, 0, 0, 0.08) 12px
  );
}
```

- [ ] **Step 2: Manual QA**

Run: `npm run dev`. Schedule a task. Mark it complete in TaskList. Confirm the block in the calendar now shows a diagonal stripe pattern and 60% opacity. Unmark. Stripe disappears.

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/calendar/TimeBlock.tsx src/renderer/src/index.css
git commit -m "style(calendar): striped overlay on completed time blocks"
```

---

### Task 13: Final integration QA and docs update

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `TODOS.md` (remove the closed TODO if one tracks this)

- [ ] **Step 1: Run the full manual QA checklist**

From the spec's "Testing → Manual QA checklist" section. Go through each bullet, noting pass/fail:

1. Drag task from TaskList onto Wednesday 14:00 in Weekly → block appears at 14:00–14:30. ☐
2. Resize bottom edge down → `scheduledEnd` extends with 15-min snap. ☐
3. Move block to Thursday 10:00 → day+time both shift, duration preserved. ☐
4. Schedule 2-hour block overlapping a 1-hour block → side-by-side, widths sum to 100%. ☐
5. Mark task complete → striped overlay on block. ☐
6. Unschedule via right-click → block gone, task stays. ☐
7. Create "매주 화요일 14:00–15:00" recurring task → block on every Tuesday of the visible week. ☐
8. App restart → all blocks persist. ☐

If any fail, fix before proceeding.

- [ ] **Step 2: Run full test suite and type check**

Run: `npx tsc --noEmit && npm test`
Expected: clean, all tests pass (27 original + 11 new tests from tasks 2/3/4/5 = 38 total).

- [ ] **Step 3: Update CHANGELOG**

Prepend to `CHANGELOG.md`:

```markdown
## [Unreleased]

### Added
- 타임블로킹 (로컬): 작업을 Daily/Weekly 캘린더로 드래그해서 "언제 할지" 시간대 배정. 블록 이동/리사이즈/우클릭 해제 지원. 반복 작업은 매 인스턴스마다 같은 시각에 자동 반영. Google Calendar 동기화는 Phase 2 예정.
```

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: note local time blocking in CHANGELOG"
```

- [ ] **Step 5: Final status check**

Run:
```bash
git log origin/main..HEAD --oneline
npm test
```

Expected: 13+ local commits, all tests pass. Ready for `/ship`.

---

## Self-review checklist (done before handing off this plan)

- [x] All spec sections map to a task: data model (Task 1), UX drag/resize (Tasks 6/7/8/9), recurring helper (Task 4), overlap layout (Task 3), unschedule paths (Tasks 7/10), read-only detail (Task 11), completed styling (Task 12), migration (Task 1), testing (embedded in each TDD task + Task 13 integration pass).
- [x] No TBDs or "TODO: fill in later" placeholders.
- [x] Type consistency: `scheduledStart/End` (camelCase) in TS, `scheduled_start/end` (snake_case) only in DB migration and JSON row mapping.
- [x] Every code step shows complete code, not references to "similar to Task N".
- [x] Each task ends with a commit so the history tells the story.
