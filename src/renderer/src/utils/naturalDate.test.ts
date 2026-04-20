import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseNaturalDateTime } from './naturalDate'

// date-fns의 날짜 계산을 위해 현재 날짜를 고정
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-25T09:00:00'))
})

describe('parseNaturalDateTime', () => {
  describe('상대 날짜', () => {
    it('"오늘" → 오늘 날짜', () => {
      const result = parseNaturalDateTime('오늘 회의')
      expect(result).not.toBeNull()
      expect(result?.date).toBe('2026-03-25')
    })

    it('"내일" → 내일 날짜', () => {
      const result = parseNaturalDateTime('내일 장보기')
      expect(result).not.toBeNull()
      expect(result?.date).toBe('2026-03-26')
    })

    it('"모레" → 2일 후', () => {
      const result = parseNaturalDateTime('모레 약속')
      expect(result).not.toBeNull()
      expect(result?.date).toBe('2026-03-27')
    })
  })

  describe('시간 표현 (날짜 없이 시간만 입력하면 null)', () => {
    it('"오후3시30분"만 입력 → null (날짜가 없으면 파싱 안 됨)', () => {
      const result = parseNaturalDateTime('오후3시30분')
      expect(result).toBeNull()
    })

    it('"오늘 오후3시30분" → 오늘 + 15:30', () => {
      const result = parseNaturalDateTime('오늘 오후3시30분')
      expect(result).not.toBeNull()
      expect(result?.date).toBe('2026-03-25')
      expect(result?.time).toBe('15:30')
    })

    it('"오늘 14시50분" → 오늘 + 14:50', () => {
      const result = parseNaturalDateTime('오늘 14시50분')
      expect(result).not.toBeNull()
      expect(result?.time).toBe('14:50')
    })
  })

  describe('날짜 + 시간 결합', () => {
    it('"내일 14시50분" → 내일 날짜 + 14:50', () => {
      const result = parseNaturalDateTime('내일 14시50분')
      expect(result).not.toBeNull()
      expect(result?.date).toBe('2026-03-26')
      expect(result?.time).toBe('14:50')
    })

    it('"내일 오후3시" → 내일 날짜 + 15:00', () => {
      const result = parseNaturalDateTime('내일 오후3시')
      expect(result).not.toBeNull()
      expect(result?.date).toBe('2026-03-26')
      expect(result?.time).toBe('15:00')
    })
  })

  describe('인식 불가', () => {
    it('날짜 없는 입력 → null', () => {
      const result = parseNaturalDateTime('장보기')
      expect(result).toBeNull()
    })
  })

  describe('consumed 토큰 수', () => {
    it('"내일 장보기"에서 1개 토큰 consumed', () => {
      const result = parseNaturalDateTime('내일 장보기')
      expect(result).not.toBeNull()
      expect(result?.consumed).toBe(1)
    })

    it('"내일 14시50분 회의"에서 2개 토큰 consumed', () => {
      const result = parseNaturalDateTime('내일 14시50분 회의')
      expect(result).not.toBeNull()
      expect(result?.consumed).toBe(2)
    })
  })
})
