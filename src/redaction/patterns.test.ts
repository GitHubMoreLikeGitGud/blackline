import { describe, expect, it } from "vitest";
import { specimens } from "../specimens.ts";
import { findRegexSpans } from "./patterns.ts";
import type { SpanDraft } from "./types.ts";

function covers(text: string, spans: readonly SpanDraft[], snippet: string): boolean {
  const at = text.indexOf(snippet);
  if (at < 0) throw new Error(`Snippet not in text: ${snippet}`);
  return spans.some((span) => span.start <= at && span.end >= at + snippet.length);
}

function hits(text: string, spans: readonly SpanDraft[], snippet: string): boolean {
  const at = text.indexOf(snippet);
  if (at < 0) throw new Error(`Snippet not in text: ${snippet}`);
  return spans.some((span) => span.start < at + snippet.length && span.end > at);
}

describe("findRegexSpans", () => {
  it("flags emails, Singapore phones, NRIC-like ids, cards, accounts, and labelled dates of birth", () => {
    const text = [
      "Email ada.specimen@example.com and Ada.Specimen+bills@example.org.",
      "Phone +65 8123 4567, +6581234567, +65-9234-5678, and local 8123 4567.",
      "Also +1 202 555 0147.",
      "NRIC S1234567D, FIN G1234567X, T0123456G, F7654321K, M1234567P.",
      "Card 4242424242424242 and 4242 4242 4242 4242.",
      "Account number: 0102030405.",
      "Date of birth: 15 March 1990.",
      "DOB 01/01/1988.",
      "Born on 1992-07-04.",
      "Birth date: March 15, 1990.",
    ].join("\n");
    const spans = findRegexSpans(text);

    expect(covers(text, spans, "ada.specimen@example.com")).toBe(true);
    expect(covers(text, spans, "Ada.Specimen+bills@example.org")).toBe(true);
    expect(covers(text, spans, "+65 8123 4567")).toBe(true);
    expect(covers(text, spans, "+6581234567")).toBe(true);
    expect(covers(text, spans, "+65-9234-5678")).toBe(true);
    const localPhone = text.lastIndexOf("8123 4567");
    expect(spans.some((span) => span.start === localPhone && span.category === "phone")).toBe(true);
    expect(covers(text, spans, "+1 202 555 0147")).toBe(true);
    expect(covers(text, spans, "S1234567D")).toBe(true);
    expect(covers(text, spans, "G1234567X")).toBe(true);
    expect(covers(text, spans, "T0123456G")).toBe(true);
    expect(covers(text, spans, "F7654321K")).toBe(true);
    expect(covers(text, spans, "M1234567P")).toBe(true);
    expect(covers(text, spans, "4242424242424242")).toBe(true);
    expect(covers(text, spans, "4242 4242 4242 4242")).toBe(true);
    expect(covers(text, spans, "0102030405")).toBe(true);
    expect(covers(text, spans, "15 March 1990")).toBe(true);
    expect(covers(text, spans, "01/01/1988")).toBe(true);
    expect(covers(text, spans, "1992-07-04")).toBe(true);
    expect(covers(text, spans, "March 15, 1990")).toBe(true);
  });

  it("flags compact and spaced IBANs", () => {
    const text = "Pay GB82WEST12345698765432 or GB82 WEST 1234 5698 7654 32 today.";
    const spans = findRegexSpans(text);
    expect(covers(text, spans, "GB82WEST12345698765432")).toBe(true);
    expect(covers(text, spans, "GB82 WEST 1234 5698 7654 32")).toBe(true);
    expect(spans.filter((span) => span.category === "card")).toHaveLength(0);
  });

  it("does not treat invoice dates, short numbers, or prices as personal details", () => {
    const text = "Invoice date: 02 Nov 2026. Lease start: 01/04/2026. Amount 70.50. Ref 1234.";
    const spans = findRegexSpans(text);
    expect(hits(text, spans, "02 Nov 2026")).toBe(false);
    expect(hits(text, spans, "01/04/2026")).toBe(false);
    expect(hits(text, spans, "70.50")).toBe(false);
    expect(spans).toHaveLength(0);
  });

  it("does not flag an 8-digit run that has no separator and no +65 prefix", () => {
    const spans = findRegexSpans("Reference 81234567 is not a spaced phone.");
    expect(spans).toHaveLength(0);
  });

  it("prefers an IBAN over the digit groups inside it", () => {
    const text = "IBAN: GB82 WEST 1234 5698 7654 32";
    const spans = findRegexSpans(text);
    expect(spans.map((span) => span.category)).toEqual(["iban"]);
  });
});

describe("specimen documents", () => {
  it("blacklines the structured details printed on each specimen", () => {
    const medical = specimens.find((specimen) => specimen.id === "medical");
    const lease = specimens.find((specimen) => specimen.id === "lease");
    const payslip = specimens.find((specimen) => specimen.id === "payslip");
    if (!medical || !lease || !payslip) throw new Error("Missing specimen");

    const medicalSpans = findRegexSpans(medical.text);
    expect(covers(medical.text, medicalSpans, "S1234567D")).toBe(true);
    expect(covers(medical.text, medicalSpans, "15 March 1990")).toBe(true);
    expect(covers(medical.text, medicalSpans, "+65 8123 4567")).toBe(true);
    expect(covers(medical.text, medicalSpans, "alex.specimen@example.com")).toBe(true);
    expect(covers(medical.text, medicalSpans, "4242 4242 4242 4242")).toBe(true);
    expect(covers(medical.text, medicalSpans, "001234567890")).toBe(true);
    expect(hits(medical.text, medicalSpans, "02 Nov 2026")).toBe(false);
    expect(hits(medical.text, medicalSpans, "Alex Specimen")).toBe(false);

    const leaseSpans = findRegexSpans(lease.text);
    expect(covers(lease.text, leaseSpans, "G1234567X")).toBe(true);
    expect(covers(lease.text, leaseSpans, "01/01/1988")).toBe(true);
    expect(covers(lease.text, leaseSpans, "+65 9234 5678")).toBe(true);
    expect(covers(lease.text, leaseSpans, "jordan.placeholder@example.com")).toBe(true);
    expect(covers(lease.text, leaseSpans, "0099887766")).toBe(true);
    expect(covers(lease.text, leaseSpans, "GB82 WEST 1234 5698 7654 32")).toBe(true);
    expect(hits(lease.text, leaseSpans, "01/04/2026")).toBe(false);
    expect(hits(lease.text, leaseSpans, "31/03/2028")).toBe(false);
    expect(leaseSpans.some((span) => span.category === "card")).toBe(false);

    const payslipSpans = findRegexSpans(payslip.text);
    expect(covers(payslip.text, payslipSpans, "T0123456G")).toBe(true);
    expect(covers(payslip.text, payslipSpans, "1992-07-04")).toBe(true);
    expect(covers(payslip.text, payslipSpans, "casey.notaperson@example.com")).toBe(true);
    expect(covers(payslip.text, payslipSpans, "8123 4567")).toBe(true);
    expect(covers(payslip.text, payslipSpans, "0102030405")).toBe(true);
  });
});
