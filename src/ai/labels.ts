import { InferenceMode, InferenceSource, type InferenceMode as InferenceModeName, type InferenceSource as InferenceSourceName } from "firebase/ai";

export function modeLabel(mode: InferenceModeName): string {
  switch (mode) {
    case InferenceMode.PREFER_ON_DEVICE:
      return "PREFER_ON_DEVICE";
    case InferenceMode.ONLY_ON_DEVICE:
      return "ONLY_ON_DEVICE";
    case InferenceMode.ONLY_IN_CLOUD:
      return "ONLY_IN_CLOUD";
    case InferenceMode.PREFER_IN_CLOUD:
      return "PREFER_IN_CLOUD";
    default: {
      const exhaustive: never = mode;
      throw new Error(`Unhandled inference mode ${String(exhaustive)}`);
    }
  }
}

export function sourceBadge(source: InferenceSourceName): "ON DEVICE" | "CLOUD" {
  switch (source) {
    case InferenceSource.ON_DEVICE:
      return "ON DEVICE";
    case InferenceSource.IN_CLOUD:
      return "CLOUD";
    default: {
      const exhaustive: never = source;
      throw new Error(`Unhandled inference source ${String(exhaustive)}`);
    }
  }
}

export function documentLeftDevice(input: {
  mode: InferenceModeName;
  inferenceSource: InferenceSourceName | null;
}): boolean {
  if (input.inferenceSource === InferenceSource.IN_CLOUD) return true;
  if (input.inferenceSource === InferenceSource.ON_DEVICE) return false;
  return input.mode === InferenceMode.ONLY_IN_CLOUD || input.mode === InferenceMode.PREFER_IN_CLOUD;
}
