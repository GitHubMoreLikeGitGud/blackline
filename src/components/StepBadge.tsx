import type { InferenceSource } from "firebase/ai";
import { sourceBadge } from "../ai/labels.ts";

export function StepBadge({ source }: { source: InferenceSource | null }) {
  if (source === null) {
    return <span className="badge unknown">SOURCE UNREPORTED</span>;
  }
  const label = sourceBadge(source);
  const kind = label === "ON DEVICE" ? "device" : "cloud";
  return <span className={`badge ${kind}`}>{label}</span>;
}
