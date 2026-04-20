# AI 채팅 히스토리 영속화 — 설계

- **상태:** 승인 (설계 단계)
- **작성일:** 2026-04-20
- **관련 TODO:** `TODOS.md` → Post-MVP → [P2] Chat History Persistence (v2.0.1)

## 문제

AI 어시스턴트 채팅 패널(`AiChatPanel.tsx`)은 `aiMessages`를 Zustand 메모리에만
유지합니다. 앱을 재시작하면 이전 대화가 모두 사라져서, 패널을 다시 열었을 때
사용자가 방금 전까지 나눈 대화를 보지 못합니다. P2 TODO는 재시작 후에도
히스토리가 유지되도록 영속화를 요청합니다.

## 목표

- 앱 실행 시 이전 채팅 메시지를 복원해, 마지막으로 본 상태 그대로 패널이
  열리게 한다.
- 메시지 수를 사용자가 직접 설정할 수 있게 해서, 장기 사용 시에도 히스토리가
  무한정 커지지 않게 한다.
- 기존 `ai-config.json` 패턴을 그대로 따른다. main 프로세스의 동기 파일 I/O,
  단순 IPC, 마이그레이션 없음.

## 비목표 (이번 버전에서 안 함)

- **대화 여러 개 / 세션 분리.** MVP에서는 단일 연속 스레드 하나로 충분.
  (ChatGPT식 사이드바는 범위 밖.)
- **LLM 컨텍스트 연속성.** `aiSendMessage`는 여전히 현재 프롬프트 + 태스크
  스냅샷만 모델에 보낸다. 저장된 히스토리는 UI 복원용이며, LLM은 이전 턴을
  보지 못한다. 향후 별도 티켓에서 chat-completion 포맷으로 컨텍스트 주입 추가.
- **스트리밍 중 크래시 복구.** 스트리밍 도중 앱이 죽으면 해당 턴은 유실.
  보통 응답 시간 2~10초, 허용 범위.

## 설계

### 데이터 모델

파일 위치: `<userData>/ai-chat.json` (기존 `ai-config.json`과 같은 폴더).

```json
{
  "version": 1,
  "messages": [
    { "id": "uuid", "role": "user",      "content": "…", "timestamp": "ISO" },
    { "id": "uuid", "role": "assistant", "content": "…", "timestamp": "ISO" }
  ]
}
```

- `AiMessage` 타입(이미 `useStore.ts`에 정의됨)을 그대로 재사용.
- `version: 1`은 향후 스키마 변경 대비용 훅.
- 단일 스레드 설계라 배열 하나면 충분.

### 설정 확장

`AiConfig` (in `src/main/ai-service.ts`)에 필드 하나 추가:

```ts
interface AiConfig {
  // 기존 필드들...
  maxHistoryMessages: number
}

const DEFAULT_CONFIG: AiConfig = {
  // 기존 기본값들...
  maxHistoryMessages: 200
}
```

200이면 약 100 왕복 수준. 기존 사용자의 `ai-config.json`에 이 필드가 없어도
`getAiConfig`의 `{ ...DEFAULT_CONFIG, ...saved }` 병합 로직이 기본값을
자동 주입하므로 마이그레이션 코드 불필요.

### Main 프로세스

`src/main/database.ts`에 추가:

```ts
let chatHistoryPath: string

// initDatabase() 안에서:
chatHistoryPath = path.join(userDataPath, 'ai-chat.json')

export function getChatHistory(): Record<string, unknown>[] {
  if (!existsSync(chatHistoryPath)) return []
  try {
    const raw = JSON.parse(readFileSync(chatHistoryPath, 'utf-8'))
    return Array.isArray(raw.messages) ? raw.messages : []
  } catch {
    return []
  }
}

export function saveChatHistory(messages: Record<string, unknown>[]): void {
  writeFileSync(
    chatHistoryPath,
    JSON.stringify({ version: 1, messages }, null, 2),
    'utf-8'
  )
}
```

Main 프로세스는 메시지를 불투명한 레코드로 취급한다. `AiMessage` 타입은
renderer(`src/renderer/src/types/index.ts`)에 있어 main이 import할 수 없기
때문이다. 기존 `saveAiConfig(config: Record<string, unknown>)`이 이미
타입 있는 renderer 데이터를 타입 없는 main 쪽 API로 주고받는 방식과 동일하다.

동기 `writeFileSync`는 `saveAiConfig`와 동일한 패턴. 파일 크기는 cap=200
기준 수백 KB 수준이고 저장 호출은 드물어(스트림 완료 시점), 디바운스 불필요.

`src/main/ipc-handlers.ts`에 IPC 핸들러 추가:

```ts
ipcMain.handle('ai:get-history', () => db.getChatHistory())
ipcMain.handle('ai:save-history', (_, messages) => db.saveChatHistory(messages))
```

별도 clear 핸들러는 추가하지 않는다 — 빈 배열 save가 clear 역할.

### Preload 브릿지

`src/preload/index.ts` + `src/preload/index.d.ts`에 노출:

- `aiGetHistory(): Promise<AiMessage[]>`
- `aiSaveHistory(messages: AiMessage[]): Promise<void>`

### Renderer 스토어 (useStore.ts)

신규 액션:

```ts
aiLoadHistory: async () => {
  const messages = await window.api.aiGetHistory()
  set({ aiMessages: messages })
}
```

