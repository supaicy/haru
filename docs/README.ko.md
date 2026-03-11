<p align="center">
  <img src="../resources/icon-128.png" alt="haru" width="128" height="128">
</p>

<h1 align="center">haru</h1>

<p align="center">
  <strong>macOS 올인원 생산성 앱</strong><br>
  할 일 관리, 캘린더, 포모도로, 습관 트래커를 하나에
</p>

<p align="center">
  <a href="../README.md">🇺🇸 English</a>
</p>

<p align="center">
  <a href="https://github.com/supaicy/haru/releases/latest">
    <img src="https://img.shields.io/badge/Download-macOS_(Apple_Silicon)-blue?style=for-the-badge&logo=apple" alt="Download DMG">
  </a>
</p>

<p align="center">
  <a href="https://github.com/supaicy/haru/stargazers">
    <img src="https://img.shields.io/github/stars/supaicy/haru?style=flat-square" alt="Stars">
  </a>
  <img src="https://img.shields.io/github/downloads/supaicy/haru/total?style=flat-square" alt="Downloads">
  <img src="https://img.shields.io/github/v/release/supaicy/haru?style=flat-square" alt="Release">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
</p>

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **태스크 관리** | 할 일 추가/편집/삭제, 서브태스크, 우선순위, 태그 |
| **자연어 입력** | "내일 장보기", "다음주 월요일 회의" 등 자연어 날짜 인식 |
| **캘린더** | 월간 / 주간 / 일간 뷰 |
| **칸반 보드** | 드래그앤드롭으로 할 일 / 진행 중 / 완료 관리 |
| **포모도로 타이머** | 25분 집중 + 5분 휴식 사이클, 세션 기록 |
| **습관 트래커** | 매일 체크하는 습관 목록 |
| **아이젠하워 매트릭스** | 긴급/중요도 기반 4분면 정리 |
| **타임라인** | 시간순 태스크 흐름 보기 |
| **통계** | 완료율, 포모도로 기록, 생산성 분석 |
| **게이미피케이션** | 점수 / 레벨 시스템으로 동기부여 |
| **다크 / 라이트 모드** | 눈이 편한 테마 전환 |
| **키보드 단축키** | Cmd+N, Cmd+Shift+A 등 빠른 조작 |
| **자동 업데이트** | 새 버전 출시 시 앱 내 알림 |

## 설치 방법

### DMG로 설치 (권장)

1. 위의 **Download** 버튼 클릭 (또는 [Releases](https://github.com/supaicy/haru/releases) 페이지)
2. 다운로드된 `.dmg` 파일 열기
3. `haru` 앱을 `Applications` 폴더로 드래그

> **처음 실행 시 주의사항**
> macOS가 앱을 차단할 수 있습니다.
> `haru.app`을 **우클릭 > 열기**를 선택하거나,
> **시스템 설정 > 개인 정보 보호 및 보안**에서 "확인 없이 열기"를 허용해주세요.

### 소스에서 빌드

```bash
git clone https://github.com/supaicy/haru.git
cd haru
npm install
npm run dev        # 개발 모드 실행
npm run package    # macOS 앱으로 패키징
```

## 키보드 단축키

| 단축키 | 기능 |
|--------|------|
| `Cmd + N` | 할 일 추가 |
| `Cmd + Shift + A` | 빠른 추가 (글로벌) |
| `Cmd + F` | 검색 |
| `Cmd + Z` | 되돌리기 |
| `Cmd + D` | 오늘 마감일 설정 |
| `Cmd + E` | 데이터 내보내기 |
| `1` `2` `3` `4` | 우선순위 변경 |
| `Delete` | 선택 태스크 삭제 |
| `Esc` | 선택 해제 / 닫기 |

## 기술 스택

- **Electron 40** — macOS 네이티브 앱
- **React 19** + **TypeScript** — UI
- **Tailwind CSS 3** — 스타일링
- **Zustand** — 상태 관리
- **JSON 파일 저장소** — 로컬 데이터 저장

## 시스템 요구사항

- macOS 12 (Monterey) 이상
- Apple Silicon (M1 / M2 / M3 / M4)

---

<p align="center">
  Made by <a href="https://github.com/supaicy">supaicy</a>
</p>
