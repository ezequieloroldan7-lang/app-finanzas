import { formatARS, formatUSD, convertToARS } from './formatters';
import { supabase } from './supabase';

const GROQ_MODEL = 'llama-3.3-70b-versatile';

export function buildFinancialContext({ expenses, cards, categories, recurring, budget, rates, savingsGoal }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const recentExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date + 'T12:00:00');
    const diffMonths = (year - d.getFullYear()) * 12 + (month - d.getMonth());
    return diffMonths >= 0 && diffMonths <= 2;
  });

  const byCat = {};
  for (const cat of categories) byCat[cat.id] = { name: cat.name, emoji: cat.emoji, total: 0, count: 0 };
  for (const exp of recentExpenses) {
    const ars = convertToARS(exp.amount, exp.currency, exp.exchangeRate);
    if (byCat[exp.categoryId]) { byCat[exp.categoryId].total += ars; byCat[exp.categoryId].count++; }
  }

  const catSummary = Object.values(byCat)
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .map(c => `  - ${c.emoji} ${c.name}: ${formatARS(c.total)} (${c.count} pagos)`)
    .join('\n') || '  (sin datos)';

  const recurringSummary = recurring.length
    ? recurring.map(r => {
        const ars = convertToARS(r.amount, r.currency, r.exchangeRate);
        return `  - ${r.description}: ${formatARS(ars)}/mes`;
      }).join('\n')
    : '  (sin recurrentes)';

  const cardsSummary = cards.length
    ? cards.map(c => `  - ${c.name} (cierra día ${c.closingDay})`).join('\n')
    : '  (sin tarjetas)';

  const currentMonth = today.toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  const ratesSummary = rates
    ? [
        rates.tarjeta ? `  - Tarjeta: $ ${rates.tarjeta.toLocaleString('es-AR')}` : null,
        rates.blue ? `  - Blue: $ ${rates.blue.toLocaleString('es-AR')}` : null,
        rates.oficial ? `  - Oficial: $ ${rates.oficial.toLocaleString('es-AR')}` : null,
      ].filter(Boolean).join('\n') || '  (no disponible)'
    : '  (no disponible)';

  const goalSummary = savingsGoal
    ? (() => {
        const fmt = savingsGoal.currency === 'USD' ? formatUSD : formatARS;
        const deadlineText = savingsGoal.deadline
          ? ` — fecha límite: ${new Date(savingsGoal.deadline + 'T12:00:00').toLocaleDateString('es-AR')}`
          : '';
        return `  - "${savingsGoal.name}": ${fmt(savingsGoal.amount)}${deadlineText}`;
      })()
    : '  (sin meta activa)';

  return `Sos un asistente financiero personal especializado en finanzas argentinas.
Tenés acceso a los datos reales del usuario y das consejos personalizados y concretos.
Hablás en español con tuteo (vos/te/tu), sos directo, amigable y práctico.
No uses "che" ni muletillas de lunfardo — el tono es profesional pero cercano.
Usás emojis cuando acompaña el contexto. Respondés en 2-4 párrafos cortos y claros.
No inventás datos — usá solo los que tenés abajo.
Considerá siempre el contexto argentino: inflación, dólar blue, cuotas sin interés y poder adquisitivo.

===== DATOS DEL USUARIO =====
Fecha actual: ${currentMonth}
Total gastos registrados: ${expenses.length}

Tarjetas de crédito:
${cardsSummary}

Gastos por categoría (últimos 3 meses):
${catSummary}

Gastos recurrentes / suscripciones:
${recurringSummary}

Presupuesto mensual: ${budget?.monthly ? formatARS(budget.monthly) : 'no configurado'}

Cotización USD actual:
${ratesSummary}

Meta de ahorro activa:
${goalSummary}
=============================`;
}

// Llama al proxy serverless — la API key nunca sale del servidor
async function callAiProxy(messages, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No hay sesión activa');

  const res = await fetch('/api/ai-proxy', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, ...options }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  return res.json();
}

export async function sendChatMessage(_apiKey, userMessage, history, systemContext) {
  const messages = [
    { role: 'system', content: systemContext },
    ...history.map(m => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.parts[0].text,
    })),
    { role: 'user', content: userMessage },
  ];

  const data = await callAiProxy(messages, { max_tokens: 800, temperature: 0.7 });
  return data.choices?.[0]?.message?.content ?? '';
}

export async function suggestCategory(description, categoryNames) {
  const messages = [{
    role: 'user',
    content: `Para el gasto "${description.trim()}", ¿cuál de estas categorías es la más apropiada? Respondé SOLO con el nombre exacto, sin nada más. Categorías: ${categoryNames.join(', ')}`,
  }];

  const data = await callAiProxy(messages, { max_tokens: 20, temperature: 0.2, type: 'category' });
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}
