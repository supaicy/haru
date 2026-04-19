import type { Task } from '../types'

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

/**
 * Compute the scheduled block for a specific occurrence of a task.
 *
 * - Non-recurring tasks: returns {start, end} verbatim from task.scheduledStart/End.
 * - Recurring tasks: treats task.scheduledStart/End as a time-of-day + duration
 *   template. The date portion is ignored; the occurrence date is combined with
 *   the template's time-of-day and duration.
 *
 * Returns null if the task has no scheduled template.
 *
 * Input strings must be naive local ISO ("YYYY-MM-DDTHH:mm:ss"); any timezone
 * suffix (Z or ±HH:MM) would be silently propagated and cause parsing drift.
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
