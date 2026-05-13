import { formatARS } from '../lib/formatters';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

function BalanceCard({ totalIngresos, totalGastos }) {
  const balance = totalIngresos - totalGastos;
  const positive = balance > 0;
  const zero = balance === 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 transition-all duration-300 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20 fade-in-up cursor-default">
      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-4 font-semibold">
        Balance del mes
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Ingresos */}
        <div className="bg-emerald-400/5 border border-emerald-400/15 rounded-2xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp size={11} className="text-emerald-400" />
            <span className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold">Ingresos</span>
          </div>
          <div className="text-emerald-400 font-semibold tabular-nums text-sm leading-none">
            {formatARS(totalIngresos)}
          </div>
        </div>

        {/* Gastos */}
        <div className="bg-red-400/5 border border-red-400/15 rounded-2xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingDown size={11} className="text-red-400" />
            <span className="text-[10px] uppercase tracking-wider text-red-400/70 font-semibold">Gastos</span>
          </div>
          <div className="text-red-400 font-semibold tabular-nums text-sm leading-none">
            {formatARS(totalGastos)}
          </div>
        </div>
      </div>

      {/* Net result — most prominent */}
      <div className={`rounded-2xl px-4 py-3 flex items-center justify-between ${
        zero
          ? 'bg-zinc-800/40 border border-zinc-700/40'
          : positive
            ? 'bg-emerald-400/8 border border-emerald-400/20'
            : 'bg-red-400/8 border border-red-400/20'
      }`}>
        <div className="flex items-center gap-2">
          {zero
            ? <Minus size={13} className="text-zinc-500" />
            : positive
              ? <TrendingUp size={13} className="text-emerald-400" />
              : <TrendingDown size={13} className="text-red-400" />
          }
          <span className="text-xs text-zinc-400 font-medium">Resultado neto</span>
        </div>
        <div className={`text-xl font-serif-display tabular-nums font-semibold ${
          zero ? 'text-zinc-400' : positive ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {positive ? '+' : ''}{formatARS(balance)}
        </div>
      </div>
    </div>
  );
}

export default BalanceCard;
