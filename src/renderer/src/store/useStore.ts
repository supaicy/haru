import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { Task, TaskList, Folder, Habit, HabitLog, PomodoroSession, SmartList, ViewType, Priority, SortBy, SortDir, UndoAction } from '../types'

export type Theme = 'dark' | 'light'

interface Store {
  // 데이터
  tasks: Task[]
  trashTasks: Task[]
  lists: TaskList[]
  folders: Folder[]
  habits: Habit[]
  habitLogs: HabitLog[]
  pomodoroSessions: PomodoroSession[]
  score: { total: number; events: { type: string; points: number; date: string }[] }

  // UI
  selectedListId: string | SmartList
  selectedTaskId: string | null
  viewType: ViewType
  searchQuery: string
  showAddTask: boolean
  editingListId: string | null
  theme: Theme
  showSettings: boolean
  sortBy: SortBy
  sortDir: SortDir
  batchSelectedIds: string[]
  batchMode: boolean
  undoStack: UndoAction[]
  showQuickAdd: boolean
  showExport: boolean
  dragTaskId: string | null

  // 초기화
  loadData: () => Promise<void>

  // 폴더
  addFolder: (name: string) => Promise<void>
  updateFolder: (id: string, name: string, collapsed: boolean) => Promise<void>
  removeFolder: (id: string) => Promise<void>

  // 리스트
  setSelectedList: (id: string | SmartList) => void
  addList: (name: string, color: string, folderId?: string | null) => Promise<void>
  updateList: (id: string, updates: Partial<TaskList>) => Promise<void>
  removeList: (id: string) => Promise<void>
  setEditingList: (id: string | null) => void
  reorderLists: (ids: string[]) => Promise<void>

  // 태스크
  addTask: (title: string, opts?: { listId?: string; dueDate?: string | null; priority?: Priority; parentId?: string | null; dueTime?: string | null; reminderAt?: string | null; isRecurring?: boolean; recurringPattern?: string | null }) => Promise<void>
  updateTask: (task: Partial<Task> & { id: string }) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  removeTask: (id: string) => Promise<void>
  restoreTask: (id: string) => Promise<void>
  permanentDeleteTask: (id: string) => Promise<void>
  emptyTrash: () => Promise<void>
  selectTask: (id: string | null) => void
  setShowAddTask: (show: boolean) => void
  reorderTasks: (ids: string[]) => Promise<void>
  setDragTaskId: (id: string | null) => void

  // 일괄
  toggleBatchMode: () => void
  toggleBatchSelect: (id: string) => void
  selectAllBatch: () => void
  clearBatchSelection: () => void
  batchComplete: () => Promise<void>
  batchDelete: () => Promise<void>
  batchMove: (listId: string) => Promise<void>
  batchSetPriority: (priority: Priority) => Promise<void>

  // 정렬
  setSortBy: (sort: SortBy) => void
  setSortDir: (dir: SortDir) => void

  // 뷰
  setViewType: (type: ViewType) => void
  setSearchQuery: (query: string) => void
  setTheme: (theme: Theme) => void
  toggleSettings: () => void
  setShowQuickAdd: (show: boolean) => void
  setShowExport: (show: boolean) => void

  // 되돌리기
  pushUndo: (action: UndoAction) => void
  popUndo: () => Promise<void>
  clearUndo: () => void

  // 습관
  addHabit: (name: string, color: string, frequency: 'daily' | 'weekly', targetDays: number[]) => Promise<void>
  removeHabit: (id: string) => Promise<void>
  toggleHabitLog: (habitId: string, date: string) => Promise<void>

  // 포모도로
  savePomodoroSession: (session: Omit<PomodoroSession, 'id'>) => Promise<void>

  // 점수
  addScore: (type: string, points: number) => Promise<void>

  // 첨부파일
  pickAttachment: () => Promise<{ name: string; path: string }[]>

  // 내보내기
  exportData: () => Promise<boolean>
}

function mapTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    completed: Boolean(row.completed),
    priority: (row.priority as Priority) || 'none',
    dueDate: (row.due_date as string) || null,
    dueTime: (row.due_time as string) || null,
    reminderAt: (row.reminder_at as string) || null,
    listId: (row.list_id as string) || 'inbox',
    parentId: (row.parent_id as string) || null,
    tags: safeParseArray(row.tags as string),
    attachments: safeParseArray(row.attachments as string),
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string) || null,
    deletedAt: (row.deleted_at as string) || null,
    sortOrder: (row.sort_order as number) || 0,
    isRecurring: Boolean(row.is_recurring),
    recurringPattern: (row.recurring_pattern as string) || null
  }
}
function mapList(row: Record<string, unknown>): TaskList {
  return { id: row.id as string, name: row.name as string, color: row.color as string, icon: row.icon as string, folderId: (row.folder_id as string) || null, sortOrder: (row.sort_order as number) || 0, createdAt: row.created_at as string }
}
function mapFolder(row: Record<string, unknown>): Folder {
  return { id: row.id as string, name: row.name as string, collapsed: Boolean(row.collapsed), sortOrder: (row.sort_order as number) || 0, createdAt: row.created_at as string }
}
function mapHabit(row: Record<string, unknown>): Habit {
  return { id: row.id as string, name: row.name as string, color: row.color as string, frequency: row.frequency as 'daily' | 'weekly', targetDays: safeParseArray(row.target_days as string), createdAt: row.created_at as string }
}
function mapHabitLog(row: Record<string, unknown>): HabitLog {
  return { id: row.id as string, habitId: row.habit_id as string, date: row.date as string, completed: Boolean(row.completed) }
}
function mapPomodoroSession(row: Record<string, unknown>): PomodoroSession {
  return { id: row.id as string, taskId: (row.taskId as string) || null, duration: row.duration as number, type: row.type as 'work' | 'break', startedAt: row.startedAt as string, completedAt: (row.completedAt as string) || null }
}
function safeParseArray(s: string | undefined | null): string[] {
  try { return JSON.parse(s || '[]') } catch { return [] }
}

