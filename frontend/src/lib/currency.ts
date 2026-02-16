import { useAppStore } from '@/stores/appStore';

/**
 * Format a number as currency based on tenant settings
 */
export function formatCurrency(value: number): string {
  const currency = useAppStore.getState().currentTenant?.settings.currency || 'LKR';
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number as currency without decimals based on tenant settings
 */
export function formatCurrencyCompact(value: number): string {
  const currency = useAppStore.getState().currentTenant?.settings.currency || 'LKR';
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
