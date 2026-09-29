"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import type { Song } from "@/types/lyrics";
import { generateSongWithGemini } from "@/lib/generateSong";
import { loadApiKey, saveApiKey, songFromPaste } from "@/lib/songLibrary";

interface AddSongDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (song: Song) => void;
}

export default function AddSongDialog({
  open,
  onClose,
  onCreated,
}: AddSongDialogProps) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [japaneseText, setJapaneseText] = useState("");
  const [translationText, setTranslationText] = useState("");
  const [apiKey, setApiKey] = useState(() =>
    typeof window !== "undefined" ? loadApiKey() : ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setTitle("");
    setArtist("");
    setJapaneseText("");
    setTranslationText("");
    setError(null);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const handlePasteSave = () => {
    setError(null);
    try {
      const song = songFromPaste({
        title,
        artist,
        japaneseText,
        translationText,
      });
      onCreated(song);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "建立失敗");
    }
  };

  const handleAiGenerate = async () => {
    setError(null);
    if (!title.trim()) {
      setError("請輸入歌名");
      return;
    }
    setBusy(true);
    try {
      saveApiKey(apiKey);
      const song = await generateSongWithGemini({
        title: title.trim(),
        artist: artist.trim() || "未知",
        japaneseText: japaneseText.trim() || undefined,
        apiKey,
      });
      onCreated(song);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "產生失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="新增歌曲"
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface-elevated ring-1 ring-border sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-ink">新增歌曲</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-ink"
            aria-label="關閉"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <p className="text-xs leading-relaxed text-muted">
            可貼上你已有的日文歌詞來建立（不必重編譯）。若只有歌名／演唱者並用 AI
            產生，將建立「原創練習歌詞」，不會抓取受著作權保護的原曲歌詞。
          </p>

          <Field label="歌名">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：桜の道"
              className="field-input"
            />
          </Field>

          <Field label="演唱者">
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="例如：練習用／歌手名"
              className="field-input"
            />
          </Field>

          <Field label="日文歌詞（每行一句，建議貼上）">
            <textarea
              value={japaneseText}
              onChange={(e) => setJapaneseText(e.target.value)}
              rows={5}
              placeholder={"桜の道をゆっくり歩こう\n風がそっと髪を揺らす"}
              className="field-input resize-y font-jp"
              lang="ja"
            />
          </Field>

          <Field label="繁中翻譯（選填，每行對應一句）">
            <textarea
              value={translationText}
              onChange={(e) => setTranslationText(e.target.value)}
              rows={3}
              placeholder={"慢慢走在櫻花大道上吧\n風輕輕地搖晃著頭髮"}
              className="field-input resize-y"
            />
          </Field>

          <Field label="Gemini API Key（選填，用於 AI 假名／翻譯）">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="field-input font-mono text-xs"
              autoComplete="off"
            />
            <p className="mt-1 text-[11px] text-muted">
              Key 只存在你的手機瀏覽器，不會上傳到我們的伺服器。可到 Google AI Studio 免費申請。
            </p>
          </Field>

          {error && (
            <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-400/30">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border p-4">
          <button
            type="button"
            disabled={busy || !japaneseText.trim()}
            onClick={handlePasteSave}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-surface px-4 py-3 text-sm font-medium text-ink ring-1 ring-border transition hover:bg-surface-hover disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            用貼上的歌詞建立
          </button>
          <button
            type="button"
            disabled={busy || !title.trim() || !apiKey.trim()}
            onClick={handleAiGenerate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {japaneseText.trim() ? "AI 補上假名與翻譯" : "AI 產生原創練習歌"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-soft">{label}</span>
      {children}
    </label>
  );
}
