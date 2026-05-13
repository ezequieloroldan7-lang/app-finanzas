import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatARS } from '../lib/formatters';

async function generateInsights(context) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;

  const messages = [
    {
      role: 'system',
      content: `Sos un asistente financiero personal para Argentina. Analizás datos financieros reales y generás exactamente 3 insights concisos y accionables.
Respondé SOLO con un JSON válido con este formato exacto:
{"insights":[{"type":"positive|negative|warning|tip","text":"insight en español argentino, máximo 80 caracteres"}]}
No escribas nada más fuera del JSON.`,
    },
    {
      role: 'user',
      content: `Analizá estos datos financieros y generá 3 insights:\n${context}`,
    },
  ];

  const res = await fetch('/api/ai-proxy', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, max_tokens: 300, temperature: 0.4 }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';

  try {
    // Extract JSON from response (it might have extra whitespace)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.insights || null;
  } catch {
    return null;
  }
}

function buildContext({ expenses, income, budget, categories, recurring, currentYear, currentMonth }) {
  const monthExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date + 'T12:00:00');
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const byCat = {};
  for (const cat of categories) byCat[cat.id] = { name: cat.name, total: 0 };
  for (const exp of monthExpenses) {
    if (byCat[exp.categoryId]) byCat[exp.categoryId].total += exp.amount;
  }

  const topCats = Object.values(byCat)
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map(c => `${c.name}: ${formatARS(c.total)}`)
    .join(', ');

  const totalExp = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const totalInc = income
    .filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date + 'T12:00:00');
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((s, e) => s + e.amount, 0);

  const budgetLine = budget?.monthly ? `Presupuesto: ${formatARS(budget.monthly)}` : 'Sin presupuesto configurado';
  const recurrLine = recurring.length ? `Recurrentes: ${recurring.length} items` : '';

  return [
    `Mes: ${currentMonth + 1}/${currentYear}`,
    `Total gastos: ${formatARS(totalExp)}`,
    `Total ingresos: ${formatARS(totalInc)}`,
    `Balance: ${formatARS(totalInc - totalExp)}`,
    budgetLine,
    topCats ? `Top categorías: ${topCats}` : '',
    recurrLine,
  ].filter(Boolean).join('\n');
}

const ICONS = {
  positive: CheckCircle2,
  negative: TrendingDown,
  warning: AlertCircle,
  tip: Lightbulb,
};

const COLORS = {
  positive: 'text-emerald-400',
  negative: 'text-red-400',
  warning: 'text-amber-400',
  tip: 'text-lime-400',
};

const BG = {
  positive: 'bg-emerald-400/5 border-emerald-400/15',
  negative: 'bg-red-400/5 border-red-400/15',
  warning: 'bg-amber-400/5 border-amber-400/15',
  tip: 'bg-lime-400/5 border-lime-400/15',
};

export default function ProactiveInsightsCard({ expenses, income, budget, categories, recurring, currentYear, currentMonth }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const generatedKeyRef = useRef(null);

  const monthKey = `${currentYear}-${currentMonth}`;

  const generate = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const ctx = buildContext({ expenses, income, budget, categories, recurring, currentYear, currentMonth });
      const result = await generateInsights(ctx);
      if (result) {
        setInsights(result);
        generatedKeyRef.current = monthKey;
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [expenses, income, budget, categories, recurring, currentYear, currentMonth, monthKey]);

  // Auto-generate once per month when data is loaded
  useEffect(() => {
    if (generatedKeyRef.current === monthKey) return;
    if (expenses.length === 0 && income.length === 0) return;
    generate();
  }, [monthKey]);

  // Don't render if failed and no insights yet (proxy not configured)
  if (failed && !insights) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 transition-all duration-300 hover:border-zinc-700 fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold flex items-center gap-1.5">
            <Sparkles size={10} className="text-lime-400" />
            IA · Insights del mes
          </div>
          <div className="text-zinc-100 font-medium mt-0.5">Análisis automático</div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          aria-label="Regenerar insights"
          className="p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all disabled:opacity-40 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 rounded-2xl shimmer" />
          ))}
        </div>
      )}

      {/* Insights */}
      {!loading && insights && (
        <div className="space-y-2.5">
          {insights.map((ins, i) => {
            const Icon = ICONS[ins.type] || Lightbulb;
            const color = COLORS[ins.type] || 'text-lime-400';
            const bg = BG[ins.type] || 'bg-lime-400/5 border-lime-400/15';
            return (
              <div
                key={i}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-2xl border ${bg}`}
              >
                <Icon size={14} className={`${color} shrink-0 mt-0.5`} />
                <p className="text-xs text-zinc-300 leading-relaxed">{ins.text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
