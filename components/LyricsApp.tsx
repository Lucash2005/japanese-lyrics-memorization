"use client";

import { useCallback, useEffect, useState } from "react";
import { Music2 } from "lucide-react";
import type { AppMode, Line, Song } from "@/types/lyrics";
import ModeSwitcher from "./ModeSwitcher";
import StudyMode from "./StudyMode";
import ClozeMode from "./ClozeMode";
import LoopMode from "./LoopMode";

const STORAGE_KEY = "lyrics-mastery-v1";

interface LyricsAppProps {
  song: Song;
}

export default function LyricsApp({ song }: LyricsAppProps) {
  const [mode, setMode] = useState<AppMode>("study");
  const [lines, setLines] = useState<Line[]>(song.lines);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Record<string, number>;
      setLines((prev) =>
        prev.map((line) =>
          typeof saved[line.id] === "number"
            ? { ...line, mastery: Math.min(5, Math.max(0, saved[line.id])) }
            : line
        )
      );
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const persistMastery = useCallback((next: Line[]) => {
    const map: Record<string, number> = {};
    for (const line of next) map[line.id] = line.mastery;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      /* quota / private mode */
    }
  }, []);

  const onMasteryChange = useCallback(
    (lineId: string, mastery: number) => {
      setLines((prev) => {
        const next = prev.map((l) =>
          l.id === lineId ? { ...l, mastery } : l
        );
        persistMastery(next);
        return next;
      });
    },
    [persistMastery]
  );

  const avgMastery =
    lines.reduce((sum, l) => sum + l.mastery, 0) / Math.max(1, lines.length);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8 sm:max-w-xl sm:py-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-accent">
          <Music2 className="h-5 w-5" />
          <p className="text-xs font-medium tracking-[0.2em] uppercase">
            練歌 · 日文歌詞背誦
          </p>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl" lang="ja">
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
        {mode === "study" && <StudyMode lines={lines} />}
        {mode === "cloze" && (
          <ClozeMode lines={lines} onMasteryChange={onMasteryChange} />
        )}
        {mode === "loop" && (
          <LoopMode lines={lines} audioUrl={song.audioUrl} />
        )}
      </main>

      <footer className="pb-6 text-center text-[11px] text-muted/70">
        點擊學習 · 主動回憶 · 單句循環 — 一次練熟一首歌
      </footer>
    </div>
  );
}
