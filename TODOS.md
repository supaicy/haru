# TODOS

## Pre-implementation (Must do before coding)

### [P0] ~~Korean LLM Accuracy Benchmark~~ ✅ DONE (2026-03-25)
- **Result:** llama3.2:latest (3B) — JSON 파싱 96%, 서브태스크 100%, 우선순위 70%
- **Verdict:** PASS — 3B 모델로 충분. 우선순위 프롬프트 few-shot 강화 필요. "글피" 등 비표준 표현은 기존 naturalDate.ts 폴백으로 커버
- **Model:** llama3.2:latest (3B, 2GB) — 디자인 문서의 8B 대신 3B로도 충분
- **Data:** /tmp/haru-benchmark-results.jsonl

## MVP (v2.0)

### ~~[P1] OpenAI Compatible API Fallback~~ ✅ DONE (v1.3.0, 2026-04-01)
- **Result:** Ollama + OpenAI + Custom API 지원 완료. Settings UI에서 provider 선택, API 키 설정, 연결 테스트 가능. LLM 출력 검증 및 설정 영속화 포함.

## Post-MVP

### [P2] Chat History Persistence (v2.0.1)
- **What:** 채팅 히스토리를 별도 ai-chat.json 파일에 영구 저장
- **Why:** 메모리만 유지하면 앱 재시작 시 컨텍스트 소실. 사용자가 후속 질문 시 혼란
- **Context:** MVP에서는 메모리만 사용. 사용자 피드백에서 히스토리 요구가 높으면 v2.0.1에서 구현. 별도 JSON 파일로 분리하여 기존 DB 파일 크기에 영향 없게 설계. 대화 삭제/초기화 기능 필요
- **Depends on:** AI 채팅 기본 구현
- **Added:** 2026-03-25 by /plan-eng-review (외부 리뷰어 지적)

## Code Quality / Lint Cleanup

Biome 도입 후 남은 린트 위반. PR #12, #13으로 biome 설치 + 자동 수정 완료. 남은 178 errors는 아래와 같이 분류되며 독립 PR로 점진적 처리 권장.

### [P2] `useButtonType` codemod (115 errors)
- **What:** `<button>` 요소에 `type="button"` 속성 일괄 추가
- **Why:** Biome의 `lint/a11y/useButtonType` — form 안에서 기본값이 `submit`이라 의도치 않은 폼 제출 발생 가능
- **How:** 단순 codemod (jscodeshift 또는 정규식). `<button` 다음에 `type=` 속성이 없으면 `type="button"` 삽입. 단, 실제 submit 버튼은 수동으로 `type="submit"`으로 구분 필요
- **Scope:** 115개 위반, 대략 20+ 파일
- **Added:** 2026-04-20 by /health follow-up

### [P2] 클릭 가능 div 접근성 수정 (~50 errors)
- **What:** `<div onClick>` 요소에 키보드 핸들러 + 적절한 ARIA 역할 추가
- **Why:** Biome의 `lint/a11y/useKeyWithClickEvents` (22) + `lint/a11y/noStaticElementInteractions` (28) — 키보드 사용자가 해당 UI를 조작할 수 없음
- **How:** 각 케이스별로 (a) `<button>`으로 변경 가능한지 판단, (b) 불가하면 `role="button"` + `tabIndex={0}` + `onKeyDown` Enter/Space 핸들러 추가
- **Added:** 2026-04-20 by /health follow-up

### [P1] `useHookAtTopLevel` 위반 2건 조사
- **What:** React hook이 최상위 레벨이 아닌 곳에서 호출되는 2곳 식별 및 수정
- **Why:** React hooks 규칙 위반은 **진짜 버그**일 가능성 높음 (조건부 hook 호출은 렌더 순서 꼬임). Biome가 감지한 2건은 먼저 확인해야 함
- **How:** `npx biome lint src electron.vite.config.ts 2>&1 | grep "useHookAtTopLevel" -B1` 로 위치 확인 후 검토
- **Priority:** P1 — 다른 것보다 먼저
- **Added:** 2026-04-20 by /health follow-up

### [P3] 나머지 정밀 정리 (~11 errors + 10 warnings)
- `noArrayIndexKey` (6) — React key에 배열 인덱스 사용. 대부분 안전하지만 리스트 재정렬 있을 경우 버그
- `noLabelWithoutControl` (4) — `<label>` 에 `htmlFor` 또는 연결된 컨트롤 없음
- `noSvgWithoutTitle` (1)
- `noNonNullAssertion` warnings (6) — `foo!` 사용처를 옵셔널 체이닝이나 타입 좁히기로 대체
- `noUnusedVariables` warnings (4)
- **Added:** 2026-04-20 by /health follow-up

### Baseline

- 현재 health score: 7.3/10 (타입 10 · 린트 0 · 테스트 10, 재분배 가중치 적용)
- 린트 점수를 7 이상으로 올리려면 에러 20개 미만으로 감소 필요
- 위 작업 모두 완료 시 대략 클린 상태 도달 예상
