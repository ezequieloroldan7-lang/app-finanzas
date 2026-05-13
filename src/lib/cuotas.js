import { monthKey } from './formatters';

// Returns the actual closing date for a given month.
// If the user explicitly set a closing date for this month (closingDates map),
// that value is used as-is (it's already the real bank date).
// Otherwise falls back to the nominal day with weekend adjustment:
// Argentine banks typically advance the closing to the previous Friday when
// the nominal day falls on Saturday or Sunday.
export function getAdjustedClosingDate(year, month, nominalDay, closingDates = {}) {
  const key = monthKey(year, month);
  const lastDay = new Date(year, month + 1, 0).getDate();

  if (closingDates[key] !== undefined) {
    // User-supplied real closing date — use directly, no weekend shift needed
    return new Date(year, month, Math.min(closingDates[key], lastDay));
  }

  // Auto: clamp + advance Saturday/Sunday to previous Friday
  const d = new Date(year, month, Math.min(nominalDay, lastDay));
  const dow = d.getDay(); // 0=Sun, 6=Sat
  if (dow === 6) d.setDate(d.getDate() - 1); // Saturday → Friday
  if (dow === 0) d.setDate(d.getDate() - 2); // Sunday → Friday
  return d;
}

// Returns { year, month } of the first resumen the purchase falls into.
export function getFirstResumen(purchaseDate, closingDay, closingDates = {}) {
  const purchase = new Date(purchaseDate + 'T12:00:00');
  const y = purchase.getFullYear();
  const m = purchase.getMonth();
  const closing = getAdjustedClosingDate(y, m, closingDay, closingDates);
  closing.setHours(12, 0, 0, 0);
  if (purchase < closing) return { year: y, month: m };
  const next = new Date(y, m + 1, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

// Sistema francés: returns the fixed monthly cuota given amount, n cuotas, annual rate (TNA %).
export function cuotaWithInterest(amount, n, tnaPercent) {
  if (!n || n <= 0) return 0;
  if (!tnaPercent || tnaPercent <= 0) return amount / n;
  const i = (tnaPercent / 100) / 12;
  return amount * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
}

export function getCuotasDistribution(expense, cards) {
  const card = cards.find(c => c.id === expense.cardId);
  if (!card) return [];
  const totalARS = expense.currency === 'USD'
    ? expense.amount * (expense.exchangeRate || 1)
    : expense.amount;
  const cuotaAmount = cuotaWithInterest(totalARS, expense.totalCuotas, expense.tna || 0);
  const first = getFirstResumen(expense.date, card.closingDay, card.closingDates || {});
  const dist = [];
  for (let i = 0; i < expense.totalCuotas; i++) {
    const d = new Date(first.year, first.month + i, 1);
    dist.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      cuotaNum: i + 1,
      totalCuotas: expense.totalCuotas,
      amount: cuotaAmount,
    });
  }
  return dist;
}

export function getSharedCuotasDistribution(expense) {
  const totalARS = expense.currency === 'USD'
    ? expense.amount * (expense.exchangeRate || 1)
    : expense.amount;
  const n = expense.totalCuotas || 1;
  const cuotaAmount = totalARS / n;
  const start = new Date(expense.date + 'T12:00:00');
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth(), cuotaNum: i + 1, totalCuotas: n, amount: cuotaAmount };
  });
}

export function getRecurringForMonth(recurring, year, month, cardId) {
  const result = [];
  const monthEnd = new Date(year, month + 1, 0);
  const monthStart = new Date(year, month, 1);
  for (const r of recurring) {
    if (cardId && cardId !== 'all' && r.cardId !== cardId) continue;
    const start = new Date(r.startDate + 'T12:00:00');
    if (start > monthEnd) continue;
    if (r.endDate) {
      const end = new Date(r.endDate + 'T12:00:00');
      if (end < monthStart) continue;
    }
    const totalARS = r.currency === 'USD'
      ? r.amount * (r.exchangeRate || 1)
      : r.amount;
    result.push({
      isRecurring: true,
      expense: {
        id: 'rec-' + r.id + '-' + monthKey(year, month),
        recurringId: r.id,
        description: r.description,
        amount: r.amount,
        currency: r.currency || 'ARS',
        exchangeRate: r.exchangeRate,
        cardId: r.cardId,
        categoryId: r.categoryId,
        totalCuotas: 1,
        date: new Date(year, month, Math.min(Math.max(r.dayOfMonth || 1, 1), monthEnd.getDate()))
          .toISOString().slice(0, 10),
        isRecurring: true,
      },
      cuota: { amount: totalARS, cuotaNum: 1, totalCuotas: 1, year, month },
    });
  }
  return result;
}
