const SPEAK_RATE = 0.9;

let voicesReady = false;

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
    // iOS sometimes never fires voiceschanged
    setTimeout(done, 400);
  });
}

function pickJapaneseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const ja = voices.filter((v) => v.lang.toLowerCase().startsWith("ja"));
  if (ja.length === 0) return null;
  // Prefer higher-quality / local voices when labeled
  return (
    ja.find((v) => /enhanced|premium|neural|kyoko|otoya|google/i.test(v.name)) ||
    ja[0]
  );
}

/** Strip 漢字(かな) annotations → plain text for TTS. */
export function plainJapaneseForSpeech(text: string): string {
  return text.replace(/([^\s(]+?)\(([^)]+)\)/g, "$1").trim();
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking() {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}

export async function speakJapanese(
  text: string,
  opts?: { rate?: number }
): Promise<void> {
  if (!isSpeechSupported()) {
    throw new Error("此瀏覽器不支援語音朗讀");
  }
  const content = plainJapaneseForSpeech(text);
  if (!content) return;

  stopSpeaking();
  // Chrome quirk: cancel then speak needs a tick
  await new Promise((r) => setTimeout(r, 40));

  const voices = await ensureVoices();
  const voice = pickJapaneseVoice(voices);

  return new Promise((resolve, reject) => {
    const utter = new SpeechSynthesisUtterance(content);
    utter.lang = "ja-JP";
    utter.rate = opts?.rate ?? SPEAK_RATE;
    if (voice) utter.voice = voice;
    utter.onend = () => resolve();
    utter.onerror = (e) => {
      if (e.error === "canceled" || e.error === "interrupted") resolve();
      else reject(new Error("朗讀失敗，請確認系統已安裝日文語音"));
    };
    window.speechSynthesis.speak(utter);
  });
}
