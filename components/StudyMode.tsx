"use client";

import { useState, type ReactNode } from "react";
import { Languages, Type } from "lucide-react";
import type { Line } from "@/types/lyrics";
import LyricCard from "./LyricCard";

interface StudyModeProps {
  lines: Line[];
}

export default function StudyMode({ lines }: StudyModeProps) {
  const [showFurigana, setShowFurigana] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(lines.map((l) => [l.id, true]))
  );

  const toggleJapanese = (id: string) => {
    setVisibleMap((prev) => ({ ...prev, [id]: !prev[id] }));
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
      </div>

      <p className="text-xs text-muted">點擊卡片可顯示／隱藏該句日文歌詞</p>

      <div className="flex flex-col gap-3">
        {lines.map((line, index) => (
          <LyricCard
            key={line.id}
            line={line}
            index={index}
            showFurigana={showFurigana}
            showTranslation={showTranslation}
            japaneseVisible={visibleMap[line.id] ?? true}
            onToggleJapanese={() => toggleJapanese(line.id)}
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