`App.tsx`의 마운트 effect에서 한 번 호출. `aiLoadConfig`는 현재 Settings 모달을
열 때 lazy하게 호출되지만, 히스토리는 더 일찍 로드돼야 실행 직후 패널을 열었을
때 이전 메시지가 바로 보인다. `App.tsx`의 새 effect는 히스토리 로드만 담당하고,
Settings의 기존 lazy 설정 로딩은 그대로 둔다.

자르기 헬퍼. 저장 직전 한 번만 적용해서 UI 상태와 파일이 항상 일치:

```ts
const trim = (msgs: AiMessage[], cap: number) =>
  msgs.length > cap ? msgs.slice(-cap) : msgs
```

저장 트리거:

1. `onAiStreamDone` — user+assistant 왕복 하나가 정상 완료된 시점.
2. `onAiStreamError` — 오류 메시지도 히스토리에 남긴다.
3. `aiClearMessages` — 빈 배열 저장, 파일의 메시지 목록 비움.

각 트리거는 현재 `aiConfig`에서 `maxHistoryMessages`를 읽고, `trim` 적용하고,
`aiMessages` state 갱신 후 `aiSaveHistory` 호출.

### Settings UI (Settings.tsx)

AI 섹션 안에 필드 하나 추가. "저장 및 연결 테스트" 버튼 바로 위에 배치 —
API 키 입력이 `aiProvider !== 'ollama'` 조건부라 그 아래로 두면 ollama 사용자는
못 보게 되기 때문:

```tsx
<div>
  <label htmlFor="ai-max-history" className="...">
    채팅 기록 보관 개수
  </label>
  <input
    id="ai-max-history"
    type="number"
    min={0}
    max={10000}
    value={aiMaxHistory}
    onChange={(e) =>
      setAiMaxHistory(Math.max(0, parseInt(e.target.value, 10) || 0))
    }
    className="..."
  />
  <p className="text-xs text-gray-500 mt-1">
    오래된 메시지부터 자동 삭제됩니다. 0이면 보관 안 함.
  </p>
</div>
```

- `handleAiSave`가 기존 필드들과 함께 `maxHistoryMessages: aiMaxHistory`를
  `aiSaveConfig`에 전달.
- `aiConfig` 로드 시 `setAiMaxHistory(aiConfig.maxHistoryMessages ?? 200)`로
  기존 사용자(필드 없음)에 기본값 적용.
- Cap을 낮춰도 **기존 저장된 히스토리는 즉시 잘리지 않음**. 다음 저장 시점에
  `trim`으로 자연스럽게 수렴.

## 엣지 케이스

| 케이스 | 동작 |
|------|----------|
| `ai-chat.json` 없음 (신규 사용자) | `getChatHistory`가 `[]` 반환. 패널 빈 상태로 열림. |
| `ai-chat.json` 손상 / JSON 파싱 실패 | `getChatHistory`가 `[]` 반환. 다음 저장이 덮어씀. 토스트 없음. |
| 기존 config에 `maxHistoryMessages` 필드 없음 | `DEFAULT_CONFIG` 병합이 200 공급. 마이그레이션 코드 불필요. |
| Cap을 현재 파일보다 낮게 설정 | 즉시 자르지 않음. 다음 스트림 완료 시 새 cap으로 정리. |
| 스트리밍 중 앱 종료 | user 메시지 + 부분 assistant 응답 유실. 허용. |
| 동시 쓰기 | Main 프로세스 단일 스레드 + 동기 `writeFileSync` — 레이스 없음. `ai-config` 패턴과 동일. |

## 테스트

기존 `src/main/ai-service.test.ts` 스타일을 따라(혹은 파일이 커지면 새
`database.test.ts`로 분리) 다음 케이스 추가:

- `getChatHistory()`가 파일 없을 때 `[]` 반환.
- `getChatHistory()`가 손상된 JSON일 때 `[]` 반환.
- `getChatHistory()`가 `messages`가 배열이 아닐 때 `[]` 반환.
- `saveChatHistory(msgs)` → `getChatHistory()` 라운드트립 일치.
- 저장 파일에 `version: 1` 포함.
- `trim` 헬퍼: cap=0 → `[]`; cap≥length → 변화 없음; cap<length → 마지막 cap개만 순서 보존.

IPC 핸들러 통합 테스트(`ipcMain` 모킹 비용 대비 가치 낮음)와 renderer 스토어
테스트(프로젝트에 선례 없음)는 범위 제외.

## 수정 파일 목록

- `src/main/database.ts` — `chatHistoryPath`, `getChatHistory`,
  `saveChatHistory` 추가. `initDatabase` 확장.
- `src/main/ai-service.ts` — `AiConfig` / `DEFAULT_CONFIG`에
  `maxHistoryMessages` 확장.
- `src/main/ipc-handlers.ts` — 신규 핸들러 2개.
- `src/main/ai-service.test.ts` (또는 신규 파일) — 위 단위 테스트.
- `src/preload/index.ts` + `index.d.ts` — 브릿지 메서드 2개.
- `src/renderer/src/store/useStore.ts` — `aiLoadHistory` 액션 +
  `onAiStreamDone` / `onAiStreamError` / `aiClearMessages`에 save 호출,
  `trim` 헬퍼. `AiConfig` 타입 확장.
- `src/renderer/src/App.tsx` — 마운트 시 `aiLoadHistory` 호출.
- `src/renderer/src/components/sidebar/Settings.tsx` — 입력 필드 추가,
  `handleAiSave`에 연결.
