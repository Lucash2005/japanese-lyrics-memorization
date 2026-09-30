"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Music2 } from "lucide-react";
import type { AppMode, Line, Song } from "@/types/lyrics";
import ModeSwitcher from "./ModeSwitcher";
import StudyMode from "./StudyMode";
import ClozeMode from "./ClozeMode";
import LoopMode from "./LoopMode";
import SongPicker from "./SongPicker";
import AddSongDialog from "./AddSongDialog";
import { APP_UPDATED_AT, APP_VERSION, formatUpdatedAt } from "@/lib/version";
import {
  applyMastery,
  loadActiveSongId,
  loadLibrary,
  loadMasteryMap,
  saveActiveSongId,
  saveLibrary,
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

  useEffect(() => {
    const library = loadLibrary(seedSong);
    const mastery = loadMasteryMap();
    const withMastery = library.map((s) => applyMastery(s, mastery));
    setSongs(withMastery);
    const savedId = loadActiveSongId(seedSong.id);
    setActiveId(
      withMastery.some((s) => s.id === savedId) ? savedId : withMastery[0].id
    );
    setReady(true);
  }, [seedSong]);

  const song = useMemo(
    () => songs.find((s) => s.id === activeId) || songs[0] || seedSong,
    [songs, activeId, seedSong]
  );

  const lines = song.lines;

  const persistSongs = useCallback((next: Song[]) => {
    setSongs(next);
    saveLibrary(next);
  }, []);

  const onMasteryChange = useCallback(
    (lineId: string, mastery: number) => {
      const map = loadMasteryMap();
      map[lineId] = mastery;
      saveMasteryMap(map);

      persistSongs(
        songs.map((s) =>
          s.id === song.id
            ? {
                ...s,
                lines: s.lines.map((l) =>
                  l.id === lineId ? { ...l, mastery } : l
                ),
              }
            : s
        )
      );
    },
    [persistSongs, song.id, songs]
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
        {mode === "study" && <StudyMode key={song.id} lines={lines} />}
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

      <footer className="space-y-1 pb-6 text-center text-[11px] text-muted/70">
        <p>新增歌曲會存在此手機瀏覽器，不必重新編譯</p>
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
