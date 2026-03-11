<p align="center">
  <img src="resources/icon-128.png" alt="haru" width="128" height="128">
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
| **Natural Language Input** | Type "tomorrow grocery" or "next monday meeting" to set due dates |
| **Calendar** | Monthly, weekly, and daily views |
| **Kanban Board** | Drag-and-drop tasks across To Do / In Progress / Done |
| **Pomodoro Timer** | 25-min focus + 5-min break cycles with session history |
| **Habit Tracker** | Daily habit checklist |
| **Eisenhower Matrix** | Organize by urgency and importance |
| **Timeline** | Chronological task flow view |
| **Statistics** | Completion rates, pomodoro records, productivity analytics |
| **Gamification** | Points and level system for motivation |
| **Dark / Light Mode** | Easy on the eyes, day or night |
| **Keyboard Shortcuts** | Cmd+N, Cmd+Shift+A, and more for fast navigation |
| **Auto Update** | Get notified when a new version is available |

## Installation

### Download DMG (Recommended)

1. Click the **Download** button above (or visit [Releases](https://github.com/supaicy/haru/releases))
2. Open the downloaded `.dmg` file
3. Drag `haru` to your `Applications` folder

> **First launch note**
> macOS may block the app on first run.
> Right-click `haru.app` > **Open**, or go to
> **System Settings > Privacy & Security** and click "Open Anyway".

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
