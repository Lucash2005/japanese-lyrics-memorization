export interface Line {
  id: string;
  japanese: string;
  furigana: string; // kanji with reading, e.g. 桜(さくら)の下(した)で
  translation: string; // Traditional Chinese
  mastery: number; // 0–5, default 0
  startTime?: number; // seconds, mock timestamps OK
  hint?: string; // optional initial-sound hint for cloze
  /** Simple grammar / sentence notes in Traditional Chinese */
  analysis?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  lines: Line[];
  audioUrl?: string; // optional placeholder
}

export type AppMode = "study" | "cloze" | "loop";
