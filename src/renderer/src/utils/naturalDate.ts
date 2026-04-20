import {
  addDays,
  addWeeks,
  addMonths,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  startOfDay,
  format
} from 'date-fns'

const DAY_MAP: Record<string, number> = {
  일요일: 0,
  일: 0,
  월요일: 1,
  월: 1,
  화요일: 2,
  화: 2,
  수요일: 3,
  수: 3,
  목요일: 4,
  목: 4,
  금요일: 5,
  금: 5,
  토요일: 6,
  토: 6
}

const NEXT_DAY_FN = [nextSunday, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday]

export interface ParsedDateTime {
  date: string // "YYYY-MM-DD"
  time: string | null // "HH:MM" 또는 null
  consumed: number // 소비된 단어 수
}

/**
 * 시간 표현을 파싱하여 "HH:MM" 형식으로 반환
 * 지원 패턴:
 *   "14시50분", "14시 50분", "14시", "3시30분"
 *   "오전9시", "오후3시30분", "오전 11시 30분"
 *   "14:50", "9:30"
 */
function parseNaturalTime(tokens: string[]): { time: string; consumed: number } | null {
  if (tokens.length === 0) return null
  const joined = tokens.slice(0, 3).join(' ')

  // "오전/오후 N시 M분" or "오전/오후 N시M분" or "오전N시M분"
  const ampmFull = joined.match(/^(오전|오후)\s*(\d{1,2})시\s*(\d{1,2})분?/)
  if (ampmFull) {
    let h = parseInt(ampmFull[2], 10)
    const m = parseInt(ampmFull[3], 10)
    if (h > 12 || m > 59) return null
    if (ampmFull[1] === '오후' && h < 12) h += 12
    if (ampmFull[1] === '오전' && h === 12) h = 0
    const consumed = countConsumed(tokens, ampmFull[0])
    return { time: fmtTime(h, m), consumed }
  }

  // "오전/오후 N시"
  const ampmHour = joined.match(/^(오전|오후)\s*(\d{1,2})시/)
  if (ampmHour) {
    let h = parseInt(ampmHour[2], 10)
    if (h > 12) return null
    if (ampmHour[1] === '오후' && h < 12) h += 12
    if (ampmHour[1] === '오전' && h === 12) h = 0
    const consumed = countConsumed(tokens, ampmHour[0])
    return { time: fmtTime(h, 0), consumed }
  }

  // "N시M분" or "N시 M분"
  const hourMin = joined.match(/^(\d{1,2})시\s*(\d{1,2})분?/)
  if (hourMin) {
    const h = parseInt(hourMin[1], 10)
    const m = parseInt(hourMin[2], 10)
    if (h > 23 || m > 59) return null
    const consumed = countConsumed(tokens, hourMin[0])
    return { time: fmtTime(h, m), consumed }
  }

  // "N시"
  const hourOnly = joined.match(/^(\d{1,2})시/)
  if (hourOnly) {
    const h = parseInt(hourOnly[1], 10)
    if (h > 23) return null
    const consumed = countConsumed(tokens, hourOnly[0])
    return { time: fmtTime(h, 0), consumed }
  }

  // "14:50", "9:30"
  const colonTime = tokens[0].match(/^(\d{1,2}):(\d{2})$/)
  if (colonTime) {
    const h = parseInt(colonTime[1], 10)
    const m = parseInt(colonTime[2], 10)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return { time: fmtTime(h, m), consumed: 1 }
    }
  }

  return null
}

/** 매칭된 텍스트가 tokens에서 몇 개의 단어를 소비하는지 계산 */
function countConsumed(tokens: string[], matched: string): number {
  let count = 0
  let len = 0
  for (const tok of tokens) {
    if (len >= matched.replace(/\s+/g, '').length) break
    len += tok.replace(/\s+/g, '').length
    count++
  }
  return Math.max(1, count)
}

function fmtTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function parseNaturalDate(input: string): string | null {
  const result = parseNaturalDateTime(input)
  return result ? result.date : null
}

/**
 * 자연어 입력에서 날짜와 시간을 모두 파싱
 * "내일 14시50분" → { date: "2026-03-17", time: "14:50", consumed: 2 }
 * "오늘 오후3시" → { date: "2026-03-16", time: "15:00", consumed: 2 }
 * "내일" → { date: "2026-03-17", time: null, consumed: 1 }
 */
