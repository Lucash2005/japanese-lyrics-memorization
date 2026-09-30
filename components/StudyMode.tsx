"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Languages, Type, Volume2 } from "lucide-react";
import type { Line } from "@/types/lyrics";
import LyricCard from "./LyricCard";
import DisplaySettings from "./DisplaySettings";
import { isSpeechSupported, speakJapanese, stopSpeaking } from "@/lib/tts";

const SPEECH_PREF_KEY = "lyrics-speech-enabled-v1";

interface StudyModeProps {
  lines: Line[];
}

export default function StudyMode({ lines }: StudyModeProps) {
  const [showFurigana, setShowFurigana] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [speechOk, setSpeechOk] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(lines.map((l) => [l.id, true]))
  );

  useEffect(() => {
    setSpeechOk(isSpeechSupported());
    try {
      const saved = localStorage.getItem(SPEECH_PREF_KEY);
      if (saved === "0") setSpeechEnabled(false);
      if (saved === "1") setSpeechEnabled(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const toggleSpeech = () => {
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
  };

  const toggleJapanese = (id: string) => {
    setVisibleMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const onSpeak = async (line: Line) => {
    try {
      setSpeakingId(line.id);
      setVoiceHint(null);
      const result = await speakJapanese(line.furigana || line.japanese);
      if (result.fallbackReason) {
        setVoiceHint(result.fallbackReason);
      } else if (result.engine === "neural") {
        setVoiceHint(
          result.fromCache ? "播放已存音檔（不需 Key）" : "AI 人聲已產生並保存"
        );
        window.setTimeout(() => setVoiceHint(null), 2200);
      }
    } catch {
      setVoiceHint("朗讀失敗，請檢查系統日文語音設定");
    } finally {
      setSpeakingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <ToggleChip
          active={showFurigana}
          onClick={() => setShowFurigana((v) => !v)}
          icon={<Type className="h-3.5 w-3.5" />}
          label="假名"
        />
        <ToggleChip
          active={showTranslation}
          onClick={() => setShowTranslation((v) => !v)}
          icon={<Languages className="h-3.5 w-3.5" />}
          label="中文翻譯"
        />
        {speechOk && (
          <ToggleChip
            active={speechEnabled}
            onClick={toggleSpeech}
            icon={<Volume2 className="h-3.5 w-3.5" />}
            label="朗讀"
          />
        )}
      </div>

      <DisplaySettings />

      <p className="text-xs text-muted">
        點擊卡片可顯示／隱藏日文
        {speechEnabled ? "；點「朗讀」播放該句（可在設定選 AI 人聲）" : ""}
        {speakingId ? " · 播放中…" : ""}
      </p>
      {voiceHint && (
        <p className="rounded-xl bg-surface-elevated px-3 py-2 text-[11px] leading-relaxed text-accent ring-1 ring-accent/30">
          {voiceHint}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {lines.map((line, index) => (
          <LyricCard
            key={line.id}
            line={line}
            index={index}
            showFurigana={showFurigana}
            showTranslation={showTranslation}
            japaneseVisible={visibleMap[line.id] ?? true}
            speechEnabled={speechEnabled && speechOk}
            onToggleJapanese={() => toggleJapanese(line.id)}
            onSpeak={() => onSpeak(line)}
          />
        ))}
      </div>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
        active
          ? "bg-accent/20 text-accent ring-1 ring-accent/40"
          : "bg-surface-elevated text-muted ring-1 ring-border hover:text-ink"
      }`}
    >
      {icon}
      {label}
      <span className="ml-0.5 opacity-70">{active ? "開" : "關"}</span>
    </button>
  );
}
