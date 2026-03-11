import { ipcMain, dialog, Notification, globalShortcut, BrowserWindow, shell, app } from 'electron'
import { basename } from 'path'
import { v4 as uuid } from 'uuid'
import * as db from './database'

function compareVersions(current: string, latest: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const [cMajor = 0, cMinor = 0, cPatch = 0] = parse(current)
  const [lMajor = 0, lMinor = 0, lPatch = 0] = parse(latest)
  if (lMajor !== cMajor) return lMajor > cMajor
  if (lMinor !== cMinor) return lMinor > cMinor
  return lPatch > cPatch
}

export function setupIpcHandlers(): void {
  // Folders
  ipcMain.handle('get-folders', () => db.getFolders())
  ipcMain.handle('create-folder', (_, id, name) => db.createFolder(id, name))
  ipcMain.handle('update-folder', (_, id, name, collapsed) => db.updateFolder(id, name, collapsed))
  ipcMain.handle('delete-folder', (_, id) => db.deleteFolder(id))

  // Lists
  ipcMain.handle('get-lists', () => db.getLists())
  ipcMain.handle('create-list', (_, id, name, color, icon, folderId) => db.createList(id, name, color, icon, folderId))
  ipcMain.handle('update-list', (_, id, updates) => db.updateList(id, updates))
  ipcMain.handle('delete-list', (_, id) => db.deleteList(id))
  ipcMain.handle('reorder-lists', (_, ids) => db.reorderLists(ids))

  // Tasks
  ipcMain.handle('get-tasks', () => db.getTasks())
  ipcMain.handle('get-trash-tasks', () => db.getTrashTasks())
  ipcMain.handle('create-task', (_, task) => db.createTask(task))
  ipcMain.handle('update-task', (_, task) => db.updateTask(task))
  ipcMain.handle('delete-task', (_, id) => db.deleteTask(id))
  ipcMain.handle('restore-task', (_, id) => db.restoreTask(id))
  ipcMain.handle('permanent-delete-task', (_, id) => db.permanentDeleteTask(id))
  ipcMain.handle('empty-trash', () => db.emptyTrash())
  ipcMain.handle('reorder-tasks', (_, ids) => db.reorderTasks(ids))
  ipcMain.handle('batch-update-tasks', (_, ids, updates) => db.batchUpdateTasks(ids, updates))

  // Habits
  ipcMain.handle('get-habits', () => db.getHabits())
  ipcMain.handle('create-habit', (_, id, name, color, frequency, targetDays) => db.createHabit(id, name, color, frequency, targetDays))
  ipcMain.handle('delete-habit', (_, id) => db.deleteHabit(id))
  ipcMain.handle('get-habit-logs', () => db.getHabitLogs())
  ipcMain.handle('toggle-habit-log', (_, id, habitId, date) => db.toggleHabitLog(id, habitId, date))

  // Pomodoro
  ipcMain.handle('get-pomodoro-sessions', () => db.getPomodoroSessions())
  ipcMain.handle('save-pomodoro-session', (_, session) => db.savePomodoroSession(session))

  // Score
  ipcMain.handle('get-score', () => db.getScore())
  ipcMain.handle('add-score-event', (_, event) => db.addScoreEvent(event))

  // Attachments
  ipcMain.handle('pick-attachment', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '모든 파일', extensions: ['*'] },
        { name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
        { name: '문서', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] }
      ]
    })
    if (result.canceled) return []
    const attachments: { name: string; path: string }[] = []
    for (const filePath of result.filePaths) {
      const name = `${uuid()}-${basename(filePath)}`
      const destPath = db.copyAttachment(filePath, name)
      attachments.push({ name: basename(filePath), path: destPath })
    }
    return attachments
  })
  ipcMain.handle('get-attachments-dir', () => db.getAttachmentsDir())

  // Export
  ipcMain.handle('export-data', async () => {
    const result = await dialog.showSaveDialog({
      defaultPath: `ticktick-backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }, { name: 'CSV', extensions: ['csv'] }]
    })
    if (result.canceled || !result.filePath) return false
    const ext = result.filePath.endsWith('.csv') ? 'csv' : 'json'
    const exportedData = db.exportData()
    if (ext === 'csv') {
      const parsed = JSON.parse(exportedData)
      const tasks = parsed.tasks || []
      const header = 'Title,Description,Priority,DueDate,List,Completed,CreatedAt\n'
      const rows = tasks.map((t: Record<string, unknown>) =>
        `"${t.title}","${t.description}","${t.priority}","${t.due_date || ''}","${t.list_id}","${t.completed ? 'Yes' : 'No'}","${t.created_at}"`
      ).join('\n')
      const { writeFileSync } = require('fs')
      writeFileSync(result.filePath, header + rows, 'utf-8')
    } else {
      const { writeFileSync } = require('fs')
      writeFileSync(result.filePath, exportedData, 'utf-8')
    }
    return true
  })

  // Notifications
  ipcMain.handle('show-notification', (_, title, body) => {
    new Notification({ title, body }).show()
  })

  // 업데이트 확인
  ipcMain.handle('check-for-updates', async () => {
    try {
      const res = await fetch('https://api.github.com/repos/supaicy/haru/releases/latest', {
        headers: { 'User-Agent': 'haru-app' }
      })
      if (!res.ok) return null
      const data = await res.json()
      const latestVersion = data.tag_name as string
      const currentVersion = app.getVersion()
      if (compareVersions(currentVersion, latestVersion)) {
        return { version: latestVersion, downloadUrl: data.html_url as string }
      }
      return null
    } catch {
      return null
    }
  })

  // 외부 링크 열기
  ipcMain.handle('open-external', (_, url: string) => {
    shell.openExternal(url)
  })

  // Quick add (global shortcut)
  ipcMain.handle('register-global-shortcut', () => {
    try {
      globalShortcut.register('CommandOrControl+Shift+A', () => {
        const wins = BrowserWindow.getAllWindows()
        if (wins.length > 0) {
          const win = wins[0]
          if (win.isMinimized()) win.restore()
          win.focus()
          win.webContents.send('global-quick-add')
        }
      })
      return true
    } catch {
      return false
    }
  })
}