export function parseNaturalDateTime(input: string): ParsedDateTime | null {
  const tokens = input.trim().split(/\s+/)
  if (tokens.length === 0) return null

  const today = startOfDay(new Date())

  // 먼저 날짜 부분을 파싱 (1~N개 토큰 시도)
  let dateStr: string | null = null
  let dateConsumed = 0

  // 여러 토큰으로 된 날짜 표현 시도 (예: "다음주 월요일", "이번 주 금요일")
  for (let i = Math.min(tokens.length, 3); i >= 1; i--) {
    const candidate = tokens.slice(0, i).join(' ')
    const parsed = parseDateExpression(candidate, today)
    if (parsed) {
      dateStr = parsed
      dateConsumed = i
      break
    }
  }

  // 붙여쓰기 처리: "내일14시50분" → 첫 토큰에서 날짜+시간을 분리
  if (!dateStr && tokens.length > 0) {
    const first = tokens[0]
    const dateKeywords = ['오늘', '내일', '모레', '글피']
    for (const kw of dateKeywords) {
      if (first.startsWith(kw) && first.length > kw.length) {
        const parsed = parseDateExpression(kw, today)
        if (parsed) {
          dateStr = parsed
          dateConsumed = 0 // 토큰 자체는 소비하지 않고 아래서 시간 파싱
          // 첫 토큰에서 날짜 키워드를 제거하고 나머지를 시간으로 시도
          const rest = first.slice(kw.length)
          const timeParsed = parseNaturalTime([rest, ...tokens.slice(1)])
          if (timeParsed) {
            // 시간 부분이 첫 토큰 안에 있으므로 consumed 계산
            const _restLen = rest.replace(/\s+/g, '').length
            let timeTokens = 0
            let consumed = 0
            // rest가 첫 토큰의 나머지이므로 첫 토큰 = 1개 소비
            const restTokens = [rest, ...tokens.slice(1)]
            for (const _tok of restTokens) {
              if (consumed >= timeParsed.consumed) break
              consumed++
              timeTokens++
            }
            // 첫 토큰(날짜+시간)은 1개로 카운트, 추가 토큰은 시간이 소비한 만큼
            const totalConsumed = 1 + (timeTokens > 1 ? timeTokens - 1 : 0)
            return { date: dateStr, time: timeParsed.time, consumed: totalConsumed }
          }
          // 시간 파싱 안 되면 날짜만 (첫 토큰 전체를 소비)
          return { date: dateStr, time: null, consumed: 1 }
        }
      }
    }
  }

  if (!dateStr) return null

  // 날짜 뒤 남은 토큰에서 시간 파싱 시도
  const remaining = tokens.slice(dateConsumed)
  const timeParsed = parseNaturalTime(remaining)

  return {
    date: dateStr,
    time: timeParsed ? timeParsed.time : null,
    consumed: dateConsumed + (timeParsed ? timeParsed.consumed : 0)
  }
}

/** 날짜 표현만 파싱 (기존 parseNaturalDate 로직) */
function parseDateExpression(text: string, today: Date): string | null {
  if (/^오늘$/.test(text)) return fmt(today)
  if (/^내일$/.test(text)) return fmt(addDays(today, 1))
  if (/^모레$/.test(text)) return fmt(addDays(today, 2))
  if (/^글피$/.test(text)) return fmt(addDays(today, 3))

  // "N일 후", "N일후", "N일 뒤"
  const daysLater = text.match(/^(\d+)\s*일\s*(후|뒤)$/)
  if (daysLater) return fmt(addDays(today, parseInt(daysLater[1], 10)))

  // "N주 후"
  const weeksLater = text.match(/^(\d+)\s*주\s*(후|뒤)$/)
  if (weeksLater) return fmt(addWeeks(today, parseInt(weeksLater[1], 10)))

  // "N개월 후"
  const monthsLater = text.match(/^(\d+)\s*개?월\s*(후|뒤)$/)
  if (monthsLater) return fmt(addMonths(today, parseInt(monthsLater[1], 10)))

  // "다음주", "다음 주"
  if (/^다음\s*주$/.test(text)) return fmt(nextMonday(today))

  // "다음주 월요일", "다음 주 금요일"
  const nextWeekDay = text.match(/^다음\s*주\s*(.+)$/)
  if (nextWeekDay) {
    const dayNum = DAY_MAP[nextWeekDay[1]]
    if (dayNum !== undefined) return fmt(NEXT_DAY_FN[dayNum](addDays(today, 6)))
  }

  // "이번 금요일", "이번주 월요일"
  const thisWeekDay = text.match(/^이번\s*주?\s*(.+)$/)
  if (thisWeekDay) {
    const dayNum = DAY_MAP[thisWeekDay[1]]
    if (dayNum !== undefined) {
      const target = NEXT_DAY_FN[dayNum](addDays(today, -1))
      if (target >= today) return fmt(target)
    }
  }

  // "월요일", "금요일" 등 요일만
  if (DAY_MAP[text] !== undefined) {
    const dayNum = DAY_MAP[text]
    return fmt(NEXT_DAY_FN[dayNum](today))
  }

  // "1월 15일", "3월 5일"
  const monthDay = text.match(/^(\d{1,2})월\s*(\d{1,2})일$/)
  if (monthDay) {
    const m = parseInt(monthDay[1], 10) - 1
    const d = parseInt(monthDay[2], 10)
    const year = today.getFullYear()
    let date = new Date(year, m, d)
    if (date < today) date = new Date(year + 1, m, d)
    return fmt(date)
  }

  // "2026-03-15" 또는 "2026/03/15" 형식
  const isoDate = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (isoDate) {
    return fmt(new Date(parseInt(isoDate[1], 10), parseInt(isoDate[2], 10) - 1, parseInt(isoDate[3], 10)))
  }

  return null
}

function fmt(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function getDateSuggestions(input: string): { label: string; date: string }[] {
  if (!input.trim()) return []

  const suggestions: { label: string; date: string }[] = []
  const parsed = parseNaturalDate(input)
  if (parsed) {
    suggestions.push({ label: input, date: parsed })
  }

  const defaults = [
    { label: '오늘', text: '오늘' },
    { label: '내일', text: '내일' },
    { label: '다음 주', text: '다음주' }
  ]

  for (const d of defaults) {
    if (d.label.includes(input) || d.text.includes(input)) {
      const date = parseNaturalDate(d.text)
      if (date && !suggestions.find((s) => s.date === date)) {
        suggestions.push({ label: d.label, date })
      }
    }
  }

  return suggestions.slice(0, 5)
}
