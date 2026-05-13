import { useState } from 'react';
import { ChevronRight, CreditCard, X } from 'lucide-react';

const STEPS = ['welcome', 'card', 'done'];

export default function OnboardingWizard({ onCreateCard, onDismiss }) {
  const [step, setStep] = useState(0);
  const [cardName, setCardName] = useState('');
  const [closingDay, setClosingDay] = useState(15);
  const [color, setColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  const dismiss = () => {
    localStorage.setItem('onboarding_v1_done', '1');
    onDismiss?.();
  };

  const handleCreateCard = async () => {
    if (!cardName.trim()) return;
    setSaving(true);
    try {
      await onCreateCard({ name: cardName.trim(), closingDay: Number(closingDay), color, closingDates: {} });
      setStep(2);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  // Full-screen overlay
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative">
        <button onClick={dismiss} className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-400 p-1" aria-label="Cerrar onboarding">
          <X size={18} />
        </button>

        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-lime-400 w-6' : 'bg-zinc-700 w-3'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="text-center">
            <div className="text-4xl mb-4">👋</div>
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">¡Bienvenido a Mis Finanzas!</h2>
            <p className="text-zinc-400 text-sm mb-8">
              Controlá tus gastos en tarjeta, cuotas y suscripciones en un solo lugar. Te guiamos en los primeros pasos.
            </p>
            <button onClick={() => setStep(1)} className="w-full bg-lime-300 text-zinc-950 font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-lime-200 transition-colors">
              Empezar <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-xl bg-lime-400/10 flex items-center justify-center">
                <CreditCard size={18} className="text-lime-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-100">Agregá tu primera tarjeta</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="onb-card-name" className="text-zinc-400 text-xs mb-1.5 block">Nombre de la tarjeta</label>
                <input
                  id="onb-card-name"
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Ej: Visa, Naranja, BBVA"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-lime-400/50"
                />
              </div>
              <div>
                <label htmlFor="onb-closing-day" className="text-zinc-400 text-xs mb-1.5 block">Día de cierre</label>
                <input
                  id="onb-closing-day"
                  type="number"
                  min="1"
                  max="31"
                  value={closingDay}
                  onChange={(e) => setClosingDay(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-lime-400/50"
                />
              </div>
            </div>
            <button
              onClick={handleCreateCard}
              disabled={saving || !cardName.trim()}
              className="mt-6 w-full bg-lime-300 text-zinc-950 font-semibold py-3 rounded-2xl disabled:opacity-40 hover:bg-lime-200 transition-colors"
            >
              {saving ? 'Guardando...' : 'Agregar tarjeta'}
            </button>
            <button onClick={() => setStep(2)} className="mt-3 w-full text-zinc-500 text-sm hover:text-zinc-400 py-2">
              Saltar por ahora
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">¡Listo para empezar!</h2>
            <p className="text-zinc-400 text-sm mb-8">
              Usá el botón <strong className="text-zinc-300">+</strong> para agregar gastos. Podés importar resúmenes PDF de tu banco o registrar todo manualmente.
            </p>
            <button onClick={dismiss} className="w-full bg-lime-300 text-zinc-950 font-semibold py-3 rounded-2xl hover:bg-lime-200 transition-colors">
              ¡Entendido!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
