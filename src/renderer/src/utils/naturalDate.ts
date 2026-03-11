import { addDays, addWeeks, addMonths, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday, startOfDay, format } from 'date-fns'

const DAY_MAP: Record<string, number> = {
  '일요일': 0, '일': 0,
  '월요일': 1, '월': 1,
  '화요일': 2, '화': 2,
  '수요일': 3, '수': 3,
  '목요일': 4, '목': 4,
  '금요일': 5, '금': 5,
  '토요일': 6, '토': 6,
}

const NEXT_DAY_FN = [nextSunday, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday]

export function parseNaturalDate(input: string): string | null {
  const text = input.trim()
  const today = startOfDay(new Date())

  if (/^오늘$/.test(text)) return fmt(today)
  if (/^내일$/.test(text)) return fmt(addDays(today, 1))
  if (/^모레$/.test(text)) return fmt(addDays(today, 2))
  if (/^글피$/.test(text)) return fmt(addDays(today, 3))

  // "N일 후", "N일후", "N일 뒤"
  const daysLater = text.match(/^(\d+)\s*일\s*(후|뒤)$/)
  if (daysLater) return fmt(addDays(today, parseInt(daysLater[1])))

  // "N주 후"
  const weeksLater = text.match(/^(\d+)\s*주\s*(후|뒤)$/)
  if (weeksLater) return fmt(addWeeks(today, parseInt(weeksLater[1])))

  // "N개월 후"
  const monthsLater = text.match(/^(\d+)\s*개?월\s*(후|뒤)$/)
  if (monthsLater) return fmt(addMonths(today, parseInt(monthsLater[1])))

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
    const m = parseInt(monthDay[1]) - 1
    const d = parseInt(monthDay[2])
    let year = today.getFullYear()
    let date = new Date(year, m, d)
    if (date < today) date = new Date(year + 1, m, d)
    return fmt(date)
  }

  // "2026-03-15" 또는 "2026/03/15" 형식
  const isoDate = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (isoDate) {
    return fmt(new Date(parseInt(isoDate[1]), parseInt(isoDate[2]) - 1, parseInt(isoDate[3])))
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
    { label: '다음 주', text: '다음주' },
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
