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
  updateAvailable: { version: string; downloadUrl: string } | null
  updateChecked: boolean
  updateDownloadProgress: number | null
  updateReady: boolean

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
  updateAvailable: null as { version: string; downloadUrl: string } | null,
  updateChecked: false,
  updateDownloadProgress: null as number | null,
  updateReady: false,

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

  // === 폴더 ===
  addFolder: async (name) => {
    const id = uuid()
    const now = new Date().toISOString()
    const maxOrder = get().folders.reduce((m, f) => Math.max(m, f.sortOrder || 0), 0)
    const newFolder: Folder = { id, name, collapsed: false, sortOrder: maxOrder + 1, createdAt: now }
    set((s) => ({ folders: [...s.folders, newFolder] }))
    window.api.createFolder(id, name)
  },
  updateFolder: async (id, name, collapsed) => {
    set((s) => ({
      folders: s.folders.map((f) => f.id === id ? { ...f, name, collapsed } : f)
    }))
    window.api.updateFolder(id, name, collapsed)
  },
  removeFolder: async (id) => {
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      lists: s.lists.map((l) => l.folderId === id ? { ...l, folderId: null } : l)
    }))
    window.api.deleteFolder(id)
  },

  // === 리스트 ===
  setSelectedList: (id) => set({ selectedListId: id, selectedTaskId: null, viewType: 'tasks', batchMode: false, batchSelectedIds: [] }),
  addList: async (name, color, folderId) => {
    const id = uuid()
    const now = new Date().toISOString()
    const maxOrder = get().lists.reduce((m, l) => Math.max(m, l.sortOrder || 0), 0)
    const newList: TaskList = { id, name, color, icon: 'list', folderId: folderId || null, sortOrder: maxOrder + 1, createdAt: now }
    set((s) => ({ lists: [...s.lists, newList] }))
    window.api.createList(id, name, color, 'list', folderId || null)
  },
  updateList: async (id, updates) => {
    set((s) => ({
      lists: s.lists.map((l) => l.id === id ? { ...l, ...updates } : l)
    }))
    const mapped: Record<string, unknown> = {}
    if (updates.name !== undefined) mapped.name = updates.name
    if (updates.color !== undefined) mapped.color = updates.color
    if (updates.folderId !== undefined) mapped.folder_id = updates.folderId
    if (updates.sortOrder !== undefined) mapped.sort_order = updates.sortOrder
    window.api.updateList(id, mapped)
  },
  removeList: async (id) => {
    set((s) => ({
      lists: s.lists.filter((l) => l.id !== id),
      tasks: s.tasks.map((t) => t.listId === id ? { ...t, listId: 'inbox' } : t),
      selectedListId: s.selectedListId === id ? 'inbox' : s.selectedListId
    }))
    window.api.deleteList(id)
  },
  setEditingList: (id) => set({ editingListId: id }),
  reorderLists: async (ids) => {
    set((s) => ({
      lists: s.lists.map((l) => {
        const idx = ids.indexOf(l.id)
        return idx >= 0 ? { ...l, sortOrder: idx } : l
      }).sort((a, b) => a.sortOrder - b.sortOrder)
    }))
    window.api.reorderLists(ids)
  },

  // === 태스크 ===
  addTask: async (title, opts = {}) => {
    const currentList = get().selectedListId
    const smartLists = ['today', 'next7days', 'all', 'completed', 'inbox', 'trash']
    const targetList = opts.listId || (typeof currentList === 'string' && !smartLists.includes(currentList) ? currentList : 'inbox')
    let finalDueDate = opts.dueDate || null
    if (!finalDueDate && currentList === 'today') finalDueDate = new Date().toISOString().split('T')[0]

    const id = uuid()
    const now = new Date().toISOString()
    const maxOrder = get().tasks.filter((t) => t.listId === targetList).reduce((m, t) => Math.max(m, t.sortOrder || 0), 0)

    const newTask: Task = {
      id, title, description: '', completed: false,
      priority: opts.priority || 'none',
      dueDate: finalDueDate, dueTime: opts.dueTime || null,
      reminderAt: opts.reminderAt || null,
      listId: targetList, parentId: opts.parentId || null,
      tags: [], attachments: [],
      createdAt: now, completedAt: null, deletedAt: null,
      sortOrder: maxOrder + 1,
      isRecurring: opts.isRecurring || false,
      recurringPattern: opts.recurringPattern || null
    }
    set((s) => ({ tasks: [...s.tasks, newTask] }))

    window.api.createTask({
      id, title, description: '', priority: opts.priority || 'none',
      dueDate: finalDueDate, dueTime: opts.dueTime || null,
      reminderAt: opts.reminderAt || null,
      listId: targetList, parentId: opts.parentId || null,
      tags: [], attachments: [],
      isRecurring: opts.isRecurring || false,
      recurringPattern: opts.recurringPattern || null
    })
  },
  updateTask: async (task) => {
    set((s) => ({
      tasks: s.tasks.map((t) => t.id === task.id ? { ...t, ...task } : t)
    }))
    window.api.updateTask(task)
  },
  toggleTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const newCompleted = !task.completed
    const completedAt = newCompleted ? new Date().toISOString() : null

    set((s) => ({
      tasks: s.tasks.map((t) => t.id === id ? { ...t, completed: newCompleted, completedAt } : t)
    }))
    window.api.updateTask({ id, completed: newCompleted })

    if (newCompleted) {
      const points = task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1
      get().addScore('taskComplete', points)
    }
  },
  removeTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (task) {
      get().pushUndo({ type: 'deleteTask', description: `"${task.title}" 삭제됨`, data: task, timestamp: Date.now() })
    }
    const now = new Date().toISOString()
    set((s) => {
      const subtasks = s.tasks.filter((t) => t.parentId === id)
      const deletedItems = [...(task ? [{ ...task, deletedAt: now }] : []), ...subtasks.map((t) => ({ ...t, deletedAt: now }))]
      return {
        tasks: s.tasks.filter((t) => t.id !== id && t.parentId !== id),
        trashTasks: [...s.trashTasks, ...deletedItems],
        selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId
      }
    })
    window.api.deleteTask(id)
  },
  restoreTask: async (id) => {
    const task = get().trashTasks.find((t) => t.id === id)
    if (task) {
      const restored = { ...task, deletedAt: null }
      set((s) => ({
        trashTasks: s.trashTasks.filter((t) => t.id !== id),
        tasks: [...s.tasks, restored]
      }))
    }
    window.api.restoreTask(id)
  },
  permanentDeleteTask: async (id) => {
    set((s) => ({
      trashTasks: s.trashTasks.filter((t) => t.id !== id),
      tasks: s.tasks.filter((t) => t.id !== id && t.parentId !== id)
    }))
    window.api.permanentDeleteTask(id)
  },
  emptyTrash: async () => {
    set({ trashTasks: [] })
    window.api.emptyTrash()
  },
  selectTask: (id) => set({ selectedTaskId: id }),
  setShowAddTask: (show) => set({ showAddTask: show }),
  reorderTasks: async (ids) => {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        const idx = ids.indexOf(t.id)
        return idx >= 0 ? { ...t, sortOrder: idx } : t
      })
    }))
    window.api.reorderTasks(ids)
  },
  setDragTaskId: (id) => set({ dragTaskId: id }),

  // === 일괄 ===
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
    const now = new Date().toISOString()
    set((s) => ({
      tasks: s.tasks.map((t) => ids.includes(t.id) ? { ...t, completed: true, completedAt: now } : t),
      batchSelectedIds: [], batchMode: false
    }))
    window.api.batchUpdateTasks(ids, { completed: true })
  },
  batchDelete: async () => {
    const ids = get().batchSelectedIds
    const now = new Date().toISOString()
    const allTasks = get().tasks
    const subtaskIds = allTasks.filter((t) => t.parentId && ids.includes(t.parentId)).map((t) => t.id)
    const allDeletedIds = [...new Set([...ids, ...subtaskIds])]
    const deletedTasks = allTasks.filter((t) => allDeletedIds.includes(t.id))
    set((s) => ({
      tasks: s.tasks.filter((t) => !allDeletedIds.includes(t.id)),
      trashTasks: [...s.trashTasks, ...deletedTasks.map((t) => ({ ...t, deletedAt: now }))],
      batchSelectedIds: [], batchMode: false
    }))
    window.api.batchUpdateTasks(allDeletedIds, { deleted: true })
  },
  batchMove: async (listId) => {
    const ids = get().batchSelectedIds
    set((s) => ({
      tasks: s.tasks.map((t) => ids.includes(t.id) ? { ...t, listId } : t),
      batchSelectedIds: [], batchMode: false
    }))
    window.api.batchUpdateTasks(ids, { listId })
  },
  batchSetPriority: async (priority) => {
    const ids = get().batchSelectedIds
    set((s) => ({
      tasks: s.tasks.map((t) => ids.includes(t.id) ? { ...t, priority } : t),
      batchSelectedIds: []
    }))
    window.api.batchUpdateTasks(ids, { priority })
  },

  // === 정렬 ===
  setSortBy: (sort) => set({ sortBy: sort }),
  setSortDir: (dir) => set({ sortDir: dir }),

  // === 뷰 ===
  setViewType: (type) => set({ viewType: type, selectedTaskId: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTheme: (theme) => { localStorage.setItem('ticktick-theme', theme); set({ theme }) },
  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
  setShowQuickAdd: (show) => set({ showQuickAdd: show }),
  setShowExport: (show) => set({ showExport: show }),

  // === 되돌리기 ===
  pushUndo: (action) => set((s) => ({ undoStack: [...s.undoStack.slice(-19), action] })),
  popUndo: async () => {
    const stack = get().undoStack
    if (stack.length === 0) return
    const action = stack[stack.length - 1]
    set({ undoStack: stack.slice(0, -1) })
    if (action.type === 'deleteTask') {
      const task = action.data as Task
      set((s) => ({
        trashTasks: s.trashTasks.filter((t) => t.id !== task.id),
        tasks: [...s.tasks, { ...task, deletedAt: null }]
      }))
      window.api.restoreTask(task.id)
    } else if (action.type === 'deleteTasks') {
      const ids = action.data as string[]
      set((s) => {
        const restored = s.trashTasks.filter((t) => ids.includes(t.id))
        return {
          trashTasks: s.trashTasks.filter((t) => !ids.includes(t.id)),
          tasks: [...s.tasks, ...restored.map((t) => ({ ...t, deletedAt: null }))]
        }
      })
      for (const id of ids) window.api.restoreTask(id)
    }
  },
  clearUndo: () => set({ undoStack: [] }),

  // === 습관 ===
  addHabit: async (name, color, frequency, targetDays) => {
    const id = uuid()
    const now = new Date().toISOString()
    const newHabit: Habit = { id, name, color, frequency, targetDays, createdAt: now }
    set((s) => ({ habits: [...s.habits, newHabit] }))
    window.api.createHabit(id, name, color, frequency, targetDays)
  },
  removeHabit: async (id) => {
    set((s) => ({
      habits: s.habits.filter((h) => h.id !== id),
      habitLogs: s.habitLogs.filter((l) => l.habitId !== id)
    }))
    window.api.deleteHabit(id)
  },
  toggleHabitLog: async (habitId, date) => {
    const existing = get().habitLogs.find((l) => l.habitId === habitId && l.date === date)
    const id = uuid()
    if (existing) {
      set((s) => ({ habitLogs: s.habitLogs.filter((l) => !(l.habitId === habitId && l.date === date)) }))
    } else {
      const newLog: HabitLog = { id, habitId, date, completed: true }
      set((s) => ({ habitLogs: [...s.habitLogs, newLog] }))
      get().addScore('habitComplete', 1)
    }
    window.api.toggleHabitLog(id, habitId, date)
  },

  // === 포모도로 ===
  savePomodoroSession: async (session) => {
    const id = uuid()
    const fullSession: PomodoroSession = { ...session, id }
    set((s) => ({ pomodoroSessions: [...s.pomodoroSessions, fullSession] }))
    window.api.savePomodoroSession({ ...session, id })

    if (session.type === 'work' && session.completedAt) {
      get().addScore('pomodoroComplete', 2)
    }
  },

  // === 점수 ===
  addScore: async (type, points) => {
    const date = new Date().toISOString().split('T')[0]
    set((s) => ({
      score: {
        total: s.score.total + points,
        events: [...s.score.events, { type, points, date }]
      }
    }))
    window.api.addScoreEvent({ type, points, date })
  },

  // === 첨부파일 ===
  pickAttachment: async () => {
    return (await window.api.pickAttachment()) as { name: string; path: string }[]
  },

  // === 내보내기 ===
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
