export const EXTRACTION_PROMPT = [
  "Transcribe this document image into plain text.",
  "Keep the reading order and line breaks. Do not summarise or translate.",
  "Then list personal details that appear in the transcript.",
  "Each flag text must be copied exactly from the transcript, with the same characters and spacing.",
  "Flag personal names, identification numbers, phone numbers, email addresses, postal addresses, dates of birth, and bank, card, or account numbers.",
  "Do not flag organisation names, invoice numbers, prices, or dates that are not a date of birth.",
  "Set uncertain to true if any word is hard to read, and write [illegible] in place of that word.",
  "This page is a fictional specimen. Transcribe only what is visible. Do not invent details.",
].join("\n");

export function buildQuestionPrompt(redactedDocument: string, question: string): string {
  return [
    "Answer the question using only the redacted document below.",
    "Tokens like [redacted:email] were removed on the reader's device and were not sent.",
    "Do not guess the removed text. Do not ask the reader to paste the original document or the photo.",
    "If the remaining text is not enough, say what kind of information is missing.",
    "",
    "Redacted document:",
    redactedDocument.trim(),
    "",
    "Question:",
    question.trim(),
  ].join("\n");
}
