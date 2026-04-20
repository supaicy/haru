import { useState, useEffect } from 'react'
import { Repeat, X } from 'lucide-react'
import { useStore } from '../../store/useStore'

type RecurringType = 'daily' | 'weekly' | 'monthly' | 'yearly'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function parsePattern(pattern: string | null): {
  type: RecurringType
  weekDays: number[]
  monthDay: number
  yearMonth: number
  yearDay: number
} {
  if (!pattern) return { type: 'daily', weekDays: [], monthDay: 1, yearMonth: 1, yearDay: 1 }

  if (pattern === 'daily') return { type: 'daily', weekDays: [], monthDay: 1, yearMonth: 1, yearDay: 1 }

  if (pattern.startsWith('weekly:')) {
    const days = pattern.replace('weekly:', '').split(',').map(Number)
    return { type: 'weekly', weekDays: days, monthDay: 1, yearMonth: 1, yearDay: 1 }
  }

  if (pattern.startsWith('monthly:')) {
    const day = parseInt(pattern.replace('monthly:', ''), 10)
    return { type: 'monthly', weekDays: [], monthDay: day, yearMonth: 1, yearDay: 1 }
  }

  if (pattern.startsWith('yearly:')) {
    const [month, day] = pattern.replace('yearly:', '').split('-').map(Number)
    return { type: 'yearly', weekDays: [], monthDay: 1, yearMonth: month, yearDay: day }
  }

  return { type: 'daily', weekDays: [], monthDay: 1, yearMonth: 1, yearDay: 1 }
}

function buildPattern(
  type: RecurringType,
  weekDays: number[],
  monthDay: number,
  yearMonth: number,
  yearDay: number
): string {
  switch (type) {
    case 'daily':
      return 'daily'
    case 'weekly':
      return `weekly:${weekDays.sort((a, b) => a - b).join(',')}`
    case 'monthly':
      return `monthly:${monthDay}`
    case 'yearly':
      return `yearly:${yearMonth}-${yearDay}`
  }
}

export function RecurringPicker({
  value,
  onChange
}: {
  value: string | null
  onChange: (pattern: string | null) => void
}) {
  const { theme } = useStore()
  const isDark = theme === 'dark'
  const [open, setOpen] = useState(false)

  const parsed = parsePattern(value)
  const [type, setType] = useState<RecurringType>(parsed.type)
  const [weekDays, setWeekDays] = useState<number[]>(parsed.weekDays)
  const [monthDay, setMonthDay] = useState(parsed.monthDay)
  const [yearMonth, setYearMonth] = useState(parsed.yearMonth)
  const [yearDay, setYearDay] = useState(parsed.yearDay)

  // 값이 외부에서 바뀌면 동기화
  useEffect(() => {
    const p = parsePattern(value)
    setType(p.type)
    setWeekDays(p.weekDays)
    setMonthDay(p.monthDay)
    setYearMonth(p.yearMonth)
    setYearDay(p.yearDay)
  }, [value])

  const toggleWeekDay = (day: number) => {
    setWeekDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const handleApply = () => {
    const pattern = buildPattern(type, weekDays, monthDay, yearMonth, yearDay)
    onChange(pattern)
    setOpen(false)
  }

  const handleClear = () => {
    onChange(null)
    setOpen(false)
  }

  const typeLabels: Record<RecurringType, string> = {
    daily: '매일',
    weekly: '매주',
    monthly: '매월',
    yearly: '매년'
  }

  const displayLabel = value
    ? value === 'daily'
      ? '매일'
      : value.startsWith('weekly:')
        ? `매주 ${value
            .replace('weekly:', '')
            .split(',')
            .map((d) => WEEKDAYS[Number(d)])
            .join(', ')}`
        : value.startsWith('monthly:')
          ? `매월 ${value.replace('monthly:', '')}일`
          : value.startsWith('yearly:')
            ? (() => {
                const [m, d] = value.replace('yearly:', '').split('-')
                return `매년 ${m}월 ${d}일`
              })()
            : '반복'
    : null

  return (
    <div className="relative">
      {/* 트리거 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
          value
            ? 'text-primary-400 bg-primary-900/30'
            : isDark
              ? 'text-gray-500 hover:bg-gray-700'
              : 'text-gray-400 hover:bg-gray-200'
        }`}
      >
        <Repeat size={14} />
        {displayLabel || '반복'}
      </button>

      {/* 드롭다운 */}
      {open && (
        <div
          className={`absolute left-0 top-full mt-1 z-50 rounded-lg shadow-2xl border p-3 min-w-[260px] ${
            isDark ? 'bg-[#2C2C2E] border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          {/* 반복 유형 선택 */}
          <div className="flex gap-1 mb-3">
            {(Object.keys(typeLabels) as RecurringType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  type === t
                    ? 'bg-primary-500 text-white'
                    : isDark
                      ? 'text-gray-400 hover:bg-gray-700'
                      : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {typeLabels[t]}
              </button>
            ))}
          </div>

          {/* 요일 선택 (매주) */}
          {type === 'weekly' && (
            <div className="mb-3">
              <div className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>요일 선택</div>
              <div className="flex gap-1">
                {WEEKDAYS.map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleWeekDay(idx)}
                    className={`w-8 h-8 text-xs rounded-full transition-colors ${
                      weekDays.includes(idx)
                        ? 'bg-primary-500 text-white'
                        : isDark
                          ? 'text-gray-400 bg-gray-700 hover:bg-gray-600'
                          : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 날짜 선택 (매월) */}
          {type === 'monthly' && (
            <div className="mb-3">
              <div className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>매월 몇 일</div>
              <input
                type="number"
                min={1}
                max={31}
                value={monthDay}
                onChange={(e) => setMonthDay(Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)))}
                className={`w-20 text-sm px-2 py-1 rounded border outline-none ${
                  isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700'
                }`}
              />
              <span className={`ml-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>일</span>
            </div>
          )}

          {/* 월+일 선택 (매년) */}
          {type === 'yearly' && (
            <div className="mb-3">
              <div className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>매년 날짜</div>
              <div className="flex items-center gap-2">
                <select
                  value={yearMonth}
                  onChange={(e) => setYearMonth(parseInt(e.target.value, 10))}
                  className={`text-sm px-2 py-1 rounded border outline-none ${
                    isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  {MONTHS.map((label, idx) => (
                    <option key={idx} value={idx + 1}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={yearDay}
                  onChange={(e) => setYearDay(Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)))}
                  className={`w-16 text-sm px-2 py-1 rounded border outline-none ${
                    isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700'
                  }`}
                />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>일</span>
              </div>
            </div>
          )}

          {/* 하단 버튼 */}
          <div className={`flex justify-between pt-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={handleClear}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <X size={12} />
              해제
            </button>
            <button
              onClick={handleApply}
              className="text-xs px-3 py-1 rounded bg-primary-500 text-white hover:bg-primary-600 transition-colors"
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
