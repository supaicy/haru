import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import type { Priority } from '../types'

const PRIORITY_MAP: Record<string, Priority> = {
  '1': 'none',
  '2': 'low',
  '3': 'medium',
  '4': 'high'
}

export function useKeyboardShortcuts() {
  const {
    setShowAddTask,
    setSearchQuery,
    popUndo,
    updateTask,
    removeTask,
    selectTask,
    setShowQuickAdd,
    setShowExport,
    exportData
  } = useStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      const key = e.key
      const { selectedTaskId, showAddTask, showQuickAdd, showExport } = useStore.getState()

      // Escape: 패널 닫기 / 선택 해제
      if (key === 'Escape') {
        if (showQuickAdd) {
          useStore.getState().setShowQuickAdd(false)
          return
        }
        if (showExport) {
          useStore.getState().setShowExport(false)
          return
        }
        if (showAddTask) {
          useStore.getState().setShowAddTask(false)
          return
        }
        if (selectedTaskId) {
          selectTask(null)
          return
        }
        return
      }

      // Cmd+Shift+A: 빠른 추가 토글
      if (isMod && e.shiftKey && (key === 'a' || key === 'A')) {
        e.preventDefault()
        useStore.getState().setShowQuickAdd(!useStore.getState().showQuickAdd)
        return
      }

      // Cmd+N: 태스크 추가 토글
      if (isMod && key === 'n') {
        e.preventDefault()
        useStore.getState().setShowAddTask(!useStore.getState().showAddTask)
        return
      }

      // Cmd+F: 검색 포커스
      if (isMod && key === 'f') {
        e.preventDefault()
        setSearchQuery('')
        setTimeout(() => {
          const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]')
          searchInput?.focus()
        }, 50)
        return
      }

      // Cmd+Z: 되돌리기
      if (isMod && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        popUndo()
        return
      }

      // Cmd+E: 내보내기
      if (isMod && key === 'e') {
        e.preventDefault()
        exportData()
        return
      }

      // Cmd+D: 선택된 태스크에 오늘 마감일 설정
      if (isMod && key === 'd') {
        e.preventDefault()
        const taskId = useStore.getState().selectedTaskId
        if (taskId) {
          const today = new Date().toISOString().split('T')[0]
          updateTask({ id: taskId, dueDate: today })
        }
        return
      }

      // 입력 필드에 포커스가 있으면 아래 단축키 무시
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      // Delete/Backspace: 선택된 태스크 삭제
      if (key === 'Delete' || key === 'Backspace') {
        const taskId = useStore.getState().selectedTaskId
        if (taskId) {
          e.preventDefault()
          removeTask(taskId)
        }
        return
      }

      // 1-4: 선택된 태스크 우선순위 설정
      if (!isMod && PRIORITY_MAP[key]) {
        const taskId = useStore.getState().selectedTaskId
        if (taskId) {
          e.preventDefault()
          updateTask({ id: taskId, priority: PRIORITY_MAP[key] })
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setShowAddTask, setSearchQuery, popUndo, updateTask, removeTask, selectTask, setShowQuickAdd, setShowExport, exportData])
}
