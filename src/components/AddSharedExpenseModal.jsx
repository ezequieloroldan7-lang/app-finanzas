import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CUOTA_OPTIONS } from '../constants';
import { formatARS } from '../lib/formatters';
import { fetchRates } from '../lib/cotizacion';
import FormSection from './FormSection';

const RATE_LABELS = [
  { key: 'tarjeta', label: 'Tarjeta' },
  { key: 'blue', label: 'Blue' },
  { key: 'oficial', label: 'Oficial' },
];

function AddSharedExpenseModal({ existing, categories, members, userId, onSave, onClose }) {
  const [amount, setAmount] = useState(existing?.amount?.toString() || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [date, setDate] = useState(existing?.date || new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState(existing?.categoryId || categories[0]?.id || '');
  const [totalCuotas, setTotalCuotas] = useState(existing?.totalCuotas || 1);
  const [currency, setCurrency] = useState(existing?.currency || 'ARS');
  const [exchangeRate, setExchangeRate] = useState(existing?.exchangeRate?.toString() || '');
  const [paidBy, setPaidBy] = useState(existing?.paidBy || userId);

  const [rates, setRates] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [selectedRateKey, setSelectedRateKey] = useState(null);

  useEffect(() => {
    if (currency !== 'USD' || existing) return;
    setRatesLoading(true);
    fetchRates()
      .then(r => {
        setRates(r);
        if (!exchangeRate && r.tarjeta) {
          setExchangeRate(r.tarjeta.toString());
          setSelectedRateKey('tarjeta');
        }
      })
      .catch(() => {})
      .finally(() => setRatesLoading(false));
  }, [currency]);

  const numAmount = parseFloat(amount) || 0;
  const numRate = parseFloat(exchangeRate) || 1;
  const totalARS = currency === 'USD' ? numAmount * numRate : numAmount;
  const cuotaAmount = totalCuotas > 1 ? totalARS / totalCuotas : totalARS;

  const valid = numAmount > 0 && description.trim() && categoryId && (currency !== 'USD' || numRate > 0);

  const handleSubmit = () => {
    if (!valid) return;
    onSave({
      id: existing?.id,
      amount: numAmount,
      description: description.trim(),
      date,
      categoryId,
      totalCuotas,
      currency,
      exchangeRate: currency === 'USD' ? numRate : null,
      paidBy,
    });
  };

  const partner = members.find(m => m.userId !== userId);
  const partnerLabel = partner?.displayName || partner?.email?.split('@')[0] || 'Pareja';

  return (
    <div className="fixed inset-0 z-40 fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-zinc-950 rounded-t-3xl border-t border-zinc-800 max-h-[92vh] overflow-y-auto slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-900 px-5 py-4 flex items-center justify-between">
          <h3 className="text-zinc-100 text-lg font-medium">
            {existing ? 'Editar gasto compartido' : 'Nuevo gasto compartido'}
          </h3>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-zinc-900">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* ¿Quién pagó? */}
          <FormSection label="¿Quién pagó?">
            <div className="flex gap-2">
              <button
                onClick={() => setPaidBy(userId)}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-medium transition-all border-2 ${
                  paidBy === userId
                    ? 'border-violet-400 bg-violet-400/10 text-violet-100'
                    : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                Yo
              </button>
              <button
                onClick={() => setPaidBy(partner?.userId || 'partner')}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-medium transition-all border-2 ${
                  paidBy !== userId
                    ? 'border-violet-400 bg-violet-400/10 text-violet-100'
                    : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {partnerLabel}
              </button>
            </div>
          </FormSection>

          {/* Monto */}
          <FormSection label="Monto">
            <div className="flex gap-2 mb-3">
              {['ARS', 'USD'].map(cur => (
                <button
                  key={cur}
                  onClick={() => setCurrency(cur)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    currency === cur
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
            <div className="flex items-baseline gap-2 border-b border-zinc-800 pb-2">
              <span className="text-zinc-500 text-3xl font-serif-display">
                {currency === 'USD' ? 'US$' : '$'}
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent text-zinc-50 text-4xl font-serif-display outline-none placeholder:text-zinc-700 min-w-0"
                autoFocus
              />
            </div>

            {currency === 'USD' && (
              <div className="mt-3 space-y-3">
                {ratesLoading && <p className="text-xs text-zinc-500">Obteniendo cotización…</p>}
                {!ratesLoading && rates && (
                  <div className="flex gap-2">
                    {RATE_LABELS.map(({ key, label }) =>
                      rates[key] ? (
                        <button
                          key={key}
                          onClick={() => { setSelectedRateKey(key); setExchangeRate(rates[key].toString()); }}
                          className={`flex-1 py-2 px-1 rounded-xl border text-center transition-all ${
                            selectedRateKey === key
                              ? 'border-violet-400 bg-violet-400/10'
                              : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                          }`}
                        >
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
                          <div className="text-sm font-medium tabular-nums text-zinc-100 mt-0.5">
                            $ {rates[key].toLocaleString('es-AR')}
                          </div>
                        </button>
                      ) : null,
                    )}
                  </div>
                )}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500">Tipo de cambio</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={exchangeRate}
                    onChange={e => { setExchangeRate(e.target.value); setSelectedRateKey(null); }}
                    placeholder="ej. 1200"
                    className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-600 transition-colors"
                  />
                  {numAmount > 0 && numRate > 1 && (
                    <div className="text-xs text-zinc-500 mt-1.5 tabular-nums">
                      ≈ {formatARS(numAmount * numRate)} ARS
                    </div>
                  )}
                </div>
              </div>
            )}
          </FormSection>

          {/* Descripción */}
          <FormSection label="Descripción">
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="ej. Supermercado"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-zinc-100 outline-none focus:border-zinc-600 transition-colors"
            />
          </FormSection>

          {/* Categoría */}
          <FormSection label="Categoría">
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all border ${
                    categoryId === c.id
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <span className="mr-1">{c.emoji}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </FormSection>

          {/* Fecha */}
          <FormSection label="Fecha">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-zinc-100 outline-none focus:border-zinc-600 transition-colors"
            />
          </FormSection>

          {/* Cuotas */}
          <FormSection label="Cuotas" hint={totalCuotas === 1 ? '1 pago' : `${totalCuotas}x`}>
            <div className="flex gap-2 flex-wrap">
              {CUOTA_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => setTotalCuotas(n)}
                  className={`min-w-[48px] h-11 px-3 rounded-xl text-sm font-medium transition-all ${
                    totalCuotas === n
                      ? 'bg-violet-400 text-zinc-950'
                      : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {n === 1 ? '1' : `${n}x`}
                </button>
              ))}
            </div>
            {totalCuotas > 1 && totalARS > 0 && (
              <div className="mt-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>{totalCuotas} cuotas de</span>
                  <span className="text-zinc-100 font-medium tabular-nums">{formatARS(cuotaAmount)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 text-xs mt-1">
                  <span>Cada uno paga</span>
                  <span className="tabular-nums">{formatARS(cuotaAmount / 2)} /mes</span>
                </div>
              </div>
            )}
          </FormSection>

          <button
            onClick={handleSubmit}
            disabled={!valid}
            className="w-full bg-violet-400 text-zinc-950 font-medium py-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-violet-300 enabled:active:scale-[0.98] transition-all"
          >
            {existing ? 'Guardar cambios' : 'Agregar gasto compartido'}
          </button>
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}

export default AddSharedExpenseModal;
