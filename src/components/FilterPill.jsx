function FilterPill({ active, onClick, children, color }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
        active
          ? 'bg-lime-400/10 text-lime-400 border-lime-400/30 shadow-[0_0_12px_rgba(163,230,53,0.15)]'
          : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700 active:scale-95'
      }`}
    >
      {color && (
        <span
          className={`inline-block w-2 h-2 rounded-full shrink-0 transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-70'}`}
          style={{ background: color }}
        />
      )}
      {children}
    </button>
  );
}

export default FilterPill;
