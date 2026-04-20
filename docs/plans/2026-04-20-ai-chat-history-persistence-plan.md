# AI 채팅 히스토리 영속화 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 채팅 메시지를 `<userData>/ai-chat.json`에 영속화해 재시작 후에도 복원되게 하고, 메시지 수 상한을 사용자가 설정할 수 있도록 한다.

**Architecture:** Main 프로세스가 기존 `ai-config.json` 패턴 그대로 동기 파일 I/O 제공, IPC 브릿지로 renderer에 노출. Renderer는 앱 마운트 시 로드, 스트리밍 완료/오류/Clear 시점에 trim 적용 후 저장. LLM 호출에는 히스토리 포함하지 않음 (UI 복원 전용).

**Tech Stack:** Electron main + preload + renderer (React/Zustand/TypeScript), vitest, biome.

**Related spec:** `docs/design/2026-04-20-ai-chat-history-persistence.md`

---

## 파일 구조

| 경로 | 역할 |
|------|------|
| `src/main/database.ts` | `readHistoryFile` / `writeHistoryFile` 순수 헬퍼, `getChatHistory` / `saveChatHistory` 공개 래퍼, `chatHistoryPath` 초기화. |
| `src/main/database.test.ts` | 위 순수 헬퍼 단위 테스트 (신규). |
| `src/main/ai-service.ts` | `AiConfig`에 `maxHistoryMessages` 필드 + 기본값 추가. |
| `src/main/ai-service.test.ts` | `maxHistoryMessages` 기본값 테스트 추가. |
| `src/main/ipc-handlers.ts` | `ai:get-history` / `ai:save-history` 핸들러 등록. |
| `src/preload/index.ts` | `aiGetHistory` / `aiSaveHistory` 브릿지 노출. |
| `src/renderer/src/types/index.ts` | `AiConfig`에 `maxHistoryMessages` 추가. |
| `src/renderer/src/store/useStore.ts` | `trim` 유틸, `aiLoadHistory` 액션, 스트림 완료/오류/Clear에서 저장. |
| `src/renderer/src/store/useStore.test.ts` | `trim` 유틸 단위 테스트 (신규). |
| `src/renderer/src/App.tsx` | 마운트 effect에 `aiLoadHistory()` 호출 추가. |
| `src/renderer/src/components/sidebar/Settings.tsx` | "채팅 기록 보관 개수" 입력 필드 + 저장 연동. |

---

## Task 1: Main — 순수 파일 I/O 헬퍼

**Files:**
- Modify: `src/main/database.ts` (상단에 `readHistoryFile`, `writeHistoryFile` 추가)
- Create: `src/main/database.test.ts`

순수 함수(파일 경로를 인자로 받음)로 구현한 뒤, 모듈 레벨 상태에 의존하는 공개 래퍼는 Task 2에서 추가한다. 이렇게 나누면 테스트는 `os.tmpdir()` 기반 실제 파일로 라운드트립할 수 있고 Electron 컨텍스트가 필요 없다.

- [ ] **Step 1: 테스트 파일 생성 — 실패 테스트 작성**

