import { loadApiKey } from "@/lib/songLibrary";

const ANALYSIS_PROMPT = `你是日文學習助教。請用「繁體中文」分析下面這一句日文，嚴格依照下列格式輸出純文字（不要 JSON、不要 markdown 程式碼塊）：

例句文法（Gemini）

1.原句與翻譯：
（日文原句）
（繁體中文翻譯）

2.核心文法拆解：
• 詞／詞組（讀音）：詞性說明，「意思」。用途說明。
• ……（逐詞或逐重要語塊列出）

3.語感與特點：
• 語氣：……
• 時態：……
• 適用情境：……

要求：簡潔清楚，適合初中級學習者；助詞、動詞形、敬體／常體要點到。`;

async function resolveModels(apiKey: string): Promise<string[]> {
  const fallback = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
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
    const ids = (data.models || [])
      .filter((m) =>
        (m.supportedGenerationMethods || []).includes("generateContent")
      )
      .map((m) => (m.name || "").replace(/^models\//, ""))
      .filter(
        (id) =>
          /flash/i.test(id) &&
          !/embed|tts|image|vision|robotics|computer/i.test(id)
      );
    return ids.length > 0 ? [...new Set(ids)] : fallback;
  } catch {
    return fallback;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function cleanAnalysisText(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```(?:text|markdown)?\s*/i, "").replace(/\s*```$/, "");
  if (!text.includes("例句文法")) {
    text = `例句文法（Gemini）\n\n${text}`;
  }
  return text.trim();
}

/** Generate / refresh sentence analysis for one lyric line. */
export async function analyzeLineWithGemini(input: {
  japanese: string;
  translation?: string;
  furigana?: string;
  apiKey?: string;
}): Promise<string> {
  const key = (input.apiKey || loadApiKey()).trim();
  if (!key) throw new Error("請先在「新增歌曲」填寫 Gemini API Key");

  const japanese = input.japanese.trim();
  if (!japanese) throw new Error("沒有日文句子可分析");

  const userBlock = [
    `日文：${japanese}`,
    input.furigana ? `假名參考：${input.furigana}` : "",
    input.translation ? `既有翻譯（可沿用或微調）：${input.translation}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const models = await resolveModels(key);
  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [{ text: `${ANALYSIS_PROMPT}\n\n${userBlock}` }],
      },
    ],
    generationConfig: { temperature: 0.35 },
  });

  let lastError = "分析失敗：找不到可用模型";
  for (const model of models.slice(0, 5)) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        const payload = (await res.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const text =
          payload.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || "")
            .join("") || "";
        if (!text.trim()) {
          lastError = "AI 沒有回傳分析內容";
          break;
        }
        return cleanAnalysisText(text);
      }
      const errText = await res.text().catch(() => "");
      if (res.status === 400 || res.status === 403) {
        throw new Error("API Key 無效或無權限，請檢查 Gemini Key");
      }
      if (res.status === 404) {
        lastError = `模型 ${model} 不可用`;
        break;
      }
      if (res.status === 429 || res.status === 503) {
        lastError = "Gemini 忙碌中，請稍後再按「重新分析」";
        await sleep(700 * (attempt + 1) * (attempt + 1));
        continue;
      }
      throw new Error(`分析失敗（${res.status}）${errText.slice(0, 100)}`);
    }
  }
  throw new Error(lastError);
}
