import type { Category } from "./categories.ts";
import type { RedactionSpan } from "./types.ts";

export function redactionToken(category: Category): string {
  return `[redacted:${category}]`;
}

export function applyRedaction(text: string, spans: readonly RedactionSpan[]): string {
  const active = spans
    .filter((span) => span.redacted && span.start >= 0 && span.end <= text.length && span.end > span.start)
    .sort((left, right) => right.start - left.start);

  let output = text;
  let guard = text.length;
  for (const span of active) {
    if (span.end > guard) continue;
    output = `${output.slice(0, span.start)}${redactionToken(span.category)}${output.slice(span.end)}`;
    guard = span.start;
  }
  return output;
}