`src/main/database.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readHistoryFile, writeHistoryFile } from './database'

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'haru-db-test-'))
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

describe('chat history file I/O', () => {
  it('readHistoryFile: 파일이 없으면 빈 배열', () => {
    expect(readHistoryFile(join(tmp, 'missing.json'))).toEqual([])
  })

  it('readHistoryFile: 손상된 JSON은 빈 배열', () => {
    const p = join(tmp, 'corrupt.json')
    writeFileSync(p, '{not valid', 'utf-8')
    expect(readHistoryFile(p)).toEqual([])
  })

  it('readHistoryFile: messages가 배열이 아니면 빈 배열', () => {
    const p = join(tmp, 'weird.json')
    writeFileSync(p, JSON.stringify({ version: 1, messages: 'nope' }), 'utf-8')
    expect(readHistoryFile(p)).toEqual([])
  })

  it('writeHistoryFile → readHistoryFile 라운드트립 일치', () => {
    const p = join(tmp, 'ai-chat.json')
    const msgs = [
      { id: 'u1', role: 'user', content: 'hi', timestamp: '2026-04-20T00:00:00.000Z' },
      { id: 'a1', role: 'assistant', content: 'hello', timestamp: '2026-04-20T00:00:01.000Z' }
    ]
    writeHistoryFile(p, msgs)
    expect(readHistoryFile(p)).toEqual(msgs)
  })

  it('writeHistoryFile은 version: 1을 파일에 기록', () => {
    const p = join(tmp, 'ai-chat.json')
    writeHistoryFile(p, [])
    const raw = JSON.parse(readFileSync(p, 'utf-8'))
    expect(raw.version).toBe(1)
    expect(raw.messages).toEqual([])
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run src/main/database.test.ts`
Expected: `readHistoryFile is not exported`로 전부 FAIL.

- [ ] **Step 3: `database.ts`에 순수 헬퍼 구현**

`src/main/database.ts`의 import 블록 바로 아래, 기존 `save()` 위 적절한 위치에 추가:

```ts
export function readHistoryFile(filePath: string): Record<string, unknown>[] {
  if (!existsSync(filePath)) return []
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'))
    return Array.isArray(raw?.messages) ? raw.messages : []
  } catch {
    return []
  }
}

export function writeHistoryFile(filePath: string, messages: Record<string, unknown>[]): void {
  writeFileSync(filePath, JSON.stringify({ version: 1, messages }, null, 2), 'utf-8')
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `npx vitest run src/main/database.test.ts`
Expected: 5 passed.

- [ ] **Step 5: 기존 전체 테스트 재실행으로 회귀 없음 확인**

Run: `npx vitest run`
Expected: 105 passed (기존 100 + 신규 5).

- [ ] **Step 6: 커밋**

```bash
git add src/main/database.ts src/main/database.test.ts
git commit -m "feat(db): add pure readHistoryFile/writeHistoryFile helpers

I/O for the upcoming ai-chat.json. Pure so tests can drive real tmp
files without an Electron context. JSON parsing errors and non-array
payloads are coerced to []."
```

---

## Task 2: Main — 공개 래퍼 + 초기화

**Files:**
- Modify: `src/main/database.ts`

공개 API는 모듈 레벨 `chatHistoryPath`를 사용해 캡슐화하고, `initDatabase`에서 경로 설정.

- [ ] **Step 1: `chatHistoryPath` 변수 선언 추가**

`src/main/database.ts`의 기존 `let aiConfigPath: string` 선언 옆 (동일 섹션)에 추가:

```ts
let chatHistoryPath: string
```

(`let dbPath: string` / `let aiConfigPath: string` 선언들과 함께 위치.)

- [ ] **Step 2: `initDatabase`에서 경로 설정**

기존 `aiConfigPath = path.join(userDataPath, 'ai-config.json')` 바로 아래:

```ts
chatHistoryPath = path.join(userDataPath, 'ai-chat.json')
```

- [ ] **Step 3: 공개 래퍼 추가**

`writeHistoryFile` 정의 바로 아래:

```ts
export function getChatHistory(): Record<string, unknown>[] {
  if (!chatHistoryPath) return []
  return readHistoryFile(chatHistoryPath)
}

export function saveChatHistory(messages: Record<string, unknown>[]): void {
  if (!chatHistoryPath) return
  writeHistoryFile(chatHistoryPath, messages)
}
```

- [ ] **Step 4: 타입체크 + 린트 + 테스트 실행**

Run: `npx tsc --build && npx biome check src electron.vite.config.ts --reporter=summary && npx vitest run`
Expected: tsc 통과, biome 새 위반 없음 (useHookAtTopLevel 등 기존 178 errors 기준은 변함), vitest 105 passed.

- [ ] **Step 5: 커밋**

```bash
git add src/main/database.ts
git commit -m "feat(db): wire getChatHistory/saveChatHistory wrappers

