import { describe, expect, test } from "bun:test";
import { parseFeedback } from "../src/parser";

const categories = ["Clarity", "Timeliness", "CI_Quality", "Review_Helpfulness"];

describe("parseFeedback", () => {
  test("parses standard input with optional comment", () => {
    const body = `Clarity: 8\nTimeliness: 9\nCI_Quality: 7\n\nOptional comment:\nLooks good. The pipeline flaked once.`;
    const res = parseFeedback(body, categories);
    expect(res.hasAny).toBeTrue();
    expect(res.ratings.Clarity).toBe(8);
    expect(res.ratings.Timeliness).toBe(9);
    expect(res.ratings.CI_Quality).toBe(7);
    expect(res.ratings.Review_Helpfulness).toBeNull();
    expect(res.commentText).toContain("Looks good");
  });

  test("rejects out-of-range and keeps text", () => {
    const body = `Clarity: 11\nTimeliness: 0\n\nOptional comment:\nToo many issues.`;
    const res = parseFeedback(body, categories);
    expect(res.ratings.Clarity).toBeNull();
    expect(res.ratings.Timeliness).toBeNull();
    expect(res.commentText).toBe("Too many issues.");
  });

  test("handles hyphen delimiter and spacing", () => {
    const body = `Clarity - 7\nTimeliness:9`;
    const res = parseFeedback(body, categories);
    expect(res.ratings.Clarity).toBe(7);
    expect(res.ratings.Timeliness).toBe(9);
  });

  test("ignores when no ratings and no text", () => {
    const body = `\n\nOptional comment:\n\n`;
    const res = parseFeedback(body, categories);
    expect(res.hasAny).toBeFalse();
  });
}); 