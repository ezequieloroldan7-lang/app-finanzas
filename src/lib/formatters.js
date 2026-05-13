export const formatARS = (n) =>
  n === null || n === undefined || isNaN(n)
    ? '$ 0'
    : '$ ' + Math.round(n).toLocaleString('es-AR');

export const formatUSD = (n) =>
  n === null || n === undefined || isNaN(n)
    ? 'US$ 0'
    : 'US$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;

export const uid = () => crypto.randomUUID();

export const convertToARS = (amount, currency, exchangeRate) => {
  if (currency === 'USD') {
    if (!exchangeRate) console.warn('convertToARS: exchangeRate is null/0 for USD amount, defaulting to 1:1');
    return amount * (exchangeRate || 1);
  }
  return amount;
};
