export class BlacklineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlacklineError";
  }
}

export function messageFrom(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) return "Something went wrong before a model call finished.";
  return message.length > 320 ? `${message.slice(0, 317)}…` : message;
}