export const useStore = create<Store>((set, get) => ({
  tasks: [], trashTasks: [], lists: [], folders: [], habits: [], habitLogs: [],
  pomodoroSessions: [], score: { total: 0, events: [] },
  selectedListId: 'today', selectedTaskId: null, viewType: 'tasks',
  searchQuery: '', showAddTask: false, editingListId: null,
  theme: (localStorage.getItem('ticktick-theme') as Theme) || 'dark',
  showSettings: false, sortBy: 'default', sortDir: 'asc',
  batchSelectedIds: [], batchMode: false,
  undoStack: [], showQuickAdd: false, showExport: false, dragTaskId: null,

  loadData: async () => {
    const [rawLists, rawTasks, rawTrash, rawHabits, rawHabitLogs, rawFolders, rawSessions, rawScore] = await Promise.all([
      window.api.getLists(), window.api.getTasks(), window.api.getTrashTasks(),
      window.api.getHabits(), window.api.getHabitLogs(), window.api.getFolders(),
      window.api.getPomodoroSessions(), window.api.getScore()
    ])
    set({
      lists: (rawLists as Record<string, unknown>[]).map(mapList),
      tasks: (rawTasks as Record<string, unknown>[]).map(mapTask),
      trashTasks: (rawTrash as Record<string, unknown>[]).map(mapTask),
      habits: (rawHabits as Record<string, unknown>[]).map(mapHabit),
      habitLogs: (rawHabitLogs as Record<string, unknown>[]).map(mapHabitLog),
      folders: (rawFolders as Record<string, unknown>[]).map(mapFolder),
      pomodoroSessions: (rawSessions as Record<string, unknown>[]).map(mapPomodoroSession),
      score: rawScore as { total: number; events: { type: string; points: number; date: string }[] }
    })
  },

  // 폴더
  addFolder: async (name) => { await window.api.createFolder(uuid(), name); await get().loadData() },
  updateFolder: async (id, name, collapsed) => { await window.api.updateFolder(id, name, collapsed); await get().loadData() },
  removeFolder: async (id) => { await window.api.deleteFolder(id); await get().loadData() },

  // 리스트
  setSelectedList: (id) => set({ selectedListId: id, selectedTaskId: null, viewType: 'tasks', batchMode: false, batchSelectedIds: [] }),
  addList: async (name, color, folderId) => { await window.api.createList(uuid(), name, color, 'list', folderId || null); await get().loadData() },
  updateList: async (id, updates) => {
    const mapped: Record<string, unknown> = {}
    if (updates.name !== undefined) mapped.name = updates.name
    if (updates.color !== undefined) mapped.color = updates.color
    if (updates.folderId !== undefined) mapped.folder_id = updates.folderId
    if (updates.sortOrder !== undefined) mapped.sort_order = updates.sortOrder
    await window.api.updateList(id, mapped)
    await get().loadData()
  },
  removeList: async (id) => { await window.api.deleteList(id); if (get().selectedListId === id) set({ selectedListId: 'inbox' }); await get().loadData() },
  setEditingList: (id) => set({ editingListId: id }),
  reorderLists: async (ids) => { await window.api.reorderLists(ids); await get().loadData() },

  // 태스크
  addTask: async (title, opts = {}) => {
    const currentList = get().selectedListId
    const smartLists = ['today', 'next7days', 'all', 'completed', 'inbox', 'trash']
    const targetList = opts.listId || (typeof currentList === 'string' && !smartLists.includes(currentList) ? currentList : 'inbox')
    let finalDueDate = opts.dueDate || null
    if (!finalDueDate && currentList === 'today') finalDueDate = new Date().toISOString().split('T')[0]

    await window.api.createTask({
      id: uuid(), title, description: '', priority: opts.priority || 'none',
      dueDate: finalDueDate, dueTime: opts.dueTime || null, reminderAt: opts.reminderAt || null,
      listId: targetList, parentId: opts.parentId || null, tags: [], attachments: [],
      isRecurring: opts.isRecurring || false, recurringPattern: opts.recurringPattern || null
    })
    await get().loadData()
  },
  updateTask: async (task) => { await window.api.updateTask(task); await get().loadData() },
  toggleTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const newCompleted = !task.completed
    await window.api.updateTask({ id, completed: newCompleted })
    if (newCompleted) {
      await get().addScore('taskComplete', task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1)
    }
    await get().loadData()
  },
  removeTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (task) {
      get().pushUndo({ type: 'deleteTask', description: `"${task.title}" 삭제됨`, data: task, timestamp: Date.now() })
    }
    await window.api.deleteTask(id)
    if (get().selectedTaskId === id) set({ selectedTaskId: null })
    await get().loadData()
  },
  restoreTask: async (id) => { await window.api.restoreTask(id); await get().loadData() },
  permanentDeleteTask: async (id) => { await window.api.permanentDeleteTask(id); await get().loadData() },
  emptyTrash: async () => { await window.api.emptyTrash(); await get().loadData() },
  selectTask: (id) => set({ selectedTaskId: id }),
  setShowAddTask: (show) => set({ showAddTask: show }),
  reorderTasks: async (ids) => { await window.api.reorderTasks(ids); await get().loadData() },
  setDragTaskId: (id) => set({ dragTaskId: id }),

  // 일괄
  toggleBatchMode: () => set((s) => ({ batchMode: !s.batchMode, batchSelectedIds: [] })),
  toggleBatchSelect: (id) => set((s) => ({
    batchSelectedIds: s.batchSelectedIds.includes(id)
      ? s.batchSelectedIds.filter((i) => i !== id)
      : [...s.batchSelectedIds, id]
  })),
  selectAllBatch: () => {
    const { tasks, selectedListId } = get()
    const filtered = getFilteredTaskIds(tasks, selectedListId)
    set({ batchSelectedIds: filtered })
  },
  clearBatchSelection: () => set({ batchSelectedIds: [] }),
  batchComplete: async () => {
    const ids = get().batchSelectedIds
    await window.api.batchUpdateTasks(ids, { completed: true })
    set({ batchSelectedIds: [], batchMode: false })
    await get().loadData()
  },
  batchDelete: async () => {
    const ids = get().batchSelectedIds
    await window.api.batchUpdateTasks(ids, { deleted: true })
    set({ batchSelectedIds: [], batchMode: false })
    await get().loadData()
  },
  batchMove: async (listId) => {
    const ids = get().batchSelectedIds
    await window.api.batchUpdateTasks(ids, { listId })
    set({ batchSelectedIds: [], batchMode: false })
    await get().loadData()
  },
  batchSetPriority: async (priority) => {
    const ids = get().batchSelectedIds
    await window.api.batchUpdateTasks(ids, { priority })
    set({ batchSelectedIds: [] })
    await get().loadData()
  },

  // 정렬
  setSortBy: (sort) => set({ sortBy: sort }),
  setSortDir: (dir) => set({ sortDir: dir }),

  // 뷰
  setViewType: (type) => set({ viewType: type, selectedTaskId: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTheme: (theme) => { localStorage.setItem('ticktick-theme', theme); set({ theme }) },
  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
  setShowQuickAdd: (show) => set({ showQuickAdd: show }),
  setShowExport: (show) => set({ showExport: show }),

  // 되돌리기
  pushUndo: (action) => set((s) => ({ undoStack: [...s.undoStack.slice(-19), action] })),
  popUndo: async () => {
    const stack = get().undoStack
    if (stack.length === 0) return
    const action = stack[stack.length - 1]
    set({ undoStack: stack.slice(0, -1) })
    if (action.type === 'deleteTask') {
      const task = action.data as Task
      await window.api.restoreTask(task.id)
    } else if (action.type === 'deleteTasks') {
      const ids = action.data as string[]
      for (const id of ids) await window.api.restoreTask(id)
    }
    await get().loadData()
  },
  clearUndo: () => set({ undoStack: [] }),

  // 습관
  addHabit: async (name, color, frequency, targetDays) => { await window.api.createHabit(uuid(), name, color, frequency, targetDays); await get().loadData() },
  removeHabit: async (id) => { await window.api.deleteHabit(id); await get().loadData() },
  toggleHabitLog: async (habitId, date) => {
    await window.api.toggleHabitLog(uuid(), habitId, date)
    const wasLogged = get().habitLogs.some((l) => l.habitId === habitId && l.date === date)
    if (!wasLogged) await get().addScore('habitComplete', 1)
    await get().loadData()
  },

  // 포모도로
  savePomodoroSession: async (session) => {
    await window.api.savePomodoroSession({ ...session, id: uuid() })
    if (session.type === 'work' && session.completedAt) {
      await get().addScore('pomodoroComplete', 2)
    }
    await get().loadData()
  },

  // 점수
  addScore: async (type, points) => {
    await window.api.addScoreEvent({ type, points, date: new Date().toISOString().split('T')[0] })
    await get().loadData()
  },

  // 첨부파일
  pickAttachment: async () => {
    return (await window.api.pickAttachment()) as { name: string; path: string }[]
  },

  // 내보내기
  exportData: async () => {
    return (await window.api.exportData()) as boolean
  }
}))

function getFilteredTaskIds(tasks: Task[], listId: string | SmartList): string[] {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const next7 = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0]
  switch (listId) {
    case 'today': return tasks.filter((t) => !t.completed && t.dueDate && t.dueDate <= todayStr).map((t) => t.id)
    case 'next7days': return tasks.filter((t) => !t.completed && t.dueDate && t.dueDate <= next7).map((t) => t.id)
    case 'all': return tasks.filter((t) => !t.completed).map((t) => t.id)
    case 'completed': return tasks.filter((t) => t.completed).map((t) => t.id)
    default: return tasks.filter((t) => t.listId === listId && !t.completed).map((t) => t.id)
  }
}
