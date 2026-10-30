"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Music2, Upload } from "lucide-react";
import type { AppMode, Line, Song } from "@/types/lyrics";
import ModeSwitcher from "./ModeSwitcher";
import StudyMode from "./StudyMode";
import ClozeMode from "./ClozeMode";
import LoopMode from "./LoopMode";
import SongPicker from "./SongPicker";
import AddSongDialog from "./AddSongDialog";
import { APP_UPDATED_AT, APP_VERSION, formatUpdatedAt } from "@/lib/version";
import {
  exportLibraryJson,
  loadPersistentLibrary,
  parseImportedLibrary,
  savePersistentLibrary,
} from "@/lib/libraryStore";
import {
  applyMastery,
  loadActiveSongId,
  loadMasteryMap,
  saveActiveSongId,
  saveMasteryMap,
  upsertSong,
} from "@/lib/songLibrary";

interface LyricsAppProps {
  seedSong: Song;
}

export default function LyricsApp({ seedSong }: LyricsAppProps) {
  const [ready, setReady] = useState(false);
  const [songs, setSongs] = useState<Song[]>([seedSong]);
  const [activeId, setActiveId] = useState(seedSong.id);
  const [mode, setMode] = useState<AppMode>("study");
  const [addOpen, setAddOpen] = useState(false);
  const [backupNote, setBackupNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const library = await loadPersistentLibrary(seedSong);
      if (cancelled) return;
      const mastery = loadMasteryMap();
      const withMastery = library.map((s) => applyMastery(s, mastery));
      setSongs(withMastery);
      const savedId = loadActiveSongId(seedSong.id);
      setActiveId(
        withMastery.some((s) => s.id === savedId) ? savedId : withMastery[0].id
      );
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [seedSong]);

  const song = useMemo(
    () => songs.find((s) => s.id === activeId) || songs[0] || seedSong,
    [songs, activeId, seedSong]
  );

  const lines = song.lines;

  const persistSongs = useCallback((next: Song[]) => {
    setSongs(next);
    void savePersistentLibrary(next);
  }, []);

  const patchActiveLines = useCallback((lineId: string, patch: Partial<Line>) => {
    setSongs((prev) => {
      const next = prev.map((s) =>
        s.id !== activeIdRef.current
          ? s
          : {
              ...s,
              lines: s.lines.map((l) =>
                l.id === lineId ? { ...l, ...patch } : l
              ),
            }
      );
      void savePersistentLibrary(next);
      return next;
    });
  }, []);

  const onMasteryChange = useCallback(
    (lineId: string, mastery: number) => {
      const map = loadMasteryMap();
      map[lineId] = mastery;
      saveMasteryMap(map);
      patchActiveLines(lineId, { mastery });
    },
    [patchActiveLines]
  );

  const onAnalysisUpdate = useCallback(
    (lineId: string, analysis: string) => {
      patchActiveLines(lineId, { analysis });
    },
    [patchActiveLines]
  );

  const onSelect = (id: string) => {
    setActiveId(id);
    saveActiveSongId(id);
    setMode("study");
  };

  const onCreated = (created: Song) => {
    const next = upsertSong(songs, created);
    persistSongs(next);
    setActiveId(created.id);
    saveActiveSongId(created.id);
    setMode("study");
  };

  const onExport = async () => {
    const json = exportLibraryJson(songs);
    const file = new File([json], "lyrics-backup.json", {
      type: "application/json",
    });
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "練歌曲庫備份",
        });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = "lyrics-backup.json";
        a.click();
        URL.revokeObjectURL(url);
      }
      setBackupNote("已匯出備份。歌詞與分析都在檔案裡，不含 API Key。");
    } catch {
      setBackupNote("匯出已取消");
    }
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const merged = parseImportedLibrary(text, songs);
      persistSongs(merged);
      setBackupNote(`已匯入，目前 ${merged.length} 首歌。已分析的句子會一併還原。`);
    } catch (e) {
      setBackupNote(e instanceof Error ? e.message : "匯入失敗");
    }
  };

  const onDelete = (id: string) => {
    if (songs.length <= 1) return;
    if (id === seedSong.id) return;
    const next = songs.filter((s) => s.id !== id);
    persistSongs(next);
    const fallback = next[0]?.id || seedSong.id;
    setActiveId(fallback);
    saveActiveSongId(fallback);
  };

  const avgMastery =
    lines.reduce((sum: number, l: Line) => sum + l.mastery, 0) /
    Math.max(1, lines.length);

  if (!ready) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-20 text-sm text-muted">
        載入曲庫中…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8 sm:max-w-xl sm:py-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-accent">
          <Music2 className="h-5 w-5" />
          <p className="text-xs font-medium tracking-[0.2em] uppercase">
            練歌 · 日文歌詞背誦
          </p>
        </div>

        <SongPicker
          songs={songs}
          activeId={song.id}
          onSelect={onSelect}
          onAdd={() => setAddOpen(true)}
          onDelete={onDelete}
        />

        <div>
          <h1
            className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
            lang="ja"
          >
            {song.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{song.artist}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{lines.length} 句</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>平均熟練度 {avgMastery.toFixed(1)} / 5</span>
        </div>
      </header>

      <ModeSwitcher mode={mode} onChange={setMode} />

      <main>
        {mode === "study" && (
          <StudyMode
            key={song.id}
            lines={lines}
            onAnalysisUpdate={onAnalysisUpdate}
          />
        )}
        {mode === "cloze" && (
          <ClozeMode
            key={song.id}
            lines={lines}
            onMasteryChange={onMasteryChange}
          />
        )}
        {mode === "loop" && (
          <LoopMode key={song.id} lines={lines} audioUrl={song.audioUrl} />
        )}
      </main>

      <footer className="space-y-2 pb-6 text-center text-[11px] text-muted/70">
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => void onExport()}
            className="inline-flex items-center gap-1 rounded-lg bg-surface-elevated px-3 py-2 text-[11px] text-soft ring-1 ring-border"
          >
            <Download className="h-3.5 w-3.5" />
            匯出備份
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg bg-surface-elevated px-3 py-2 text-[11px] text-soft ring-1 ring-border"
          >
            <Upload className="h-3.5 w-3.5" />
            匯入備份
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onImportFile(file);
            }}
          />
        </div>
        {backupNote && <p className="text-accent">{backupNote}</p>}
        <p>分析沒有到期日，存在這支手機。觀看不需要 API Key。</p>
        <p>
          iPhone 若超過約一週沒打開本站，Safari 可能清掉本機資料（含分析與 Key）。建議加入主畫面，並偶爾匯出備份。
        </p>
        <p className="font-mono text-muted/80">
          v{APP_VERSION} · 更新 {formatUpdatedAt(APP_UPDATED_AT)}
        </p>
      </footer>

      <AddSongDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={onCreated}
      />
    </div>
  );
}
