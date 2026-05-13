import { getAdjustedClosingDate } from './cuotas';
import { supabase } from './supabase';

const STORAGE_KEY = 'card-close-notifs';
const BUDGET_NOTIF_KEY = 'budget-notifs';
const RECURRING_NOTIF_KEY = 'recurring-notifs';
const DAYS_BEFORE = 3;

function getNextClosingDate(closingDay, closingDates = {}) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const y = today.getFullYear();
  const m = today.getMonth();

  const thisMonth = getAdjustedClosingDate(y, m, closingDay, closingDates);
  if (thisMonth.toISOString().slice(0, 10) >= todayStr) return thisMonth;

  const next = new Date(y, m + 1, 1);
  return getAdjustedClosingDate(next.getFullYear(), next.getMonth(), closingDay, closingDates);
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function subscribeToPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, subscription: sub.toJSON() },
      { onConflict: 'user_id' }
    );
  } catch (e) {
    console.warn('push subscribe error:', e);
  }
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unavailable';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function checkCardNotifications(cards) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  })();

  const today = new Date().toISOString().slice(0, 10);
  let changed = false;

  for (const card of cards) {
    const closing = getNextClosingDate(card.closingDay, card.closingDates || {});
    const msUntil = closing - new Date();
    const daysUntil = Math.ceil(msUntil / (1000 * 60 * 60 * 24));

    if (daysUntil >= 0 && daysUntil <= DAYS_BEFORE) {
      const key = `${card.id}-${closing.toISOString().slice(0, 10)}`;
      if (!stored[key]) {
        const body =
          daysUntil === 0
            ? `¡Hoy cierra ${card.name}! Revisá tus gastos del mes.`
            : `${card.name} cierra en ${daysUntil} día${daysUntil !== 1 ? 's' : ''}.`;
        try {
          new Notification('💳 Cierre de tarjeta', { body, icon: '/icon.svg' });
        } catch {
          // Notifications blocked silently
        }
        stored[key] = today;
        changed = true;
      }
    }
  }

  if (changed) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }
}

export function checkBudgetNotification(currentTotal, budget) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!budget || budget <= 0 || currentTotal <= 0) return;

  const pct = currentTotal / budget;
  if (pct < 0.85) return;

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - today.getDate();
  if (daysLeft <= 7) return; // No molestar en la última semana del mes

  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(BUDGET_NOTIF_KEY) || '{}'); }
    catch { return {}; }
  })();

  if (stored[monthKey]) return;

  const body = pct >= 1
    ? `Superaste el presupuesto mensual (${Math.round(pct * 100)}%)`
    : `Usaste el ${Math.round(pct * 100)}% del presupuesto. Quedan ${daysLeft} días del mes.`;

  try {
    new Notification('💰 Presupuesto', { body, icon: '/icon.svg' });
    stored[monthKey] = today.toISOString().slice(0, 10);
    localStorage.setItem(BUDGET_NOTIF_KEY, JSON.stringify(stored));
  } catch { /* noop */ }
}

export function checkRecurringNotifications(recurring) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!recurring?.length) return;

  const today = new Date();
  const todayDay = today.getDate();
  const DAYS_AHEAD = 3;

  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(RECURRING_NOTIF_KEY) || '{}'); }
    catch { return {}; }
  })();

  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  if (stored[monthKey]) return;

  const upcoming = recurring.filter(r => {
    if (!r.dayOfMonth) return false;
    const diff = r.dayOfMonth - todayDay;
    return diff >= 0 && diff <= DAYS_AHEAD;
  });

  if (upcoming.length === 0) return;

  const total = upcoming.reduce((s, r) => s + (r.amount || 0), 0);
  const names = upcoming.map(r => r.description).slice(0, 3).join(', ');
  const body = `${upcoming.length} gasto${upcoming.length > 1 ? 's' : ''} próximo${upcoming.length > 1 ? 's' : ''}: ${names}${total > 0 ? ` ($ ${Math.round(total).toLocaleString('es-AR')})` : ''}`;

  try {
    new Notification('🔔 Gastos recurrentes', { body, icon: '/icon.svg' });
    stored[monthKey] = today.toISOString().slice(0, 10);
    localStorage.setItem(RECURRING_NOTIF_KEY, JSON.stringify(stored));
  } catch { /* noop */ }
}

export function checkLargeExpenseNotification(expense, recentExpenses) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!expense?.amount || expense.amount <= 0) return;

  const today = new Date();
  const daysInMonth = today.getDate();
  if (daysInMonth <= 1 || !recentExpenses?.length) return;

  const monthTotal = recentExpenses
    .filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date + 'T12:00:00');
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    })
    .reduce((s, e) => s + (e.currency === 'ARS' ? e.amount : e.amount * (e.exchangeRate || 1)), 0);

  const dailyAvg = monthTotal / daysInMonth;
  if (dailyAvg <= 0) return;

  const expenseARS = expense.currency === 'ARS'
    ? expense.amount
    : expense.amount * (expense.exchangeRate || 1);

  if (expenseARS < dailyAvg * 2) return;

  try {
    new Notification('⚠️ Gasto grande detectado', {
      body: `"${expense.description}" fue 2x tu promedio diario del mes.`,
      icon: '/icon.svg',
    });
  } catch { /* noop */ }
}
