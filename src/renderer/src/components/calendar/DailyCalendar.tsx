import React, { useState, useMemo, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { toDateString } from '../../utils/date'
import type { Task, Priority } from '../../types'
import { ChevronLeft, ChevronRight, Flag, CheckCircle2, Circle } from 'lucide-react'

// 요일 이름
const dayLabels = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

// 시간 슬롯 (6:00 ~ 23:00, 30분 단위)
interface TimeSlot {
  hour: number
  minute: number
  label: string
}

const timeSlots: TimeSlot[] = []
for (let h = 6; h <= 23; h++) {
  timeSlots.push({ hour: h, minute: 0, label: formatTime(h, 0) })
  timeSlots.push({ hour: h, minute: 30, label: '' })
}

function formatTime(h: number, m: number): string {
  const period = h < 12 ? '오전' : '오후'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${period} ${hour12}시` : `${period} ${hour12}:${m.toString().padStart(2, '0')}`
}

function dateToStr(d: Date): string {
  return toDateString(d)
}

function parseTime(timeStr: string): { hour: number; minute: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10) }
}

// 우선순위 색상 (배경용)
const priorityBg: Record<Priority, { dark: string; light: string }> = {
  high: { dark: 'bg-red-500/20 border-l-red-500', light: 'bg-red-50 border-l-red-400' },
  medium: { dark: 'bg-amber-500/20 border-l-amber-500', light: 'bg-amber-50 border-l-amber-400' },
  low: { dark: 'bg-blue-500/20 border-l-blue-500', light: 'bg-blue-50 border-l-blue-400' },
  none: { dark: 'bg-gray-700/50 border-l-gray-500', light: 'bg-gray-100 border-l-gray-400' }
}

export function DailyCalendar(): React.ReactElement {
  const { theme, tasks, selectTask, selectedTaskId, toggleTask } = useStore()
  const isDark = theme === 'dark'

  const [currentDate, setCurrentDate] = useState(() => new Date())

  const dateStr = useMemo(() => dateToStr(currentDate), [currentDate])
  const todayStr = useMemo(() => dateToStr(new Date()), [])
  const isToday = dateStr === todayStr

  // 해당 날짜의 태스크
  const { allDayTasks, timedTasks } = useMemo(() => {
    const dayTasks = tasks.filter(
      (t) => !t.deletedAt && t.dueDate === dateStr
    )

    const allDay: Task[] = []
    const timed: Task[] = []

    for (const task of dayTasks) {
      if (task.dueTime) {
        timed.push(task)
      } else {
        allDay.push(task)
      }
    }

    // 시간순 정렬
    timed.sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || ''))

    return { allDayTasks: allDay, timedTasks: timed }
  }, [tasks, dateStr])

  // 네비게이션
  const goToday = useCallback(() => setCurrentDate(new Date()), [])
  const goPrev = useCallback(
    () =>
      setCurrentDate((prev) => {
        const d = new Date(prev)
        d.setDate(d.getDate() - 1)
        return d
      }),
    []
  )
  const goNext = useCallback(
    () =>
      setCurrentDate((prev) => {
        const d = new Date(prev)
        d.setDate(d.getDate() + 1)
        return d
      }),
    []
  )

  // 특정 시간 슬롯에 속하는 태스크
  const getTasksAtSlot = (hour: number, minute: number): Task[] => {
    return timedTasks.filter((t) => {
      if (!t.dueTime) return false
      const parsed = parseTime(t.dueTime)
      if (!parsed) return false
      // 30분 단위로 매칭: 같은 시 + 분이 해당 범위
      if (parsed.hour !== hour) return false
      if (minute === 0) return parsed.minute < 30
      return parsed.minute >= 30
    })
  }

  // 헤더 날짜 표시
  const headerText = useMemo(() => {
    const y = currentDate.getFullYear()
    const m = currentDate.getMonth() + 1
    const d = currentDate.getDate()
    const dayLabel = dayLabels[currentDate.getDay()]
    return `${y}년 ${m}월 ${d}일 ${dayLabel}`
  }, [currentDate])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* 헤더 */}
      <div
        className={`px-6 py-3 border-b flex items-center justify-between ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <div>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {headerText}
          </h2>
          {isToday && (
            <span className="text-xs text-blue-500 font-medium">오늘</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className={`px-3 py-1 text-xs rounded-md border ${
              isDark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
          >
            오늘
          </button>
          <button
            onClick={goPrev}
            className={`p-1 rounded-md ${
              isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goNext}
            className={`p-1 rounded-md ${
              isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 캘린더 본문 */}
      <div className="flex-1 overflow-y-auto">
        {/* 종일 태스크 */}
        {allDayTasks.length > 0 && (
          <div
            className={`px-6 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <div
              className={`text-xs font-medium mb-2 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              종일
            </div>
            <div className="space-y-1.5">
              {allDayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => selectTask(task.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border-l-2 ${
                    isDark
                      ? priorityBg[task.priority].dark
                      : priorityBg[task.priority].light
                  } ${
                    selectedTaskId === task.id
                      ? isDark
                        ? 'ring-1 ring-blue-500'
                        : 'ring-1 ring-blue-400'
                      : ''
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTask(task.id)
                    }}
                    className="flex-shrink-0"
                  >
                    {task.completed ? (
                      <CheckCircle2 size={14} className="text-green-500" />
                    ) : (
                      <Circle
                        size={14}
                        className={isDark ? 'text-gray-500' : 'text-gray-400'}
                      />
                    )}
                  </button>
                  <span
                    className={`text-sm flex-1 truncate ${
                      task.completed
                        ? 'line-through text-gray-500'
                        : isDark
                          ? 'text-gray-200'
                          : 'text-gray-800'
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.priority !== 'none' && (
                    <Flag
                      size={12}
                      className={
                        task.priority === 'high'
                          ? 'text-red-500'
                          : task.priority === 'medium'
                            ? 'text-amber-500'
                            : 'text-blue-500'
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 시간 슬롯 */}
        <div className="px-2">
          {timeSlots.map((slot) => {
            const slotTasks = getTasksAtSlot(slot.hour, slot.minute)
            const isHourMark = slot.minute === 0
            return (
              <div
                key={`${slot.hour}-${slot.minute}`}
                className={`flex ${
                  isHourMark
                    ? `border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`
                    : `border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`
                }`}
                style={{ minHeight: '40px' }}
              >
                {/* 시간 라벨 */}
                <div className="w-20 flex-shrink-0 text-right pr-3 pt-0.5">
                  {isHourMark && (
                    <span
                      className={`text-[11px] ${
                        isDark ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      {slot.label}
                    </span>
                  )}
                </div>

                {/* 태스크 영역 */}
                <div className="flex-1 py-0.5 pr-4 space-y-1">
                  {slotTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => selectTask(task.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border-l-2 transition-colors ${
                        isDark
                          ? priorityBg[task.priority].dark
                          : priorityBg[task.priority].light
                      } ${
                        selectedTaskId === task.id
                          ? isDark
                            ? 'ring-1 ring-blue-500'
                            : 'ring-1 ring-blue-400'
                          : ''
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleTask(task.id)
                        }}
                        className="flex-shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 size={14} className="text-green-500" />
                        ) : (
                          <Circle
                            size={14}
                            className={isDark ? 'text-gray-500' : 'text-gray-400'}
                          />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm truncate ${
                            task.completed
                              ? 'line-through text-gray-500'
                              : isDark
                                ? 'text-gray-200'
                                : 'text-gray-800'
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.dueTime && (
                          <p
                            className={`text-[10px] ${
                              isDark ? 'text-gray-500' : 'text-gray-400'
                            }`}
                          >
                            {task.dueTime}
                          </p>
                        )}
                      </div>

                      {task.priority !== 'none' && (
                        <Flag
                          size={12}
                          className={`flex-shrink-0 ${
                            task.priority === 'high'
                              ? 'text-red-500'
                              : task.priority === 'medium'
                                ? 'text-amber-500'
                                : 'text-blue-500'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
