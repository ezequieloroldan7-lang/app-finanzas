import { CreditCard, FileUp, Sparkles } from 'lucide-react';

function EmptyState({ onAdd, onImport }) {
  return (
    <div className="px-6 pt-16 pb-36 text-center fade-in">
      {/* Icon with glow ring */}
      <div className="relative inline-flex items-center justify-center mb-8">
        <div className="absolute inset-0 w-24 h-24 rounded-full bg-lime-400/10 blur-xl animate-pulse" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800/60 flex items-center justify-center shadow-xl shadow-black/30">
          <CreditCard size={32} className="text-lime-400 drop-shadow-[0_0_8px_rgba(163,230,53,0.4)]" />
        </div>
      </div>

      {/* Heading */}
      <h2 className="font-serif-display italic text-4xl text-zinc-100 mb-3 leading-tight">
        Empezá a trackear
      </h2>
      <p className="text-zinc-500 max-w-xs mx-auto mb-2 text-sm leading-relaxed">
        Cargá tu primera compra o subí el resumen de tu tarjeta.
      </p>
      <p className="text-zinc-600 max-w-xs mx-auto mb-10 text-xs leading-relaxed inline-flex items-center gap-1.5 justify-center">
        <Sparkles size={11} className="text-lime-400/60" />
        Todo en un solo lugar, con IA incluida
      </p>

      {/* CTAs */}
      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <button
          onClick={onAdd}
          className="bg-gradient-to-r from-lime-400 to-lime-300 text-zinc-950 font-semibold py-3.5 rounded-2xl hover:from-lime-300 hover:to-lime-200 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-lime-400/20 text-sm tracking-wide"
        >
          Cargar primer gasto
        </button>
        <button
          onClick={onImport}
          className="text-zinc-500 text-sm py-3 hover:text-zinc-200 inline-flex items-center justify-center gap-2 transition-colors rounded-2xl hover:bg-zinc-900/50 border border-transparent hover:border-zinc-800 duration-200"
        >
          <FileUp size={14} />
          Subir resumen PDF
        </button>
      </div>
    </div>
  );
}

export default EmptyState;
