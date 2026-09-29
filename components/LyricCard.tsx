"use client";

import { Eye, EyeOff, Volume2 } from "lucide-react";
import type { Line } from "@/types/lyrics";
import { renderFurigana } from "@/lib/furigana";

interface LyricCardProps {
  line: Line;
  index: number;
  showFurigana: boolean;
  showTranslation: boolean;
  japaneseVisible: boolean;
  speechEnabled: boolean;
  onToggleJapanese: () => void;
  onSpeak: () => void;
}

export default function LyricCard({
  line,
  index,
  showFurigana,
  showTranslation,
  japaneseVisible,
  speechEnabled,
  onToggleJapanese,
  onSpeak,
}: LyricCardProps) {
  return (
    <div className="lyric-card group w-full rounded-2xl bg-surface-elevated p-4 ring-1 ring-border transition-all hover:ring-accent/40 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] tracking-wider text-muted">
          {String(index + 1).padStart(2, "0")}
          {typeof line.startTime === "number" && (
            <span className="ml-2 opacity-70">
              {formatTime(line.startTime)}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {speechEnabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSpeak();
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-accent ring-1 ring-accent/30 transition hover:bg-accent/15"
              aria-label={`朗讀第 ${index + 1} 句`}
            >
              <Volume2 className="h-3.5 w-3.5" />
              朗讀
            </button>
          )}
          <button
            type="button"
            onClick={onToggleJapanese}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted transition hover:text-accent"
            aria-pressed={japaneseVisible}
            aria-label={`${japaneseVisible ? "隱藏" : "顯示"}日文歌詞`}
          >
            {japaneseVisible ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                隱藏
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                顯示
              </>
            )}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleJapanese}
        className="w-full text-left focus-visible:outline-none"
        aria-label={`第 ${index + 1} 句日文區域`}
      >
        <div
          className={`lyric-flip relative min-h-[2.75rem] overflow-hidden ${
            japaneseVisible ? "is-visible" : "is-hidden"
          }`}
        >
          <p
            className={`jp-line text-lg leading-relaxed text-ink sm:text-xl ${
              japaneseVisible ? "opacity-100" : "opacity-0"
            }`}
            lang="ja"
          >
            {showFurigana ? renderFurigana(line.furigana) : line.japanese}
          </p>
          {!japaneseVisible && (
            <p className="absolute inset-0 flex items-center text-sm text-muted/80">
              —— 點擊顯示日文 ——
            </p>
          )}
        </div>
      </button>

      {showTranslation && (
        <p className="mt-3 border-t border-border pt-3 text-sm leading-relaxed text-soft">
          {line.translation}
        </p>
      )}

      <div className="mt-3 flex gap-0.5" aria-label={`熟練度 ${line.mastery}/5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < line.mastery ? "bg-accent" : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
