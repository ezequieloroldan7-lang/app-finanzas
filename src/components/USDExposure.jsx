import { Wallet } from 'lucide-react';
import { formatARS, formatUSD } from '../lib/formatters';

function USDExposure({ exposure }) {
  return (
    <div className="bg-gradient-to-br from-emerald-950/40 to-zinc-900 border border-emerald-900/40 rounded-3xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/70">
            Exposición en USD
          </div>
          <div className="text-zinc-100 font-medium mt-0.5">
            Cuotas activas en dólares
          </div>
        </div>
        <Wallet size={18} className="text-emerald-400/70" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Total USD</div>
          <div className="font-serif-display text-2xl text-emerald-300 tabular-nums">
            {formatUSD(exposure.totalUSD)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Equivalente ARS</div>
          <div className="font-serif-display text-2xl text-zinc-200 tabular-nums">
            {formatARS(exposure.totalARS)}
          </div>
        </div>
      </div>
      <div className="text-[10px] text-zinc-500 mt-3">
        {exposure.count} compra{exposure.count !== 1 ? 's' : ''} en USD · ARS calculado al cambio de cada compra
      </div>
    </div>
  );
}

export default USDExposure;
