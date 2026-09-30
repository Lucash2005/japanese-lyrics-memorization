"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Pause,
  Play,
  SkipBack,
  Volume2,
  Music,
  Repeat,
  Square,
} from "lucide-react";
import type { Line } from "@/types/lyrics";
import { isSpeechSupported, speakJapanese, stopSpeaking } from "@/lib/tts";

interface AudioPlayerProps {
  audioUrl?: string;
  seekTo?: number | null;
  onSeekHandled?: () => void;
  playbackRate: number;
}

export default function AudioPlayer({
  audioUrl,
  seekTo,
  onSeekHandled,
  playbackRate,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const hasSrc = Boolean(audioUrl && audioUrl.trim().length > 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (seekTo == null || Number.isNaN(seekTo)) return;
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = seekTo;
      setCurrentTime(seekTo);
      if (hasSrc) {
        void audio.play().then(() => setPlaying(true)).catch(() => {
          /* autoplay may be blocked without src or gesture */
        });
      }
    } catch {
      /* seeking before metadata is fine to ignore */
    }
    onSeekHandled?.();
  }, [seekTo, hasSrc, onSeekHandled]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !hasSrc) return;
    if (audio.paused) {
      void audio.play().then(() => setPlaying(true));
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) setCurrentTime(audio.currentTime);
  };

  const onLoaded = () => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration)) {
      setDuration(audio.duration);
    }
  };

  const onSeekBar = (e: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const t = Number(e.target.value);
    if (audio && hasSrc) {
      audio.currentTime = t;
      setCurrentTime(t);
    } else {
      setCurrentTime(t);
    }
  };

  return (
    <div className="rounded-2xl bg-surface-elevated p-4 ring-1 ring-border sm:p-5">
      <audio
        ref={audioRef}
        src={hasSrc ? audioUrl : undefined}
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoaded}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />

      {!hasSrc && (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-surface px-3 py-3 ring-1 ring-border">
          <Music className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
          <div className="text-xs leading-relaxed text-muted">
            <p className="font-medium text-soft">音訊佔位（尚未加入檔案）</p>
            <p className="mt-1">
              將 <code className="text-accent">audioUrl</code> 設為 MP3／音訊路徑後即可播放。
              單句「播放」會 seek 到該句的 <code className="text-accent">startTime</code>。
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!hasSrc}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={playing ? "暫停" : "播放"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <input
            type="range"
            min={0}
            max={hasSrc && duration > 0 ? duration : 60}
            step={0.1}
            value={currentTime}
            onChange={onSeekBar}
            disabled={!hasSrc}
            className="seek-bar w-full"
            aria-label="播放進度"
          />
          <div className="flex justify-between font-mono text-[11px] text-muted">
            <span>{formatTime(currentTime)}</span>
            <span className="inline-flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              {playbackRate.toFixed(2)}x
            </span>
            <span>{formatTime(hasSrc && duration > 0 ? duration : 60)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LoopModeProps {
  lines: Line[];
  audioUrl?: string;
}

export function LoopMode({ lines, audioUrl }: LoopModeProps) {
  const [rate, setRate] = useState(1);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [speechOk, setSpeechOk] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(lines.map((l) => [l.id, true]))
  );
  const [looping, setLooping] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loopCount, setLoopCount] = useState(0);
  const stopRef = useRef(false);
  const hasSrc = Boolean(audioUrl && audioUrl.trim().length > 0);

  useEffect(() => {
    setSpeechOk(isSpeechSupported());
    setSelected(Object.fromEntries(lines.map((l) => [l.id, true])));
    return () => {
      stopRef.current = true;
      stopSpeaking();
    };
  }, [lines]);

  const clearSeek = useCallback(() => setSeekTo(null), []);

  const selectedLines = lines.filter((l) => selected[l.id]);
  const selectedCount = selectedLines.length;
  const allSelected = lines.length > 0 && selectedCount === lines.length;

  const toggleOne = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(Object.fromEntries(lines.map((l) => [l.id, false])));
    } else {
      setSelected(Object.fromEntries(lines.map((l) => [l.id, true])));
    }
  };

  const playSentenceOnce = async (line: Line) => {
    if (hasSrc) {
      const start = typeof line.startTime === "number" ? line.startTime : 0;
      const idx = lines.findIndex((l) => l.id === line.id);
      const nextStart =
        idx >= 0 && idx < lines.length - 1 && typeof lines[idx + 1].startTime === "number"
          ? (lines[idx + 1].startTime as number)
          : start + 8;
      setSeekTo(start);
      await waitForAudioSegment(start, Math.max(nextStart - start, 2), rate);
      return;
    }
    await speakJapanese(line.furigana || line.japanese, {
      rate: rate >= 1 ? 1 : rate,
    });
  };

  const playSentence = (line: Line) => {
    if (looping) return;
    setActiveId(line.id);
    void playSentenceOnce(line)
      .catch(() => {})
      .finally(() => setActiveId(null));
  };

  const stopLoop = () => {
    stopRef.current = true;
    setLooping(false);
    setActiveId(null);
    stopSpeaking();
    const audio = document.querySelector("audio");
    if (audio) {
      audio.pause();
    }
  };

  const startLoop = async () => {
    if (selectedCount === 0 || looping) return;
    stopRef.current = false;
    setLooping(true);
    setLoopCount(0);

    try {
      while (!stopRef.current) {
        const queue = lines.filter((l) => selected[l.id]);
        if (queue.length === 0) break;

        for (const line of queue) {
          if (stopRef.current) break;
          setActiveId(line.id);
          try {
            await playSentenceOnce(line);
          } catch {
            /* continue loop */
          }
          if (stopRef.current) break;
          // short pause between lines
          await sleep(350);
        }
        if (stopRef.current) break;
        setLoopCount((n) => n + 1);
        await sleep(500);
      }
    } finally {
      setLooping(false);
      setActiveId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-surface-elevated px-4 py-3 text-xs leading-relaxed text-muted ring-1 ring-border">
        <p className="font-medium text-soft">怎麼用單句循環</p>
        <ol className="mt-1.5 list-decimal space-y-1 pl-4">
          <li>勾選要練習的句子（可多選）</li>
          <li>按「開始循環」會依序朗讀勾選句，播完再從頭重複</li>
          <li>也可點右側按鈕只播單句一次</li>
        </ol>
      </div>

      <AudioPlayer
        audioUrl={audioUrl}
        seekTo={seekTo}
        onSeekHandled={clearSeek}
        playbackRate={rate}
      />

      {!hasSrc && speechOk && (
        <p className="text-xs text-muted">
          尚未加入歌曲音檔時，會用日文語音（或 AI 人聲）朗讀勾選句子。
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">播放速度</span>
        {([0.75, 0.9, 1.0] as const).map((r) => (
          <button
            key={r}
            type="button"
            disabled={looping}
            onClick={() => setRate(r)}
            className={`rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition disabled:opacity-40 ${
              rate === r
                ? "bg-accent text-on-accent"
                : "bg-surface-elevated text-muted ring-1 ring-border hover:text-ink"
            }`}
          >
            {r.toFixed(2).replace(/0$/, "")}x
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleAll}
          disabled={looping}
          className="rounded-lg bg-surface-elevated px-3 py-2 text-xs font-medium text-soft ring-1 ring-border disabled:opacity-40"
        >
          {allSelected ? "取消全選" : "全選"}
        </button>
        <span className="text-xs text-muted">已選 {selectedCount} 句</span>
        <div className="ml-auto flex gap-2">
          {!looping ? (
            <button
              type="button"
              onClick={() => void startLoop()}
              disabled={selectedCount === 0 || (!hasSrc && !speechOk)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-on-accent disabled:opacity-40"
            >
              <Repeat className="h-3.5 w-3.5" />
              開始循環
            </button>
          ) : (
            <button
              type="button"
              onClick={stopLoop}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-300 ring-1 ring-rose-400/40"
            >
              <Square className="h-3.5 w-3.5" />
              停止
            </button>
          )}
        </div>
      </div>

      {looping && (
        <p className="text-xs text-accent">
          循環中… 已完整輪播 {loopCount} 次
          {activeId
            ? ` · 正在第 ${
                lines.findIndex((l) => l.id === activeId) + 1
              } 句`
            : ""}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {lines.map((line, index) => {
          const isOn = Boolean(selected[line.id]);
          const isActive = activeId === line.id;
          return (
            <li
              key={line.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 ring-1 sm:px-4 ${
                isActive
                  ? "bg-accent/15 ring-accent/40"
                  : isOn
                    ? "bg-surface-elevated ring-border"
                    : "bg-surface/60 ring-border/60 opacity-70"
              }`}
            >
              <label className="flex shrink-0 cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={isOn}
                  disabled={looping}
                  onChange={() => toggleOne(line.id)}
                  className="h-4 w-4 accent-[var(--accent)]"
                  aria-label={`勾選第 ${index + 1} 句`}
                />
              </label>
              <span className="w-6 shrink-0 font-mono text-xs text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink" lang="ja">
                  {line.japanese}
                </p>
                <p className="truncate text-xs text-muted">{line.translation}</p>
              </div>
              <button
                type="button"
                disabled={looping}
                onClick={() => playSentence(line)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent/15 px-2.5 py-2 text-xs font-medium text-accent ring-1 ring-accent/30 transition hover:bg-accent/25 disabled:opacity-40"
                aria-label={`播放第 ${index + 1} 句一次`}
              >
                {hasSrc ? (
                  <SkipBack className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">單次</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Play HTML5 audio from start for durationSec (best-effort segment loop). */
function waitForAudioSegment(
  start: number,
  durationSec: number,
  playbackRate: number
): Promise<void> {
  return new Promise((resolve) => {
    const audio = document.querySelector("audio");
    if (!audio) {
      resolve();
      return;
    }
    const end = start + durationSec;
    const onTime = () => {
      if (audio.currentTime >= end || audio.ended || audio.paused) {
        cleanup();
        audio.pause();
        resolve();
      }
    };
    const cleanup = () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onTime);
    };
    audio.playbackRate = playbackRate;
    try {
      audio.currentTime = start;
    } catch {
      /* ignore */
    }
    void audio.play().catch(() => {
      cleanup();
      resolve();
    });
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onTime);
    // safety timeout
    setTimeout(
      () => {
        cleanup();
        resolve();
      },
      Math.ceil((durationSec * 1000) / Math.max(playbackRate, 0.5)) + 800
    );
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
