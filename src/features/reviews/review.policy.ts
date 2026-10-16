export const RATING_WINDOW_MONTHS = 12;
export const PUBLIC_REVIEW_WINDOW_MONTHS = 24;

export function subtractUtcMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() - months);

  return result;
}

export function getRatingCutoff(now = new Date()): Date {
  return subtractUtcMonths(now, RATING_WINDOW_MONTHS);
}

export function getPublicReviewCutoff(now = new Date()): Date {
  return subtractUtcMonths(now, PUBLIC_REVIEW_WINDOW_MONTHS);
}
