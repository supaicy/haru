import { useState, useRef, useEffect } from 'react'
import { Calendar, Flag, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { parseNaturalDate } from '../../utils/naturalDate'
import { formatDueDate } from '../../utils/date'
import type { Priority } from '../../types'

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'none', label: '없음', color: 'text-gray-500' },
  { value: 'low', label: '낮음', color: 'text-blue-400' },
  { value: 'medium', label: '중간', color: 'text-yellow-400' },
  { value: 'high', label: '높음', color: 'text-red-400' }
]

export function AddTask({ onClose }: { onClose: () => void }) {
  const { addTask, selectedListId, theme } = useStore()
  const isDark = theme === 'dark'
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<Priority>('none')
  const [showPriority, setShowPriority] = useState(false)
  const [naturalDateHint, setNaturalDateHint] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // 자연어 날짜 감지
  useEffect(() => {
    if (!title.trim()) { setNaturalDateHint(null); return }
    const words = title.trim().split(/\s+/)
    const parsed = parseNaturalDate(words[0])
    if (parsed && words.length > 1) {
      setNaturalDateHint(parsed)
    } else {
      setNaturalDateHint(null)
    }
  }, [title])

  const handleSubmit = async () => {
    if (!title.trim()) return
    let finalTitle = title.trim()
    let finalDueDate = dueDate || null

    // 자연어 날짜가 감지되면 적용
    if (naturalDateHint && !dueDate) {
      const words = finalTitle.split(/\s+/)
      words.shift()
      finalTitle = words.join(' ')
      finalDueDate = naturalDateHint
    }

    if (!finalTitle) return

    const listId = ['today', 'next7days', 'all', 'completed', 'trash'].includes(selectedListId as string)
      ? undefined : (selectedListId as string)
    await addTask(finalTitle, { listId, dueDate: finalDueDate, priority })
    setTitle(''); setDueDate(''); setPriority('none'); setNaturalDateHint(null)
    inputRef.current?.focus()
  }

  return (
    <div className={`border rounded-lg mx-4 mb-3 ${isDark ? 'border-primary-500/50 bg-gray-800/50' : 'border-primary-300 bg-gray-50'}`}>
      <div className="flex items-center px-3 py-2">
        <input ref={inputRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose() }}
          placeholder='할 일을 입력하세요... (예: "내일 장보기")'
          className={`flex-1 bg-transparent text-sm outline-none ${isDark ? 'text-gray-100 placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'}`} />
        <button onClick={onClose} className={`ml-2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
          <X size={16} />
        </button>
      </div>

      {/* 자연어 날짜 힌트 */}
      {naturalDateHint && (
        <div className={`px-3 py-1 text-xs ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>
          📅 {formatDueDate(naturalDateHint)} ({naturalDateHint})로 설정됨
        </div>
      )}

      <div className={`flex items-center gap-2 px-3 py-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
        <div className="relative">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full" />
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
            dueDate ? 'text-primary-400 bg-primary-900/30' : isDark ? 'text-gray-500 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-200'
          }`}>
            <Calendar size={14} />{dueDate || '마감일'}
          </span>
        </div>

        <div className="relative">
          <button onClick={() => setShowPriority(!showPriority)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
              priority !== 'none' ? PRIORITY_OPTIONS.find((p) => p.value === priority)?.color + (isDark ? ' bg-gray-700' : ' bg-gray-200') : isDark ? 'text-gray-500 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-200'
            }`}>
            <Flag size={14} />{PRIORITY_OPTIONS.find((p) => p.value === priority)?.label}
          </button>
          {showPriority && (
            <div className={`absolute left-0 top-full mt-1 rounded-lg shadow-xl py-1 z-50 min-w-[100px] ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
              {PRIORITY_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => { setPriority(opt.value); setShowPriority(false) }}
                  className={`w-full text-left px-3 py-1.5 text-xs ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} ${opt.color}`}>{opt.label}</button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />
        <button onClick={handleSubmit} disabled={!title.trim()}
          className="text-xs px-3 py-1 rounded bg-primary-500 text-white disabled:opacity-30 hover:bg-primary-600 transition-colors">추가</button>
      </div>
    </div>
  )
}
