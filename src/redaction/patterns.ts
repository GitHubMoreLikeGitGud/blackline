import type { Category } from "./categories.ts";
import type { SpanDraft } from "./types.ts";

const MONTH =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

const NUMERIC_DATE = String.raw`(?:0?[1-9]|[12]\d|3[01])[\/\-.](?:0?[1-9]|1[0-2])[\/\-.](?:19|20)\d{2}`;
const ISO_DATE = String.raw`(?:19|20)\d{2}[\/\-.](?:0?[1-9]|1[0-2])[\/\-.](?:0?[1-9]|[12]\d|3[01])`;
const DAY_MONTH_YEAR = String.raw`(?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+(?:${MONTH})\s+(?:19|20)\d{2}`;
const MONTH_DAY_YEAR = String.raw`(?:${MONTH})\s+(?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?,?\s+(?:19|20)\d{2}`;
const DATE = `(?:${NUMERIC_DATE}|${ISO_DATE}|${DAY_MONTH_YEAR}|${MONTH_DAY_YEAR})`;

interface Hit {
  start: number;
  end: number;
  category: Category;
}

export function findRegexSpans(text: string): SpanDraft[] {
  const groups: Hit[][] = [
    collect(text, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "email"),
    collect(text, /\b[STFGM]\d{7}[A-Z]\b/gi, "id"),
    collectIban(text),
    collectCard(text),
    collect(text, /(?:\+65|\(\+?65\))[\s.-]?[3689]\d{3}[\s.-]?\d{4}\b/g, "phone"),
    collect(text, /(?<!\d)[3689]\d{3}[\s-]\d{4}(?!\d)/g, "phone"),
    collect(text, /(?<!\d)\+\d{1,3}[\s.-](?:\(\d{1,4}\)|\d{2,4})[\s.-]\d{3,4}[\s.-]\d{3,4}\b/g, "phone"),
    collectAccount(text),
    collectDob(text),
  ];

  const kept: Hit[] = [];
  for (const group of groups) {
    for (const hit of group) {
      const overlaps = kept.some((existing) => hit.start < existing.end && hit.end > existing.start);
      if (!overlaps) kept.push(hit);
    }
  }

  return kept
    .sort((left, right) => left.start - right.start)
    .map((hit) => ({
      start: hit.start,
      end: hit.end,
      category: hit.category,
      source: "regex" as const,
    }));
}

function collect(text: string, pattern: RegExp, category: Category): Hit[] {
  const hits: Hit[] = [];
  for (const match of text.matchAll(pattern)) {
    const value = match[0];
    if (match.index === undefined || value.length === 0) continue;
    hits.push({ start: match.index, end: match.index + value.length, category });
  }
  return hits;
}

function collectIban(text: string): Hit[] {
  const pattern = /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}\s?[A-Z0-9]{1,4}\b/gi;
  const hits: Hit[] = [];
  for (const match of text.matchAll(pattern)) {
    const value = match[0];
    if (match.index === undefined) continue;
    const compact = value.replace(/[^A-Z0-9]/gi, "");
    if (compact.length < 15 || compact.length > 34) continue;
    hits.push({ start: match.index, end: match.index + value.length, category: "iban" });
  }
  return hits;
}

function collectCard(text: string): Hit[] {
  const grouped = /(?<!\d)(?:\d{4}[ -]){3}\d{1,7}(?!\d)/g;
  const continuous = /(?<!\d)\d{13,19}(?!\d)/g;
  return [...collect(text, grouped, "card"), ...collect(text, continuous, "card")].filter((hit) => {
    const digits = text.slice(hit.start, hit.end).replace(/\D/g, "");
    return digits.length >= 13 && digits.length <= 19;
  });
}

function collectAccount(text: string): Hit[] {
  const pattern =
    /\b(?:account|a\/c|acct\.?)(?:\s+(?:no\.?|number|#))?[:\s#-]*([0-9](?:[0-9\s-]{4,20}[0-9]))/gi;
  const hits: Hit[] = [];
  for (const match of text.matchAll(pattern)) {
    const bounds = captureBounds(match, 1);
    if (!bounds) continue;
    const digits = text.slice(bounds.start, bounds.end).replace(/\D/g, "");
    if (digits.length < 6 || digits.length > 18) continue;
    hits.push({ start: bounds.start, end: bounds.end, category: "account" });
  }
  return hits;
}

function collectDob(text: string): Hit[] {
  const pattern = new RegExp(
    String.raw`(?:d\.?\s*o\.?\s*b\.?|date\s+of\s+birth|birth\s+date|born(?:\s+on)?)\s*[:\-]?\s*(${DATE})`,
    "gi",
  );
  const hits: Hit[] = [];
  for (const match of text.matchAll(pattern)) {
    const bounds = captureBounds(match, 1);
    if (!bounds) continue;
    hits.push({ start: bounds.start, end: bounds.end, category: "dob" });
  }
  return hits;
}

function captureBounds(match: RegExpMatchArray, group: number): { start: number; end: number } | null {
  const value = match[group];
  if (typeof value !== "string" || value.length === 0 || match.index === undefined) return null;
  const offset = match[0].lastIndexOf(value);
  if (offset < 0) return null;
  const start = match.index + offset;
  return { start, end: start + value.length };
}
