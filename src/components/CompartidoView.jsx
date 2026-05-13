import { useMemo, useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Users, Mail, FolderHeart, Send, Pencil, Terminal } from 'lucide-react';
import { formatARS, convertToARS } from '../lib/formatters';
import { getSharedCuotasDistribution } from '../lib/cuotas';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import { MONTH_NAMES } from '../constants';

function getMonthExpenses(expenses, year, month) {
  const result = [];
  for (const exp of expenses) {
    const dist = getSharedCuotasDistribution(exp);
    for (const slot of dist) {
      if (slot.year === year && slot.month === month) {
        result.push({ exp, slot });
      }
    }
  }
  return result.sort((a, b) => b.exp.date.localeCompare(a.exp.date));
}

// ─── Setup screen ──────────────────────────────────────────────────────────
function SetupScreen({ onCreate }) {
  const [step, setStep] = useState('name'); // 'name' | 'invite'
  const [name, setName] = useState('Gastos en común');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [folder, setFolder] = useState(null);
  const [invited, setInvited] = useState(false);

  const handleCreateFolder = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const f = await onCreate(name.trim());
      setFolder(f);
      setStep('invite');
    } catch (e) {
      setError(e.message || 'Error al crear la carpeta');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!email.trim() || !folder) return;
    setLoading(true);
    setError('');
    try {
      await onCreate.__invite(folder.id, email.trim());
      setInvited(true);
    } catch (e) {
      setError(e.message || 'Error al enviar invitación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-28 flex flex-col">
      <header className="sticky top-0 z-20 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-900 px-5 pt-6 pb-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-medium">VUE Finanzas</div>
        <h1 className="text-2xl text-zinc-50 font-serif-display italic mt-0.5">Compartido</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 gap-8">
        <div className="w-20 h-20 rounded-3xl bg-violet-400/10 border border-violet-400/20 flex items-center justify-center">
          <FolderHeart size={36} className="text-violet-400" />
        </div>

        <div className="text-center">
          <h2 className="text-xl text-zinc-100 font-medium">Gastos en pareja</h2>
          <p className="text-sm text-zinc-500 mt-2 max-w-xs">
            Creá una carpeta compartida para llevar juntos lo que gastan en común.
          </p>
        </div>

        {step === 'name' && (
          <div className="w-full space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-2">
                Nombre de la carpeta
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-violet-400 transition-colors"
                placeholder="Gastos en común"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={handleCreateFolder}
              disabled={!name.trim() || loading}
              className="w-full bg-violet-400 text-zinc-950 font-medium py-4 rounded-2xl disabled:opacity-40 hover:bg-violet-300 active:scale-[0.98] transition-all"
            >
              {loading ? 'Creando…' : 'Crear carpeta'}
            </button>
          </div>
        )}

        {step === 'invite' && !invited && (
          <div className="w-full space-y-4">
            <div className="bg-violet-400/10 border border-violet-400/20 rounded-2xl px-4 py-3 text-sm text-violet-200">
              ✓ Carpeta "{folder?.name}" creada. Ahora invitá a tu pareja.
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-2">
                Email de tu pareja (Gmail)
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-violet-400 transition-colors"
                  placeholder="pareja@gmail.com"
                />
                <button
                  onClick={handleInvite}
                  disabled={!email.trim() || loading}
                  className="px-4 py-3 bg-violet-400 text-zinc-950 rounded-xl font-medium disabled:opacity-40 hover:bg-violet-300 transition-colors"
                >
                  {loading ? '…' : <Send size={18} />}
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Omitir por ahora
            </button>
          </div>
        )}

        {step === 'invite' && invited && (
          <div className="w-full space-y-4">
            <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-2xl px-4 py-3 text-sm text-emerald-200">
              ✓ Invitación enviada a {email}. Cuando inicie sesión en la app, verá la carpeta automáticamente.
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-violet-400 text-zinc-950 font-medium py-4 rounded-2xl hover:bg-violet-300 active:scale-[0.98] transition-all"
            >
              Ir a la carpeta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Invite modal ──────────────────────────────────────────────────────────
function InviteModal({ folderId, onInvite, onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onInvite(folderId, email.trim());
      setDone(true);
    } catch (e) {
      setError(e.message || 'Error al invitar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-zinc-950 rounded-t-3xl border-t border-zinc-800 p-5 slide-up space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-zinc-100 text-lg font-medium">Invitar persona</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-zinc-900">
            <ChevronLeft size={20} />
          </button>
        </div>
        {done ? (
          <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-2xl px-4 py-3 text-sm text-emerald-200">
            ✓ Invitación enviada a {email}
          </div>
        ) : (
          <>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-2">Email (Gmail)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="pareja@gmail.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-violet-400 transition-colors"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={handle}
              disabled={!email.trim() || loading}
              className="w-full bg-violet-400 text-zinc-950 font-medium py-4 rounded-2xl disabled:opacity-40 hover:bg-violet-300 transition-all"
            >
              {loading ? 'Enviando…' : 'Enviar invitación'}
            </button>
          </>
        )}
        <div className="h-2" />
      </div>
    </div>
  );
}

// ─── Migration pending screen ──────────────────────────────────────────────
function MigracionPendiente() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-28 flex flex-col">
      <header className="sticky top-0 z-20 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-900 px-5 pt-6 pb-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-medium">VUE Finanzas</div>
        <h1 className="text-2xl text-zinc-50 font-serif-display italic mt-0.5">Compartido</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 gap-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
          <Terminal size={36} className="text-amber-400" />
        </div>
        <div className="text-center">
          <h2 className="text-xl text-zinc-100 font-medium">Falta configurar la base de datos</h2>
          <p className="text-sm text-zinc-500 mt-2 max-w-xs">
            Para usar la carpeta compartida necesitás ejecutar el SQL de migración en Supabase.
          </p>
        </div>
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 space-y-2 text-sm">
          <div className="text-zinc-300 font-medium">Pasos:</div>
          <ol className="text-zinc-500 space-y-1.5 list-decimal list-inside">
            <li>Abrí tu proyecto en supabase.com</li>
            <li>Andá a <span className="text-zinc-300">SQL Editor</span></li>
            <li>Pegá y ejecutá el SQL del plan de migración</li>
            <li>Recargá la app</li>
          </ol>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-amber-400 text-zinc-950 font-medium py-4 rounded-2xl hover:bg-amber-300 active:scale-[0.98] transition-all"
        >
          Recargar app
        </button>
      </div>
    </div>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────────
function CompartidoView({ folder, members, expenses, userId, categories, tablesReady, onAdd, onEdit, onDelete, onCreateFolder, onInvite }) {
  if (!tablesReady) return <MigracionPendiente />;
  const { year, month, prevMonth, nextMonth } = useMonthNavigation();
  const [showInvite, setShowInvite] = useState(false);

  if (!folder) {
    const onCreate = async (name) => {
      const f = await onCreateFolder(name);
      return f;
    };
    onCreate.__invite = onInvite;
    return <SetupScreen onCreate={onCreate} />;
  }

  const monthItems = useMemo(() => getMonthExpenses(expenses, year, month), [expenses, year, month]);

  const myPaid = useMemo(() =>
    monthItems.reduce((sum, { exp, slot }) =>
      exp.paidBy === userId ? sum + slot.amount : sum, 0),
    [monthItems, userId],
  );

  const partnerPaid = useMemo(() =>
    monthItems.reduce((sum, { exp, slot }) =>
      exp.paidBy !== userId ? sum + slot.amount : sum, 0),
    [monthItems, userId],
  );

  const totalMonth = myPaid + partnerPaid;
  const balance = myPaid - totalMonth / 2;

  const partner = members.find(m => m.userId !== userId);
  const partnerLabel = partner?.displayName || partner?.email?.split('@')[0] || 'Pareja';

  const byCat = useMemo(() => {
    const map = {};
    for (const { exp, slot } of monthItems) {
      map[exp.categoryId] = (map[exp.categoryId] || 0) + slot.amount;
    }
    return Object.entries(map)
      .map(([catId, t]) => ({ cat: categories.find(c => c.id === catId), total: t }))
      .filter(x => x.cat)
      .sort((a, b) => b.total - a.total);
  }, [monthItems, categories]);

  return (
    <div className="min-h-screen bg-zinc-950 pb-28">
      <header className="sticky top-0 z-20 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-900 px-5 pt-6 pb-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-medium">VUE Finanzas</div>
        <div className="flex items-center justify-between mt-0.5">
          <h1 className="text-2xl text-zinc-50 font-serif-display italic">{folder.name}</h1>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors text-xs"
          >
            <Users size={14} />
            {members.length} {members.length === 1 ? 'persona' : 'personas'}
          </button>
        </div>
      </header>

      <main className="px-5 pt-6 space-y-4">
        {/* Month switcher */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="text-zinc-200 font-medium capitalize">{MONTH_NAMES[month]} {year}</span>
          <button onClick={nextMonth} className="p-2 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Balance card */}
        {totalMonth > 0 && (
          <div className="bg-zinc-900 rounded-2xl px-5 py-4 space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Total compartido</div>
                <div className="text-3xl font-serif-display text-zinc-100 tabular-nums mt-1">
                  {formatARS(totalMonth)}
                </div>
                <div className="text-xs text-zinc-600 mt-0.5">
                  {monthItems.length} {monthItems.length === 1 ? 'gasto' : 'gastos'} · cada uno {formatARS(totalMonth / 2)}
                </div>
              </div>
              {/* Balance indicator */}
              <div className={`text-right text-sm font-medium tabular-nums rounded-xl px-3 py-2 ${
                Math.abs(balance) < 1
                  ? 'bg-zinc-800 text-zinc-400'
                  : balance > 0
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : 'bg-red-400/10 text-red-400'
              }`}>
                {Math.abs(balance) < 1 ? (
                  <span>Estamos al día</span>
                ) : balance > 0 ? (
                  <div>
                    <div>{partnerLabel} te debe</div>
                    <div className="text-base">{formatARS(Math.abs(balance))}</div>
                  </div>
                ) : (
                  <div>
                    <div>Le debés a {partnerLabel}</div>
                    <div className="text-base">{formatARS(Math.abs(balance))}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Who paid what */}
            <div className="flex gap-3 pt-2 border-t border-zinc-800">
              <div className="flex-1 text-center">
                <div className="text-xs text-zinc-500">Yo pagué</div>
                <div className="text-sm font-medium tabular-nums text-zinc-200 mt-0.5">{formatARS(myPaid)}</div>
              </div>
              <div className="w-px bg-zinc-800" />
              <div className="flex-1 text-center">
                <div className="text-xs text-zinc-500">{partnerLabel} pagó</div>
                <div className="text-sm font-medium tabular-nums text-zinc-200 mt-0.5">{formatARS(partnerPaid)}</div>
              </div>
            </div>

            {/* Category breakdown */}
            {byCat.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">Por categoría</div>
                {byCat.map(({ cat, total: t }) => {
                  const pct = totalMonth > 0 ? (t / totalMonth) * 100 : 0;
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                          <span>{cat.emoji}</span>
                          <span>{cat.name}</span>
                        </span>
                        <span className="text-xs tabular-nums text-zinc-300">{formatARS(t)}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cat.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Expense list */}
        {monthItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 mb-1">No hay gastos este mes</p>
            <p className="text-xs text-zinc-600">Tocá + para agregar un gasto compartido</p>
          </div>
        ) : (
          <div className="space-y-2">
            {monthItems.map(({ exp, slot }) => {
              const cat = categories.find(c => c.id === exp.categoryId);
              const isPaidByMe = exp.paidBy === userId;
              return (
                <div key={`${exp.id}-${slot.cuotaNum}`} className="bg-zinc-900 rounded-2xl px-4 py-3.5 flex items-center gap-3">
                  <span className="text-xl shrink-0">{cat?.emoji || '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-100 truncate">{exp.description}</div>
                    <div className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1.5">
                      <span>{exp.date}</span>
                      <span>·</span>
                      <span className={isPaidByMe ? 'text-violet-400' : 'text-zinc-500'}>
                        {isPaidByMe ? 'Yo pagué' : `${partnerLabel} pagó`}
                      </span>
                      {exp.totalCuotas > 1 && (
                        <><span>·</span><span>{slot.cuotaNum}/{exp.totalCuotas}</span></>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium tabular-nums text-zinc-100">{formatARS(slot.amount)}</div>
                    <div className="text-xs text-zinc-600 tabular-nums">c/u {formatARS(slot.amount / 2)}</div>
                  </div>
                  {exp.totalCuotas <= 1 && (
                    <button
                      onClick={() => onEdit(exp)}
                      className="p-1.5 rounded-full text-zinc-700 hover:text-violet-400 hover:bg-zinc-800 transition-colors shrink-0"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(exp.id)}
                    className="p-1.5 rounded-full text-zinc-700 hover:text-red-400 hover:bg-zinc-800 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Invite prompt when alone */}
        {members.length < 2 && (
          <div
            onClick={() => setShowInvite(true)}
            className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl px-5 py-4 flex items-center gap-3 cursor-pointer hover:border-violet-400/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-violet-400/10 flex items-center justify-center shrink-0">
              <Mail size={18} className="text-violet-400" />
            </div>
            <div>
              <div className="text-sm text-zinc-300">Invitá a tu pareja</div>
              <div className="text-xs text-zinc-600 mt-0.5">Para que pueda ver y agregar gastos</div>
            </div>
          </div>
        )}
      </main>

      <button
        onClick={onAdd}
        className="fixed bottom-[4.5rem] right-5 z-30 h-14 w-14 rounded-full bg-violet-400 text-zinc-950 flex items-center justify-center hover:bg-violet-300 active:scale-95 transition-all"
        style={{ boxShadow: '0 10px 30px -5px rgba(167,139,250,0.4), 0 0 0 1px rgba(167,139,250,0.1)' }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {showInvite && (
        <InviteModal
          folderId={folder.id}
          onInvite={onInvite}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}

export default CompartidoView;
