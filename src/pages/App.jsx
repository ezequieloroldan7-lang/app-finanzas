import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CalendarDays, Plus, X, UserCircle2, FileText } from 'lucide-react';
import { monthKey, uid } from '../lib/formatters';
import { exportToExcel } from '../lib/exportExcel';
import {
  checkCardNotifications,
  checkBudgetNotification,
  checkRecurringNotifications,
  checkLargeExpenseNotification,
  subscribeToPush,
} from '../lib/notificaciones';
import {
  getCuotasForMonth,
  getMoMByCategory,
  getMonthlyTotals,
  getIncomeForMonth,
} from '../lib/aggregations';
import { getHealthScore } from '../lib/health';
import { useAuth } from '../hooks/useAuth';
import { useExpenses } from '../hooks/useExpenses';
import { useCards } from '../hooks/useCards';
import { useCategories } from '../hooks/useCategories';
import { useRecurring } from '../hooks/useRecurring';
import { useBudget } from '../hooks/useBudget';
import { useIncome } from '../hooks/useIncome';
import { useIncomeCategories } from '../hooks/useIncomeCategories';
import { useFiles } from '../hooks/useFiles';
import { useSharedFolders } from '../hooks/useSharedFolders';
import { useSharedExpenses } from '../hooks/useSharedExpenses';
import { useSavingsGoal } from '../hooks/useSavingsGoal';
import EmptyState from '../components/EmptyState';
import MonthSwitcher from '../components/MonthSwitcher';
import HeroKPI from '../components/HeroKPI';
import HealthScoreCard from '../components/HealthScoreCard';
import DebtProjectionCard from '../components/DebtProjectionCard';
import ProactiveInsightsCard from '../components/ProactiveInsightsCard';
import CategoryStackedChart from '../components/CategoryStackedChart';
import BalanceCard from '../components/BalanceCard';
import CardHistoryChart from '../components/CardHistoryChart';
import AddExpenseModal from '../components/AddExpenseModal';
import AddIncomeModal from '../components/AddIncomeModal';
import SettingsModal from '../components/SettingsModal';
import YearlyModal from '../components/YearlyModal';
import ImportarResumenModal from '../components/ImportarResumenModal';
import BottomNav from '../components/BottomNav';
import TarjetasView from '../components/TarjetasView';
import GastosView from '../components/GastosView';
import IngresoView from '../components/IngresoView';
import ArchivosView from '../components/ArchivosView';
import ChatIA from '../components/ChatIA';
import MetasAhorroModal from '../components/MetasAhorroModal';
import { ToastContainer, useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import OnboardingWizard from '../components/OnboardingWizard';
import ProfileModal from '../components/ProfileModal';
import Login from './Login';

export default function App() {
  const { user, loading, signIn, signUp, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-lime-400 rounded-full animate-spin" />
          <div className="text-zinc-600 text-xs tracking-widest uppercase">Cargando</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onSignIn={signIn} onSignUp={signUp} onSignInWithGoogle={signInWithGoogle} />;
  }

  return <Dashboard userId={user.id} userEmail={user.email} onSignOut={signOut} />;
}

function validateImportSchema(parsed) {
  if (!Array.isArray(parsed.expenses)) return 'Falta el array de gastos';
  for (const e of parsed.expenses.slice(0, 5)) {
    if (typeof e.description !== 'string') return 'Los gastos deben tener campo description (string)';
    if (typeof e.amount !== 'number') return 'Los gastos deben tener campo amount (número)';
  }
  if (parsed.cards !== undefined && !Array.isArray(parsed.cards)) return 'El campo cards debe ser un array';
  if (parsed.categories !== undefined && !Array.isArray(parsed.categories)) return 'El campo categories debe ser un array';
  if (parsed.recurring !== undefined && !Array.isArray(parsed.recurring)) return 'El campo recurring debe ser un array';
  return null;
}

function Dashboard({ userId, userEmail, onSignOut }) {
  const {
    expenses, loading: expLoading, upsertExpense, deleteExpense, setAll: setAllExpenses,
  } = useExpenses(userId);
  const {
    cards, loading: cardsLoading, save: saveCards, setAll: setAllCards,
  } = useCards(userId);
  const {
    categories, loading: catsLoading, save: saveCategories, setAll: setAllCategories,
  } = useCategories(userId);
  const {
    recurring, loading: recurLoading, save: saveRecurring, setAll: setAllRecurring,
  } = useRecurring(userId);
  const { budget, loading: budgetLoading, saveBudget } = useBudget(userId);
  const { goal: savingsGoal, setGoal: setSavingsGoal, clearGoal: clearSavingsGoal } = useSavingsGoal(userId);
  const { income, loading: incomeLoading, upsertIncome, deleteIncome } = useIncome(userId);
  const { incomeCategories, loading: incomeCatsLoading } = useIncomeCategories(userId);
  const { files, loading: filesLoading, uploadFile, getDownloadUrl, deleteFile } = useFiles(userId);
  const { toasts, showToast, dismissToast } = useToast();
  const {
    myFolder, members: sharedMembers, invites: sharedInvites,
    pendingReceivedInvites, customPartnerName, loading: sharedFoldersLoading,
    createFolder, inviteMember, removePartner, renamePartner,
    acceptInvite, rejectInvite,
  } = useSharedFolders(
    userId,
    userEmail,
    (member) => {
      showToast(`${member.displayName || member.email.split('@')[0]} se unió a tus gastos compartidos`);
    },
    () => {
      showToast('💜 Recibiste una invitación para gastos en pareja', 'info');
    },
  );
  const {
    expenses: sharedExpenses, loading: sharedExpLoading,
    deleteExpense: deleteSharedExpense, reload: reloadSharedExpenses,
  } = useSharedExpenses(myFolder?.id, userId, (exp) => {
    const partnerMember = sharedMembers.find(m => m.userId !== userId);
    const name = partnerMember?.displayName || partnerMember?.email?.split('@')[0] || 'Tu pareja';
    showToast(`${name} agregó "${exp.description}"`);
  });

  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallBanner(false);
    setInstallPrompt(null);
  };

  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('vue_active_tab') || 'inicio'; } catch { return 'inicio'; }
  });
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    try { localStorage.setItem('vue_active_tab', tab); } catch {}
  };
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [showAdd, setShowAdd] = useState(false);
  const [addNoCard, setAddNoCard] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState(null);
  const [showYearly, setShowYearly] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFromFile, setImportFromFile] = useState(null);
  const [editing, setEditing] = useState(null);
  const [addShared, setAddShared] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showGoal, setShowGoal] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const confirmResolveRef = useRef(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('onboarding_v1_done');
  });
  const [showProfile, setShowProfile] = useState(false);

  const loaded =
    !expLoading && !cardsLoading && !catsLoading && !recurLoading &&
    !budgetLoading && !incomeLoading && !incomeCatsLoading && !filesLoading &&
    !sharedFoldersLoading;

  const openConfirm = useCallback((config) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState(config);
    });
  }, []);

  const handleConfirmConfirm = useCallback(() => {
    setConfirmState(null);
    confirmResolveRef.current?.(true);
  }, []);

  const handleConfirmCancel = useCallback(() => {
    setConfirmState(null);
    confirmResolveRef.current?.(false);
  }, []);

  useEffect(() => {
    if (cards.length > 0) checkCardNotifications(cards);
  }, [cards]);

  useEffect(() => {
    if (loaded && recurring.length > 0) checkRecurringNotifications(recurring);
  }, [loaded, recurring]);

  useEffect(() => {
    if (userId && Notification.permission === 'granted') {
      subscribeToPush(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (Notification.permission !== 'default') return;
    const timer = setTimeout(async () => {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        subscribeToPush(userId);
      }
    }, 30_000); // 30 seconds after login
    return () => clearTimeout(timer);
  }, [userId]);

  const handleSaveExpense = async (exp) => {
    const isNew = !exp.id;
    const expId = exp.id || uid();
    let receiptPath = exp.receiptPath || null;
    if (exp.receiptFile) {
      try {
        const uploaded = await uploadFile(exp.receiptFile, 'receipt', { name: exp.description || 'comprobante' });
        receiptPath = uploaded.storagePath;
      } catch { /* receipt upload failure is non-blocking */ }
    }
    const { receiptFile: _rf, ...expData } = exp;
    try {
      await upsertExpense({ ...expData, id: expId, receiptPath });
    } catch (e) {
      showToast('Error al guardar el gasto: ' + (e?.message || 'error desconocido'));
      return;
    }
    if (addShared && isNew) {
      const partner = sharedMembers.find(m => m.userId !== userId);
      if (partner?.email) {
        fetch('/api/notify-expense', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: partner.email,
            senderName: userEmail.split('@')[0],
            description: exp.description,
            amount: exp.amount,
            date: exp.date,
          }),
        }).catch(() => {});
      }
      if (partner?.userId) {
        fetch('/api/push-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: partner.userId,
            title: `${userEmail.split('@')[0]} agregó un gasto`,
            body: `${exp.description}${exp.amount ? ` — $${Number(exp.amount).toLocaleString('es-AR')}` : ''}`,
          }),
        }).catch(() => {});
      }
    }
    checkLargeExpenseNotification({ ...expData, id: expId, receiptPath }, expenses);
    // If it's a shared expense, reload the shared list immediately so it appears
    // without waiting for the Supabase realtime event.
    if (addShared) reloadSharedExpenses();
    setShowAdd(false);
    setEditing(null);
    setAddNoCard(false);
    setAddShared(false);
  };

  const handleSaveIncome = async (inc) => {
    try {
      await upsertIncome({ ...inc, id: inc.id || uid() });
      setShowAddIncome(false);
    } catch (e) {
      const msg = e?.message || '';
      if (msg.includes('relation') || msg.includes('does not exist')) {
        setErrorMsg('Algo salió mal al cargar tus datos. Por favor, intentá de nuevo o contactá soporte.');
      } else {
        setErrorMsg('Error al guardar ingreso: ' + msg);
      }
    }
  };

  const handleDeleteExpense = useCallback(async (id) => {
    try {
      await deleteExpense(id);
    } catch (e) {
      showToast('Error al eliminar el gasto: ' + (e?.message || 'error desconocido'));
    }
  }, [deleteExpense, showToast]);

  const handleUpdatePersonalExpense = useCallback(async (exp) => {
    await upsertExpense(exp);
  }, [upsertExpense]);

  const handleSettleDebt = useCallback(async ({ paidBy, amount }) => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await upsertExpense({
        id: uid(),
        sharedFolderId: myFolder?.id,
        paidBy,
        date: today,
        description: 'Saldo de deuda',
        amount,
        currency: 'ARS',
        categoryId: null,
        totalCuotas: 1,
      });
      showToast('Deuda saldada correctamente');
    } catch (e) {
      showToast('Error al saldar deuda: ' + (e?.message || 'error desconocido'));
    }
  }, [upsertExpense, myFolder?.id, showToast]);

  const handleReset = useCallback(async () => {
    await setAllExpenses([]);
    await setAllRecurring([]);
    await saveBudget({ monthly: 0, categoryLimits: {} });
  }, [setAllExpenses, setAllRecurring, saveBudget]);

  const handleExportExcel = useCallback(async () => {
    await exportToExcel({ expenses, recurring, cards, categories });
  }, [expenses, recurring, cards, categories]);

  const handleImportResumen = async (items) => {
    try {
      const withIds = items.map(item => ({ ...item, id: uid() }));
      await setAllExpenses([...expenses, ...withIds]);
      showToast(`${items.length} gastos importados correctamente`);
    } catch (e) {
      showToast('Error al importar: ' + (e?.message || 'error desconocido'));
    }
  };

  const handleExport = () => {
    const blob = new Blob(
      [JSON.stringify(
        { expenses, cards, categories, recurring, budget, exportedAt: new Date().toISOString(), version: 'v2' },
        null,
        2,
      )],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mis-finanzas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.expenses || !Array.isArray(parsed.expenses)) {
        setErrorMsg('Archivo inválido: falta el array de gastos');
        return;
      }
      const schemaError = validateImportSchema(parsed);
      if (schemaError) {
        setErrorMsg('Archivo inválido: ' + schemaError);
        return;
      }
      const confirmed = await openConfirm({
        title: 'Reemplazar todos los datos',
        description: `Vas a reemplazar TODOS tus datos actuales con los del archivo. Esta acción no se puede deshacer.\n\n• ${parsed.expenses.length} gastos\n• ${parsed.recurring?.length || 0} recurrentes\n• ${parsed.cards?.length || 0} tarjetas`,
        confirmLabel: 'Reemplazar',
        danger: true,
      });
      if (!confirmed) return;
      await setAllExpenses(parsed.expenses || []);
      if (parsed.cards) await setAllCards(parsed.cards);
      if (parsed.categories) await setAllCategories(parsed.categories);
      if (parsed.recurring) await setAllRecurring(parsed.recurring || []);
      if (parsed.budget) await saveBudget(parsed.budget);
    } catch (e) {
      setErrorMsg('Error al leer el archivo: ' + e.message);
    }
  };

  const handleFileDownload = async (file) => {
    try {
      const url = await getDownloadUrl(file.storagePath);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        showToast('No se pudo obtener el enlace de descarga. Intentá de nuevo.', 'error');
      }
    } catch {
      showToast('Error al descargar el archivo.', 'error');
    }
  };

  const handleOpenImportFromFile = (file) => {
    setImportFromFile(file);
    setShowImport(true);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Historical: last 12 months (up to and including current month)
  const historicalTotals = useMemo(
    () => getMonthlyTotals(expenses, recurring, cards, year, month - 11, 12, 'all'),
    [expenses, recurring, cards, year, month],
  );

  // Projection: next 12 months
  const projectedTotals = useMemo(
    () => getMonthlyTotals(expenses, recurring, cards, year, month + 1, 12, 'all'),
    [expenses, recurring, cards, year, month],
  );

  // Merged for backward compatibility with consumers expecting the full 23-month range
  const monthlyTotals = useMemo(
    () => ({ ...historicalTotals, ...projectedTotals }),
    [historicalTotals, projectedTotals],
  );

  const currentMonthCuotas = useMemo(
    () => getCuotasForMonth(expenses, recurring, cards, year, month, 'all'),
    [expenses, recurring, cards, year, month],
  );

  const currentMonthTotal = useMemo(
    () => currentMonthCuotas.reduce((sum, c) => sum + c.cuota.amount, 0),
    [currentMonthCuotas],
  );

  useEffect(() => {
    if (loaded && budget?.monthly > 0) {
      checkBudgetNotification(currentMonthTotal, budget.monthly);
    }
  }, [loaded, currentMonthTotal, budget?.monthly]);

  const nextMonthDate = new Date(year, month + 1, 1);
  const nextMonthTotal = monthlyTotals[monthKey(nextMonthDate.getFullYear(), nextMonthDate.getMonth())] || 0;
  const prevMonthDate = new Date(year, month - 1, 1);
  const prevMonthTotal = monthlyTotals[monthKey(prevMonthDate.getFullYear(), prevMonthDate.getMonth())] || 0;
  const monthDelta = prevMonthTotal > 0 ? (currentMonthTotal - prevMonthTotal) / prevMonthTotal : 0;

  const momData = useMemo(
    () => getMoMByCategory(expenses, recurring, cards, categories, year, month, 'all', 12),
    [expenses, recurring, cards, categories, year, month],
  );

  const currentMonthIncome = useMemo(
    () => getIncomeForMonth(income, year, month),
    [income, year, month],
  );

  const settingsData = useMemo(
    () => ({ expenses, cards, categories, recurring, budget }),
    [expenses, cards, categories, recurring, budget],
  );

  const healthScore = useMemo(
    () => getHealthScore(monthlyTotals, year, month, expenses, budget),
    [monthlyTotals, year, month, expenses, budget],
  );

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-lime-400 rounded-full animate-spin" />
          <div className="text-zinc-600 text-xs tracking-widest uppercase">Cargando</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {showInstallBanner && (
        <div className="fixed bottom-20 left-4 right-4 z-40 bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex items-center gap-3 shadow-xl shadow-black/50">
          <div className="flex-1">
            <div className="text-zinc-100 text-sm font-medium">Instalá la app</div>
            <div className="text-zinc-500 text-xs">Accedé más rápido desde tu pantalla de inicio</div>
          </div>
          <button onClick={handleInstall} className="bg-lime-300 text-zinc-950 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-lime-200 transition-colors">
            Instalar
          </button>
          <button onClick={() => setShowInstallBanner(false)} className="text-zinc-500 hover:text-zinc-300 p-1" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="fixed top-4 left-4 right-4 z-50 flex items-start gap-3 bg-red-950/90 border border-red-800 text-red-200 text-sm px-4 py-3 rounded-2xl backdrop-blur-xl shadow-xl">
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-200 shrink-0 mt-0.5">
            <X size={16} />
          </button>
        </div>
      )}

      {activeTab === 'inicio' && (
        <div className="pb-20">
          <header className="sticky top-0 z-20 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-900 px-5 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-serif italic text-zinc-100 text-xl leading-none">
                  VUE<span className="text-lime-400">·</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowYearly(true)}
                  aria-label="Ver resumen anual"
                  className="p-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
                >
                  <CalendarDays size={20} />
                </button>
                <button
                  onClick={() => setShowProfile(true)}
                  aria-label="Mi perfil"
                  className="p-2 -mr-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
                >
                  <UserCircle2 size={20} />
                </button>
              </div>
            </div>
          </header>

          {expenses.length === 0 && recurring.length === 0 ? (
            <EmptyState onAdd={() => setShowAdd(true)} onImport={() => setShowImport(true)} />
          ) : (
            <main className="px-5 space-y-5 pt-6">
              <MonthSwitcher
                year={year}
                month={month}
                onPrev={() => setCurrentDate(new Date(year, month - 1, 1))}
                onNext={() => setCurrentDate(new Date(year, month + 1, 1))}
                onToday={() =>
                  setCurrentDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
                }
              />

              {/* Greeting */}
              <div className="space-y-0.5">
                <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-zinc-500">
                  Buenas, {userEmail ? userEmail.split('@')[0] : 'usuario'}
                </div>
                <div className="font-serif italic text-[28px] leading-tight text-zinc-100">
                  <span className="text-zinc-500">Tu plata,</span> en orden.
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setEditing(null); setAddNoCard(false); setShowAdd(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-lime-300/10 text-lime-300 border border-lime-300/20 hover:bg-lime-300/15 transition-colors text-sm font-medium"
                >
                  <Plus size={14} />
                  Nuevo gasto
                </button>
                <button
                  onClick={() => setShowImport(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 transition-colors text-sm"
                >
                  <FileText size={14} />
                  Importar resumen
                </button>
              </div>

              <BalanceCard
                totalIngresos={currentMonthIncome}
                totalGastos={currentMonthTotal}
              />

              <CardHistoryChart
                expenses={expenses}
                recurring={recurring}
                cards={cards}
                currentYear={year}
                currentMonth={month}
                months={12}
              />

              {momData.some(d => categories.some(c => d[c.id] > 0)) && (
                <CategoryStackedChart data={momData} categories={categories} months={12} />
              )}

              <HeroKPI
                total={currentMonthTotal}
                nextMonth={nextMonthTotal}
                delta={monthDelta}
                cuotasCount={currentMonthCuotas.length}
                budget={budget?.monthly}
                monthlyInflation={budget?.monthlyInflation || 0}
                currentMonth={month}
                goal={savingsGoal}
                onOpenGoal={() => setShowGoal(true)}
              />

              <HealthScoreCard score={healthScore} />

              <DebtProjectionCard
                expenses={expenses}
                cards={cards}
                currentYear={year}
                currentMonth={month}
              />

              <ProactiveInsightsCard
                expenses={expenses}
                income={income}
                budget={budget}
                categories={categories}
                recurring={recurring}
                currentYear={year}
                currentMonth={month}
              />
            </main>
          )}

          <button
            onClick={() => {
              setEditing(null);
              setAddNoCard(false);
              setShowAdd(true);
            }}
            aria-label="Agregar gasto"
            className="fixed right-5 z-30 h-14 w-14 rounded-full bg-lime-300 text-zinc-950 flex items-center justify-center hover:bg-lime-200 active:scale-95 transition-all"
            style={{
              bottom: 'calc(4.5rem + env(safe-area-inset-bottom))',
              boxShadow: '0 10px 30px -5px rgba(190, 242, 100, 0.4), 0 0 0 1px rgba(190, 242, 100, 0.1)',
            }}
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {activeTab === 'tarjetas' && (
        <TarjetasView
          cards={cards}
          expenses={expenses}
          recurring={recurring}
          categories={categories}
          onOpenSettings={(tab) => { setSettingsInitialTab(tab || null); setShowSettings(true); }}
          onOpenProfile={() => setShowProfile(true)}
          onAddExpense={() => { setEditing(null); setAddNoCard(false); setShowAdd(true); }}
          onImportResumen={() => setShowImport(true)}
          onEditExpense={(e) => {
            if (e.isRecurring) return;
            setEditing(e);
            setAddNoCard(false);
            setShowAdd(true);
          }}
          onDeleteExpense={handleDeleteExpense}
          onSaveCard={async (updatedCard) => {
            await saveCards(cards.map(c => c.id === updatedCard.id ? updatedCard : c));
          }}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />
      )}

      {activeTab === 'gastos' && (() => {
        const partnerMember = sharedMembers.find(m => m.userId !== userId) || null;
        const partnerInvite = sharedInvites[0] || null;
        return (
          <GastosView
            expenses={expenses}
            sharedExpenses={sharedExpenses}
            sharedExpLoading={sharedExpLoading}
            categories={categories}
            recurring={recurring}
            cards={cards}
            onSaveRecurring={saveRecurring}
            onOpenProfile={() => setShowProfile(true)}
            userId={userId}
            sharedFolderId={myFolder?.id || null}
            partnerName={customPartnerName || partnerMember?.displayName || null}
            partnerMember={partnerMember}
            partnerInvite={partnerInvite}
            receivedPendingInvites={pendingReceivedInvites}
            onAcceptInvite={async (invite) => {
              try { await acceptInvite(invite); showToast('¡Bienvenido/a al espacio compartido!'); }
              catch (e) { showToast(e?.message || 'Error al aceptar la invitación'); }
            }}
            onRejectInvite={async (invite) => {
              try { await rejectInvite(invite); showToast('Invitación rechazada'); }
              catch (e) { showToast(e?.message || 'Error al rechazar la invitación'); }
            }}
            onAdd={() => { setEditing(null); setAddNoCard(true); setAddShared(false); setShowAdd(true); }}
            onAddShared={() => { setEditing(null); setAddNoCard(true); setAddShared(true); setShowAdd(true); }}
            onEditShared={(exp) => { setEditing(exp); setAddNoCard(true); setAddShared(true); setShowAdd(true); }}
            onEditPersonal={(exp) => { setEditing(exp); setAddNoCard(true); setAddShared(false); setShowAdd(true); }}
            onDelete={handleDeleteExpense}
            onDeleteShared={deleteSharedExpense}
            onCreateFolder={createFolder}
            onInvite={async (email) => {
              const folder = myFolder || await createFolder('Gastos en pareja');
              await inviteMember(folder.id, email);
              const { data: { session } } = await supabase.auth.getSession();
              fetch('/api/send-invite', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify({ toEmail: email, inviterEmail: userEmail }),
              }).catch(() => {});
            }}
            onRemovePartner={removePartner}
            onRenamePartner={renamePartner}
            onSettleDebt={handleSettleDebt}
            onGetReceiptUrl={getDownloadUrl}
          />
        );
      })()}

      {activeTab === 'ingresos' && (
        <IngresoView
          income={income}
          incomeCategories={incomeCategories}
          onAdd={() => setShowAddIncome(true)}
          onDelete={deleteIncome}
          onOpenProfile={() => setShowProfile(true)}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />
      )}

      {activeTab === 'archivos' && (
        <ArchivosView
          files={files}
          cards={cards}
          onUpload={uploadFile}
          onDelete={deleteFile}
          onDownload={handleFileDownload}
          onOpenImport={handleOpenImportFromFile}
          onOpenProfile={() => setShowProfile(true)}
          onAddExpense={(prefill) => {
            setEditing({ ...prefill, cardId: null, totalCuotas: 1, currency: 'ARS' });
            setAddNoCard(true);
            setShowAdd(true);
          }}
        />
      )}

      {activeTab === 'chat' && (
        <ChatIA
          expenses={expenses}
          cards={cards}
          categories={categories}
          recurring={recurring}
          budget={budget}
          savingsGoal={savingsGoal}
          onOpenProfile={() => setShowProfile(true)}
        />
      )}

      <BottomNav active={activeTab} onChange={handleTabChange} onAdd={() => { setEditing(null); setAddNoCard(false); setShowAdd(true); }} />

      {showProfile && (
        <ProfileModal
          userId={userId}
          userEmail={userEmail}
          onClose={() => setShowProfile(false)}
          onSignOut={() => { setShowProfile(false); onSignOut(); }}
          onOpenSettings={(tab) => {
            setShowProfile(false);
            setSettingsInitialTab(tab || null);
            setShowSettings(true);
          }}
        />
      )}

      {showAdd && (
        <AddExpenseModal
          existing={editing}
          cards={cards}
          categories={categories}
          noCard={addNoCard}
          sharedFolderId={addShared ? (myFolder?.id || null) : null}
          currentUserId={userId}
          partnerId={sharedMembers.find(m => m.userId !== userId)?.userId || null}
          onSave={handleSaveExpense}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
            setAddNoCard(false);
            setAddShared(false);
          }}
        />
      )}

      {showAddIncome && (
        <AddIncomeModal
          incomeCategories={incomeCategories}
          onSave={handleSaveIncome}
          onClose={() => setShowAddIncome(false)}
        />
      )}

      {showYearly && (
        <YearlyModal
          expenses={expenses}
          recurring={recurring}
          cards={cards}
          categories={categories}
          onClose={() => setShowYearly(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          data={settingsData}
          onSaveCards={async (c) => { await saveCards(c); showToast('Tarjetas guardadas'); }}
          onSaveCategories={async (c) => { await saveCategories(c); showToast('Categorías guardadas'); }}
          onSaveRecurring={async (r) => { await saveRecurring(r); showToast('Recurrentes guardados'); }}
          onSaveBudget={async (b) => { await saveBudget(b); showToast('Presupuesto guardado'); }}
          initialTab={settingsInitialTab}
          onClose={() => { setShowSettings(false); setSettingsInitialTab(null); }}
          onReset={handleReset}
          onExport={handleExport}
          onExportExcel={handleExportExcel}
          onImport={handleImport}
          onImportResumen={() => setShowImport(true)}
          onSignOut={onSignOut}
        />
      )}

      {showImport && (
        <ImportarResumenModal
          cards={cards}
          categories={categories}
          onImport={handleImportResumen}
          onClose={() => { setShowImport(false); setImportFromFile(null); }}
        />
      )}
      {showGoal && (
        <MetasAhorroModal
          goal={savingsGoal}
          onSave={setSavingsGoal}
          onClear={clearSavingsGoal}
          onClose={() => setShowGoal(false)}
        />
      )}
      {showOnboarding && expenses.length === 0 && cards.length === 0 && loaded && (
        <OnboardingWizard
          onCreateCard={async (card) => { await saveCards([...cards, { ...card, id: uid() }]); }}
          onDismiss={() => setShowOnboarding(false)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {confirmState && (
        <ConfirmDialog
          open={!!confirmState}
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel={confirmState.confirmLabel}
          danger={confirmState.danger}
          onConfirm={handleConfirmConfirm}
          onCancel={handleConfirmCancel}
        />
      )}
    </div>
  );
}
