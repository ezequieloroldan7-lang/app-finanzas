const norm = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ');

export function detectRecurring(expenses, recurring) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const cutoff = sixMonthsAgo.toISOString().slice(0, 7);

  // Solo cuotas únicas en los últimos 6 meses
  const recent = expenses.filter(
    e => e.totalCuotas === 1 && e.date.slice(0, 7) >= cutoff,
  );

  // Agrupar por descripción normalizada + tarjeta
  const groups = new Map();
  for (const exp of recent) {
    const key = norm(exp.description) + '|' + exp.cardId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(exp);
  }

  // Descripiones ya configuradas como recurrentes
  const recurringNorms = new Set(recurring.map(r => norm(r.description)));

  const suggestions = [];

  for (const exps of groups.values()) {
    if (exps.length < 2) continue;

    // 2+ meses distintos
    const months = new Set(exps.map(e => e.date.slice(0, 7)));
    if (months.size < 2) continue;

    // Montos consistentes (±20%)
    const amounts = exps.map(e => e.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    if (avg === 0) continue;
    if (!amounts.every(a => Math.abs(a - avg) / avg <= 0.2)) continue;

    const sorted = [...exps].sort((a, b) => b.date.localeCompare(a.date));
    const latest = sorted[0];

    // Ya existe como recurrente
    if (recurringNorms.has(norm(latest.description))) continue;

    // Inferir día del mes como promedio de las fechas
    const days = exps.map(e => parseInt(e.date.slice(8), 10));
    const dayOfMonth = Math.round(days.reduce((a, b) => a + b, 0) / days.length);

    suggestions.push({
      id: norm(latest.description) + '|' + latest.cardId,
      description: latest.description,
      amount: Math.round(avg),
      currency: latest.currency,
      categoryId: latest.categoryId,
      cardId: latest.cardId,
      dayOfMonth,
      startDate: [...exps].sort((a, b) => a.date.localeCompare(b.date))[0].date,
      monthCount: months.size,
    });
  }

  return suggestions;
}
