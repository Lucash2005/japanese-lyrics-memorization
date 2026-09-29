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
  const hasSrc = Boolean(audioUrl && audioUrl.trim().length > 0);

  useEffect(() => {
    setSpeechOk(isSpeechSupported());
    return () => stopSpeaking();
  }, []);

  const clearSeek = useCallback(() => setSeekTo(null), []);

  const playSentence = (line: Line) => {
    if (hasSrc) {
      setSeekTo(typeof line.startTime === "number" ? line.startTime : 0);
      return;
    }
    // No song audio file → speak the line with TTS
    void speakJapanese(line.furigana || line.japanese, {
      rate: rate >= 1 ? 1 : rate,
    }).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-4">
      <AudioPlayer
        audioUrl={audioUrl}
        seekTo={seekTo}
        onSeekHandled={clearSeek}
        playbackRate={rate}
      />

      {!hasSrc && speechOk && (
        <p className="text-xs text-muted">
          尚未加入歌曲音檔時，「播放句子」會改用系統日文語音朗讀該句。
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">播放速度</span>
        {([0.75, 0.9, 1.0] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRate(r)}
            className={`rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition ${
              rate === r
                ? "bg-accent text-on-accent"
                : "bg-surface-elevated text-muted ring-1 ring-border hover:text-ink"
            }`}
          >
            {r.toFixed(2).replace(/0$/, "")}x
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {lines.map((line, index) => (
          <li
            key={line.id}
            className="flex items-center gap-3 rounded-xl bg-surface-elevated px-3 py-3 ring-1 ring-border sm:px-4"
          >
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
              onClick={() => playSentence(line)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent/15 px-2.5 py-2 text-xs font-medium text-accent ring-1 ring-accent/30 transition hover:bg-accent/25"
              aria-label={`播放第 ${index + 1} 句`}
            >
              {hasSrc ? (
                <SkipBack className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {hasSrc ? "播放句子" : "朗讀"}
              </span>
              <span className="font-mono opacity-80">
                {formatTime(line.startTime ?? 0)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