Module-level chatHistoryPath set in initDatabase mirrors the existing
aiConfigPath pattern. Wrappers short-circuit to [] / noop before init
so tests and non-Electron entry points don't crash."
```

---

## Task 3: Main — `AiConfig`에 `maxHistoryMessages`

**Files:**
- Modify: `src/main/ai-service.ts`
- Modify: `src/main/ai-service.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`src/main/ai-service.test.ts`의 `describe('getAiConfig / setAiConfig', ...)` 블록 끝에 추가:

```ts
    it('maxHistoryMessages 기본값은 200', async () => {
      const ai = await loadAiService()
      const config = ai.getAiConfig()
      expect(config.maxHistoryMessages).toBe(200)
    })

    it('maxHistoryMessages 변경이 반영됨', async () => {
      const ai = await loadAiService()
      ai.setAiConfig({ maxHistoryMessages: 50 })
      expect(ai.getAiConfig().maxHistoryMessages).toBe(50)
    })
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run src/main/ai-service.test.ts`
Expected: 새 테스트 2개 FAIL ("expected undefined to be 200" 등).

- [ ] **Step 3: `AiConfig` 인터페이스 확장**

`src/main/ai-service.ts`의 `AiConfig`:

```ts
interface AiConfig {
  provider: 'ollama' | 'openai' | 'custom'
  baseUrl: string
  model: string
  apiKey: string | null
  maxHistoryMessages: number
}
```

- [ ] **Step 4: `DEFAULT_CONFIG`에 기본값 추가**

```ts
const DEFAULT_CONFIG: AiConfig = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  model: 'llama3.2:latest',
  apiKey: null,
  maxHistoryMessages: 200
}
```

- [ ] **Step 5: 테스트 재실행 — 통과 확인**

Run: `npx vitest run src/main/ai-service.test.ts`
Expected: 모두 통과 (신규 포함).

- [ ] **Step 6: 커밋**

```bash
git add src/main/ai-service.ts src/main/ai-service.test.ts
git commit -m "feat(ai): add maxHistoryMessages to AiConfig (default 200)

Caps chat history length. Merged via DEFAULT_CONFIG so existing users
with no field in ai-config.json pick up the default automatically —
no migration code needed."
```

---

## Task 4: Main — IPC 핸들러 등록

**Files:**
- Modify: `src/main/ipc-handlers.ts`

- [ ] **Step 1: 핸들러 두 개 추가**

`ipc-handlers.ts`의 AI 섹션 마지막 (`ai:stream-chat` 핸들러 블록 아래, `// Quick add` 위) 에 추가:

```ts
  ipcMain.handle('ai:get-history', () => db.getChatHistory())
  ipcMain.handle('ai:save-history', (_, messages) => db.saveChatHistory(messages))
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --build`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/main/ipc-handlers.ts
git commit -m "feat(ipc): expose ai:get-history and ai:save-history handlers

Renderer calls these on app mount (load) and after each stream
completion / error / clear (save)."
```

---

## Task 5: Preload — 브릿지 + 타입

**Files:**
- Modify: `src/preload/index.ts`

`index.d.ts`는 `Api = typeof api` 자동 파생이라 수동 수정 불필요.

- [ ] **Step 1: 브릿지 메서드 두 개 추가**

`src/preload/index.ts`의 AI 블록에서 `aiStreamChat` 뒤, `onAiStreamToken` 앞에 추가:

```ts
  aiGetHistory: () => ipcRenderer.invoke('ai:get-history'),
  aiSaveHistory: (messages: unknown[]) => ipcRenderer.invoke('ai:save-history', messages),
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --build`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/preload/index.ts
git commit -m "feat(preload): bridge aiGetHistory / aiSaveHistory"
```

---

## Task 6: Renderer — 타입 확장 + `trim` 유틸 (TDD)

**Files:**
- Modify: `src/renderer/src/types/index.ts`
- Create: `src/renderer/src/store/trim.ts`
- Create: `src/renderer/src/store/trim.test.ts`

