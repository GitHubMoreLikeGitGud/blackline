import { BlacklineError } from "../errors.ts";

export type ImageMime = "image/jpeg" | "image/png";

export function imageKind(file: File): ImageMime | null {
  const type = file.type.toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg") return "image/jpeg";
  if (type === "image/png") return "image/png";
  if (type && type !== "application/octet-stream") return null;
  if (/\.jpe?g$/i.test(file.name)) return "image/jpeg";
  if (/\.png$/i.test(file.name)) return "image/png";
  return null;
}

export async function fileToInlinePart(file: File): Promise<{
  type: "inlineData";
  inlineData: { data: string; mimeType: ImageMime };
}> {
  const mimeType = imageKind(file);
  if (!mimeType) {
    throw new BlacklineError("Blackline reads JPEG and PNG only. On-device Gemini Nano does not accept other formats.");
  }
  if (file.size > 7 * 1024 * 1024) {
    throw new BlacklineError("That image is over 7 MB. Export a smaller JPEG or PNG.");
  }
  const dataUrl = await readAsDataUrl(file);
  const comma = dataUrl.indexOf(",");
  const data = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  if (!data) throw new BlacklineError("The image could not be read.");
  return { type: "inlineData", inlineData: { data, mimeType } };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new BlacklineError("The image could not be read."));
    };
    reader.onerror = () => reject(new BlacklineError("The image could not be read."));
    reader.readAsDataURL(file);
  });
}
