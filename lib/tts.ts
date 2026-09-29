import { loadApiKey } from "@/lib/songLibrary";

const SPEAK_RATE = 0.92;
const VOICE_MODE_KEY = "lyrics-voice-mode-v1"; // system | neural
const NEURAL_VOICE_KEY = "lyrics-neural-voice-v1";

export type VoiceMode = "system" | "neural";

const audioCache = new Map<string, string>(); // text+voice -> object URL
let currentAudio: HTMLAudioElement | null = null;
let voicesReady = false;

const TTS_MODELS = [
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
  "gemini-2.0-flash-preview-tts",
];

/** Japanese-friendly Gemini prebuilt voices (multilingual neural). */
export const NEURAL_VOICES = [
  { id: "Kore", label: "Kore（清晰）" },
  { id: "Aoede", label: "Aoede（柔和）" },
  { id: "Charon", label: "Charon（沉穩）" },
  { id: "Fenrir", label: "Fenrir（有力）" },
  { id: "Puck", label: "Puck（輕快）" },
] as const;

function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }
  const synth = window.speechSynthesis;
  const existing = synth.getVoices();
  if (existing.length > 0 || voicesReady) {
    return Promise.resolve(synth.getVoices());
  }
  return new Promise((resolve) => {
    const done = () => {
      voicesReady = true;
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 400);
  });
}

function pickJapaneseVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const ja = voices.filter((v) => v.lang.toLowerCase().startsWith("ja"));
  if (ja.length === 0) return null;
  return (
    ja.find((v) =>
      /enhanced|premium|neural|kyoko|otoya|google|siri/i.test(v.name)
    ) || ja[0]
  );
}

/** Strip 漢字(かな) annotations → plain text for TTS. */
export function plainJapaneseForSpeech(text: string): string {
  return text.replace(/([^\s(]+?)\(([^)]+)\)/g, "$1").trim();
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function loadVoiceMode(): VoiceMode {
  try {
    const v = localStorage.getItem(VOICE_MODE_KEY);
    return v === "neural" ? "neural" : "system";
  } catch {
    return "system";
  }
}

export function saveVoiceMode(mode: VoiceMode) {
  try {
    localStorage.setItem(VOICE_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function loadNeuralVoice(): string {
  try {
    return localStorage.getItem(NEURAL_VOICE_KEY) || "Kore";
  } catch {
    return "Kore";
  }
}

export function saveNeuralVoice(id: string) {
  try {
    localStorage.setItem(NEURAL_VOICE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

async function speakSystem(
  content: string,
  opts?: { rate?: number }
): Promise<void> {
  if (!isSpeechSupported()) {
    throw new Error("此瀏覽器不支援語音朗讀");
  }
  stopSpeaking();
  await new Promise((r) => setTimeout(r, 40));

  const voices = await ensureVoices();
  const voice = pickJapaneseVoice(voices);

  return new Promise((resolve, reject) => {
    const utter = new SpeechSynthesisUtterance(content);
    utter.lang = "ja-JP";
    utter.rate = opts?.rate ?? SPEAK_RATE;
    utter.pitch = 1.02;
    if (voice) utter.voice = voice;
    utter.onend = () => resolve();
    utter.onerror = (e) => {
      if (e.error === "canceled" || e.error === "interrupted") resolve();
      else reject(new Error("朗讀失敗，請確認系統已安裝日文語音"));
    };
    window.speechSynthesis.speak(utter);
  });
}

function pcm16ToWavBlob(base64: string, sampleRate = 24000): Blob {
  const binary = atob(base64);
  const len = binary.length;
  const samples = new Uint8Array(len);
  for (let i = 0; i < len; i++) samples[i] = binary.charCodeAt(i);

  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length, true);

  const pcm = new Uint8Array(buffer, 44);
  pcm.set(samples);
  return new Blob([buffer], { type: "audio/wav" });
}

function parseMimeRate(mime: string | undefined): number {
  const m = mime?.match(/rate=(\d+)/i);
  return m ? Number(m[1]) : 24000;
}

async function fetchNeuralAudio(
  content: string,
  apiKey: string,
  voiceName: string
): Promise<string> {
  const cacheKey = `${voiceName}::${content}`;
  const cached = audioCache.get(cacheKey);
  if (cached) return cached;

  let lastError = "AI 人聲目前不可用";
  for (const model of TTS_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: content }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 404) {
        lastError = `TTS 模型不可用，改試下一個`;
        continue;
      }
      if (res.status === 429 || res.status === 503) {
        lastError = "AI 人聲伺服器忙碌，已改用系統語音";
        throw new Error(lastError);
      }
      if (res.status === 400 || res.status === 403) {
        throw new Error("Gemini API Key 無法使用 AI 人聲，請檢查權限");
      }
      lastError = `AI 人聲失敗（${res.status}）${errText.slice(0, 80)}`;
      continue;
    }

    const payload = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
      }>;
    };
    const inline = payload.candidates?.[0]?.content?.parts?.find(
      (p) => p.inlineData?.data
    )?.inlineData;
    if (!inline?.data) {
      lastError = "AI 人聲沒有回傳音訊";
      continue;
    }

    const rate = parseMimeRate(inline.mimeType);
    const blob =
      inline.mimeType?.includes("wav") || inline.mimeType?.includes("mp3")
        ? new Blob(
            [Uint8Array.from(atob(inline.data), (c) => c.charCodeAt(0))],
            { type: inline.mimeType || "audio/wav" }
          )
        : pcm16ToWavBlob(inline.data, rate);

    const objectUrl = URL.createObjectURL(blob);
    audioCache.set(cacheKey, objectUrl);
    return objectUrl;
  }

  throw new Error(lastError);
}

async function playObjectUrl(url: string, rate = 1): Promise<void> {
  stopSpeaking();
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    currentAudio = audio;
    audio.playbackRate = Math.min(1.25, Math.max(0.7, rate));
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      reject(new Error("音檔播放失敗"));
    };
    void audio.play().catch(reject);
  });
}

/**
 * Speak Japanese. Uses Gemini neural TTS when mode=neural + API key,
 * otherwise falls back to system speechSynthesis.
 */
export async function speakJapanese(
  text: string,
  opts?: { rate?: number; preferNeural?: boolean }
): Promise<void> {
  const content = plainJapaneseForSpeech(text);
  if (!content) return;

  const mode = opts?.preferNeural === false ? "system" : loadVoiceMode();
  const apiKey = loadApiKey();

  if (mode === "neural" && apiKey) {
    try {
      const voice = loadNeuralVoice();
      const url = await fetchNeuralAudio(content, apiKey, voice);
      await playObjectUrl(url, opts?.rate ?? 1);
      return;
    } catch {
      // Fall through to system voice
    }
  }

  await speakSystem(content, opts);
}