`trim`은 별도 모듈로 분리해 단위 테스트하고 store에서 import. 테스트 용이성 + 단일 책임.

- [ ] **Step 1: `AiConfig` 타입 확장**

`src/renderer/src/types/index.ts`:

```ts
export interface AiConfig {
  provider: 'ollama' | 'openai' | 'custom'
  baseUrl: string
  model: string
  apiKey: string | null
  maxHistoryMessages: number
}
```

- [ ] **Step 2: 실패 테스트 작성**

`src/renderer/src/store/trim.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { trimHistory } from './trim'
import type { AiMessage } from '../types'

const mkMsg = (id: string): AiMessage => ({
  id,
  role: 'user',
  content: id,
  timestamp: `2026-04-20T00:00:${id.padStart(2, '0')}.000Z`
})

describe('trimHistory', () => {
  it('cap보다 짧으면 그대로 반환', () => {
    const msgs = [mkMsg('1'), mkMsg('2')]
    expect(trimHistory(msgs, 5)).toEqual(msgs)
  })

  it('cap과 같으면 그대로 반환', () => {
    const msgs = [mkMsg('1'), mkMsg('2')]
    expect(trimHistory(msgs, 2)).toEqual(msgs)
  })

  it('cap보다 길면 마지막 cap개만 보존 (순서 유지)', () => {
    const msgs = [mkMsg('1'), mkMsg('2'), mkMsg('3'), mkMsg('4')]
    const result = trimHistory(msgs, 2)
    expect(result.map((m) => m.id)).toEqual(['3', '4'])
  })

  it('cap=0이면 빈 배열', () => {
    expect(trimHistory([mkMsg('1'), mkMsg('2')], 0)).toEqual([])
  })
})
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

Run: `npx vitest run src/renderer/src/store/trim.test.ts`
Expected: `Cannot find module './trim'`로 FAIL.

- [ ] **Step 4: `trim.ts` 구현**

`src/renderer/src/store/trim.ts`:

```ts
import type { AiMessage } from '../types'

