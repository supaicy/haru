# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-04-01

### Added
- AI 어시스턴트: Ollama(로컬) 및 OpenAI/커스텀 API를 통한 자연어 작업 생성 및 채팅
- AI 채팅 패널: 실시간 스트리밍 응답, 추천 질문, 연결 상태 표시
- AI 설정: Settings에서 AI 제공자/모델/API 키 설정 가능
- AI 작업 생성: 자연어 입력으로 하위 작업과 우선순위를 자동 추출
- LLM 출력 검증: priority, dueDate, dueTime 등 LLM 반환값의 유효성 검증
- AI 설정 영속화: 앱 재시작 후에도 AI 설정이 유지됨

### Changed
- 작업 상세 패널 너비 확대 (320px → 480px), 메모 작성 영역이 남은 공간을 모두 채움
- AI 연결 실패 시 에러 메시지가 설정된 제공자에 따라 다르게 표시

### Fixed
- AI 작업 생성 성공 시 로딩 스피너가 해제되지 않던 버그 수정
