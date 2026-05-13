import { monthKey, convertToARS } from './formatters';
import { cuotaWithInterest, getCuotasDistribution, getRecurringForMonth } from './cuotas';
import { MONTH_NAMES_SHORT } from '../constants';

export function getMonthlyTotals(expenses, recurring, cards, fromYear, fromMonth, monthsCount, cardId) {
  const totals = {};
  const filteredExp = !cardId || cardId === 'all'
    ? expenses
    : expenses.filter(e => e.cardId === cardId);
  for (let i = 0; i < monthsCount; i++) {
    const d = new Date(fromYear, fromMonth + i, 1);
    totals[monthKey(d.getFullYear(), d.getMonth())] = 0;
  }
  for (const exp of filteredExp) {
    for (const c of getCuotasDistribution(exp, cards)) {
      const k = monthKey(c.year, c.month);
      if (k in totals) totals[k] += c.amount;
    }
  }
  for (let i = 0; i < monthsCount; i++) {
    const d = new Date(fromYear, fromMonth + i, 1);
    const k = monthKey(d.getFullYear(), d.getMonth());
    const recurr = getRecurringForMonth(recurring, d.getFullYear(), d.getMonth(), cardId);
    for (const r of recurr) totals[k] += r.cuota.amount;
  }
  return totals;
}

export function getCuotasForMonth(expenses, recurring, cards, year, month, cardId) {
  const result = [];
  for (const exp of expenses) {
    if (cardId && cardId !== 'all' && exp.cardId !== cardId) continue;
    const dist = getCuotasDistribution(exp, cards);
    const m = dist.find(c => c.year === year && c.month === month);
    if (m) result.push({ expense: exp, cuota: m });
  }
  result.push(...getRecurringForMonth(recurring, year, month, cardId));
  return result;
}

export function getCategoryBreakdown(cuotas, categories) {
  const byCategory = {};
  for (const c of cuotas) {
    const catId = c.expense.categoryId;
    byCategory[catId] = (byCategory[catId] || 0) + c.cuota.amount;
  }
  return categories
    .map(cat => ({ ...cat, amount: byCategory[cat.id] || 0 }))
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function getMoMByCategory(expenses, recurring, cards, categories, currentYear, currentMonth, cardId, months = 6) {
  const arr = [];
  for (let i = -(months - 1); i <= 0; i++) {
    const d = new Date(currentYear, currentMonth + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const row = { label: MONTH_NAMES_SHORT[m], year: y, month: m };
    for (const cat of categories) row[cat.id] = 0;
    const cuotas = getCuotasForMonth(expenses, recurring, cards, y, m, cardId);
    for (const c of cuotas) {
      row[c.expense.categoryId] = (row[c.expense.categoryId] || 0) + c.cuota.amount;
    }
    arr.push(row);
  }
  return arr;
}

export function getIncomeForMonth(income, year, month) {
  return income
    .filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, e) => {
      return sum + convertToARS(e.amount, e.currency, e.exchangeRate);
    }, 0);
}

export function getIncomeMoM(income, fromYear, fromMonth, months) {
  const totals = {};
  for (let i = 0; i < months; i++) {
    const d = new Date(fromYear, fromMonth + i, 1);
    const k = monthKey(d.getFullYear(), d.getMonth());
    totals[k] = income
      .filter(e => {
        if (!e.date) return false;
        const ed = new Date(e.date + 'T12:00:00');
        return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
      })
      .reduce((sum, e) => sum + convertToARS(e.amount, e.currency, e.exchangeRate), 0);
  }
  return totals;
}

export function getUSDExposure(expenses, currentYear, currentMonth) {
  let totalUSD = 0;
  let totalARS = 0;
  let count = 0;
  for (const exp of expenses) {
    if (exp.currency !== 'USD') continue;
    const purchaseDate = new Date(exp.date + 'T12:00:00');
    const monthsElapsed =
      (currentYear - purchaseDate.getFullYear()) * 12 +
      (currentMonth - purchaseDate.getMonth());
    const cuotasRemaining = Math.max(0, exp.totalCuotas - Math.max(0, monthsElapsed));
    if (cuotasRemaining <= 0) continue;
    const usdPerCuota = exp.amount / exp.totalCuotas;
    const arsPerCuota = cuotaWithInterest(
      exp.amount * (exp.exchangeRate || 1),
      exp.totalCuotas,
      exp.tna || 0,
    );
    totalUSD += usdPerCuota * cuotasRemaining;
    totalARS += arsPerCuota * cuotasRemaining;
    count++;
  }
  return { totalUSD, totalARS, count };
}
