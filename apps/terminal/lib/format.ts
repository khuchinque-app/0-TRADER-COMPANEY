// Utility functions for formatting numbers and currency

/**
 * Format number with locale-aware separators
 */
export function formatNumber(num: number, decimals: number = 2): string {
  if (isNaN(num) || !isFinite(num)) return '-';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency (USDT)
 */
export function formatCurrency(num: number, symbol: string = '$'): string {
  return `${symbol}${formatNumber(num, 2)}`;
}

/**
 * Format percentage
 */
export function formatPercent(num: number): string {
  if (isNaN(num) || !isFinite(num)) return '-';
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

/**
 * Format price with appropriate decimal places based on value
 */
export function formatPrice(num: number): string {
  if (Math.abs(num) >= 1000) return formatNumber(num, 2);
  if (Math.abs(num) >= 1) return formatNumber(num, 4);
  if (Math.abs(num) >= 0.01) return formatNumber(num, 6);
  return formatNumber(num, 8);
}

/**
 * Format quantity
 */
export function formatQuantity(num: number): string {
  if (num >= 1000) return formatNumber(num, 2);
  if (num >= 1) return formatNumber(num, 4);
  return formatNumber(num, 6);
}

/**
 * Quantity for holdings rows: right number of decimals per magnitude,
 * trailing zeros stripped (0.500000 -> 0.5, 10000 -> 10,000) so the column
 * reads like an exchange, not a float dump.
 */
export function formatQuantityClean(num: number): string {
  if (isNaN(num) || !isFinite(num)) return '-';
  return formatQuantity(num).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

/**
 * Convert USDT to IDR
 */
export function usdtToIdr(usdt: number, rate: number): string {
  const idr = usdt * rate;
  return `Rp ${formatNumber(idr, 0)}`;
}

/**
 * Convert IDR to USDT
 */
export function idrToUsdt(idr: number, rate: number): string {
  const usdt = idr / rate;
  return formatCurrency(usdt);
}

/**
 * Shorten long numbers (e.g., 1234567 -> 1.23M)
 */
export function shortenNumber(num: number): string {
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return formatNumber(num);
}

/**
 * Format time
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour12: false });
}

/**
 * Format date + time
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Check if number is positive (green/up) or negative (red/down)
 */
export function getChangeClass(value: number): string {
  if (value > 0) return 'text-green-500';
  if (value < 0) return 'text-red-500';
  return 'text-gray-400';
}
