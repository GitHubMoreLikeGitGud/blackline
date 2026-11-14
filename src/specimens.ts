import raw from "./specimens.json";

export interface Specimen {
  id: string;
  title: string;
  filename: string;
  blurb: string;
  suggestion: string;
  text: string;
}

function readSpecimens(value: unknown): Specimen[] {
  if (typeof value !== "object" || value === null || !("specimens" in value)) {
    throw new Error("specimens.json is missing a specimens array.");
  }
  const list = (value as { specimens: unknown }).specimens;
  if (!Array.isArray(list)) {
    throw new Error("specimens.json is missing a specimens array.");
  }
  return list.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new Error("A specimen entry is not an object.");
    }
    const record = item as Record<string, unknown>;
    return {
      id: requiredString(record, "id"),
      title: requiredString(record, "title"),
      filename: requiredString(record, "filename"),
      blurb: requiredString(record, "blurb"),
      suggestion: requiredString(record, "suggestion"),
      text: requiredString(record, "text"),
    };
  });
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`A specimen is missing ${key}.`);
  }
  return value;
}

export const specimens: Specimen[] = readSpecimens(raw);

export function specimenById(id: string): Specimen | undefined {
  return specimens.find((specimen) => specimen.id === id);
}
