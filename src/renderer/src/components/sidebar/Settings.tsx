import { Moon, Sun, X, Download, Keyboard, ArrowUpCircle } from 'lucide-react'
import { useStore } from '../../store/useStore'

const SHORTCUTS = [
  { keys: 'Cmd+N', desc: '할 일 추가' },
  { keys: 'Cmd+Shift+A', desc: '빠른 추가' },
  { keys: 'Cmd+F', desc: '검색' },
  { keys: 'Cmd+Z', desc: '되돌리기' },
  { keys: 'Cmd+E', desc: '데이터 내보내기' },
  { keys: 'Cmd+D', desc: '오늘 마감일 설정' },
  { keys: 'Delete', desc: '선택 태스크 삭제' },
  { keys: '1-4', desc: '우선순위 변경 (없음~높음)' },
  { keys: 'Esc', desc: '선택 해제 / 닫기' },
]

export function Settings() {
  const { theme, setTheme, showSettings, toggleSettings, setShowExport, exportData, updateAvailable } = useStore()

  if (!showSettings) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={toggleSettings}>
      <div className={`w-[480px] max-h-[80vh] overflow-y-auto rounded-xl shadow-2xl ${theme === 'dark' ? 'bg-[#2C2C2E] text-gray-100' : 'bg-white text-gray-800'}`}
        onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-base font-semibold">설정</h2>
          <button onClick={toggleSettings} className="text-gray-500 hover:text-gray-300 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-6">
          {/* 테마 */}
          <div>
            <h3 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>테마</h3>
            <div className="flex gap-3">
              <button onClick={() => setTheme('dark')}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === 'dark' ? 'border-primary-500 bg-primary-500/10' : 'border-gray-300 hover:border-gray-400'
                }`}>
                <div className="w-16 h-10 rounded-lg bg-[#1C1C1E] border border-gray-600 flex items-center justify-center">
                  <Moon size={16} className="text-gray-400" />
                </div>
                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-primary-400' : 'text-gray-500'}`}>다크 모드</span>
              </button>
              <button onClick={() => setTheme('light')}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === 'light' ? 'border-primary-500 bg-primary-500/10' : theme === 'dark' ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
                }`}>
                <div className="w-16 h-10 rounded-lg bg-white border border-gray-300 flex items-center justify-center">
                  <Sun size={16} className="text-yellow-500" />
                </div>
                <span className={`text-xs font-medium ${theme === 'light' ? 'text-primary-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>라이트 모드</span>
              </button>
            </div>
          </div>

          {/* 데이터 */}
          <div className={`border-t pt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>데이터</h3>
            <button onClick={() => { exportData(); toggleSettings() }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${
                theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}>
              <Download size={18} />
              <div className="text-left">
                <div className="text-sm font-medium">데이터 내보내기</div>
                <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>JSON 또는 CSV로 백업</div>
              </div>
            </button>
          </div>

          {/* 키보드 단축키 */}
          <div className={`border-t pt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`flex items-center gap-2 text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              <Keyboard size={16} /> 키보드 단축키
            </h3>
            <div className="space-y-1.5">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center justify-between">
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{s.desc}</span>
                  <kbd className={`text-xs px-2 py-0.5 rounded font-mono ${
                    theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                  }`}>{s.keys}</kbd>
                </div>
              ))}
            </div>
          </div>

          {/* 정보 */}
          <div className={`border-t pt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            {updateAvailable && (
              <button
                onClick={() => window.api.openExternal(updateAvailable.downloadUrl)}
                className={`flex items-center gap-3 w-full px-4 py-3 mb-3 rounded-lg transition-colors ${
                  theme === 'dark' ? 'bg-primary-500/20 hover:bg-primary-500/30 text-primary-300' : 'bg-primary-50 hover:bg-primary-100 text-primary-600'
                }`}>
                <ArrowUpCircle size={18} />
                <div className="text-left flex-1">
                  <div className="text-sm font-medium">새 버전 사용 가능</div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-primary-400' : 'text-primary-500'}`}>
                    haru {updateAvailable.version} 다운로드
                  </div>
                </div>
              </button>
            )}
            <div className="flex items-center justify-between">
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>haru v1.1.0</span>
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Electron + React</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
