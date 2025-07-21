// Utility functions for safe number formatting
// Prevents toLocaleString errors when values are undefined

/**
 * Safely formats a number with toLocaleString, handling undefined/null values
 * @param value - The number to format
 * @param defaultValue - Default value if input is undefined/null (default: 0)
 * @param currency - Currency prefix (default: 'Rs')
 * @returns Formatted string
 */
export function formatCurrency(value: number | undefined | null, defaultValue: number = 0, currency: string = 'Rs'): string {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : defaultValue;
  return `${currency} ${safeValue.toLocaleString()}`;
}

/**
 * Safely formats a number with toLocaleString, handling undefined/null values
 * @param value - The number to format
 * @param defaultValue - Default value if input is undefined/null (default: 0)
 * @returns Formatted string
 */
export function formatNumber(value: number | undefined | null, defaultValue: number = 0): string {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : defaultValue;
  return safeValue.toLocaleString();
}

/**
 * Safely formats a number with fixed decimal places
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param defaultValue - Default value if input is undefined/null (default: 0)
 * @returns Formatted string
 */
export function formatDecimal(value: number | undefined | null, decimals: number = 2, defaultValue: number = 0): string {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : defaultValue;
  return safeValue.toFixed(decimals);
}

/**
 * Safely formats a multiplier value (e.g., 2.5x)
 * @param value - The multiplier to format
 * @param defaultValue - Default value if input is undefined/null (default: 1)
 * @returns Formatted string with 'x' suffix
 */
export function formatMultiplier(value: number | undefined | null, defaultValue: number = 1): string {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : defaultValue;
  return `${safeValue.toFixed(2)}x`;
}

/**
 * Safely gets a numeric value, handling undefined/null
 * @param value - The value to check
 * @param defaultValue - Default value if input is undefined/null (default: 0)
 * @returns Safe numeric value
 */
export function safeNumber(value: number | undefined | null, defaultValue: number = 0): number {
  return typeof value === 'number' && !isNaN(value) ? value : defaultValue;
}
