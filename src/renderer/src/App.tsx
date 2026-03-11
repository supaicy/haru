import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { Sidebar } from './components/sidebar/Sidebar'
import { Settings } from './components/sidebar/Settings'
import { TaskListView } from './components/tasks/TaskList'
import { TaskDetail } from './components/tasks/TaskDetail'
import { CalendarView } from './components/calendar/CalendarView'
import { WeeklyCalendar } from './components/calendar/WeeklyCalendar'
import { DailyCalendar } from './components/calendar/DailyCalendar'
import { PomodoroTimer } from './components/pomodoro/PomodoroTimer'
import { HabitTracker } from './components/habits/HabitTracker'
import { KanbanView } from './components/kanban/KanbanView'
import { TimelineView } from './components/timeline/TimelineView'
import { EisenhowerMatrix } from './components/eisenhower/EisenhowerMatrix'
import { StatsView } from './components/stats/StatsView'
import { QuickAdd } from './components/common/QuickAdd'
import { UndoToast } from './components/common/UndoToast'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function MainContent() {
  const { viewType } = useStore()
  switch (viewType) {
    case 'calendar': return <CalendarView />
    case 'calendarWeekly': return <WeeklyCalendar />
    case 'calendarDaily': return <DailyCalendar />
    case 'pomodoro': return <PomodoroTimer />
    case 'habits': return <HabitTracker />
    case 'kanban': return <KanbanView />
    case 'timeline': return <TimelineView />
    case 'eisenhower': return <EisenhowerMatrix />
    case 'stats': return <StatsView />
    default: return <TaskListView />
  }
}

export default function App() {
  const { loadData, selectedTaskId, viewType, theme, showQuickAdd, checkForUpdates } = useStore()

  useKeyboardShortcuts()

  useEffect(() => {
    loadData()
    checkForUpdates()
    // 글로벌 단축키 등록
    window.api.registerGlobalShortcut?.()
    // 글로벌 퀵 추가 이벤트 수신
    const cleanup = window.api.onGlobalQuickAdd?.(() => {
      useStore.getState().setShowQuickAdd(true)
    })
    return () => cleanup?.()
  }, [loadData])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.body.style.backgroundColor = theme === 'dark' ? '#1C1C1E' : '#FFFFFF'
    document.body.style.color = theme === 'dark' ? '#E5E5EA' : '#1C1C1E'
  }, [theme])

  const isDark = theme === 'dark'

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-[#1C1C1E] text-gray-100' : 'bg-white text-gray-800'}`}>
      <Sidebar />
      <div className="flex flex-1 min-w-0">
        <MainContent />
        {viewType === 'tasks' && selectedTaskId && <TaskDetail />}
      </div>
      <Settings />
      {showQuickAdd && <QuickAdd />}
      <UndoToast />
    </div>
  )
}
