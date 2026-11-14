import { preferCategory, type Category } from "./categories.ts";
import { findRegexSpans } from "./patterns.ts";
import type { ModelFlag, RedactionSpan, SpanDraft, SpanSource } from "./types.ts";

export function buildBlackline(
  transcript: string,
  flags: readonly ModelFlag[],
): { spans: RedactionSpan[]; unmatched: number } {
  const aligned = alignModelFlags(transcript, flags);
  const spans = unionSpans(transcript, [...findRegexSpans(transcript), ...aligned.drafts]);
  return { spans, unmatched: aligned.unmatched };
}

export function alignModelFlags(
  transcript: string,
  flags: readonly ModelFlag[],
): { drafts: SpanDraft[]; unmatched: number } {
  const drafts: SpanDraft[] = [];
  let unmatched = 0;
  for (const flag of flags) {
    const quote = flag.text;
    const trimmed = quote.trim();
    if (trimmed.length < 2) {
      unmatched += 1;
      continue;
    }
    if (quote.length >= Math.max(80, Math.floor(transcript.length * 0.8))) {
      unmatched += 1;
      continue;
    }
    let from = 0;
    let found = false;
    while (from <= transcript.length) {
      const at = transcript.indexOf(quote, from);
      if (at < 0) break;
      found = true;
      drafts.push({
        start: at,
        end: at + quote.length,
        category: flag.category,
        source: "model",
      });
      from = at + Math.max(quote.length, 1);
    }
    if (!found) unmatched += 1;
  }
  return { drafts, unmatched };
}

export function unionSpans(text: string, drafts: readonly SpanDraft[]): RedactionSpan[] {
  const cleaned = drafts
    .filter((draft) => draft.start >= 0 && draft.end <= text.length && draft.end > draft.start)
    .map((draft) => ({ ...draft }))
    .sort((left, right) => left.start - right.start || right.end - left.end);

  const merged: SpanDraft[] = [];
  for (const draft of cleaned) {
    const last = merged[merged.length - 1];
    if (!last || draft.start > last.end) {
      merged.push(draft);
      continue;
    }
    last.end = Math.max(last.end, draft.end);
    last.category = preferCategory(last.category, draft.category);
    last.source = combineSource(last.source, draft.source);
  }

  return merged.map((draft) => ({
    id: `mark-${draft.start}-${draft.end}`,
    start: draft.start,
    end: draft.end,
    text: text.slice(draft.start, draft.end),
    category: draft.category,
    source: draft.source,
    redacted: true,
  }));
}

export function toggleSpan(spans: readonly RedactionSpan[], id: string): RedactionSpan[] {
  return spans.map((span) => (span.id === id ? { ...span, redacted: !span.redacted } : span));
}

export function addUserRedaction(
  text: string,
  spans: readonly RedactionSpan[],
  rawStart: number,
  rawEnd: number,
  category: Category,
): RedactionSpan[] {
  const start = Math.max(0, Math.min(rawStart, rawEnd));
  const end = Math.min(text.length, Math.max(rawStart, rawEnd));
  if (text.slice(start, end).trim().length === 0) return [...spans];

  const overlapping = spans.filter((span) => span.start < end && span.end > start);
  if (overlapping.length === 0) {
    const id = freshId(spans, start, end);
    const next: RedactionSpan = {
      id,
      start,
      end,
      text: text.slice(start, end),
      category,
      source: "user",
      redacted: true,
    };
    return [...spans, next].sort((left, right) => left.start - right.start);
  }

  const unionStart = Math.min(start, ...overlapping.map((span) => span.start));
  const unionEnd = Math.max(end, ...overlapping.map((span) => span.end));
  const kept = spans.filter((span) => !overlapping.includes(span));
  const first = overlapping[0];
  if (!first) return [...spans];
  const merged: RedactionSpan = {
    id: first.id,
    start: unionStart,
    end: unionEnd,
    text: text.slice(unionStart, unionEnd),
    category: overlapping.reduce((current, span) => preferCategory(current, span.category), category),
    source: "user",
    redacted: true,
  };
  return [...kept, merged].sort((left, right) => left.start - right.start);
}

function freshId(spans: readonly RedactionSpan[], start: number, end: number): string {
  const base = `mark-${start}-${end}`;
  if (!spans.some((span) => span.id === base)) return base;
  return `${base}-user`;
}

function combineSource(left: SpanSource, right: SpanSource): SpanSource {
  if (left === right) return left;
  const tags = new Set<SpanSource>([left, right]);
  if (tags.has("user")) return "user";
  if (tags.has("both") || (tags.has("regex") && tags.has("model"))) return "both";
  return "both";
}
