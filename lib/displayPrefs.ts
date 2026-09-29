const FURIGANA_KEY = "lyrics-furigana-size-v1";
const TRANSLATION_KEY = "lyrics-translation-size-v1";
const JP_KEY = "lyrics-jp-size-v1";

export interface DisplaySizes {
  furigana: number; // em relative to japanese line
  translation: number; // rem
  japanese: number; // rem
}

export const DEFAULT_SIZES: DisplaySizes = {
  furigana: 0.48,
  translation: 0.875,
  japanese: 1.125,
};

export function loadDisplaySizes(): DisplaySizes {
  try {
    return {
      furigana: Number(localStorage.getItem(FURIGANA_KEY)) || DEFAULT_SIZES.furigana,
      translation:
        Number(localStorage.getItem(TRANSLATION_KEY)) || DEFAULT_SIZES.translation,
      japanese: Number(localStorage.getItem(JP_KEY)) || DEFAULT_SIZES.japanese,
    };
  } catch {
    return { ...DEFAULT_SIZES };
  }
}

export function saveDisplaySizes(sizes: DisplaySizes) {
  try {
    localStorage.setItem(FURIGANA_KEY, String(sizes.furigana));
    localStorage.setItem(TRANSLATION_KEY, String(sizes.translation));
    localStorage.setItem(JP_KEY, String(sizes.japanese));
  } catch {
    /* ignore */
  }
}

export function applyDisplaySizes(sizes: DisplaySizes) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--furigana-size", `${sizes.furigana}em`);
  root.style.setProperty("--translation-size", `${sizes.translation}rem`);
  root.style.setProperty("--jp-line-size", `${sizes.japanese}rem`);
}
