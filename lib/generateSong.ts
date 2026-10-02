import type { Line, Song } from "@/types/lyrics";
import { newSongId } from "@/lib/songLibrary";

export interface GenerateInput {
  title: string;
  artist: string;
  /** Optional: user-pasted Japanese lyrics (preferred for real songs). */
  japaneseText?: string;
  apiKey: string;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] || text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI 回傳格式無法解析");
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeSong(data: unknown, fallbackTitle: string, fallbackArtist: string): Song {
  const obj = data as {
    title?: string;
    artist?: string;
    lines?: Array<{
      japanese?: string;
      furigana?: string;
      translation?: string;
      hint?: string;
      analysis?: string;
    }>;
  };

  if (!obj.lines || !Array.isArray(obj.lines) || obj.lines.length === 0) {
    throw new Error("AI 沒有產生可用的歌詞行");
  }

  const lines: Line[] = obj.lines.flatMap((l, i) => {
    const japanese = (l.japanese || "").trim();
    if (!japanese) return [];
    const furigana = (l.furigana || japanese).trim();
    const translation = (l.translation || "").trim();
    const analysis = (l.analysis || "").trim() || undefined;
    const hintFromLine = (l.hint || "").trim();
    const firstKana = japanese.match(/[\u3040-\u309F\u30A0-\u30FF]/)?.[0];
    const hint = hintFromLine || (firstKana ? `${firstKana}…` : undefined);
    return [
      {
        id: `line-${Date.now().toString(36)}-${i}`,
        japanese,
        furigana,
        translation,
        mastery: 0,
        startTime: i * 8,
        hint,
        analysis,
      },
    ];
  });

  if (lines.length === 0) throw new Error("沒有有效的日文歌詞行");

  const title = (obj.title || fallbackTitle).trim() || "未命名歌曲";
  return {
    id: newSongId(title),
    title,
    artist: (obj.artist || fallbackArtist).trim() || "未知演唱者",
    audioUrl: "",
    lines,
  };
}

/**
 * Call Gemini from the browser to structure lyrics.
 * - If japaneseText is provided: annotate with furigana + zh-Hant (user-supplied lyrics).
 * - If not: create ORIGINAL practice lyrics only (never copy copyrighted songs).
 */
export async function generateSongWithGemini(input: GenerateInput): Promise<Song> {
  const key = input.apiKey.trim();
  if (!key) throw new Error("請先填寫 Gemini API Key");

  const hasPaste = Boolean(input.japaneseText?.trim());

  const systemRules = hasPaste
    ? `你是日文歌詞學習助教。使用者會提供他們自己貼上的日文歌詞。
請為每一行加上：
1) furigana：用 漢字(ひらがな) 標記讀音，例如 桜(さくら)の道(みち)
2) translation：繁體中文翻譯
3) hint：該行開頭的假名提示，例如 さ…
回傳嚴格 JSON（不要 markdown）：
{"title":"...","artist":"...","lines":[{"japanese":"...","furigana":"...","translation":"...","hint":"..."}]}
保留原日文語意，不要擅自改寫成別首歌。`
    : `你是日文歌詞學習助教。請創作「完全原創」的練習用日文歌詞（4～8 行），主題可呼應歌名氣氛，但絕對不可複製、改寫或近似任何現有受著作權保護的歌曲歌詞。
artist 請標成「練習用（AI 原創）」。
每行包含 japanese、furigana（漢字(ひらがな)）、translation（繁體中文）、hint。
回傳嚴格 JSON：
{"title":"...","artist":"練習用（AI 原創）","lines":[{"japanese":"...","furigana":"...","translation":"...","hint":"..."}]}`;

  const userPrompt = hasPaste
    ? `歌名：${input.title}\n演唱者：${input.artist}\n\n日文歌詞：\n${input.japaneseText}`
    : `請以「${input.title}」／「${input.artist}」為靈感，創作原創練習歌詞（不是原曲歌詞）。`;

  // REST URL uses /models/{id}:generateContent (SDK 參數則不加 models/ 前綴)
  const models = await resolveGeminiModels(key);
  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemRules}\n\n${userPrompt}` }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  });

  let lastError = "Gemini 呼叫失敗：找不到可用模型";
  for (const model of models.slice(0, 6)) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (res.ok) {
        const payload = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text =
          payload.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || "")
            .join("") || "";
        if (!text) {
          lastError = "AI 沒有回傳內容，請稍後再試";
          break;
        }
        const parsed = extractJson(text);
        return normalizeSong(
          parsed,
          input.title,
          hasPaste ? input.artist : "練習用（AI 原創）"
        );
      }

      const errText = await res.text().catch(() => "");
      if (res.status === 400 || res.status === 403) {
        throw new Error("API Key 無效或無權限，請檢查 Gemini Key");
      }
      if (res.status === 404) {
        lastError = `模型 ${model} 不可用，改試下一個`;
        break; // next model
      }
      if (res.status === 429 || res.status === 503) {
        lastError =
          "Gemini 目前忙碌或額度繁忙（503/429），請稍等約 30 秒再試；也可先「用貼上的歌詞建立」不必等 AI。";
        // backoff then retry same model, then fall through to next model
        await sleep(800 * (attempt + 1) * (attempt + 1));
        continue;
      }
      throw new Error(
        `Gemini 呼叫失敗（${res.status}）${errText.slice(0, 120)}`
      );
    }
  }

  throw new Error(lastError);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Prefer live models from ListModels; fall back to known Flash IDs. */
async function resolveGeminiModels(apiKey: string): Promise<string[]> {
  const fallback = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
  ];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    );
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    };
    const generate = (data.models || [])
      .filter((m) =>
        (m.supportedGenerationMethods || []).includes("generateContent")
      )
      .map((m) => (m.name || "").replace(/^models\//, ""))
      .filter(Boolean);

    const preferred = generate.filter(
      (id) =>
        /flash/i.test(id) &&
        !/embed|tts|image|vision|robotics|computer/i.test(id)
    );
    const ordered = [
      ...preferred.filter((id) => /2\.5|flash-latest|2\.0/i.test(id)),
      ...preferred,
      ...generate.filter((id) => /pro/i.test(id)),
    ];
    const unique = [...new Set(ordered)];
    return unique.length > 0 ? unique : fallback;
  } catch {
    return fallback;
  }
}
