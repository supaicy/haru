import { Trophy, Star } from 'lucide-react'
import { useStore } from '../../store/useStore'

interface ScoreDisplayProps {
  compact?: boolean
}

const LEVEL_NAMES = ['초보자', '도전자', '실천가', '달인', '마스터', '그랜드마스터', '전설']

function getLevel(score: number): { level: number; name: string; progress: number } {
  const level = Math.floor(score / 100)
  const cappedLevel = Math.min(level, LEVEL_NAMES.length - 1)
  const progress = score % 100
  return {
    level: cappedLevel + 1,
    name: LEVEL_NAMES[cappedLevel],
    progress
  }
}

export function ScoreDisplay({ compact = false }: ScoreDisplayProps) {
  const { score, theme } = useStore()
  const isDark = theme === 'dark'
  const { level, name, progress } = getLevel(score.total)

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-[#2C2C2E]' : 'bg-gray-100'}`}>
        <Trophy size={14} className="text-yellow-500" />
        <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Lv.{level}</span>
        <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{score.total}</span>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl p-5 ${
        isDark ? 'bg-[#2C2C2E] border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'
      }`}
    >
      {/* 상단: 아이콘 + 점수 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-yellow-500/20' : 'bg-yellow-50'
            }`}
          >
            <Trophy size={20} className="text-yellow-500" />
          </div>
          <div>
            <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{name}</div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>레벨 {level}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Star size={16} className="text-yellow-500 fill-yellow-500" />
          <span className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{score.total}</span>
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>다음 레벨까지</span>
          <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{progress}/100</span>
        </div>
        <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 최근 점수 이벤트 (최대 3개) */}
      {score.events.length > 0 && (
        <div className={`mt-4 pt-3 border-t space-y-1.5 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          {score.events
            .slice(-3)
            .reverse()
            .map((event, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {event.type === 'taskComplete' && '태스크 완료'}
                  {event.type === 'habitComplete' && '습관 달성'}
                  {event.type === 'pomodoroComplete' && '포모도로 완료'}
                </span>
                <span className="text-xs font-medium text-yellow-500">+{event.points}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
