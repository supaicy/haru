import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Folders
  getFolders: () => ipcRenderer.invoke('get-folders'),
  createFolder: (id: string, name: string) => ipcRenderer.invoke('create-folder', id, name),
  updateFolder: (id: string, name: string, collapsed: boolean) => ipcRenderer.invoke('update-folder', id, name, collapsed),
  deleteFolder: (id: string) => ipcRenderer.invoke('delete-folder', id),

  // Lists
  getLists: () => ipcRenderer.invoke('get-lists'),
  createList: (id: string, name: string, color: string, icon: string, folderId?: string | null) =>
    ipcRenderer.invoke('create-list', id, name, color, icon, folderId || null),
  updateList: (id: string, updates: Record<string, unknown>) => ipcRenderer.invoke('update-list', id, updates),
  deleteList: (id: string) => ipcRenderer.invoke('delete-list', id),
  reorderLists: (ids: string[]) => ipcRenderer.invoke('reorder-lists', ids),

  // Tasks
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  getTrashTasks: () => ipcRenderer.invoke('get-trash-tasks'),
  createTask: (task: unknown) => ipcRenderer.invoke('create-task', task),
  updateTask: (task: unknown) => ipcRenderer.invoke('update-task', task),
  deleteTask: (id: string) => ipcRenderer.invoke('delete-task', id),
  restoreTask: (id: string) => ipcRenderer.invoke('restore-task', id),
  permanentDeleteTask: (id: string) => ipcRenderer.invoke('permanent-delete-task', id),
  emptyTrash: () => ipcRenderer.invoke('empty-trash'),
  reorderTasks: (ids: string[]) => ipcRenderer.invoke('reorder-tasks', ids),
  batchUpdateTasks: (ids: string[], updates: Record<string, unknown>) =>
    ipcRenderer.invoke('batch-update-tasks', ids, updates),

  // Habits
  getHabits: () => ipcRenderer.invoke('get-habits'),
  createHabit: (id: string, name: string, color: string, frequency: string, targetDays: number[]) =>
    ipcRenderer.invoke('create-habit', id, name, color, frequency, targetDays),
  deleteHabit: (id: string) => ipcRenderer.invoke('delete-habit', id),
  getHabitLogs: () => ipcRenderer.invoke('get-habit-logs'),
  toggleHabitLog: (id: string, habitId: string, date: string) =>
    ipcRenderer.invoke('toggle-habit-log', id, habitId, date),

  // Pomodoro
  getPomodoroSessions: () => ipcRenderer.invoke('get-pomodoro-sessions'),
  savePomodoroSession: (session: unknown) => ipcRenderer.invoke('save-pomodoro-session', session),

  // Score
  getScore: () => ipcRenderer.invoke('get-score'),
  addScoreEvent: (event: unknown) => ipcRenderer.invoke('add-score-event', event),

  // Attachments
  pickAttachment: () => ipcRenderer.invoke('pick-attachment'),
  getAttachmentsDir: () => ipcRenderer.invoke('get-attachments-dir'),

  // Export
  exportData: () => ipcRenderer.invoke('export-data'),

  // Notifications
  showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', title, body),

  // 업데이트 확인
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates') as Promise<{ version: string; downloadUrl: string } | null>,
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // Global shortcut
  registerGlobalShortcut: () => ipcRenderer.invoke('register-global-shortcut'),

  // IPC events
  onGlobalQuickAdd: (callback: () => void) => {
    ipcRenderer.on('global-quick-add', callback)
    return () => ipcRenderer.removeListener('global-quick-add', callback)
  }
}

contextBridge.exposeInMainWorld('api', api)
export type Api = typeof api
