export type ParseResult = {
  ratings: Record<string, number | null>;
  commentText: string;
  hasAny: boolean;
};

function clampToRangeOrNull(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  if (value < 1 || value > 10) return null; // reject out-of-range
  return Math.trunc(value);
}

export function parseFeedback(body: string, categories: string[]): ParseResult {
  const ratings: Record<string, number | null> = {};
  const lines = body.split(/\r?\n/);

  // Extract ratings line-by-line to also help form the comment text later
  const ratingLineIndexes = new Set<number>();

  for (const category of categories) {
    const regex = new RegExp(`(^|\\b)${category}\\s*[:\\-]\\s*(\\d{1,2})(\\b|$)`, "i");
    let value: number | null = null;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(regex);
      if (match) {
        const parsed = Number(match[2]);
        value = clampToRangeOrNull(parsed);
        ratingLineIndexes.add(i);
        break; // first occurrence only
      }
    }
    ratings[category] = value;
  }

  // Compose free-form comment: everything after the last rating line or any leftover non-rating lines
  const withoutRatingLines = lines
    .filter((_, idx) => !ratingLineIndexes.has(idx))
    .map((l) => l.trim());

  // Remove an optional label line like "Optional comment:"
  const filtered = withoutRatingLines.filter((l) => l.toLowerCase() !== "optional comment:".toLowerCase());

  // Trim leading empty lines
  while (filtered.length && filtered[0] === "") filtered.shift();
  // Trim trailing empty lines
  while (filtered.length && filtered[filtered.length - 1] === "") filtered.pop();

  const commentText = filtered.join("\n");

  const hasAnyRating = Object.values(ratings).some((v) => typeof v === "number");
  const hasText = commentText.trim().length > 0;

  return {
    ratings,
    commentText,
    hasAny: hasAnyRating || hasText,
  };
} 