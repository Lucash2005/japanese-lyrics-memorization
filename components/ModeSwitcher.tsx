"use client";

import { BookOpen, Layers, Repeat } from "lucide-react";
import type { AppMode } from "@/types/lyrics";

interface ModeSwitcherProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

const modes: { id: AppMode; label: string; icon: typeof BookOpen }[] = [
  { id: "study", label: "學習模式", icon: BookOpen },
  { id: "cloze", label: "遮蔽填空", icon: Layers },
  { id: "loop", label: "單句循環", icon: Repeat },
];

export default function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="學習模式切換"
      className="flex w-full gap-1 rounded-xl bg-surface-elevated p-1 ring-1 ring-border"
    >
      {modes.map(({ id, label, icon: Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-all sm:text-sm ${
              active
                ? "bg-accent text-on-accent shadow-sm"
                : "text-muted hover:bg-surface-hover hover:text-ink"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
