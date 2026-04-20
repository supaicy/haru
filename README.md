<p align="center">
  <img src="resources/icon-128-rounded.png" alt="haru" width="128" height="128">
</p>

<h1 align="center">haru</h1>

<p align="center">
  <strong>All-in-one productivity app for macOS</strong><br>
  Tasks, Calendar, Pomodoro, and Habit Tracker — in one place
</p>

<p align="center">
  <a href="docs/README.ko.md">🇰🇷 한국어</a>
</p>

<p align="center">
  <a href="https://github.com/supaicy/haru/releases/latest/download/haru.dmg">
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

## Features

| Feature | Description |
|---------|-------------|
| **Task Management** | Create, edit, delete tasks with subtasks, priorities, and tags |
| **AI Assistant** | Natural language task creation with auto subtasks, priority, and due dates via Ollama or OpenAI |
| **AI Chat** | Ask about your schedule, deadlines, and productivity with streaming responses |
| **Natural Language Input** | "내일 장보기", "next monday meeting", "글피 치과" — Korean and English supported |
| **Calendar** | Monthly, weekly, and daily views |
| **Time Blocking** | Drag tasks onto calendar slots to schedule when you'll work on them — resize, move, unschedule. Recurring tasks repeat the block automatically. |
| **Kanban Board** | Drag-and-drop tasks across To Do / In Progress / Done |
| **Pomodoro Timer** | 25-min focus + 5-min break cycles with session history |
| **Habit Tracker** | Daily habit checklist |
| **Eisenhower Matrix** | Organize by urgency and importance |
| **Timeline** | Chronological task flow view |
| **Statistics** | Completion rates, pomodoro records, productivity analytics |
| **Gamification** | Points and level system for motivation |
| **Dark / Light Mode** | Easy on the eyes, day or night |
| **Keyboard Shortcuts** | Cmd+N, Cmd+Shift+A, and more for fast navigation |

## Installation

### Homebrew (Recommended)

```bash
brew install --cask supaicy/haru/haru
```

첫 실행 시 macOS 경고가 뜨면:

```bash
xattr -cr /Applications/haru.app
```

업데이트:

```bash
brew upgrade --cask haru
```

### Download DMG

1. Click the **Download** button above (or visit [Releases](https://github.com/supaicy/haru/releases))
2. Open the downloaded `.dmg` file
3. Drag `haru` to your `Applications` folder
4. **첫 실행 전에 터미널에서 아래 명령을 실행하세요:**

```bash
xattr -cr /Applications/haru.app
```

> **왜 필요한가요?**
> haru는 Apple Developer 인증서로 서명되지 않은 오픈소스 앱입니다.
> macOS가 "손상되었습니다" 경고를 표시할 수 있으며, 위 명령으로 해결됩니다.
> 이 명령은 최초 설치 시 1회만 실행하면 됩니다.

### Update

- **Homebrew 사용자:** `brew upgrade --cask haru`
- **DMG 사용자:** 앱 내 **설정 > 업데이트 확인**에서 새 버전이 감지되면 GitHub Releases 페이지로 이동합니다. `haru.dmg`를 다시 다운로드하여 기존 앱에 덮어쓰기하세요.

### Build from Source

```bash
git clone https://github.com/supaicy/haru.git
cd haru
npm install
npm run dev        # Development mode
npm run package    # Build macOS app
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd + N` | Add task |
| `Cmd + Shift + A` | Quick add (global) |
| `Cmd + F` | Search |
| `Cmd + Z` | Undo |
| `Cmd + D` | Set due date to today |
| `Cmd + E` | Export data |
| `1` `2` `3` `4` | Change priority |
| `Delete` | Delete selected task |
| `Esc` | Deselect / Close |

## Tech Stack

- **Electron 40** — Native macOS app
- **React 19** + **TypeScript** — UI
- **Tailwind CSS 3** — Styling
- **Zustand** — State management
- **JSON file storage** — Local data persistence

## System Requirements

- macOS 12 (Monterey) or later
- Apple Silicon (M1 / M2 / M3 / M4)

---

<p align="center">
  Made by <a href="https://github.com/supaicy">supaicy</a>
</p>
