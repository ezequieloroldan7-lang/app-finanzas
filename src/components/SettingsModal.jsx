import { useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  X, CreditCard, Trash2, Download, Upload, RotateCcw, LogOut, FileSpreadsheet,
  Bell, BellOff, FileText,
} from 'lucide-react';
import { getNotificationPermission, requestNotificationPermission } from '../lib/notificaciones';
import { formatARS, formatUSD, uid } from '../lib/formatters';
import CardEditModal from './CardEditModal';
import CategoryEditModal from './CategoryEditModal';
import RecurringEditModal from './RecurringEditModal';

const TABS = [
  { id: 'tarjetas', label: 'Tarjetas' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'recurrentes', label: 'Recurrentes' },
  { id: 'presupuesto', label: 'Presupuesto' },
  { id: 'datos', label: 'Datos' },
];

function SettingsModal({
  data,
  onSaveCards,
  onSaveCategories,
  onSaveRecurring,
  onSaveBudget,
  onClose,
  onReset,
  onExport,
  onExportExcel,
  onImport,
  onImportResumen,
  onSignOut,
  initialTab,
}) {
  const [tab, setTab] = useState(initialTab || 'tarjetas');
  const modalRef = useRef(null);
  useFocusTrap(modalRef, true);

  return (
    <div className="fixed inset-0 z-40 fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="absolute bottom-0 left-0 right-0 bg-zinc-950 rounded-t-3xl border-t border-zinc-800 max-h-[92vh] overflow-y-auto slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-900">
          <div className="px-5 py-4 flex items-center justify-between">
            <h3 id="settings-modal-title" className="text-zinc-100 text-lg font-medium">Ajustes</h3>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="p-2 -mr-2 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-zinc-900"
            >
              <X size={20} />
            </button>
          </div>
          <div className="relative">
            <div
              className="px-5 pb-3 flex gap-2 overflow-x-auto scrollbar-none"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    tab === t.id
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-900 to-transparent" />
          </div>
        </div>

        <div className="p-5 space-y-4">
          {tab === 'tarjetas' && <CardsTab cards={data.cards} onSave={onSaveCards} />}
          {tab === 'categorias' && (
            <CategoriesTab categories={data.categories} onSave={onSaveCategories} />
          )}
          {tab === 'recurrentes' && (
            <RecurringTab
              recurring={data.recurring}
              cards={data.cards}
              categories={data.categories}
              onSave={onSaveRecurring}
            />
          )}
          {tab === 'presupuesto' && (
            <BudgetTab
              budget={data.budget}
              categories={data.categories}
              onSave={onSaveBudget}
            />
          )}
          {tab === 'datos' && (
            <DataTab
              expenseCount={data.expenses.length}
              onReset={onReset}
              onExport={onExport}
              onExportExcel={onExportExcel}
              onImport={onImport}
              onImportResumen={onImportResumen}
              onClose={onClose}
            />
          )}

          <NotificationsSection />

          {onSignOut && (
            <div className="pt-2 border-t border-zinc-900">
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-red-300 hover:border-red-900/40 transition-colors"
              >
                <LogOut size={16} />
                <span className="text-sm">Cerrar sesión</span>
              </button>
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

function CardsTab({ cards, onSave }) {
  const [editing, setEditing] = useState(null);
  const handleAdd = () =>
    setEditing({
      id: uid(),
      name: 'Nueva tarjeta',
      closingDay: 15,
      color: '#84cc16',
      isNew: true,
    });
  const handleSave = () => {
    if (!editing) return;
    const exists = cards.find(c => c.id === editing.id);
    const clean = {
      id: editing.id,
      name: editing.name,
      closingDay: editing.closingDay,
      closingDates: editing.closingDates || {},
      color: editing.color,
    };
    onSave(exists ? cards.map(c => (c.id === editing.id ? clean : c)) : [...cards, clean]);
    setEditing(null);
  };
  const handleDelete = (id) => {
    if (cards.length <= 1) {
      alert('Tenés que tener al menos una tarjeta');
      return;
    }
    if (confirm('¿Borrar esta tarjeta? Los gastos asociados se mantienen.')) {
      onSave(cards.filter(c => c.id !== id));
    }
  };
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-zinc-100 font-medium">Tus tarjetas</h4>
        <button
          onClick={handleAdd}
          className="text-lime-300 text-sm font-medium hover:text-lime-200"
        >
          + Agregar
        </button>
      </div>
      <div className="space-y-2">
        {cards.map(card => (
          <div
            key={card.id}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: card.color + '30' }}
            >
              <CreditCard size={18} style={{ color: card.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-zinc-100 font-medium truncate">{card.name}</div>
              <div className="text-zinc-500 text-xs">Cierre día {card.closingDay}</div>
            </div>
            <button
              onClick={() => setEditing({ ...card })}
              className="text-xs text-zinc-300 hover:text-zinc-100 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              Editar
            </button>
            <button
              onClick={() => handleDelete(card.id)}
              className="text-zinc-600 hover:text-red-400 p-1 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      {editing && (
        <CardEditModal
          card={editing}
          onChange={setEditing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function CategoriesTab({ categories, onSave }) {
  const [editing, setEditing] = useState(null);
  const handleAdd = () =>
    setEditing({
      id: uid(),
      name: 'Nueva',
      emoji: '📦',
      color: '#84cc16',
      isNew: true,
    });
  const handleSave = () => {
    if (!editing) return;
    const exists = categories.find(c => c.id === editing.id);
    const clean = {
      id: editing.id,
      name: editing.name,
      emoji: editing.emoji,
      color: editing.color,
    };
    onSave(
      exists
        ? categories.map(c => (c.id === editing.id ? clean : c))
        : [...categories, clean],
    );
    setEditing(null);
  };
  const handleDelete = (id) => {
    if (categories.length <= 1) {
      alert('Tenés que tener al menos una categoría');
      return;
    }
    if (confirm('¿Borrar esta categoría? Los gastos quedarán sin categoría asignada.')) {
      onSave(categories.filter(c => c.id !== id));
    }
  };
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-zinc-100 font-medium">Categorías</h4>
        <button
          onClick={handleAdd}
          className="text-lime-300 text-sm font-medium hover:text-lime-200"
        >
          + Agregar
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setEditing({ ...cat })}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center gap-2 text-left hover:border-zinc-700 transition-colors"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ background: cat.color + '30' }}
            >
              {cat.emoji}
            </div>
            <span className="text-zinc-200 text-sm truncate">{cat.name}</span>
          </button>
        ))}
      </div>
      {editing && (
        <CategoryEditModal
          cat={editing}
          onChange={setEditing}
          onSave={handleSave}
          onDelete={() => {
            handleDelete(editing.id);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function RecurringTab({ recurring, cards, categories, onSave }) {
  const [editing, setEditing] = useState(null);
  const handleAdd = () =>
    setEditing({
      id: uid(),
      description: '',
      amount: 0,
      currency: 'ARS',
      cardId: null,
      categoryId: 'suscripciones',
      dayOfMonth: 1,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      isNew: true,
    });
  const handleSave = () => {
    if (!editing) return;
    const exists = recurring.find(r => r.id === editing.id);
    const clean = {
      id: editing.id,
      description: editing.description,
      amount: parseFloat(editing.amount) || 0,
      currency: editing.currency,
      exchangeRate:
        editing.currency === 'USD'
          ? parseFloat(editing.exchangeRate) || 1
          : null,
      cardId: editing.cardId || null,
      categoryId: editing.categoryId,
      dayOfMonth: editing.dayOfMonth,
      startDate: editing.startDate,
      endDate: editing.endDate || null,
    };
    onSave(
      exists
        ? recurring.map(r => (r.id === editing.id ? clean : r))
        : [...recurring, clean],
    );
    setEditing(null);
  };
  const handleDelete = (id) => {
    if (confirm('¿Borrar este gasto recurrente?'))
      onSave(recurring.filter(r => r.id !== id));
  };
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-zinc-100 font-medium">Gastos recurrentes</h4>
          <p className="text-zinc-500 text-xs mt-0.5">
            Suscripciones, alquileres, gimnasio, etc.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="text-lime-300 text-sm font-medium hover:text-lime-200 shrink-0"
        >
          + Agregar
        </button>
      </div>
      {recurring.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-sm">
          No hay gastos recurrentes cargados todavía
        </div>
      ) : (
        <div className="space-y-2">
          {recurring.map(r => {
            const cat = categories.find(c => c.id === r.categoryId);
            const card = cards.find(c => c.id === r.cardId);
            return (
              <div
                key={r.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{ background: (cat?.color || '#52525b') + '25' }}
                >
                  {cat?.emoji || '🔁'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-100 text-sm font-medium truncate">
                    {r.description}
                  </div>
                  <div className="text-zinc-500 text-xs flex items-center gap-1.5 mt-0.5">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ background: card?.color || '#52525b' }}
                    ></span>
                    <span>{card?.name || 'Sin tarjeta'}</span>
                    <span>·</span>
                    <span>día {r.dayOfMonth}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-zinc-100 font-medium tabular-nums text-sm">
                    {r.currency === 'USD' ? formatUSD(r.amount) : formatARS(r.amount)}
                  </div>
                </div>
                <button
                  onClick={() => setEditing({ ...r })}
                  className="text-xs text-zinc-300 hover:text-zinc-100 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors shrink-0"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-zinc-600 hover:text-red-400 p-1 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {editing && (
        <RecurringEditModal
          item={editing}
          cards={cards}
          categories={categories}
          onChange={setEditing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function BudgetTab({ budget, categories, onSave }) {
  const [monthly, setMonthly] = useState(budget.monthly?.toString() || '');
  const [limits, setLimits] = useState(budget.categoryLimits || {});
  const [showCategoryLimits, setShowCategoryLimits] = useState(
    Object.keys(budget.categoryLimits || {}).length > 0,
  );
  const [monthlyInflation, setMonthlyInflation] = useState(
    budget.monthlyInflation?.toString() || '',
  );

  const inflationPct = parseFloat(monthlyInflation) || 0;
  const monthlyNum = parseFloat(monthly) || 0;

  // Show how the budget adjusts over the next 3 months if inflation is set
  const adjustedIn3Months = inflationPct > 0 && monthlyNum > 0
    ? Math.round(monthlyNum * Math.pow(1 + inflationPct / 100, 3))
    : null;

  const handleSave = () => {
    const cleanLimits = {};
    for (const [k, v] of Object.entries(limits)) {
      const num = parseFloat(v);
      if (num > 0) cleanLimits[k] = num;
    }
    onSave({
      monthly: monthlyNum,
      categoryLimits: showCategoryLimits ? cleanLimits : {},
      monthlyInflation: inflationPct || 0,
    });
  };

  return (
    <>
      <h4 className="text-zinc-100 font-medium mb-3">Presupuesto</h4>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
        <div>
          <label htmlFor="budget-monthly-limit" className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Tope mensual global
          </label>
          <div className="flex items-baseline gap-2 mt-1.5 border-b border-zinc-800 pb-2">
            <span className="text-zinc-500 text-2xl font-serif-display">$</span>
            <input
              id="budget-monthly-limit"
              type="number"
              inputMode="decimal"
              value={monthly}
              onChange={e => setMonthly(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-zinc-50 text-2xl font-serif-display outline-none placeholder:text-zinc-700"
            />
          </div>
          <p className="text-zinc-500 text-xs mt-2">
            Si lo dejás en 0, no se aplica límite
          </p>
        </div>
        <div>
          <label htmlFor="budget-monthly-inflation" className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Inflación mensual estimada (%)
          </label>
          <div className="flex items-baseline gap-2 mt-1.5 border-b border-zinc-800 pb-2">
            <input
              id="budget-monthly-inflation"
              type="number"
              inputMode="decimal"
              value={monthlyInflation}
              onChange={e => setMonthlyInflation(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-zinc-50 text-xl font-serif-display outline-none placeholder:text-zinc-700"
              step="0.1"
            />
            <span className="text-zinc-500 text-xl">%</span>
          </div>
          {adjustedIn3Months && (
            <p className="text-zinc-500 text-xs mt-2">
              En 3 meses el presupuesto equivaldrá a ~${adjustedIn3Months.toLocaleString('es-AR')} ARS
            </p>
          )}
          {!inflationPct && (
            <p className="text-zinc-600 text-xs mt-2">
              Dejalo en 0 para no ajustar por inflación
            </p>
          )}
        </div>
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showCategoryLimits}
              onChange={e => setShowCategoryLimits(e.target.checked)}
              className="w-4 h-4 accent-lime-300"
            />
            <span className="text-sm text-zinc-200">Topes por categoría</span>
          </label>
        </div>
        {showCategoryLimits && (
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: cat.color + '30' }}
                >
                  {cat.emoji}
                </div>
                <span className="text-sm text-zinc-300 flex-1 truncate">{cat.name}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={limits[cat.id] || ''}
                  onChange={e =>
                    setLimits({ ...limits, [cat.id]: e.target.value })
                  }
                  className="w-28 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-100 text-sm outline-none focus:border-zinc-600 tabular-nums text-right"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={handleSave}
        className="w-full mt-4 bg-lime-300 text-zinc-950 font-medium py-3 rounded-2xl hover:bg-lime-200 active:scale-[0.98] transition-all"
      >
        Guardar presupuesto
      </button>
    </>
  );
}

function NotificationsSection() {
  const [permission, setPermission] = useState(() => getNotificationPermission());

  if (permission === 'unavailable') return null;

  const handleRequest = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
  };

  return (
    <div className="pt-2 border-t border-zinc-900">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex items-center gap-3">
        {permission === 'granted' ? (
          <Bell size={16} className="text-lime-300 shrink-0" />
        ) : (
          <BellOff size={16} className="text-zinc-500 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-zinc-200 font-medium">
            Alertas de cierre de tarjeta
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {permission === 'granted'
              ? 'Activadas — te avisamos 3 días antes del cierre'
              : permission === 'denied'
              ? 'Bloqueadas por el navegador — habilitá desde configuración del sitio'
              : 'Recibí un recordatorio antes de cada cierre'}
          </div>
        </div>
        {permission === 'default' && (
          <button
            onClick={handleRequest}
            className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-lime-300/10 text-lime-300 hover:bg-lime-300/20 transition-colors"
          >
            Activar
          </button>
        )}
        {permission === 'granted' && (
          <span className="shrink-0 text-[10px] uppercase tracking-wider text-lime-400 font-medium">
            Activas
          </span>
        )}
      </div>
    </div>
  );
}

function DataTab({ expenseCount, onReset, onExport, onExportExcel, onImport, onImportResumen, onClose }) {
  const fileRef = useRef(null);
  return (
    <>
      <h4 className="text-zinc-100 font-medium mb-3">Datos</h4>
      <div className="space-y-2">
        <button
          onClick={() => { onClose(); onImportResumen?.(); }}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-sky-400" />
            <div>
              <div className="text-zinc-100 text-sm font-medium">
                Importar desde resumen
              </div>
              <div className="text-zinc-500 text-xs">
                Subí el PDF o pegá el texto del resumen de tarjeta
              </div>
            </div>
          </div>
        </button>
        <button
          onClick={onExport}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Download size={18} className="text-zinc-400" />
            <div>
              <div className="text-zinc-100 text-sm font-medium">
                Exportar a JSON
              </div>
              <div className="text-zinc-500 text-xs">Backup de todos tus datos</div>
            </div>
          </div>
        </button>
        <button
          onClick={onExportExcel}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={18} className="text-emerald-400" />
            <div>
              <div className="text-zinc-100 text-sm font-medium">
                Exportar a Excel
              </div>
              <div className="text-zinc-500 text-xs">
                Gastos, recurrentes y resumen mensual
              </div>
            </div>
          </div>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={e => {
            if (e.target.files?.[0]) onImport(e.target.files[0]);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Upload size={18} className="text-zinc-400" />
            <div>
              <div className="text-zinc-100 text-sm font-medium">
                Importar desde JSON
              </div>
              <div className="text-zinc-500 text-xs">
                Reemplaza tus datos actuales
              </div>
            </div>
          </div>
        </button>
        {expenseCount > 0 && (
          <button
            onClick={() => {
              if (
                confirm(
                  '¿Borrar TODOS los gastos, recurrentes y presupuesto? No se puede deshacer.',
                )
              ) {
                onReset();
                onClose();
              }
            }}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left hover:border-red-900 transition-colors"
          >
            <div className="flex items-center gap-3">
              <RotateCcw size={18} className="text-red-400" />
              <div>
                <div className="text-zinc-100 text-sm font-medium">
                  Borrar todos los datos
                </div>
                <div className="text-zinc-500 text-xs">
                  {expenseCount} gasto{expenseCount !== 1 ? 's' : ''} cargado
                  {expenseCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </button>
        )}
      </div>
      <div className="text-center text-zinc-700 text-[10px] uppercase tracking-[0.2em] pt-6">
        v2 · datos persistentes online
      </div>
    </>
  );
}

export default SettingsModal;
