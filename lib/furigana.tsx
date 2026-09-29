import type { ReactNode } from "react";

/**
 * Parse furigana strings like: 桜(さくら)の道(みち)をゆっくり歩(ある)こう
 * into ruby-annotated React nodes.
 */
export function renderFurigana(furigana: string): ReactNode[] {
  const pattern = /([^\s(]+?)\(([^)]+)\)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(furigana)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={`t-${key++}`}>{furigana.slice(lastIndex, match.index)}</span>
      );
    }
    nodes.push(
      <ruby key={`r-${key++}`} className="ruby">
        {match[1]}
        <rp>(</rp>
        <rt>{match[2]}</rt>
        <rp>)</rp>
      </ruby>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < furigana.length) {
    nodes.push(<span key={`t-${key++}`}>{furigana.slice(lastIndex)}</span>);
  }

  return nodes.length > 0 ? nodes : [<span key="plain">{furigana}</span>];
}

/** Strip furigana annotations to get plain reading text (approx). */
export function stripFurigana(furigana: string): string {
  return furigana.replace(/([^\s(]+?)\(([^)]+)\)/g, "$1");
}
