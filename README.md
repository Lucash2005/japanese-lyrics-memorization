# 練歌 · 日文歌詞背誦

用三種模式背誦日文歌詞（繁體中文翻譯）的手機友善深色網頁 App。

技術：**Next.js (App Router)**、**TypeScript**、**Tailwind CSS**、**Lucide React**。

## 只用 GitHub 上線（給 iPhone 用、不開電腦）

程式會靜態匯出，靠 **GitHub Pages** 託管，不必 Vercel。

### 第一次設定

1. 在 Cursor 點 **Create repo**，把專案建到你的 GitHub  
   （或自己新建空 repo，把程式 push 上去）
2. GitHub 專案頁 → **Settings** → **Pages**
3. **Source** 選 **GitHub Actions**
4. 確認已 push 到 `main`（會自動跑 `.github/workflows/deploy-pages.yml`）
5. 等 Actions 變綠燈後，網址為：

   `https://<你的帳號>.github.io/<repo名稱>/`

   例如：`https://lucas-hsieh.github.io/japanese-lyrics-memorization/`

6. iPhone Safari 打開該網址 → 分享 → **加入主畫面**

之後只要 `git push`，網站會自動更新。

### 本機開發

```bash
npm install
npm run dev
```

開 [http://localhost:43123](http://localhost:43123)

預覽正式靜態檔：

```bash
npm run build
npx --yes serve out -p 43123
```

### 區網用 iPhone 連本機（可選）

電腦跑 `npm run dev`，手機與電腦同一 Wi‑Fi，開 `http://電腦IP:43123`。

## 功能

| 模式 | 名稱 | 說明 |
|------|------|------|
| A | 學習模式 | 假名／中文翻譯開關；點卡片顯示或隱藏日文 |
| B | 遮蔽填空 | 顯示答案後「重背／記住」調整熟練度 |
| C | 單句循環 | 播放速度與依 `startTime` 跳句 |

熟練度（0–5）存在瀏覽器 `localStorage`。

## 專案結構

```
app/                 # App Router
components/          # ModeSwitcher、StudyMode、ClozeMode、LoopMode…
data/sampleSong.json # 示範歌「桜の道」
types/lyrics.ts
lib/furigana.tsx
.github/workflows/   # GitHub Pages 自動部署
```

## 換成自己的歌

編輯 `data/sampleSong.json`。每句需要：

- `japanese`、`furigana`（例如 `桜(さくら)の道(みち)`）、`translation`
- `mastery`（從頭用 `0`）
- 可選 `startTime`、`hint`
- 歌曲層級可選 `audioUrl`
