"use client";

import { useEffect, useState } from "react";
import { Settings2, Volume2 } from "lucide-react";
import {
  applyDisplaySizes,
  DEFAULT_SIZES,
  loadDisplaySizes,
  saveDisplaySizes,
  type DisplaySizes,
} from "@/lib/displayPrefs";
import { loadApiKey } from "@/lib/songLibrary";
import {
  loadNeuralVoice,
  loadVoiceMode,
  NEURAL_VOICES,
  saveNeuralVoice,
  saveVoiceMode,
  type VoiceMode,
} from "@/lib/tts";

export default function DisplaySettings() {
  const [open, setOpen] = useState(false);
  const [sizes, setSizes] = useState<DisplaySizes>(DEFAULT_SIZES);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("system");
  const [neuralVoice, setNeuralVoice] = useState("Kore");
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const loaded = loadDisplaySizes();
    setSizes(loaded);
    applyDisplaySizes(loaded);
    setVoiceMode(loadVoiceMode());
    setNeuralVoice(loadNeuralVoice());
    setHasKey(Boolean(loadApiKey()));
  }, []);

  const updateSizes = (patch: Partial<DisplaySizes>) => {
    setSizes((prev) => {
      const next = { ...prev, ...patch };
      saveDisplaySizes(next);
      applyDisplaySizes(next);
      return next;
    });
  };

  return (
    <div className="rounded-2xl bg-surface-elevated ring-1 ring-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
          <Settings2 className="h-4 w-4 text-accent" />
          顯示與語音設定
        </span>
        <span className="text-xs text-muted">{open ? "收合" : "展開"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <SliderRow
            label="假名（音標）大小"
            value={sizes.furigana}
            min={0.32}
            max={0.75}
            step={0.02}
            display={`${Math.round(sizes.furigana * 100)}%`}
            onChange={(v) => updateSizes({ furigana: v })}
          />
          <SliderRow
            label="日文字大小"
            value={sizes.japanese}
            min={0.95}
            max={1.6}
            step={0.05}
            display={`${sizes.japanese.toFixed(2)} rem`}
            onChange={(v) => updateSizes({ japanese: v })}
          />
          <SliderRow
            label="翻譯字大小"
            value={sizes.translation}
            min={0.7}
            max={1.25}
            step={0.05}
            display={`${sizes.translation.toFixed(2)} rem`}
            onChange={(v) => updateSizes({ translation: v })}
          />

          <div className="space-y-2 border-t border-border pt-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-soft">
              <Volume2 className="h-3.5 w-3.5 text-accent" />
              朗讀音色
            </p>
            <div className="grid grid-cols-2 gap-2">
              <ModeBtn
                active={voiceMode === "system"}
                onClick={() => {
                  setVoiceMode("system");
                  saveVoiceMode("system");
                }}
                title="系統語音"
                subtitle="免費、立即"
              />
              <ModeBtn
                active={voiceMode === "neural"}
                onClick={() => {
                  setVoiceMode("neural");
                  saveVoiceMode("neural");
                }}
                title="AI 人聲"
                subtitle={hasKey ? "較自然" : "需 API Key"}
              />
            </div>
            {voiceMode === "neural" && (
              <>
                {!hasKey && (
                  <p className="text-[11px] leading-relaxed text-muted">
                    請在「新增歌曲」填入 Gemini API Key，才能產生接近人聲的音檔。無 Key 時會自動改用系統語音。
                  </p>
                )}
                <label className="block space-y-1.5">
                  <span className="text-[11px] text-muted">人聲角色</span>
                  <select
                    value={neuralVoice}
                    onChange={(e) => {
                      setNeuralVoice(e.target.value);
                      saveNeuralVoice(e.target.value);
                    }}
                    className="field-input"
                  >
                    {NEURAL_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between text-xs text-soft">
        <span>{label}</span>
        <span className="font-mono text-muted">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="seek-bar w-full"
      />
    </label>
  );
}

function ModeBtn({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2.5 text-left transition ${
        active
          ? "bg-accent/20 text-accent ring-1 ring-accent/40"
          : "bg-surface text-muted ring-1 ring-border hover:text-ink"
      }`}
    >
      <span className="block text-xs font-semibold">{title}</span>
      <span className="block text-[10px] opacity-80">{subtitle}</span>
    </button>
  );
}
