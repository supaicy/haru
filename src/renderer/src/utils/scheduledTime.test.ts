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
  it('snaps 14:58 up to 15:00 (hour rollover)', () => {
    expect(snapTo15Min('2026-04-22T14:58:00')).toBe('2026-04-22T15:00:00')
  })
  it('leaves 14:00 unchanged', () => {
    expect(snapTo15Min('2026-04-22T14:00:00')).toBe('2026-04-22T14:00:00')
  })
})
