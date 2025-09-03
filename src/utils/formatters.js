/**
 * Utility functions for formatting numbers, currency, and percentages
 */

/**
 * Formats large numbers in a compact way (e.g., 1.2M, 3.4K)
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted number
 */
export function formatCompactNumber(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  
  const num = Math.abs(Number(value));
  const sign = value < 0 ? '-' : '';
  
  if (num >= 1000000) {
    return sign + (num / 1000000).toFixed(decimals) + 'M';
  } else if (num >= 1000) {
    return sign + (num / 1000).toFixed(decimals) + 'K';
  }
  
  return sign + num.toLocaleString('pt-BR', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: decimals 
  });
}

/**
 * Formats currency values in Brazilian Real
 * @param {number} value - The value to format
 * @param {boolean} compact - Whether to use compact notation for large values
 * @returns {string} Formatted currency
 */
export function formatCurrency(value, compact = false) {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  
  const num = Number(value);
  
  if (compact && Math.abs(num) >= 1000) {
    return 'R$ ' + formatCompactNumber(num, 1);
  }
  
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Formats percentage values
 * @param {number} value - The percentage value (0-100)
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage
 */
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  
  return Number(value).toFixed(decimals) + '%';
}

/**
 * Formats numbers with thousands separators
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number
 */
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Determines if a number should be displayed in compact format based on its size
 * @param {number} value - The number to check
 * @param {number} threshold - Threshold above which to use compact format (default: 10000)
 * @returns {boolean} Whether to use compact format
 */
export function shouldUseCompactFormat(value, threshold = 10000) {
  return Math.abs(Number(value)) >= threshold;
}
