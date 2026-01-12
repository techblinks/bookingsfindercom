/**
 * Shared helper functions for edge functions
 */

/**
 * Format a date string for display
 */
export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Safely parse JSON, returning null on failure
 */
export function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate percentage difference between two numbers
 */
export function calculatePercentageDiff(
  original: number,
  current: number
): number {
  if (original === 0) return 0;
  return Math.round(((original - current) / original) * 100);
}

/**
 * Validate that a date string is in the future
 */
export function isFutureDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currency = 'AUD'
): string {
  return `${currency}$${amount.toLocaleString()}`;
}
