import { describe, it, expect } from 'vitest'
import { trimHistory } from './trim'
import type { AiMessage } from '../types'

const mkMsg = (id: string): AiMessage => ({
  id,
  role: 'user',
  content: id,
  timestamp: `2026-04-20T00:00:${id.padStart(2, '0')}.000Z`
})

describe('trimHistory', () => {
  it('cap보다 짧으면 그대로 반환', () => {
    const msgs = [mkMsg('1'), mkMsg('2')]
    expect(trimHistory(msgs, 5)).toEqual(msgs)
  })

  it('cap과 같으면 그대로 반환', () => {
    const msgs = [mkMsg('1'), mkMsg('2')]
    expect(trimHistory(msgs, 2)).toEqual(msgs)
  })

  it('cap보다 길면 마지막 cap개만 보존 (순서 유지)', () => {
    const msgs = [mkMsg('1'), mkMsg('2'), mkMsg('3'), mkMsg('4')]
    const result = trimHistory(msgs, 2)
    expect(result.map((m) => m.id)).toEqual(['3', '4'])
  })

  it('cap=0이면 빈 배열', () => {
    expect(trimHistory([mkMsg('1'), mkMsg('2')], 0)).toEqual([])
  })
})
