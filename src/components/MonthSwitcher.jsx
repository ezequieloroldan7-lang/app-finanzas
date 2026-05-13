import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTH_NAMES } from '../constants';

function MonthSwitcher({ year, month, onPrev, onNext, onToday }) {
  const today = new Date();
  const isCurrent = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        onClick={onPrev}
        className="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900/80 border border-zinc-800/60 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 transition-all duration-150"
        aria-label="Mes anterior"
      >
        <ChevronLeft size={18} />
      </button>

      <button onClick={onToday} className="flex-1 text-center group">
        <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 font-semibold mb-0.5">
          Resumen
        </div>
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="text-zinc-50 text-lg font-semibold leading-tight">
            {MONTH_NAMES[month]}
          </span>
          <span className="text-zinc-500 text-sm font-medium tabular-nums">
            {year}
          </span>
        </div>
        {!isCurrent && (
          <div className="text-[9px] text-lime-400/60 mt-0.5 group-hover:text-lime-400 transition-colors font-medium uppercase tracking-wide">
            volver al actual
          </div>
        )}
      </button>

      <button
        onClick={onNext}
        className="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900/80 border border-zinc-800/60 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 transition-all duration-150"
        aria-label="Mes siguiente"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export default MonthSwitcher;
