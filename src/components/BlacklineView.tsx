import { useRef, useState } from "react";
import { CATEGORIES, asCategory, categoryLabel, type Category } from "../redaction/categories.ts";
import { sourceCaption, type RedactionSpan } from "../redaction/types.ts";

interface BlacklineViewProps {
  transcript: string;
  spans: readonly RedactionSpan[];
  heldCount: number;
  imageLeftDevice: boolean;
  onToggle: (id: string) => void;
  onAdd: (start: number, end: number, category: Category) => void;
}

interface TextPoint {
  node: Text;
  start: number;
}

export function BlacklineView({ transcript, spans, heldCount, imageLeftDevice, onToggle, onAdd }: BlacklineViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [category, setCategory] = useState<Category>("name");
  const segments = segmentTranscript(transcript, spans);
  const noun = heldCount === 1 ? "item" : "items";
  const counter = imageLeftDevice
    ? `${noun} held back from your questions`
    : `${heldCount === 1 ? "item stays" : "items stay"} on your device`;
  const heldNote = imageLeftDevice ? "Kept out of your questions." : "Stays on this device.";

  function refreshSelection() {
    const root = ref.current;
    const indexed = root ? indexTranscript(root) : null;
    if (!root || !indexed || indexed.text !== transcript) {
      setSelection(null);
      return;
    }
    const current = window.getSelection();
    if (!current || current.rangeCount === 0 || current.isCollapsed) {
      setSelection(null);
      return;
    }
    const range = current.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
      setSelection(null);
      return;
    }
    const start = pointOffset(indexed, range.startContainer, range.startOffset);
    const end = pointOffset(indexed, range.endContainer, range.endOffset);
    if (start === null || end === null || start === end) {
      setSelection(null);
      return;
    }
    const from = Math.min(start, end);
    const to = Math.max(start, end);
    if (transcript.slice(from, to).trim().length === 0) {
      setSelection(null);
      return;
    }
    setSelection({ start: from, end: to });
  }

  return (
    <section className="sheet" aria-labelledby="blackline-title">
      <div className="sheet-head">
        <h2 id="blackline-title">Blackline</h2>
        <p className="counter" aria-live="polite">
          <strong>{heldCount}</strong> {counter}
        </p>
      </div>
      <p className="fine">
        {imageLeftDevice
          ? "You sent this photo to the cloud for the read, so these details were in it. Black chips are kept out of your questions. Copper chips will be included if you ask a question. Activate a chip to switch it."
          : "Black chips stay here. Copper chips will be included if you ask a question. Activate a chip to switch it."}
      </p>
      <div className="selection-bar">
        <label>
          Treat a selection as
          <select value={category} onChange={(event) => setCategory(asCategory(event.target.value))}>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {categoryLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button secondary"
          disabled={!selection}
          onClick={() => {
            if (!selection) return;
            onAdd(selection.start, selection.end, category);
            setSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
        >
          Blackline the selection
        </button>
        <p>{selection ? transcript.slice(selection.start, selection.end) : "Select text in the page to blackline it."}</p>
      </div>
      <div
        className="transcript"
        ref={ref}
        aria-label="Transcribed page with personal details marked"
        onMouseUp={refreshSelection}
        onKeyUp={refreshSelection}
      >
        {segments.map((segment) =>
          segment.kind === "text" ? (
            <span key={segment.key}>{segment.text}</span>
          ) : (
            <button
              key={segment.key}
              type="button"
              className={segment.span.redacted ? "mark held" : "mark released"}
              aria-pressed={segment.span.redacted}
              onClick={() => onToggle(segment.span.id)}
            >
              <span className={segment.span.redacted ? "struck" : undefined}>{segment.text}</span>
              <span data-skip className="mark-tag">
                {" "}
                {segment.span.redacted ? "Held" : "Sent"} · {categoryLabel(segment.span.category)}
              </span>
              <span data-skip className="sr-only">
                {" "}
                {sourceCaption(segment.span.source)}.{" "}
                {segment.span.redacted ? heldNote : "Will be included in the question."}
              </span>
            </button>
          ),
        )}
      </div>
    </section>
  );
}

type Segment =
  | { kind: "text"; key: string; text: string }
  | { kind: "mark"; key: string; span: RedactionSpan; text: string };

function segmentTranscript(text: string, spans: readonly RedactionSpan[]): Segment[] {
  const sorted = [...spans].sort((left, right) => left.start - right.start);
  const parts: Segment[] = [];
  let cursor = 0;
  for (const span of sorted) {
    if (span.start < cursor || span.end > text.length || span.start >= span.end) continue;
    if (span.start > cursor) {
      parts.push({ kind: "text", key: `text-${cursor}`, text: text.slice(cursor, span.start) });
    }
    parts.push({ kind: "mark", key: span.id, span, text: text.slice(span.start, span.end) });
    cursor = span.end;
  }
  if (cursor < text.length) {
    parts.push({ kind: "text", key: `text-${cursor}`, text: text.slice(cursor) });
  }
  return parts;
}

function indexTranscript(root: HTMLElement): { text: string; nodes: TextPoint[] } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(candidate) {
      if (candidate.parentElement?.closest("[data-skip]")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: TextPoint[] = [];
  let text = "";
  let current = walker.nextNode();
  while (current) {
    const node = current as Text;
    nodes.push({ node, start: text.length });
    text += node.textContent ?? "";
    current = walker.nextNode();
  }
  return { text, nodes };
}

function pointOffset(indexed: { text: string; nodes: TextPoint[] }, node: Node, offset: number): number | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const found = indexed.nodes.find((entry) => entry.node === node);
    if (!found) return null;
    return found.start + offset;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const element = node as Element;
  const next = element.childNodes[offset] ?? null;
  if (!next) return indexed.text.length;
  const following = indexed.nodes.find((entry) => entry.node === next || next.contains(entry.node));
  return following ? following.start : indexed.text.length;
}
