import type { Line, Song } from "@/types/lyrics";

export const LIBRARY_KEY = "lyrics-library-v1";
export const ACTIVE_SONG_KEY = "lyrics-active-song-v1";
export const API_KEY_STORAGE = "lyrics-gemini-api-key-v1";
export const MASTERY_KEY = "lyrics-mastery-v1";

export function loadLibrary(seed: Song): Song[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) {
      saveLibrary([seed]);
      return [seed];
    }
    const parsed = JSON.parse(raw) as Song[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveLibrary([seed]);
      return [seed];
    }
    // Ensure seed sample exists
    if (!parsed.some((s) => s.id === seed.id)) {
      const next = [seed, ...parsed];
      saveLibrary(next);
      return next;
    }
    return parsed;
  } catch {
    return [seed];
  }
}

export function saveLibrary(songs: Song[]) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(songs));
}

export function loadActiveSongId(fallback: string): string {
  try {
    return localStorage.getItem(ACTIVE_SONG_KEY) || fallback;
  } catch {
    return fallback;
  }
}

export function saveActiveSongId(id: string) {
  localStorage.setItem(ACTIVE_SONG_KEY, id);
}

export function loadApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export function saveApiKey(key: string) {
  if (!key.trim()) localStorage.removeItem(API_KEY_STORAGE);
  else localStorage.setItem(API_KEY_STORAGE, key.trim());
}

export function loadMasteryMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(MASTERY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

export function saveMasteryMap(map: Record<string, number>) {
  localStorage.setItem(MASTERY_KEY, JSON.stringify(map));
}

export function applyMastery(song: Song, map: Record<string, number>): Song {
  return {
    ...song,
    lines: song.lines.map((line) =>
      typeof map[line.id] === "number"
        ? { ...line, mastery: Math.min(5, Math.max(0, map[line.id])) }
        : line
    ),
  };
}

export function upsertSong(songs: Song[], song: Song): Song[] {
  const idx = songs.findIndex((s) => s.id === song.id);
  if (idx === -1) return [...songs, song];
  const next = songs.slice();
  next[idx] = song;
  return next;
}

export function newSongId(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u3040-\u30ff\u4e00-\u9fff-]+/g, "")
    .slice(0, 24);
  return `${slug || "song"}-${Date.now().toString(36)}`;
}

/** Build a song from pasted JP (+ optional ZH) without external API. */
export function songFromPaste(input: {
  title: string;
  artist: string;
  japaneseText: string;
  translationText?: string;
}): Song {
  const jpLines = input.japaneseText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const zhLines = (input.translationText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (jpLines.length === 0) {
    throw new Error("請至少貼上一行日文歌詞");
  }

  const lines: Line[] = jpLines.map((japanese, i) => {
    const hintChar = japanese.match(/[\u3040-\u309F\u30A0-\u30FF]/)?.[0];
    return {
      id: `line-${Date.now().toString(36)}-${i}`,
      japanese,
      furigana: japanese,
      translation: zhLines[i] || "",
      mastery: 0,
      startTime: i * 8,
      hint: hintChar ? `${hintChar}…` : undefined,
    };
  });

  return {
    id: newSongId(input.title),
    title: input.title.trim() || "未命名歌曲",
    artist: input.artist.trim() || "未知演唱者",
    audioUrl: "",
    lines,
  };
}
