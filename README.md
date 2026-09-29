# 練歌 · 日文歌詞背誦

A mobile-friendly dark-mode web app for memorizing Japanese song lyrics with Traditional Chinese (繁體中文) translations.

Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Lucide React**.

## Features

Three modes on one sample song:

| Mode | Label | What it does |
|------|--------|--------------|
| A | 學習模式 | Study lines with furigana / translation toggles; click a card to hide/reveal Japanese |
| B | 遮蔽填空模式 | Flashcard cloze with 顯示答案, then 重背 / 記住 mastery updates |
| C | 單句循環與聽寫 | Audio player UI with speed controls and per-line seek via `startTime` |

Mastery (0–5) persists in `localStorage` for the session browser.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Other scripts

```bash
npm run build   # production build
npm run start   # serve production build
npm run lint    # ESLint
```

## Project structure

```
app/                 # App Router layout + page
components/          # ModeSwitcher, StudyMode, ClozeMode, LoopMode, …
data/sampleSong.json # Demo song 「桜の道」
types/lyrics.ts      # Line / Song types
lib/furigana.tsx     # Ruby furigana renderer
```

## Adding your own song

Edit `data/sampleSong.json` (or load another `Song`). Each line needs:

- `japanese`, `furigana` (e.g. `桜(さくら)の道(みち)`), `translation`
- `mastery` (start at `0`)
- optional `startTime` (seconds) and `hint` for cloze
- optional song-level `audioUrl` for real playback in Loop mode

## Sample song

Demo data uses an original short practice song 「桜の道」 so the app works offline with no copyrighted audio.
