# 練歌 · 日文歌詞背誦

用三種模式背誦日文歌詞（繁體中文翻譯）的手機友善深色網頁 App。

技術：**Next.js (App Router)**、**TypeScript**、**Tailwind CSS**、**Lucide React**。

## 本機執行

```bash
npm install
npm run dev
```

電腦瀏覽器開啟： [http://localhost:43123](http://localhost:43123)

### 手機長期使用（不開電腦）

把網站部署到 Vercel 後，iPhone 用 Safari 開網址即可，不必再開電腦：

1. 用電腦或 Cursor 部署一次（見下方 claim / `vercel`）
2. iPhone Safari 打開公開網址
3. 分享 → **加入主畫面**，之後像 App 一樣點開

### 用 iPhone 連本機開發伺服器（同一 Wi‑Fi）

1. 在**電腦**上執行 `npm run dev`（不要關）
2. 查電腦區網 IP（Mac：`ipconfig getifaddr en0`）
3. iPhone 與電腦連**同一個 Wi‑Fi**
4. Safari 輸入：`http://你的電腦IP:43123`

> 不要在手機開 `localhost` / `127.0.0.1`。雲端預覽網址也無法直接給 iPhone 長期用。

### 其他指令

```bash
npm run build   # 正式建置
npm run start   # 用正式建置啟動（同樣可用區網 IP 開）
npm run lint
```

## 功能

| 模式 | 名稱 | 說明 |
|------|------|------|
| A | 學習模式 | 假名／中文翻譯開關；點卡片顯示或隱藏日文 |
| B | 遮蔽填空 | 顯示答案後「重背／記住」調整熟練度 |
| C | 單句循環 | 播放速度與依 `startTime` 跳句 |

熟練度（0–5）會存在瀏覽器 `localStorage`。

## 專案結構

```
app/                 # App Router
components/          # ModeSwitcher、StudyMode、ClozeMode、LoopMode…
data/sampleSong.json # 示範歌「桜の道」
types/lyrics.ts
lib/furigana.tsx
```

## 換成自己的歌

編輯 `data/sampleSong.json`。每句需要：

- `japanese`、`furigana`（例如 `桜(さくら)の道(みち)`）、`translation`
- `mastery`（從頭用 `0`）
- 可選 `startTime`、`hint`
- 歌曲層級可選 `audioUrl`（單句循環真實播放）
