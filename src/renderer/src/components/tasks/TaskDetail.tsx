import { useState, useEffect } from 'react'
import { X, Trash2, Flag, Calendar, AlignLeft, Tag, List, Eye, Edit3, Clock, Bell, Repeat, Paperclip } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStore } from '../../store/useStore'
import { SubtaskList } from './SubtaskList'
import { RecurringPicker } from './RecurringPicker'
import { ReminderPicker } from './ReminderPicker'
import { AttachmentList } from './AttachmentList'
import type { Priority } from '../../types'

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'none', label: '없음', color: 'text-gray-400' },
  { value: 'low', label: '낮음', color: 'text-blue-400' },
  { value: 'medium', label: '중간', color: 'text-yellow-400' },
  { value: 'high', label: '높음', color: 'text-red-400' }
]

export function TaskDetail() {
  const { tasks, lists, selectedTaskId, selectTask, updateTask, removeTask, theme } = useStore()
  const task = tasks.find((t) => t.id === selectedTaskId)
  const isDark = theme === 'dark'

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<Priority>('none')
  const [listId, setListId] = useState('inbox')
  const [tagInput, setTagInput] = useState('')
  const [mdPreview, setMdPreview] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)
  const [showReminder, setShowReminder] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title); setDescription(task.description)
      setDueDate(task.dueDate || ''); setDueTime(task.dueTime || '')
      setPriority(task.priority); setListId(task.listId)
    }
  }, [task])

  if (!task) return null

  const save = (updates: Record<string, unknown>) => updateTask({ id: task.id, ...updates })
  const addTag = () => {
    if (!tagInput.trim()) return
    save({ tags: [...new Set([...task.tags, tagInput.trim()])] }); setTagInput('')
  }
  const removeTag = (tag: string) => save({ tags: task.tags.filter((t) => t !== tag) })

  const inputCls = isDark ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-300'
  const labelCls = isDark ? 'text-gray-500' : 'text-gray-400'

  return (
    <div className={`w-80 border-l flex flex-col h-full ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>상세</span>
        <div className="flex items-center gap-2">
          <button onClick={() => removeTask(task.id)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
          <button onClick={() => selectTask(null)} className={`transition-colors ${labelCls}`}><X size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 제목 */}
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && save({ title: title.trim() })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className={`w-full bg-transparent text-base font-medium outline-none ${isDark ? 'text-gray-100' : 'text-gray-800'}`} />

        {/* 리스트 */}
        <div className="flex items-center gap-3">
          <List size={16} className={labelCls} />
          <select value={listId} onChange={(e) => { setListId(e.target.value); save({ listId: e.target.value }) }}
            className={`flex-1 text-sm rounded px-2 py-1.5 outline-none border ${inputCls}`}>
            {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        {/* 마감일 + 시간 */}
        <div className="flex items-center gap-2">
          <Calendar size={16} className={labelCls} />
          <input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); save({ dueDate: e.target.value || null }) }}
            className={`flex-1 text-sm rounded px-2 py-1.5 outline-none border ${inputCls}`} />
          <Clock size={16} className={labelCls} />
          <input type="time" value={dueTime} onChange={(e) => { setDueTime(e.target.value); save({ dueTime: e.target.value || null }) }}
            className={`w-24 text-sm rounded px-2 py-1.5 outline-none border ${inputCls}`} />
          {(dueDate || dueTime) && (
            <button onClick={() => { setDueDate(''); setDueTime(''); save({ dueDate: null, dueTime: null }) }} className={labelCls}><X size={14} /></button>
          )}
        </div>

        {/* 우선순위 */}
        <div className="flex items-center gap-3">
          <Flag size={16} className={labelCls} />
          <div className="flex gap-1">
            {PRIORITY_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => { setPriority(opt.value); save({ priority: opt.value }) }}
                className={`text-xs px-2.5 py-1 rounded transition-colors ${
                  priority === opt.value ? `${opt.color} ${isDark ? 'bg-gray-700' : 'bg-gray-200'}` : isDark ? 'text-gray-500 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100'
                }`}>{opt.label}</button>
            ))}
          </div>
        </div>

        {/* 알림 */}
        <div className="flex items-center gap-3">
          <Bell size={16} className={labelCls} />
          <div className="relative flex-1">
            <button onClick={() => setShowReminder(!showReminder)}
              className={`text-sm px-2 py-1 rounded border w-full text-left ${
                task.reminderAt ? 'text-primary-400 border-primary-500/30' : `${labelCls} ${isDark ? 'border-gray-700' : 'border-gray-300'}`
              }`}>
              {task.reminderAt ? new Date(task.reminderAt).toLocaleString('ko') : '알림 설정'}
            </button>
            {showReminder && (
              <ReminderPicker dueDate={task.dueDate} value={task.reminderAt}
                onChange={(v) => { save({ reminderAt: v }); setShowReminder(false) }} />
            )}
          </div>
        </div>

        {/* 반복 */}
        <div className="flex items-center gap-3">
          <Repeat size={16} className={labelCls} />
          <div className="relative flex-1">
            <button onClick={() => setShowRecurring(!showRecurring)}
              className={`text-sm px-2 py-1 rounded border w-full text-left ${
                task.isRecurring ? 'text-purple-400 border-purple-500/30' : `${labelCls} ${isDark ? 'border-gray-700' : 'border-gray-300'}`
              }`}>
              {task.isRecurring ? task.recurringPattern || '반복' : '반복 설정'}
            </button>
            {showRecurring && (
              <RecurringPicker value={task.recurringPattern}
                onChange={(v) => { save({ isRecurring: !!v, recurringPattern: v }); setShowRecurring(false) }} />
            )}
          </div>
        </div>

        {/* 태그 */}
        <div className="flex items-start gap-3">
          <Tag size={16} className={`${labelCls} mt-1`} />
          <div className="flex-1">
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.map((tag) => (
                <span key={tag} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                  {tag}<button onClick={() => removeTag(tag)} className="hover:text-red-400"><X size={10} /></button>
                </span>
              ))}
            </div>
            <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') addTag() }}
              placeholder="태그 추가..." className={`w-full text-xs rounded px-2 py-1.5 outline-none border ${inputCls} ${isDark ? 'placeholder-gray-600' : 'placeholder-gray-400'}`} />
          </div>
        </div>

        {/* 하위 작업 */}
        <SubtaskList taskId={task.id} />

        {/* 첨부파일 */}
        <AttachmentList taskId={task.id} attachments={task.attachments}
          onUpdate={(attachments) => save({ attachments })} />

        {/* 마크다운 메모 */}
        <div className="flex items-start gap-3">
          <AlignLeft size={16} className={`${labelCls} mt-1`} />
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-2">
              <button onClick={() => setMdPreview(false)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${!mdPreview ? 'text-primary-400 bg-primary-900/30' : isDark ? 'text-gray-500 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100'}`}>
                <Edit3 size={12} /> 편집
              </button>
              <button onClick={() => setMdPreview(true)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${mdPreview ? 'text-primary-400 bg-primary-900/30' : isDark ? 'text-gray-500 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100'}`}>
                <Eye size={12} /> 미리보기
              </button>
            </div>
            {mdPreview ? (
              <div className={`prose prose-sm max-w-none min-h-[120px] rounded px-3 py-2 border ${isDark ? 'prose-invert bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
                {description ? <Markdown remarkPlugins={[remarkGfm]}>{description}</Markdown> : <p className={isDark ? 'text-gray-600' : 'text-gray-400'}>메모가 없습니다</p>}
              </div>
            ) : (
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                onBlur={() => save({ description })}
                placeholder="마크다운으로 메모를 작성하세요..." rows={8}
                className={`w-full text-sm rounded px-2 py-1.5 outline-none border resize-none font-mono ${inputCls} ${isDark ? 'placeholder-gray-600' : 'placeholder-gray-400'}`} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
