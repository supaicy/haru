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
    const out = layoutOverlappingBlocks([b('a', 0, 60), b('b', 10, 50), b('c', 20, 40)])
    expect(out.every((e) => e.columns === 3)).toBe(true)
    const cols = out.map((e) => e.column).sort()
    expect(cols).toEqual([0, 1, 2])
  })

  it('two separated clusters → each cluster sized independently', () => {
    const out = layoutOverlappingBlocks([
      b('a', 0, 30),
      b('b', 10, 40), // cluster 1: 2-wide
      b('c', 60, 90),
      b('d', 70, 100),
      b('e', 80, 95) // cluster 2: 3-wide
    ])
    expect(out.find((e) => e.id === 'a')?.columns).toBe(2)
    expect(out.find((e) => e.id === 'c')?.columns).toBe(3)
  })

  it('tie-break: equal start, longer block first in column 0', () => {
    const out = layoutOverlappingBlocks([b('short', 0, 30), b('long', 0, 60)])
    expect(out.find((e) => e.id === 'long')?.column).toBe(0)
    expect(out.find((e) => e.id === 'short')?.column).toBe(1)
  })
})
