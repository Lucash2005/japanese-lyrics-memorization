"use client";

import { useState } from "react";
import { ChevronDown, Eye, EyeOff, Loader2, RefreshCw, Volume2 } from "lucide-react";
import type { Line } from "@/types/lyrics";
import { renderFurigana } from "@/lib/furigana";
import { analyzeLineWithGemini } from "@/lib/analyzeLine";
import { loadApiKey } from "@/lib/songLibrary";

interface LyricCardProps {
  line: Line;
  index: number;
  showFurigana: boolean;
  showTranslation: boolean;
  japaneseVisible: boolean;
  speechEnabled: boolean;
  onToggleJapanese: () => void;
  onSpeak: () => void;
  onAnalysisUpdate?: (lineId: string, analysis: string) => void;
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
  onAnalysisUpdate,
}: LyricCardProps) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analysisText = (line.analysis || "").trim();
  const hasAnalysis = Boolean(analysisText);

  const runAnalyze = async () => {
    if (!onAnalysisUpdate) return;
    setError(null);
    setBusy(true);
    setAnalysisOpen(true);
    try {
      if (!loadApiKey()) {
        throw new Error("請先在「新增歌曲」填寫 Gemini API Key");
      }
      const text = await analyzeLineWithGemini({
        japanese: line.japanese,
        translation: line.translation,
        furigana: line.furigana,
      });
      onAnalysisUpdate(line.id, text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析失敗");
    } finally {
      setBusy(false);
    }
  };

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
            className={`jp-line leading-relaxed text-ink ${
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
        <p className="translation-line mt-3 border-t border-border pt-3 leading-relaxed text-soft">
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

      <div className="mt-3 border-t border-border pt-2">
        <button
          type="button"
          onClick={() => setAnalysisOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-lg py-1.5 text-left text-[11px] font-medium text-muted transition hover:text-accent"
          aria-expanded={analysisOpen}
        >
          <span>
            句子分析
            {!hasAnalysis && (
              <span className="ml-1.5 text-accent/80">（尚未分析）</span>
            )}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${
              analysisOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {analysisOpen && (
          <div className="mt-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted">例句文法（Gemini）</span>
              {onAnalysisUpdate && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAnalyze()}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-accent ring-1 ring-accent/30 transition hover:bg-accent/15 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {hasAnalysis ? "重新分析" : "產生分析"}
                </button>
              )}
            </div>

            {error && (
              <p className="rounded-lg bg-rose-500/10 px-2.5 py-2 text-[11px] text-rose-300 ring-1 ring-rose-400/30">
                {error}
              </p>
            )}

            <div className="rounded-xl bg-surface px-3 py-2.5 text-[12px] leading-relaxed text-soft ring-1 ring-border whitespace-pre-line">
              {busy && !analysisText
                ? "分析產生中…"
                : analysisText ||
                  "此句尚無分析。點「產生分析」可用 Gemini 依文法格式產生（需 API Key）。"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
