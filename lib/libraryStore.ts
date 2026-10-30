import type { Line, Song } from "@/types/lyrics";

const DB_NAME = "lyrics-library-db-v1";
const STORE = "kv";
const DB_KEY = "library";
const LS_KEY = "lyrics-library-v1";
const LS_META = "lyrics-library-saved-at-v1";

interface LibraryBlob {
  updatedAt: number;
  songs: Song[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB 開啟失敗"));
  });
}

async function idbGet(): Promise<LibraryBlob | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(DB_KEY);
      req.onsuccess = () => {
        const val = req.result as LibraryBlob | undefined;
        if (!val || !Array.isArray(val.songs)) resolve(null);
        else resolve(val);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbPut(blob: LibraryBlob): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, DB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

function readLocal(): LibraryBlob | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const songs = JSON.parse(raw) as Song[];
    if (!Array.isArray(songs) || songs.length === 0) return null;
    const updatedAt = Number(localStorage.getItem(LS_META)) || 0;
    return { updatedAt, songs };
  } catch {
    return null;
  }
}

function writeLocal(blob: LibraryBlob) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(blob.songs));
    localStorage.setItem(LS_META, String(blob.updatedAt));
  } catch {
    /* quota — IndexedDB copy still holds the data */
  }
}

function normJp(text: string) {
  return text.replace(/\s+/g, "").trim();
}

function richerLine(a: Line, b: Line): Line {
  const analysis = a.analysis?.trim() || b.analysis?.trim() || undefined;
  return {
    ...a,
    ...b,
    japanese: b.japanese || a.japanese,
    furigana: b.furigana || a.furigana,
    translation: b.translation || a.translation,
    mastery: Math.max(a.mastery || 0, b.mastery || 0),
    analysis,
    hint: b.hint || a.hint,
  };
}

function mergeSongPair(a: Song, b: Song): Song {
  const byId = new Map<string, Line>();
  const byJp = new Map<string, Line>();
  for (const line of [...a.lines, ...b.lines]) {
    const prevId = byId.get(line.id);
    byId.set(line.id, prevId ? richerLine(prevId, line) : line);
    const key = normJp(line.japanese);
    if (!key) continue;
    const prevJp = byJp.get(key);
    byJp.set(key, prevJp ? richerLine(prevJp, line) : line);
  }
  const base = a.lines.length >= b.lines.length ? a : b;
  const other = base === a ? b : a;
  return {
    ...base,
    title: base.title || other.title,
    artist: base.artist || other.artist,
    lines: base.lines.map((line) => {
      const fromId = byId.get(line.id);
      const fromJp = byJp.get(normJp(line.japanese));
      const analysis =
        line.analysis?.trim() ||
        fromId?.analysis?.trim() ||
        fromJp?.analysis?.trim() ||
        undefined;
      return analysis ? { ...line, analysis } : line;
    }),
  };
}

function mergeLibraries(primary: Song[], extra: Song[]): Song[] {
  const map = new Map<string, Song>();
  for (const song of primary) map.set(song.id, song);
  for (const song of extra) {
    const prev = map.get(song.id);
    map.set(song.id, prev ? mergeSongPair(prev, song) : song);
  }
  return [...map.values()];
}

function analysisCount(songs: Song[]) {
  return songs.reduce(
    (n, song) => n + song.lines.filter((l) => l.analysis?.trim()).length,
    0
  );
}

function ensureSeed(songs: Song[], seed: Song): Song[] {
  if (songs.some((s) => s.id === seed.id)) return songs;
  return [seed, ...songs];
}

/** Load songs from IndexedDB and localStorage, keeping whichever copy has the analyses. */
export async function loadPersistentLibrary(seed: Song): Promise<Song[]> {
  const idb = await idbGet();
  const local = readLocal();
  const blobs = [idb, local].filter((b): b is LibraryBlob => Boolean(b?.songs?.length));

  if (blobs.length === 0) {
    const songs = [seed];
    await savePersistentLibrary(songs);
    return songs;
  }

  const ranked = [...blobs].sort((a, b) => {
    const score = analysisCount(b.songs) - analysisCount(a.songs);
    if (score !== 0) return score;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  let songs = ranked[0].songs;
  for (const blob of ranked.slice(1)) {
    songs = mergeLibraries(songs, blob.songs);
  }
  songs = ensureSeed(songs, seed);
  await savePersistentLibrary(songs);
  return songs;
}

export async function savePersistentLibrary(songs: Song[]): Promise<void> {
  const blob: LibraryBlob = { updatedAt: Date.now(), songs };
  await idbPut(blob);
  writeLocal(blob);
}

export function exportLibraryJson(songs: Song[]): string {
  return JSON.stringify(
    {
      app: "japanese-lyrics-memorization",
      exportedAt: new Date().toISOString(),
      songs,
    },
    null,
    2
  );
}

export function parseImportedLibrary(raw: string, current: Song[]): Song[] {
  const data = JSON.parse(raw) as { songs?: Song[] } | Song[];
  const incoming = Array.isArray(data) ? data : data.songs;
  if (!Array.isArray(incoming) || incoming.length === 0) {
    throw new Error("備份檔裡沒有歌曲");
  }
  const valid = incoming.filter(
    (s) => s && typeof s.id === "string" && Array.isArray(s.lines)
  );
  if (valid.length === 0) throw new Error("備份格式不正確");
  return mergeLibraries(current, valid);
}
