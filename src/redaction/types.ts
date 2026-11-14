import type { Category } from "./categories.ts";

export type SpanSource = "regex" | "model" | "both" | "user";

export interface SpanDraft {
  start: number;
  end: number;
  category: Category;
  source: SpanSource;
}

export interface RedactionSpan extends SpanDraft {
  id: string;
  text: string;
  redacted: boolean;
}

export interface ModelFlag {
  text: string;
  category: Category;
}

export function sourceCaption(source: SpanSource): string {
  switch (source) {
    case "regex":
      return "Pattern check";
    case "model":
      return "Model";
    case "both":
      return "Model and pattern check";
    case "user":
      return "Added by you";
    default: {
      const exhaustive: never = source;
      throw new Error(`Unhandled span source ${String(exhaustive)}`);
    }
  }
}
