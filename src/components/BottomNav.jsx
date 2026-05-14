import { Home, CreditCard, ListChecks, TrendingUp, Plus } from 'lucide-react';

// 4 tabs split around the center FAB slot
const LEFT_TABS = [
  { id: 'inicio',   label: 'Inicio',    Icon: Home },
  { id: 'tarjetas', label: 'Tarjetas',  Icon: CreditCard },
];
const RIGHT_TABS = [
  { id: 'gastos',   label: 'Gastos',   Icon: ListChecks },
  { id: 'ingresos', label: 'Ingresos', Icon: TrendingUp },
];

function NavTab({ id, label, Icon, active, onChange }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onChange(id)}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[52px] transition-all duration-200 cursor-pointer active:scale-90 ${
        isActive ? 'text-lime-400' : 'text-zinc-500 hover:text-zinc-400'
      }`}
    >
      <Icon
        size={20}
        strokeWidth={isActive ? 2.5 : 1.75}
        className={isActive ? 'drop-shadow-[0_0_6px_rgba(163,230,53,0.5)]' : ''}
      />
      <span className={`text-[10px] uppercase tracking-[1.2px] font-medium transition-colors duration-200 ${
        isActive ? 'text-lime-400' : 'text-zinc-500'
      }`}>
        {label}
      </span>
    </button>
  );
}

function BottomNav({ active, onChange, onAdd }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800/60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navegación principal"
    >
      <div className="relative flex items-stretch">
        {/* Left tabs */}
        {LEFT_TABS.map(tab => (
          <NavTab key={tab.id} {...tab} active={active} onChange={onChange} />
        ))}

        {/* Center FAB slot — empty spacer so FAB doesn't overlap text */}
        <div className="flex-1 flex items-center justify-center py-3 min-h-[52px]">
          {/* Spacer for the floating button */}
          <div className="w-14 h-14" aria-hidden="true" />
        </div>

        {/* Right tabs */}
        {RIGHT_TABS.map(tab => (
          <NavTab key={tab.id} {...tab} active={active} onChange={onChange} />
        ))}

        {/* FAB — absolutely positioned, floating above the bar */}
        <button
          onClick={onAdd}
          aria-label="Agregar gasto"
          className="absolute left-1/2 -translate-x-1/2 -top-7 w-[54px] h-[54px] rounded-[18px] bg-lime-400 text-zinc-950 flex items-center justify-center active:scale-95 transition-all duration-200 cursor-pointer"
          style={{
            boxShadow: '0 8px 24px -4px rgba(190,242,100,0.45), 0 0 0 1px rgba(190,242,100,0.15)',
          }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      </div>
    </nav>
  );
}

export default BottomNav;
