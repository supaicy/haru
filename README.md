<p align="center">
  <img src="resources/icon-128-rounded.png" alt="haru" width="96" height="96">
</p>

<h1 align="center">haru</h1>

<p align="center">
  A calm, all-in-one productivity app for macOS.
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/release/supaicy/haru?style=flat-square&label=release&color=4B7BEC" alt="Release">
  <img src="https://img.shields.io/github/downloads/supaicy/haru/total?style=flat-square&label=downloads&color=4B7BEC" alt="Downloads">
  <img src="https://img.shields.io/github/license/supaicy/haru?style=flat-square&color=lightgrey" alt="License">
</p>

---

## Install

```bash
brew tap supaicy/haru
brew install --cask haru
```

If macOS shows a "damaged" warning on first launch, clear the quarantine attribute once:

```bash
xattr -cr /Applications/haru.app
```

Prefer a manual install? Grab the latest [DMG from Releases](https://github.com/supaicy/haru/releases/latest).

## Features

- **Tasks** — subtasks, priorities, tags, recurring items
- **Natural language input** — *"tomorrow grocery"*, *"내일 장보기"*, *"next monday meeting"*
- **AI assistant** — create tasks from a sentence and chat about your schedule (Ollama or OpenAI)
- **Calendar & time blocking** — drag tasks onto time slots; recurring blocks repeat automatically
- **Focus tools** — Pomodoro, habit tracker, Eisenhower matrix, Kanban board
- **Stats & gamification** — completion rates, streaks, levels

## Shortcuts

| | | | |
|---|---|---|---|
| `⌘ N` | Add task | `⌘ D` | Due today |
| `⌘ ⇧ A` | Quick add (global) | `⌘ Z` | Undo |
| `⌘ F` | Search | `1` – `4` | Priority |

## Update

```bash
brew upgrade --cask haru
```

## Development

```bash
git clone https://github.com/supaicy/haru.git
cd haru && npm install
npm run dev
```

Built with Electron, React 19, TypeScript, Tailwind, and Zustand.

## Requirements

macOS 12 (Monterey) or later · Apple Silicon

---

<p align="center">
  <sub>Made by <a href="https://github.com/supaicy">supaicy</a> · <a href="docs/README.ko.md">한국어</a></sub>
</p>
