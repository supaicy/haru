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
