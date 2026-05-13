import { useMemo, useRef, useState, useEffect } from 'react';
import { Plus, Trash2, Heart, User, Mail, Pencil, X, Check, UserMinus, ArrowLeftRight, Search, SlidersHorizontal, ImageIcon, PiggyBank, Target, ChevronDown, ChevronUp, UserCircle2, Repeat, Upload } from 'lucide-react';
import RecurringEditModal from './RecurringEditModal';
import { uid } from '../lib/formatters';
import MonthSwitcher from './MonthSwitcher';
import { formatARS, convertToARS } from '../lib/formatters';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import SharedBalanceChart from './SharedBalanceChart';
import { MONTH_NAMES_SHORT } from '../constants';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Cell } from 'recharts';

function GastosView({ expenses, sharedExpenses: sharedExpensesProp = [], categories, recurring = [], cards = [], onSaveRecurring, onOpenProfile, onImportResumen, userId, sharedFolderId, partnerName, partnerMember, partnerInvite, receivedPendingInvites = [], onAcceptInvite, onRejectInvite, onAdd, onAddShared, onDelete, onDeleteShared, onEditShared, onEditPersonal, onCreateFolder, onInvite, onRemovePartner, onRenamePartner, onSettleDebt, onGetReceiptUrl, currentDate: currentDateProp = null, onDateChange }) {
  const localNav = useMonthNavigation();
  const year = currentDateProp ? currentDateProp.getFullYear() : localNav.year;
  const month = currentDateProp ? currentDateProp.getMonth() : localNav.month;
  const prevMonth = currentDateProp
    ? () => onDateChange?.(new Date(year, month - 1, 1))
    : localNav.prevMonth;
  const nextMonth = currentDateProp
    ? () => onDateChange?.(new Date(year, month + 1, 1))
    : localNav.nextMonth;
  const [section, setSection] = useState('personal'); // 'personal' | 'pareja'
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showInlineInvite, setShowInlineInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [showSettle, setShowSettle] = useState(false);
  const [settling, setSettling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCatId, setFilterCatId] = useState(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [swipedId, setSwipedId] = useState(null);
  const touchStartX = useRef(null);
  const touchCurrentX = useRef(0);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [opError, setOpError] = useState('');
  const [coupleTab, setCoupleTab] = useState('gastos'); // 'gastos' | 'ahorro'
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [chartRange, setChartRange] = useState(6);

  const openNewRecurring = () => {
    setEditingRecurring({
      id: uid(),
      description: '',
      amount: 0,
      currency: 'ARS',
      cardId: null,
      categoryId: categories[0]?.id || '',
      dayOfMonth: new Date().getDate(),
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      isNew: true,
    });
  };

  const handleSaveRecurring = async () => {
    if (!editingRecurring || !onSaveRecurring) { setEditingRecurring(null); return; }
    const clean = {
      id: editingRecurring.id,
      description: editingRecurring.description,
      amount: parseFloat(editingRecurring.amount) || 0,
      currency: editingRecurring.currency,
      exchangeRate: editingRecurring.currency === 'USD'
        ? parseFloat(editingRecurring.exchangeRate) || 1
        : null,
      cardId: editingRecurring.cardId || null,
      categoryId: editingRecurring.categoryId,
      dayOfMonth: editingRecurring.dayOfMonth,
      startDate: editingRecurring.startDate,
      endDate: editingRecurring.endDate || null,
    };
    try {
      await onSaveRecurring([...(recurring || []), clean]);
      setEditingRecurring(null);
    } catch (e) {
      setOpError('No se pudo guardar el recurrente: ' + (e?.message || 'error desconocido'));
    }
  };

  // Savings (ahorro) state — persisted in localStorage per shared folder
  const [ahorroData, setAhorroData] = useState(() => {
    if (!sharedFolderId) return { goalName: 'Meta compartida', goalAmount: 0, myContribs: [], partnerContribs: [] };
    try {
      const raw = localStorage.getItem(`pareja_ahorro_${sharedFolderId}`);
      return raw ? JSON.parse(raw) : { goalName: 'Meta compartida', goalAmount: 0, myContribs: [], partnerContribs: [] };
    } catch { return { goalName: 'Meta compartida', goalAmount: 0, myContribs: [], partnerContribs: [] }; }
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalNameInput, setGoalNameInput] = useState('');
  const [goalAmountInput, setGoalAmountInput] = useState('');
  const [addingContrib, setAddingContrib] = useState(null); // null | 'me' | 'partner'
  const [contribAmount, setContribAmount] = useState('');
  const [contribNote, setContribNote] = useState('');
  const [showAllMe, setShowAllMe] = useState(false);
  const [showAllPartner, setShowAllPartner] = useState(false);
  const [confirmDeleteGoal, setConfirmDeleteGoal] = useState(false);

  useEffect(() => {
    if (!sharedFolderId) return;
    try { localStorage.setItem(`pareja_ahorro_${sharedFolderId}`, JSON.stringify(ahorroData)); } catch {}
  }, [ahorroData, sharedFolderId]);

  const myTotalSaved = useMemo(() => (ahorroData.myContribs || []).reduce((s, c) => s + (c.amount || 0), 0), [ahorroData]);
  const partnerTotalSaved = useMemo(() => (ahorroData.partnerContribs || []).reduce((s, c) => s + (c.amount || 0), 0), [ahorroData]);
  const totalSaved = myTotalSaved + partnerTotalSaved;

  const addContrib = (who) => {
    const amt = parseFloat(contribAmount.replace(',', '.'));
    if (!amt || amt <= 0) return;
    const contrib = { id: Date.now().toString(), amount: amt, note: contribNote.trim(), date: new Date().toISOString().slice(0, 10) };
    const key = who === 'me' ? 'myContribs' : 'partnerContribs';
    setAhorroData(prev => ({ ...prev, [key]: [...(prev[key] || []), contrib] }));
    setContribAmount('');
    setContribNote('');
    setAddingContrib(null);
  };
  const removeContrib = (who, id) => {
    const key = who === 'me' ? 'myContribs' : 'partnerContribs';
    setAhorroData(prev => ({ ...prev, [key]: (prev[key] || []).filter(c => c.id !== id) }));
  };
  const saveGoal = () => {
    const amt = parseFloat(goalAmountInput.replace(',', '.').replace(/\./g, '').replace(',', '.'));
    setAhorroData(prev => ({
      ...prev,
      goalName: goalNameInput.trim() || prev.goalName,
      goalAmount: !isNaN(amt) && amt > 0 ? amt : prev.goalAmount,
    }));
    setEditingGoal(false);
  };

  const personalExpenses = useMemo(() =>
    expenses.filter(e => {
      if (!e.date || e.cardId || e.sharedFolderId) return false;
      const d = new Date(e.date + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    }).sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, year, month],
  );

  const sharedExpenses = useMemo(() =>
    sharedExpensesProp.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    }).sort((a, b) => b.date.localeCompare(a.date)),
    [sharedExpensesProp, year, month],
  );

  const monthExpenses = section === 'personal' ? personalExpenses : sharedExpenses;

  const total = useMemo(() =>
    monthExpenses.reduce((sum, e) => sum + convertToARS(e.amount, e.currency, e.exchangeRate), 0),
    [monthExpenses],
  );

  const prevTotal = useMemo(() => {
    const py = month === 0 ? year - 1 : year;
    const pm = month === 0 ? 11 : month - 1;
    if (section === 'pareja') {
      return sharedExpensesProp.filter(e => {
        if (!e.date) return false;
        const d = new Date(e.date + 'T12:00:00');
        return d.getFullYear() === py && d.getMonth() === pm;
      }).reduce((sum, e) => sum + convertToARS(e.amount, e.currency, e.exchangeRate), 0);
    }
    return expenses.filter(e => {
      if (!e.date || e.cardId || e.sharedFolderId) return false;
      const d = new Date(e.date + 'T12:00:00');
      return d.getFullYear() === py && d.getMonth() === pm;
    }).reduce((sum, e) => sum + convertToARS(e.amount, e.currency, e.exchangeRate), 0);
  }, [expenses, sharedExpensesProp, year, month, section]);

  const delta = prevTotal > 0 ? (total - prevTotal) / prevTotal : null;

  const historyData = useMemo(() => {
    const out = [];
    const baseList = section === 'pareja' ? sharedExpensesProp : expenses;
    for (let i = chartRange - 1; i >= 0; i--) {
      const d = new Date(year, month - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const total = baseList.reduce((sum, e) => {
        if (!e.date) return sum;
        if (section === 'personal' && (e.cardId || e.sharedFolderId)) return sum;
        const ed = new Date(e.date + 'T12:00:00');
        if (ed.getFullYear() !== y || ed.getMonth() !== m) return sum;
        return sum + convertToARS(e.amount, e.currency, e.exchangeRate);
      }, 0);
      out.push({
        label: MONTH_NAMES_SHORT[m] + (m === 0 ? ` ${String(y).slice(2)}` : ''),
        total,
        isCurrent: y === year && m === month,
      });
    }
    return out;
  }, [expenses, sharedExpensesProp, section, year, month, chartRange]);

  const avgHistory = useMemo(() => {
    const nonZero = historyData.filter(d => d.total > 0);
    if (!nonZero.length) return 0;
    return nonZero.reduce((s, d) => s + d.total, 0) / nonZero.length;
  }, [historyData]);
  const hasHistory = historyData.some(d => d.total > 0);

  const myPaid = useMemo(() =>
    sharedExpenses.filter(e => e.paidBy === userId || !e.paidBy)
      .reduce((sum, e) => sum + convertToARS(e.amount, e.currency, e.exchangeRate), 0),
    [sharedExpenses, userId],
  );
  const partnerPaid = useMemo(() =>
    sharedExpenses.filter(e => e.paidBy && e.paidBy !== userId)
      .reduce((sum, e) => sum + convertToARS(e.amount, e.currency, e.exchangeRate), 0),
    [sharedExpenses, userId],
  );
  const totalShared = myPaid + partnerPaid;
  const balance = myPaid - totalShared / 2;

  const byCat = useMemo(() => {
    const map = {};
    for (const e of monthExpenses) {
      map[e.categoryId] = (map[e.categoryId] || 0) + convertToARS(e.amount, e.currency, e.exchangeRate);
    }
    return Object.entries(map)
      .map(([catId, t]) => ({ cat: categories.find(c => c.id === catId), total: t }))
      .filter(x => x.cat)
      .sort((a, b) => b.total - a.total);
  }, [monthExpenses, categories]);

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return monthExpenses.filter(e => {
      if (q && !e.description?.toLowerCase().includes(q)) return false;
      if (filterCatId && e.categoryId !== filterCatId) return false;
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    });
  }, [monthExpenses, searchQuery, filterCatId, dateFrom, dateTo]);

  const activeCats = useMemo(() => {
    const ids = new Set(monthExpenses.map(e => e.categoryId).filter(Boolean));
    return categories.filter(c => ids.has(c.id));
  }, [monthExpenses, categories]);

  const hasFilters = searchQuery || filterCatId || dateFrom || dateTo;
  const clearFilters = () => { setSearchQuery(''); setFilterCatId(null); setDateFrom(''); setDateTo(''); setShowDateFilter(false); };

  const partner = partnerName || 'Pareja';
  const handleAdd = () => section === 'pareja' ? onAddShared?.() : onAdd();

  const handleSettle = async () => {
    setSettling(true);
    setOpError('');
    try {
      const debtorId = balance > 0 ? partnerMember?.userId : userId;
      await onSettleDebt?.({ paidBy: debtorId, amount: Math.abs(balance) * 2 });
      setShowSettle(false);
    } catch (e) {
      setOpError('No se pudo saldar la deuda: ' + (e?.message || 'error desconocido'));
    } finally {
      setSettling(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || inviteLoading) return;
    setInviteLoading(true);
    setInviteError('');
    try {
      await onInvite?.(inviteEmail.trim().toLowerCase());
      setInviteSent(true);
      setInviteEmail('');
      setShowInlineInvite(false);
    } catch (e) {
      console.error('invite error:', e);
      const msg = e?.message || '';
      if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already')) {
        setInviteError('Ya existe una invitación para ese email.');
      } else if (msg.includes('permission') || msg.includes('policy') || msg.includes('violates')) {
        setInviteError('Sin permisos para invitar. Verificá que las tablas de Supabase estén creadas con las políticas RLS correctas.');
      } else {
        setInviteError('No se pudo enviar la invitación. Revisá tu conexión e intentá de nuevo.');
      }
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-28">
      <header className="sticky top-0 z-20 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-900 px-5 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-medium">VUE Finanzas</div>
            <h1 className="text-2xl text-zinc-50 font-serif-display italic mt-0.5">Gastos</h1>
          </div>
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              aria-label="Mi perfil"
              className="p-2 -mr-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <UserCircle2 size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="px-5 pt-6 space-y-4">
        {opError && (
          <div className="bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-2.5 text-sm text-red-400 flex items-center justify-between gap-2">
            <span>{opError}</span>
            <button onClick={() => setOpError('')} aria-label="Cerrar error" className="shrink-0 text-red-500 hover:text-red-300">
              <X size={14} />
            </button>
          </div>
        )}
        {/* Section toggle */}
        <div className="flex gap-2 bg-zinc-900 p-1 rounded-2xl">
          <button
            onClick={() => setSection('personal')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
              section === 'personal' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <User size={14} />
            Mis gastos
          </button>
          <button
            onClick={() => setSection('pareja')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
              section === 'pareja' ? 'bg-violet-400 text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Heart size={14} />
            En pareja
          </button>
        </div>

        {/* Month switcher */}
        <MonthSwitcher
          year={year}
          month={month}
          onPrev={prevMonth}
          onNext={nextMonth}
          onToday={() => {
            const t = new Date();
            if (currentDateProp) {
              onDateChange?.(new Date(t.getFullYear(), t.getMonth(), 1));
            } else {
              localNav.goToToday();
            }
          }}
        />

        {section === 'personal' && (
          <div className="flex gap-2">
            <button
              onClick={onAdd}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-lime-300/10 text-lime-300 border border-lime-300/20 hover:bg-lime-300/15 transition-colors text-sm font-medium"
            >
              <Plus size={14} />
              Nuevo gasto
            </button>
            {onImportResumen && (
              <button
                onClick={onImportResumen}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 transition-colors text-sm"
              >
                <Upload size={14} />
                Importar resumen
              </button>
            )}
          </div>
        )}

        {/* Search + filters */}
        {!(section === 'pareja' && !sharedFolderId) && !(section === 'pareja' && coupleTab === 'ahorro') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
                <Search size={14} className="text-zinc-500 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar gasto…"
                  className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} aria-label="Limpiar búsqueda" className="text-zinc-600 hover:text-zinc-400">
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowDateFilter(v => !v)}
                className={`p-2.5 rounded-xl border transition-colors ${showDateFilter || dateFrom || dateTo ? 'bg-violet-400/15 border-violet-400/30 text-violet-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>

            {showDateFilter && (
              <div className="flex gap-2 items-center">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 outline-none focus:border-zinc-600 [color-scheme:dark]" />
                <span className="text-zinc-600 text-xs">—</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 outline-none focus:border-zinc-600 [color-scheme:dark]" />
              </div>
            )}

            {activeCats.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {activeCats.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCatId(filterCatId === cat.id ? null : cat.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                      filterCatId === cat.id
                        ? 'border-transparent text-zinc-950'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                    style={filterCatId === cat.id ? { background: cat.color } : {}}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
                {hasFilters && (
                  <button onClick={clearFilters}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-900 border border-zinc-800 whitespace-nowrap">
                    <X size={11} /> Limpiar
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pending invite notification */}
        {section === 'pareja' && receivedPendingInvites.length > 0 && (
          <div className="bg-violet-950/40 border border-violet-800/50 rounded-2xl px-5 py-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-400/20 flex items-center justify-center shrink-0">
                <Heart size={18} className="text-violet-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100">Invitación recibida</div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Alguien te invitó a compartir gastos en pareja
                </div>
              </div>
            </div>
            <div className="bg-zinc-900/60 rounded-xl px-4 py-3 space-y-1">
              <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">Invitación de</div>
              <div className="text-sm text-zinc-200">{receivedPendingInvites[0].invitedBy || 'un usuario'}</div>
            </div>
            <div className="text-xs text-zinc-500 px-0.5">
              Al aceptar, vas a poder ver y agregar gastos compartidos con tu pareja.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onAcceptInvite?.(receivedPendingInvites[0])}
                className="flex-1 py-2.5 bg-violet-400 text-zinc-950 text-sm font-semibold rounded-xl hover:bg-violet-300 active:scale-95 transition-all"
              >
                Aceptar
              </button>
              <button
                onClick={() => onRejectInvite?.(receivedPendingInvites[0])}
                className="px-5 py-2.5 text-zinc-500 hover:text-red-400 text-sm rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Rechazar
              </button>
            </div>
          </div>
        )}

        {/* Setup screen */}
        {section === 'pareja' && !sharedFolderId && receivedPendingInvites.length === 0 && (
          <div className="bg-zinc-900 rounded-2xl px-5 py-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-400/15 flex items-center justify-center shrink-0">
                <Heart size={18} className="text-violet-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-100">Gastos en pareja</div>
                <div className="text-xs text-zinc-500 mt-0.5">Invitá a tu pareja para llevar los gastos juntos</div>
              </div>
            </div>

            {inviteSent ? (
              <div className="bg-violet-400/10 border border-violet-400/20 rounded-xl px-4 py-3 space-y-1">
                <div className="text-sm text-violet-300 font-medium">Listo — invitación guardada</div>
                <div className="text-xs text-zinc-400">
                  Tu pareja tiene que abrir la app e iniciar sesión con ese email. Una vez que entre, va a ver los gastos compartidos automáticamente.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5">
                    <Mail size={14} className="text-zinc-500 shrink-0" />
                    <input
                      type="email"
                      inputMode="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleInvite()}
                      placeholder="email de tu pareja"
                      className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                    />
                  </div>
                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail.trim() || inviteLoading}
                    className="px-4 py-2.5 bg-violet-400 text-zinc-950 text-sm font-medium rounded-xl disabled:opacity-40 transition-all hover:bg-violet-300 active:scale-95"
                  >
                    {inviteLoading ? '…' : 'Invitar'}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 px-1">Se va a enviar un mail de invitación con el link a la app.</p>
                {inviteError && (
                  <p className="text-[11px] text-red-400 px-1">{inviteError}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Partner management */}
        {section === 'pareja' && sharedFolderId && (
          <div className="bg-zinc-900 rounded-2xl px-4 py-3">
            {partnerMember ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-400/20 flex items-center justify-center shrink-0 text-violet-400 text-xs font-bold">
                  {(partnerMember.displayName || partnerMember.email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { onRenamePartner?.(partnerMember.userId, nameInput); setEditingName(false); }
                          if (e.key === 'Escape') setEditingName(false);
                        }}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100 outline-none focus:border-violet-500"
                        autoFocus
                      />
                      <button onClick={() => { onRenamePartner?.(partnerMember.userId, nameInput); setEditingName(false); }}
                        className="text-violet-400 hover:text-violet-300"><Check size={14} /></button>
                      <button onClick={() => setEditingName(false)} className="text-zinc-500 hover:text-zinc-300"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-zinc-100 truncate">{partnerMember.displayName || partnerMember.email}</span>
                      <span className="text-[10px] text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded-full">Activo</span>
                    </div>
                  )}
                  <div className="text-xs text-zinc-500 truncate">{partnerMember.email}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setNameInput(partnerMember.displayName || ''); setEditingName(true); }}
                    aria-label="Editar"
                    className="p-1.5 rounded-full text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => onRemovePartner?.(partnerMember.email)}
                    aria-label="Eliminar"
                    className="p-1.5 rounded-full text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors">
                    <UserMinus size={13} />
                  </button>
                </div>
              </div>
            ) : partnerInvite ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                    <Mail size={14} className="text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-zinc-300 truncate">{partnerInvite.invitedEmail}</span>
                      <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">Pendiente</span>
                    </div>
                    <div className="text-xs text-zinc-600">Esperando que inicie sesión con ese email</div>
                  </div>
                  <button onClick={() => onRemovePartner?.(partnerInvite.invitedEmail)}
                    aria-label="Eliminar"
                    className="p-1.5 rounded-full text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors shrink-0">
                    <UserMinus size={13} />
                  </button>
                </div>
                {editingName ? (
                  <div className="flex items-center gap-2 pl-11">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { onRenamePartner?.(partnerInvite.invitedEmail, nameInput); setEditingName(false); }
                        if (e.key === 'Escape') setEditingName(false);
                      }}
                      placeholder="Apodo para tu pareja"
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100 outline-none focus:border-violet-500"
                      autoFocus
                    />
                    <button onClick={() => { onRenamePartner?.(partnerInvite.invitedEmail, nameInput); setEditingName(false); }}
                      className="text-violet-400 hover:text-violet-300"><Check size={14} /></button>
                    <button onClick={() => setEditingName(false)} className="text-zinc-500 hover:text-zinc-300"><X size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => { setNameInput(''); setEditingName(true); }}
                    className="pl-11 text-xs text-zinc-500 hover:text-violet-400 transition-colors flex items-center gap-1">
                    <Pencil size={11} /> Poner apodo
                  </button>
                )}
              </div>
            ) : showInlineInvite ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2">
                    <Mail size={13} className="text-zinc-500 shrink-0" />
                    <input
                      type="email" inputMode="email" value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleInvite()}
                      placeholder="email de tu pareja"
                      className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                      autoFocus
                    />
                  </div>
                  <button onClick={handleInvite} disabled={!inviteEmail.trim() || inviteLoading}
                    className="px-3 py-2 bg-violet-400 text-zinc-950 text-sm font-medium rounded-xl disabled:opacity-40 hover:bg-violet-300 active:scale-95 transition-all">
                    {inviteLoading ? '…' : 'Invitar'}
                  </button>
                  <button onClick={() => setShowInlineInvite(false)}
                    className="p-2 text-zinc-500 hover:text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <p className="text-[11px] text-zinc-600 px-1">Tu pareja tiene que iniciar sesión en la app con ese email</p>
                {inviteError && (
                  <p className="text-[11px] text-red-400 px-1">{inviteError}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-500">No hay pareja vinculada</span>
                <button onClick={() => { setShowInlineInvite(true); setInviteSent(false); }}
                  className="text-xs text-violet-400 hover:text-violet-300 font-medium">
                  + Invitar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Couple sub-tab toggle: Gastos / Ahorro */}
        {section === 'pareja' && sharedFolderId && (
          <div className="flex gap-2 bg-zinc-900 p-1 rounded-xl">
            <button
              onClick={() => setCoupleTab('gastos')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                coupleTab === 'gastos' ? 'bg-violet-400 text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Gastos
            </button>
            <button
              onClick={() => setCoupleTab('ahorro')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                coupleTab === 'ahorro' ? 'bg-violet-400 text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <PiggyBank size={13} />
              Ahorro
            </button>
          </div>
        )}

        {/* Ahorro tab content */}
        {section === 'pareja' && sharedFolderId && coupleTab === 'ahorro' && (
          <div className="space-y-4">
            {/* Goal card */}
            <div className="bg-zinc-900 rounded-2xl px-5 py-4 space-y-3">
              {editingGoal ? (
                <div className="space-y-2.5">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5">Nombre de la meta</div>
                    <input
                      type="text"
                      value={goalNameInput}
                      onChange={e => setGoalNameInput(e.target.value)}
                      placeholder="Ej: Vacaciones, casa nueva…"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500 placeholder:text-zinc-600"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5">Monto objetivo (ARS)</div>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={goalAmountInput}
                      onChange={e => setGoalAmountInput(e.target.value)}
                      placeholder="0"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500 placeholder:text-zinc-600"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveGoal}
                      className="flex-1 py-2 bg-violet-400 text-zinc-950 text-sm font-medium rounded-xl hover:bg-violet-300 active:scale-95 transition-all"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingGoal(false)}
                      className="px-4 py-2 text-zinc-500 hover:text-zinc-300 text-sm rounded-xl hover:bg-zinc-800 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Meta de ahorro</div>
                      <div className="text-lg font-medium text-zinc-100 mt-0.5">{ahorroData.goalName}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setGoalNameInput(ahorroData.goalName); setGoalAmountInput(ahorroData.goalAmount > 0 ? String(ahorroData.goalAmount) : ''); setEditingGoal(true); }}
                        aria-label="Editar meta"
                        className="p-1.5 rounded-full text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteGoal(true)}
                        aria-label="Borrar meta"
                        className="p-1.5 rounded-full text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {confirmDeleteGoal && (
                    <div className="bg-zinc-800/80 rounded-xl px-4 py-3 space-y-2.5">
                      <p className="text-xs text-zinc-300">¿Borrar la meta y todos los aportes? Esta acción no se puede deshacer.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setAhorroData({ goalName: 'Meta compartida', goalAmount: 0, myContribs: [], partnerContribs: [] });
                            setConfirmDeleteGoal(false);
                          }}
                          className="flex-1 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Borrar todo
                        </button>
                        <button
                          onClick={() => setConfirmDeleteGoal(false)}
                          className="px-4 py-1.5 text-zinc-400 hover:text-zinc-200 text-xs rounded-lg hover:bg-zinc-700 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                      <span className="tabular-nums font-medium">{formatARS(totalSaved)}</span>
                      {ahorroData.goalAmount > 0 && <span className="text-zinc-600 tabular-nums">de {formatARS(ahorroData.goalAmount)}</span>}
                    </div>
                    <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: ahorroData.goalAmount > 0 ? `${Math.min(100, (totalSaved / ahorroData.goalAmount) * 100)}%` : '0%',
                          background: 'linear-gradient(90deg, #a78bfa, #7c3aed)',
                        }}
                      />
                    </div>
                    {ahorroData.goalAmount > 0 && (
                      <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                        <span>{Math.min(100, Math.round((totalSaved / ahorroData.goalAmount) * 100))}% alcanzado</span>
                        {totalSaved < ahorroData.goalAmount && <span>{formatARS(ahorroData.goalAmount - totalSaved)} restante</span>}
                      </div>
                    )}
                    {ahorroData.goalAmount === 0 && (
                      <button
                        onClick={() => { setGoalNameInput(ahorroData.goalName); setGoalAmountInput(''); setEditingGoal(true); }}
                        className="mt-1 text-[11px] text-zinc-600 hover:text-violet-400 transition-colors"
                      >
                        + Establecer objetivo
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3 pt-2 border-t border-zinc-800">
                    <div className="flex-1 text-center">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-[0.15em]">Yo ahorré</div>
                      <div className="text-base font-medium tabular-nums text-zinc-200 mt-0.5">{formatARS(myTotalSaved)}</div>
                    </div>
                    <div className="w-px bg-zinc-800" />
                    <div className="flex-1 text-center">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-[0.15em]">{partner} ahorró</div>
                      <div className="text-base font-medium tabular-nums text-zinc-200 mt-0.5">{formatARS(partnerTotalSaved)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Add contribution inline form */}
            {addingContrib && (
              <div className="bg-zinc-900 rounded-2xl px-5 py-4 space-y-3">
                <div className="text-sm font-medium text-zinc-200">
                  {addingContrib === 'me' ? 'Agregar mi aporte' : `Agregar aporte de ${partner}`}
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={contribAmount}
                  onChange={e => setContribAmount(e.target.value)}
                  placeholder="Monto en ARS"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500 placeholder:text-zinc-600"
                  autoFocus
                />
                <input
                  type="text"
                  value={contribNote}
                  onChange={e => setContribNote(e.target.value)}
                  placeholder="Nota (opcional)"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500 placeholder:text-zinc-600"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => addContrib(addingContrib)}
                    disabled={!contribAmount || parseFloat(contribAmount) <= 0}
                    className="flex-1 py-2 bg-violet-400 text-zinc-950 text-sm font-medium rounded-xl disabled:opacity-40 hover:bg-violet-300 active:scale-95 transition-all"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => { setAddingContrib(null); setContribAmount(''); setContribNote(''); }}
                    className="px-4 py-2 text-zinc-500 hover:text-zinc-300 text-sm rounded-xl hover:bg-zinc-800 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Contribution columns */}
            <div className="grid grid-cols-2 gap-3">
              {/* My contributions */}
              <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Mis aportes</div>
                  <button
                    onClick={() => { setAddingContrib('me'); setContribAmount(''); setContribNote(''); }}
                    aria-label="Agregar mi aporte"
                    className="w-5 h-5 rounded-full bg-violet-400/15 text-violet-400 hover:bg-violet-400/25 flex items-center justify-center transition-colors"
                  >
                    <Plus size={11} strokeWidth={2.5} />
                  </button>
                </div>
                {(ahorroData.myContribs || []).length === 0 ? (
                  <div className="text-xs text-zinc-600 text-center py-2">Sin aportes</div>
                ) : (
                  <div className="space-y-2">
                    {(showAllMe ? ahorroData.myContribs : ahorroData.myContribs.slice(-3)).map(c => (
                      <div key={c.id} className="group flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium tabular-nums text-zinc-200">{formatARS(c.amount)}</div>
                          <div className="text-[10px] text-zinc-600">{c.date}{c.note ? ` · ${c.note}` : ''}</div>
                        </div>
                        <button
                          onClick={() => removeContrib('me', c.id)}
                          aria-label="Eliminar"
                          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all shrink-0 mt-0.5"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                    {(ahorroData.myContribs || []).length > 3 && (
                      <button
                        onClick={() => setShowAllMe(v => !v)}
                        className="flex items-center gap-0.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        {showAllMe ? <><ChevronUp size={10} />Menos</> : <><ChevronDown size={10} />+{ahorroData.myContribs.length - 3} más</>}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Partner contributions */}
              <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">{partner}</div>
                  <button
                    onClick={() => { setAddingContrib('partner'); setContribAmount(''); setContribNote(''); }}
                    aria-label={`Agregar aporte de ${partner}`}
                    className="w-5 h-5 rounded-full bg-violet-400/15 text-violet-400 hover:bg-violet-400/25 flex items-center justify-center transition-colors"
                  >
                    <Plus size={11} strokeWidth={2.5} />
                  </button>
                </div>
                {(ahorroData.partnerContribs || []).length === 0 ? (
                  <div className="text-xs text-zinc-600 text-center py-2">Sin aportes</div>
                ) : (
                  <div className="space-y-2">
                    {(showAllPartner ? ahorroData.partnerContribs : ahorroData.partnerContribs.slice(-3)).map(c => (
                      <div key={c.id} className="group flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium tabular-nums text-zinc-200">{formatARS(c.amount)}</div>
                          <div className="text-[10px] text-zinc-600">{c.date}{c.note ? ` · ${c.note}` : ''}</div>
                        </div>
                        <button
                          onClick={() => removeContrib('partner', c.id)}
                          aria-label="Eliminar"
                          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all shrink-0 mt-0.5"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                    {(ahorroData.partnerContribs || []).length > 3 && (
                      <button
                        onClick={() => setShowAllPartner(v => !v)}
                        className="flex items-center gap-0.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        {showAllPartner ? <><ChevronUp size={10} />Menos</> : <><ChevronDown size={10} />+{ahorroData.partnerContribs.length - 3} más</>}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History chart — 6/12 month comparison */}
        {!(section === 'pareja' && !sharedFolderId) && !(section === 'pareja' && coupleTab === 'ahorro') && hasHistory && (
          <div className="bg-zinc-900 rounded-2xl px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Gastos por mes</div>
                <div className="text-sm text-zinc-300 mt-0.5">Promedio: <span className="tabular-nums text-zinc-100">{formatARS(avgHistory)}</span></div>
              </div>
              <div className="flex bg-zinc-800 rounded-lg p-0.5">
                <button
                  onClick={() => setChartRange(6)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    chartRange === 6 ? (section === 'pareja' ? 'bg-violet-400 text-zinc-950' : 'bg-lime-300 text-zinc-950') : 'text-zinc-400'
                  }`}
                >
                  6m
                </button>
                <button
                  onClick={() => setChartRange(12)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    chartRange === 12 ? (section === 'pareja' ? 'bg-violet-400 text-zinc-950' : 'bg-lime-300 text-zinc-950') : 'text-zinc-400'
                  }`}
                >
                  12m
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={historyData} margin={{ top: 6, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(63,63,70,0.3)' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 shadow-xl text-xs">
                        <div className="text-zinc-500 mb-0.5">{label}</div>
                        <div className="text-zinc-100 font-medium tabular-nums">{formatARS(payload[0].value)}</div>
                      </div>
                    );
                  }}
                />
                {avgHistory > 0 && (
                  <ReferenceLine y={avgHistory} stroke="#52525b" strokeDasharray="3 3" />
                )}
                <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                  {historyData.map((d, i) => (
                    <Cell key={i} fill={d.isCurrent
                      ? (section === 'pareja' ? '#a78bfa' : '#bef264')
                      : (section === 'pareja' ? '#a78bfa55' : '#bef26455')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Summary card */}
        {!(section === 'pareja' && !sharedFolderId) && !(section === 'pareja' && coupleTab === 'ahorro') && monthExpenses.length > 0 && (
          <div className="bg-zinc-900 rounded-2xl px-5 py-4 space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Total del mes</div>
                <div className="text-3xl font-serif-display text-zinc-100 tabular-nums mt-1">{formatARS(total)}</div>
                <div className="text-xs text-zinc-600 mt-0.5">
                  {monthExpenses.length} {monthExpenses.length === 1 ? 'gasto' : 'gastos'}
                  {section === 'pareja' && totalShared > 0 && ` · c/u ${formatARS(totalShared / 2)}`}
                </div>
              </div>
              {section === 'pareja' && totalShared > 0 ? (
                <div className="flex flex-col items-end gap-1.5">
                  <div className={`text-right text-sm font-medium tabular-nums rounded-xl px-3 py-2 ${
                    Math.abs(balance) < 1 ? 'bg-zinc-800 text-zinc-400'
                      : balance > 0 ? 'bg-emerald-400/10 text-emerald-400'
                        : 'bg-red-400/10 text-red-400'
                  }`}>
                    {Math.abs(balance) < 1 ? 'Al día' : balance > 0
                      ? <><div className="text-xs">{partner} te debe</div><div>{formatARS(Math.abs(balance))}</div></>
                      : <><div className="text-xs">Le debés a {partner}</div><div>{formatARS(Math.abs(balance))}</div></>
                    }
                  </div>
                  {Math.abs(balance) >= 1 && !showSettle && (
                    <button
                      onClick={() => setShowSettle(true)}
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-violet-400 transition-colors"
                    >
                      <ArrowLeftRight size={11} /> Saldar
                    </button>
                  )}
                </div>
              ) : delta !== null ? (
                <div className={`text-sm font-medium tabular-nums ${delta >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {delta >= 0 ? '+' : ''}{(delta * 100).toFixed(0)}%
                  <div className="text-[10px] text-zinc-600 font-normal">vs mes anterior</div>
                </div>
              ) : null}
            </div>

            {section === 'pareja' && totalShared > 0 && (
              <div className="flex gap-3 pt-2 border-t border-zinc-800">
                <div className="flex-1 text-center">
                  <div className="text-xs text-zinc-500">Yo pagué</div>
                  <div className="text-sm font-medium tabular-nums text-zinc-200 mt-0.5">{formatARS(myPaid)}</div>
                </div>
                <div className="w-px bg-zinc-800" />
                <div className="flex-1 text-center">
                  <div className="text-xs text-zinc-500">{partner} pagó</div>
                  <div className="text-sm font-medium tabular-nums text-zinc-200 mt-0.5">{formatARS(partnerPaid)}</div>
                </div>
              </div>
            )}

            {showSettle && Math.abs(balance) >= 1 && (
              <div className="pt-3 border-t border-zinc-800 space-y-3">
                <div className="text-xs text-zinc-400">
                  {balance > 0
                    ? `Registrar que ${partner} te pagó ${formatARS(Math.abs(balance))}`
                    : `Registrar que le pagaste ${formatARS(Math.abs(balance))} a ${partner}`
                  }
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSettle}
                    disabled={settling}
                    className="flex-1 py-2 bg-violet-400 text-zinc-950 text-sm font-medium rounded-xl disabled:opacity-50 hover:bg-violet-300 active:scale-95 transition-all"
                  >
                    {settling ? '…' : 'Confirmar'}
                  </button>
                  <button
                    onClick={() => setShowSettle(false)}
                    className="px-4 py-2 text-zinc-500 hover:text-zinc-300 text-sm rounded-xl hover:bg-zinc-800 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {byCat.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">Por categoría</div>
                {byCat.map(({ cat, total: t }) => {
                  const pct = total > 0 ? (t / total) * 100 : 0;
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                          <span>{cat.emoji}</span><span>{cat.name}</span>
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

        {/* Shared balance history chart */}
        {section === 'pareja' && sharedFolderId && coupleTab === 'gastos' && (
          <SharedBalanceChart sharedExpenses={sharedExpensesProp} userId={userId} />
        )}

        {/* Expense list */}
        {!(section === 'pareja' && !sharedFolderId) && !(section === 'pareja' && coupleTab === 'ahorro') && (filteredExpenses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 mb-1">
              {hasFilters ? 'Sin resultados para ese filtro' : section === 'pareja' ? 'No hay gastos en pareja este mes' : 'No hay gastos este mes'}
            </p>
            <p className="text-xs text-zinc-600">
              {hasFilters ? '' : section === 'pareja' ? 'Tocá + para agregar un gasto compartido' : 'Agregá efectivo, transferencias, servicios, etc.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExpenses.map(exp => {
              const cat = categories.find(c => c.id === exp.categoryId);
              const ars = convertToARS(exp.amount, exp.currency, exp.exchangeRate);
              const iPaid = !exp.paidBy || exp.paidBy === userId;
              const isSwiped = swipedId === exp.id;

              return (
                <div key={exp.id} className="relative overflow-hidden rounded-2xl">
                  <div className="absolute inset-y-0 right-0 flex items-center px-5 bg-red-500/20 rounded-2xl">
                    <Trash2 size={18} className="text-red-400" />
                  </div>
                  <div
                    className="bg-zinc-900 rounded-2xl px-4 py-3.5 flex items-center gap-3 relative"
                    style={{ transform: isSwiped ? 'translateX(-72px)' : 'translateX(0)', transition: 'transform 0.2s ease' }}
                    onTouchStart={e => { touchStartX.current = e.touches[0].clientX; touchCurrentX.current = 0; }}
                    onTouchMove={e => {
                      if (touchStartX.current === null) return;
                      const dx = touchStartX.current - e.touches[0].clientX;
                      touchCurrentX.current = dx;
                      if (dx > 60) setSwipedId(exp.id);
                      else if (dx < 10) setSwipedId(null);
                    }}
                    onTouchEnd={() => {
                      if (touchCurrentX.current > 120) {
                        const del = section === 'pareja' ? onDeleteShared?.(exp.id) : onDelete?.(exp.id);
                        Promise.resolve(del).catch(e => setOpError('No se pudo eliminar: ' + (e?.message || 'error desconocido')));
                        setSwipedId(null);
                      }
                      touchStartX.current = null;
                    }}
                    onClick={() => { if (swipedId === exp.id) { setSwipedId(null); return; } }}
                  >
                    <span className="text-xl shrink-0">{cat?.emoji || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-100 truncate">{exp.description}</div>
                      <div className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1.5">
                        <span>{exp.date}</span>
                        <span>·</span>
                        <span>{cat?.name || 'Sin categoría'}</span>
                        {section === 'pareja' && (
                          <><span>·</span><span className={iPaid ? 'text-violet-400' : 'text-zinc-500'}>{iPaid ? 'Yo pagué' : `${partner} pagó`}</span></>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-medium tabular-nums text-zinc-100">{formatARS(ars)}</div>
                      {exp.currency === 'USD' && <div className="text-xs text-zinc-600">US$ {exp.amount}</div>}
                      {section === 'pareja' && <div className="text-xs text-zinc-600 tabular-nums">c/u {formatARS(ars / 2)}</div>}
                    </div>
                    {exp.receiptPath && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!onGetReceiptUrl) return;
                          const url = await onGetReceiptUrl(exp.receiptPath);
                          if (url) setReceiptUrl(url);
                        }}
                        className="p-1.5 rounded-full text-zinc-600 hover:text-lime-400 hover:bg-zinc-800 transition-colors shrink-0"
                        title="Ver comprobante"
                      >
                        <ImageIcon size={13} />
                      </button>
                    )}
                    {section === 'pareja' ? (
                      <button
                        onClick={() => onEditShared?.(exp)}
                        aria-label="Editar"
                        className="p-1.5 rounded-full text-zinc-700 hover:text-zinc-300 hover:bg-zinc-800 transition-colors shrink-0"
                      >
                        <Pencil size={13} />
                      </button>
                    ) : (
                      <button
                        onClick={() => onEditPersonal?.(exp)}
                        aria-label="Editar"
                        className="p-1.5 rounded-full text-zinc-700 hover:text-zinc-300 hover:bg-zinc-800 transition-colors shrink-0"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => section === 'pareja' ? onDeleteShared?.(exp.id) : onDelete(exp.id)}
                      aria-label="Eliminar"
                      className="p-1.5 rounded-full text-zinc-700 hover:text-red-400 hover:bg-zinc-800 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </main>

      {!(section === 'pareja' && !sharedFolderId) && !(section === 'pareja' && coupleTab === 'ahorro') && (
        <>
          {section === 'personal' && onSaveRecurring && (
            <button
              onClick={openNewRecurring}
              aria-label="Nuevo gasto recurrente"
              className="fixed right-5 z-30 h-11 px-4 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-medium"
              style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom) + 4.25rem)' }}
            >
              <Repeat size={14} />
              Recurrente
            </button>
          )}
          <button
            onClick={handleAdd}
            aria-label="Agregar"
            className={`fixed right-5 z-30 h-14 w-14 rounded-full text-zinc-950 flex items-center justify-center active:scale-95 transition-all ${
              section === 'pareja' ? 'bg-violet-400 hover:bg-violet-300' : 'bg-lime-300 hover:bg-lime-200'
            }`}
            style={section === 'pareja'
              ? { bottom: 'calc(4.5rem + env(safe-area-inset-bottom))', boxShadow: '0 10px 30px -5px rgba(167,139,250,0.4)' }
              : { bottom: 'calc(4.5rem + env(safe-area-inset-bottom))', boxShadow: '0 10px 30px -5px rgba(190,242,100,0.4), 0 0 0 1px rgba(190,242,100,0.1)' }
            }
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </>
      )}

      {editingRecurring && (
        <RecurringEditModal
          item={editingRecurring}
          cards={cards}
          categories={categories}
          onChange={setEditingRecurring}
          onSave={handleSaveRecurring}
          onClose={() => setEditingRecurring(null)}
        />
      )}

      {/* Receipt lightbox */}
      {receiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={() => setReceiptUrl(null)}
        >
          <button
            className="absolute top-5 right-5 p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-zinc-100"
            onClick={() => setReceiptUrl(null)}
          >
            <X size={20} />
          </button>
          <img
            src={receiptUrl}
            alt="Comprobante"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default GastosView;
