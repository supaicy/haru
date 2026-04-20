import { describe, it, expect } from 'vitest'
import { snapTo15Min, getScheduledForOccurrence, isValidSchedulePair } from './scheduledTime'
import type { Task } from '../types'

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
  it('snaps 14:58 up to 15:00 (hour rollover)', () => {
    expect(snapTo15Min('2026-04-22T14:58:00')).toBe('2026-04-22T15:00:00')
  })
  it('leaves 14:00 unchanged', () => {
    expect(snapTo15Min('2026-04-22T14:00:00')).toBe('2026-04-22T14:00:00')
  })
  it('clamps to 23:45 when snapping would roll past midnight', () => {
    expect(snapTo15Min('2026-04-22T23:53:00')).toBe('2026-04-22T23:45:00')
  })
})

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
