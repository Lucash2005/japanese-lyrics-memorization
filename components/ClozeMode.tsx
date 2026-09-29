"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Volume2,
} from "lucide-react";
import type { Line } from "@/types/lyrics";
import { renderFurigana } from "@/lib/furigana";
import { isSpeechSupported, speakJapanese, stopSpeaking } from "@/lib/tts";

const SPEECH_PREF_KEY = "lyrics-speech-enabled-v1";

interface ClozeModeProps {
  lines: Line[];
  onMasteryChange: (lineId: string, mastery: number) => void;
}

export default function ClozeMode({ lines, onMasteryChange }: ClozeModeProps) {
  // Stable id list — mastery updates must NOT reset the review queue
  const lineIds = useMemo(() => lines.map((l) => l.id).join("|"), [lines]);
  const [queue, setQueue] = useState<string[]>(() => lines.map((l) => l.id));
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [speechOk, setSpeechOk] = useState(false);

  useEffect(() => {
    setSpeechOk(isSpeechSupported());
    try {
      const saved = localStorage.getItem(SPEECH_PREF_KEY);
      if (saved === "0") setSpeechEnabled(false);
      if (saved === "1") setSpeechEnabled(true);
    } catch {
      /* ignore */
    }
    return () => stopSpeaking();
  }, []);

  const lineMap = useMemo(
    () => Object.fromEntries(lines.map((l) => [l.id, l])),
    [lines]
  );

  const currentId = queue[0];
  const current = currentId ? lineMap[currentId] : undefined;
  const total = lines.length;

  const resetSession = useCallback(() => {
    setQueue(lines.map((l) => l.id));
    setRevealed(false);
    setDone(false);
    setReviewed(0);
  }, [lines]);

  useEffect(() => {
    setQueue(lineIds.split("|").filter(Boolean));
    setRevealed(false);
    setDone(false);
    setReviewed(0);
  }, [lineIds]);

  const handleHard = () => {
    if (!current) return;
    onMasteryChange(current.id, 0);
    setQueue((q) => [...q.slice(1), current.id]);
    setRevealed(false);
    setReviewed((n) => n + 1);
  };

  const handleEasy = () => {
    if (!current) return;
    const nextMastery = Math.min(5, current.mastery + 1);
    onMasteryChange(current.id, nextMastery);
    const rest = queue.slice(1);
    setQueue(rest);
    setRevealed(false);
    setReviewed((n) => n + 1);
    if (rest.length === 0) setDone(true);
  };

  const handleReveal = () => {
    setRevealed(true);
    if (speechEnabled && speechOk && current) {
      void speakJapanese(current.furigana || current.japanese).catch(() => {});
    }
  };

  const handleSpeak = () => {
    if (!current) return;
    void speakJapanese(current.furigana || current.japanese).catch(() => {});
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-2xl bg-surface-elevated px-6 py-12 text-center ring-1 ring-border">
        <CheckCircle2 className="h-12 w-12 text-accent" />
        <div>
          <h3 className="text-xl font-semibold text-ink">本輪複習完成</h3>
          <p className="mt-2 text-sm text-muted">
            共複習 {reviewed} 次 · 熟練度已更新
          </p>
        </div>
        <button
          type="button"
          onClick={resetSession}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition hover:brightness-110"
        >
          <RotateCcw className="h-4 w-4" />
          再來一輪
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <p className="text-center text-muted">沒有可複習的句子</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>
          剩餘 {queue.length} / {total} 句
        </span>
        <div className="flex items-center gap-2">
          {speechOk && (
            <button
              type="button"
              onClick={() => {
                setSpeechEnabled((v) => {
                  const next = !v;
                  if (!next) stopSpeaking();
                  try {
                    localStorage.setItem(SPEECH_PREF_KEY, next ? "1" : "0");
                  } catch {
                    /* ignore */
                  }
                  return next;
                });
              }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
                speechEnabled
                  ? "bg-accent/20 text-accent ring-1 ring-accent/40"
                  : "bg-surface-elevated text-muted ring-1 ring-border"
              }`}
              aria-pressed={speechEnabled}
            >
              <Volume2 className="h-3.5 w-3.5" />
              朗讀 {speechEnabled ? "開" : "關"}
            </button>
          )}
          <span>已複習 {reviewed} 次</span>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{
            width: `${Math.min(100, ((total - queue.length) / total) * 100)}%`,
          }}
        />
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-surface-elevated p-6 ring-1 ring-border sm:p-8">
        <p className="translation-line mb-6 text-center leading-relaxed text-soft">
          {current.translation}
        </p>

        <div
          className={`lyric-flip mx-auto min-h-[4.5rem] text-center ${
            revealed ? "is-visible" : "is-hidden"
          }`}
        >
          {revealed ? (
            <p className="jp-line leading-relaxed text-ink" lang="ja">
              {renderFurigana(current.furigana)}
            </p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="select-none text-2xl tracking-[0.35em] text-muted/50">
                ● ● ● ● ●
              </p>
              {current.hint && (
                <p className="text-sm text-muted">
                  提示：<span className="text-accent">{current.hint}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center gap-0.5" aria-label={`熟練度 ${current.mastery}/5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`h-1 w-8 rounded-full ${
                i < current.mastery ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {!revealed ? (
        <button
          type="button"
          onClick={handleReveal}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-on-accent transition hover:brightness-110"
        >
          <Eye className="h-4 w-4" />
          顯示答案
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          {speechEnabled && speechOk && (
            <button
              type="button"
              onClick={handleSpeak}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-surface-elevated px-4 py-2.5 text-sm font-medium text-accent ring-1 ring-accent/30"
            >
              <Volume2 className="h-4 w-4" />
              再朗讀一次
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleHard}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-elevated px-4 py-3 text-sm font-medium text-soft ring-1 ring-border transition hover:ring-rose-400/50 hover:text-rose-300"
            >
              <ThumbsDown className="h-4 w-4" />
              重背
            </button>
            <button
              type="button"
              onClick={handleEasy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent/20 px-4 py-3 text-sm font-medium text-accent ring-1 ring-accent/40 transition hover:bg-accent/30"
            >
              <ThumbsUp className="h-4 w-4" />
              記住
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
