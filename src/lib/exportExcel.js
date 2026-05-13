import { cuotaWithInterest } from './cuotas';
import { getMonthlyTotals } from './aggregations';
import { MONTH_NAMES } from '../constants';

export async function exportToExcel({ expenses, recurring, cards, categories }) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const catName = (id) => categories.find(c => c.id === id)?.name || '';
  const cardName = (id) => cards.find(c => c.id === id)?.name || '';

  // ── Hoja 1: Gastos ────────────────────────────────────────────────
  const expRows = expenses.map(e => {
    const arsTotal = e.currency === 'USD'
      ? e.amount * (e.exchangeRate || 1)
      : e.amount;
    const cuotaMensual = cuotaWithInterest(arsTotal, e.totalCuotas, e.tna || 0);
    const totalConInteres = cuotaMensual * e.totalCuotas;
    return {
      Fecha: e.date,
      Descripción: e.description,
      Categoría: catName(e.categoryId),
      Tarjeta: cardName(e.cardId),
      Moneda: e.currency,
      Monto: e.amount,
      'Tipo de cambio': e.currency === 'USD' ? (e.exchangeRate || '') : '',
      'Monto ARS': Math.round(arsTotal),
      Cuotas: e.totalCuotas,
      'TNA (%)': e.tna || 0,
      'Cuota/mes ARS': Math.round(cuotaMensual),
      'Total c/interés ARS': Math.round(totalConInteres),
    };
  });
  const wsExp = XLSX.utils.json_to_sheet(expRows);
  wsExp['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 14 },
    { wch: 8 },  { wch: 12 }, { wch: 14 }, { wch: 12 },
    { wch: 7 },  { wch: 8 },  { wch: 14 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsExp, 'Gastos');

  // ── Hoja 2: Recurrentes ───────────────────────────────────────────
  if (recurring.length > 0) {
    const recRows = recurring.map(r => ({
      Descripción: r.description,
      Categoría: catName(r.categoryId),
      Tarjeta: cardName(r.cardId),
      Moneda: r.currency,
      'Monto mensual': r.amount,
      'Día del mes': r.dayOfMonth,
      'Desde': r.startDate,
      'Hasta': r.endDate || 'Sin fin',
    }));
    const wsRec = XLSX.utils.json_to_sheet(recRows);
    wsRec['!cols'] = [
      { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 8 },
      { wch: 14 }, { wch: 11 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsRec, 'Recurrentes');
  }

  // ── Hoja 3: Resumen mensual (últimos 12 meses) ────────────────────
  const now = new Date();
  const totals = getMonthlyTotals(expenses, recurring, cards, now.getFullYear(), now.getMonth() - 11, 12, 'all');
  const monthRows = Object.entries(totals).map(([key, total]) => {
    const [y, m] = key.split('-').map(Number);
    return {
      Mes: `${MONTH_NAMES[m]} ${y}`,
      'Total ARS': Math.round(total),
    };
  });
  const wsMon = XLSX.utils.json_to_sheet(monthRows);
  wsMon['!cols'] = [{ wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsMon, 'Por mes');

  // ── Descargar ─────────────────────────────────────────────────────
  const filename = `mis-finanzas-${now.toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
