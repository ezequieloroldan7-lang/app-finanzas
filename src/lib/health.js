import { monthKey } from './formatters';

// 0-100 score with 4 components of 25 each:
// trend (current vs avg(last 3)), future commitment (avg(next 3) / current),
// long cuotas (>12), budget proximity.
export function getHealthScore(monthlyTotals, currentYear, currentMonth, expenses, budget) {
  const k = monthKey(currentYear, currentMonth);
  const current = monthlyTotals[k] || 0;
  const past = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(currentYear, currentMonth - i, 1);
    past.push(monthlyTotals[monthKey(d.getFullYear(), d.getMonth())] || 0);
  }
  const future = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(currentYear, currentMonth + i, 1);
    future.push(monthlyTotals[monthKey(d.getFullYear(), d.getMonth())] || 0);
  }
  const pastNonZero = past.filter(v => v > 0);
  const avgPast = pastNonZero.length > 0
    ? pastNonZero.reduce((s, v) => s + v, 0) / pastNonZero.length
    : 0;
  const avgFuture = future.reduce((s, v) => s + v, 0) / 3;

  // 1. Trend (25)
  let trendScore = 22;
  if (avgPast > 0) {
    const ratio = current / avgPast;
    if (ratio > 1.5) trendScore = 5;
    else if (ratio > 1.2) trendScore = 12;
    else if (ratio > 1.05) trendScore = 18;
    else if (ratio > 0.9) trendScore = 22;
    else trendScore = 25;
  }

  // 2. Future commitment (25)
  let commitScore = 25;
  if (current > 0) {
    const ratio = avgFuture / current;
    if (ratio > 1.1) commitScore = 5;
    else if (ratio > 0.85) commitScore = 12;
    else if (ratio > 0.6) commitScore = 18;
    else if (ratio > 0.3) commitScore = 22;
    else commitScore = 25;
  }

  // 3. Long cuotas (25): % committed in cuotas > 12
  const longCuotaTotal = expenses
    .filter(e => e.totalCuotas > 12)
    .reduce((s, e) => s + e.amount, 0);
  const allTotal = expenses.reduce((s, e) => s + e.amount, 0);
  let longScore = 25;
  if (allTotal > 0) {
    const ratio = longCuotaTotal / allTotal;
    if (ratio > 0.5) longScore = 5;
    else if (ratio > 0.3) longScore = 12;
    else if (ratio > 0.15) longScore = 20;
  }

  // 4. Budget (25): if set, compare current vs budget; else neutral
  let budgetScore = 18;
  if (budget && budget.monthly > 0) {
    const ratio = current / budget.monthly;
    if (ratio > 1.2) budgetScore = 0;
    else if (ratio > 1) budgetScore = 8;
    else if (ratio > 0.9) budgetScore = 16;
    else budgetScore = 25;
  }

  const total = trendScore + commitScore + longScore + budgetScore;
  let label = 'Riesgo';
  let color = '#f87171';
  if (total >= 80) { label = 'Excelente'; color = '#bef264'; }
  else if (total >= 60) { label = 'Bueno'; color = '#84cc16'; }
  else if (total >= 40) { label = 'Atención'; color = '#fbbf24'; }

  return {
    total,
    label,
    color,
    components: { trendScore, commitScore, longScore, budgetScore },
    metrics: {
      current,
      avgPast,
      avgFuture,
      longCuotaPercent: allTotal > 0 ? longCuotaTotal / allTotal : 0,
    },
  };
}
