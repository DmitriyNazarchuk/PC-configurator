export const COMPONENTS = [
  { id: 'case', label: 'PC case' },
  { id: 'cpu', label: 'Processor' },
  { id: 'motherboard', label: 'Motherboard' },
  { id: 'gpu', label: 'Graphics card' },
  { id: 'ram', label: 'Memory' },
  { id: 'storage', label: 'Storage' },
  { id: 'psu', label: 'Power supply' },
  { id: 'cooler', label: 'CPU cooler' },
];

export const COMPONENT_CATEGORIES = COMPONENTS.map(({ id }) => id);
export const SETUP_FEE_BY_CURRENCY = { GBP: 25, USD: 35 };
export const POWER_BAR_MAX_WATTS = 800;
export const BUILD_CHECK_DEBOUNCE_MS = 350;
export const COMPONENT_SEARCH_DEBOUNCE_MS = 220;
export const BYTES_PER_MEGABYTE = 1024 * 1024;

export function formatMoney(amount, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}