export function trimHistory(messages: AiMessage[], cap: number): AiMessage[] {
  if (cap <= 0) return []
  return messages.length > cap ? messages.slice(-cap) : messages
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/renderer/src/store/trim.test.ts`
Expected: 4 passed.

- [ ] **Step 6: 타입체크 + 전체 테스트**

Run: `npx tsc --build && npx vitest run`
Expected: 타입 OK, 109 passed.

- [ ] **Step 7: 커밋**

```bash
git add src/renderer/src/types/index.ts src/renderer/src/store/trim.ts src/renderer/src/store/trim.test.ts
git commit -m "feat(store): add trimHistory helper + extend AiConfig

trimHistory(msgs, cap) keeps the last cap messages, used before every
history save so the file and UI stay in lockstep. AiConfig gets a
matching maxHistoryMessages field on the renderer side."
```

---

## Task 7: Renderer store — `aiLoadHistory` 액션

**Files:**
- Modify: `src/renderer/src/store/useStore.ts`

- [ ] **Step 1: `aiLoadHistory` 인터페이스 선언 추가**

`useStore.ts`의 `Actions` 인터페이스(또는 `State & Actions` 타입의 AI 섹션, 기존 `aiLoadConfig: () => Promise<void>` 근처)에 추가:

```ts
  aiLoadHistory: () => Promise<void>
```

(실제 위치: 파일 상단 `interface Store {...}` 또는 유사 구조 내부. `aiLoadConfig` 선언 바로 아래.)

- [ ] **Step 2: 구현 추가**

`useStore.ts`의 `aiLoadConfig:` 구현 바로 아래에:

```ts
  aiLoadHistory: async () => {
    const messages = (await window.api.aiGetHistory()) as AiMessage[]
    set({ aiMessages: messages })
  },
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --build`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/renderer/src/store/useStore.ts
git commit -m "feat(store): add aiLoadHistory action

Fetches persisted messages once on app mount (wired up in Task 8)
so the chat panel shows prior state immediately after launch."
```

---

## Task 8: Renderer store — 저장 트리거 3개

**Files:**
- Modify: `src/renderer/src/store/useStore.ts`

스트리밍 완료 (`onAiStreamDone`), 오류 (`onAiStreamError`), Clear 3개 지점에서 `trimHistory` + `aiSaveHistory`.

- [ ] **Step 1: `trimHistory` import 추가**

`useStore.ts` import 블록에 다른 로컬 import들과 함께:

```ts
import { trimHistory } from './trim'
```

- [ ] **Step 2: `aiSendMessage` 내부 `onAiStreamDone` 핸들러 교체**

`useStore.ts`의 `cleanupDone = window.api.onAiStreamDone?.(() => { ... })` 블록을 다음으로 교체:

```ts
    const cleanupDone = window.api.onAiStreamDone?.(() => {
      const { aiMessages, aiConfig } = get()
      const cap = aiConfig?.maxHistoryMessages ?? 200
      const trimmed = trimHistory(aiMessages, cap)
      set({ aiLoading: false, aiMessages: trimmed })
      void window.api.aiSaveHistory(trimmed)
      cleanup()
    })
```

- [ ] **Step 3: `aiSendMessage` 내부 `onAiStreamError` 핸들러 교체**

```ts
    const cleanupError = window.api.onAiStreamError?.((error: string) => {
      const withError = get().aiMessages.map((m) =>
        m.id === assistantMsg.id ? { ...m, content: `오류: ${error}` } : m
      )
      const cap = get().aiConfig?.maxHistoryMessages ?? 200
      const trimmed = trimHistory(withError, cap)
      set({ aiLoading: false, aiMessages: trimmed })
      void window.api.aiSaveHistory(trimmed)
      cleanup()
    })
```

- [ ] **Step 4: `aiClearMessages` 교체**

```ts
  aiClearMessages: () => {
    set({ aiMessages: [] })
    void window.api.aiSaveHistory([])
  },
```

- [ ] **Step 5: 타입체크 + 테스트**

Run: `npx tsc --build && npx vitest run`
Expected: 에러 없음, 109 passed.

- [ ] **Step 6: 커밋**

```bash
git add src/renderer/src/store/useStore.ts
git commit -m "feat(store): persist chat history on stream done/error/clear

Each trigger trims via maxHistoryMessages (default 200) and writes to
ai-chat.json. UI state and the file stay in lockstep because trim
results are committed to both at once."
```

---

## Task 9: App 마운트 시 히스토리 로드

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: `App`에서 `aiLoadHistory` 호출 추가**

`App.tsx`의 `loadData` useEffect 내부 맨 위쪽 (기존 `loadData()` 바로 아래):

```ts
  useEffect(() => {
    loadData()
    void useStore.getState().aiLoadHistory()
    // 자동 업데이트 이벤트 수신 (electron-updater에서 push)
    // ... (기존 코드 그대로)
```

(다른 디펜던시는 기존 `[loadData]` 유지 — `aiLoadHistory`는 `getState()` 경유라 deps에 넣지 않아도 안정적.)

- [ ] **Step 2: 타입체크**

Run: `npx tsc --build`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat(app): load AI chat history on mount

Uses getState() path to avoid adding aiLoadHistory to the loadData
effect's deps (the action is stable). History arrives before the user
can open the chat panel."
```

---

## Task 10: Settings UI — 입력 필드

**Files:**
- Modify: `src/renderer/src/components/sidebar/Settings.tsx`

- [ ] **Step 1: `aiMaxHistory` state 추가**

`Settings.tsx`의 기존 state 선언들 (`const [aiApiKey, ...]` 근처) 아래:

```tsx
  const [aiMaxHistory, setAiMaxHistory] = useState(200)
```

- [ ] **Step 2: `aiConfig` 로드 effect에 필드 동기화 추가**

기존 `useEffect(() => { if (aiConfig) { ... } }, [aiConfig])` 블록에서 `setAiProvider(aiConfig.provider)` 다음 줄에:

```tsx
      setAiMaxHistory(aiConfig.maxHistoryMessages ?? 200)
```

- [ ] **Step 3: `handleAiSave`에 필드 포함**

기존 `handleAiSave`:

```tsx
  const handleAiSave = () => {
    aiSaveConfig({
      provider: aiProvider,
      baseUrl: aiBaseUrl,
      model: aiModel,
      apiKey: aiApiKey || null,
      maxHistoryMessages: aiMaxHistory
    })
    aiCheckConnection()
  }
```

- [ ] **Step 4: 입력 필드 JSX 추가**

API 키 블록(`{aiProvider !== 'ollama' && (...)}`) 뒤, "저장 및 연결 테스트" 버튼 바로 위에:

```tsx
              <div>
                <label
                  htmlFor="ai-max-history"
                  className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  채팅 기록 보관 개수
                </label>
                <input
                  id="ai-max-history"
                  type="number"
                  min={0}
                  max={10000}
                  value={aiMaxHistory}
                  onChange={(e) => setAiMaxHistory(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className={`w-full mt-1 px-3 py-2 rounded-lg text-sm ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}
                />
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  오래된 메시지부터 자동 삭제됩니다. 0이면 보관 안 함.
                </p>
              </div>
```

- [ ] **Step 5: 타입체크 + 린트 + 테스트**

Run: `npx tsc --build && npx biome check src electron.vite.config.ts --reporter=summary && npx vitest run`
Expected: 타입 OK, 신규 biome 위반 없음, 109 passed.

- [ ] **Step 6: 커밋**

```bash
git add src/renderer/src/components/sidebar/Settings.tsx
git commit -m "feat(settings): expose maxHistoryMessages input

Number input placed above the save button (visible for every provider
since the API key row is hidden for Ollama). Wired into handleAiSave
alongside the existing fields."
```

---

## Task 11: 수동 스모크 테스트

**Files:** 코드 수정 없음. 단지 검증.

- [ ] **Step 1: 개발 모드 실행**

Run: `npm run dev`
Expected: Electron 앱이 실행, 에러 로그 없음.

- [ ] **Step 2: 기본 흐름 시나리오 확인**

사용자로서 다음을 수동으로 확인:

1. 사이드바 Bot 아이콘 → 채팅 패널 오픈 → 입력 "안녕" → LLM 응답 완료
2. 앱 완전 종료 후 재실행
3. 채팅 패널 오픈 → 이전 "안녕" + 응답이 복원되어 보이는지 확인
4. 설정 → AI → "채팅 기록 보관 개수"를 2로 변경 → 저장
5. 채팅 2번 더 보내서 총 6메시지(3왕복) 쌓기 → 앱 재시작 → 가장 최근 2메시지만 남는지 확인
6. "대화 지우기" 버튼 → 재시작 → 빈 상태 확인

- [ ] **Step 3: 파일 생성 확인 (macOS)**

Run: `ls "$HOME/Library/Application Support/ticktick/ai-chat.json"`
Expected: 파일 존재. `cat`으로 열어 `{"version":1,"messages":[...]}` 구조 확인.

- [ ] **Step 4: 스모크 테스트 통과 후 아무것도 커밋 안 함**

변경 사항 없음. 수동 검증 단계.

---

## 완료 시 검증

전체 브랜치 마감 전:

```bash
npx tsc --build
npx biome check src electron.vite.config.ts --reporter=summary
npx vitest run
```

**기대 결과:**
- tsc: 0 errors
- biome: 이전 178 errors와 동일 (+/− 신규 코드가 없는 기존 위반만 유지), warnings 증가 없음
- vitest: 100 (기존) + 5 (database.test) + 2 (ai-service.test) + 4 (trim.test) = **111 tests passing**

모두 통과하면 `feat/ai-chat-history` 브랜치는 머지 준비 완료 상태. (로컬 전용 유지 — 푸시 안 함.)
