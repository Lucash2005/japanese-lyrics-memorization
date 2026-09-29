"use client";

import { ChevronDown, Plus, Trash2 } from "lucide-react";
import type { Song } from "@/types/lyrics";

interface SongPickerProps {
  songs: Song[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export default function SongPicker({
  songs,
  activeId,
  onSelect,
  onAdd,
  onDelete,
}: SongPickerProps) {
  const active = songs.find((s) => s.id === activeId) || songs[0];
  const canDelete = songs.length > 1 && active?.id !== "sakura-michi";

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <select
          value={activeId}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full appearance-none truncate rounded-xl bg-surface-elevated py-2.5 pl-3 pr-9 text-sm text-ink ring-1 ring-border focus:outline-none focus:ring-accent"
          aria-label="選擇歌曲"
        >
          {songs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} — {s.artist}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-accent px-3 py-2.5 text-xs font-semibold text-on-accent"
        aria-label="新增歌曲"
      >
        <Plus className="h-4 w-4" />
        新增
      </button>

      {canDelete && (
        <button
          type="button"
          onClick={() => active && onDelete(active.id)}
          className="inline-flex shrink-0 rounded-xl bg-surface-elevated p-2.5 text-muted ring-1 ring-border hover:text-rose-300"
          aria-label="刪除目前歌曲"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
