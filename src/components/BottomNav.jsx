import { Home, CreditCard, ListChecks, TrendingUp, FolderOpen, Bot } from 'lucide-react';

const TABS = [
  { id: 'inicio',   label: 'Inicio',   Icon: Home },
  { id: 'tarjetas', label: 'Tarjetas', Icon: CreditCard },
  { id: 'gastos',   label: 'Gastos',   Icon: ListChecks },
  { id: 'ingresos', label: 'Ingresos', Icon: TrendingUp },
  { id: 'archivos', label: 'Archivos', Icon: FolderOpen },
  { id: 'chat',     label: 'IA',       Icon: Bot },
];

function BottomNav({ active, onChange }) {
  const activeIndex = TABS.findIndex(t => t.id === active);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navegación principal"
    >
      {/* Sliding active pill — positioned absolutely below the nav items */}
      <div className="relative flex items-stretch">
        {/* Pill indicator */}
        <div
          className="absolute top-1.5 bottom-1.5 rounded-xl bg-lime-400/10 border border-lime-400/15 pointer-events-none transition-all duration-300 ease-out"
          style={{
            left: `calc(${(activeIndex / TABS.length) * 100}% + 6px)`,
            width: `calc(${100 / TABS.length}% - 12px)`,
          }}
          aria-hidden="true"
        />

        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 min-h-[52px] relative transition-all duration-200 cursor-pointer active:scale-90 ${
                isActive ? 'text-lime-400' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              <span className="relative z-10 transition-transform duration-200">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  className={isActive ? 'drop-shadow-[0_0_6px_rgba(163,230,53,0.5)]' : ''}
                />
              </span>
              <span className={`relative z-10 text-[11px] font-semibold tracking-wide transition-all duration-200 ${
                isActive ? 'text-lime-400' : 'text-zinc-600'
              }`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
