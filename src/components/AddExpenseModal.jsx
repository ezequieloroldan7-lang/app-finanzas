import { useEffect, useRef, useState } from 'react';
import { X, ScanLine, Loader2, Camera, Sparkles } from 'lucide-react';
import { CUOTA_OPTIONS } from '../constants';
import { formatARS } from '../lib/formatters';
import { cuotaWithInterest } from '../lib/cuotas';
import { fetchRates } from '../lib/cotizacion';
import { extractTextFromImage, parseOcrResult } from '../lib/ocr';
import { suggestCategory } from '../lib/ai';
import FormSection from './FormSection';

const RATE_LABELS = [
  { key: 'tarjeta', label: 'Tarjeta' },
  { key: 'blue', label: 'Blue' },
  { key: 'oficial', label: 'Oficial' },
];

function AddExpenseModal({ existing, cards, categories, noCard, sharedFolderId, currentUserId, partnerId, onSave, onClose }) {
  const [cardId, setCardId] = useState(() => {
    if (existing) return existing.cardId ?? null;
    if (noCard) return null;
    return cards[0]?.id ?? null;
  });
  const [amount, setAmount] = useState(existing?.amount?.toString() || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [date, setDate] = useState(
    existing?.date || new Date().toISOString().slice(0, 10),
  );
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId || categories[0]?.id || '',
  );
  const [totalCuotas, setTotalCuotas] = useState(existing?.totalCuotas || 1);
  const [currency, setCurrency] = useState(existing?.currency || 'ARS');
  const [exchangeRate, setExchangeRate] = useState(
    existing?.exchangeRate?.toString() || '',
  );
  const [hasInterest, setHasInterest] = useState((existing?.tna || 0) > 0);
  const [tna, setTna] = useState(existing?.tna?.toString() || '');

  const [rates, setRates] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [selectedRateKey, setSelectedRateKey] = useState(null);

  const [paidByMe, setPaidByMe] = useState(() => {
    if (existing?.paidBy) return existing.paidBy === currentUserId;
    return true;
  });

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const imageRef = useRef(null);

  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const receiptRef = useRef(null);

  const [catSuggestion, setCatSuggestion] = useState(null);
  const [catSuggesting, setCatSuggesting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    if (!categoryId || categories.length <= 8) return;
    const idx = categories.findIndex(c => c.id === categoryId);
    if (idx > 7) setShowAllCategories(true);
  }, [categoryId, categories]);

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
      .catch(() => {
        setRates({ tarjeta: null, blue: null, oficial: null, stale: true });
      })
      .finally(() => setRatesLoading(false));
  }, [currency]);

  useEffect(() => {
    if (description.trim().length < 4 || !categories.length) { setCatSuggestion(null); return; }
    const t = setTimeout(async () => {
      setCatSuggesting(true);
      try {
        const name = await suggestCategory(description, categories.map(c => c.name));
        const found = categories.find(c => c.name.toLowerCase() === name?.toLowerCase());
        setCatSuggestion(found || null);
      } catch { setCatSuggestion(null); }
      finally { setCatSuggesting(false); }
    }, 1200);
    return () => clearTimeout(t);
  }, [description, categories]);

  const handleReceiptFile = (file) => {
    if (!file) return;
    setReceiptFile(file);
    const url = URL.createObjectURL(file);
    setReceiptPreview(url);
  };

  const handleSelectRate = (key, value) => {
    setSelectedRateKey(key);
    setExchangeRate(value.toString());
  };

  const numAmount = parseFloat(amount) || 0;
  const numRate = parseFloat(exchangeRate) || 1;
  const numTna = hasInterest ? parseFloat(tna) || 0 : 0;
  const totalARS = currency === 'USD' ? numAmount * numRate : numAmount;
  const cuotaAmount = totalCuotas > 0 ? cuotaWithInterest(totalARS, totalCuotas, numTna) : 0;
  const totalWithInterest = cuotaAmount * totalCuotas;
  const totalInterest = totalWithInterest - totalARS;

  const valid =
    numAmount > 0 &&
    description.trim() &&
    categoryId &&
    (currency !== 'USD' || numRate > 0);

  const handleOcrFile = async (file) => {
    if (!file) return;
    setOcrLoading(true);
    setOcrError('');
    try {
      const text = await extractTextFromImage(file);
      const { description: desc, amount: amt } = parseOcrResult(text);
      if (desc) setDescription(desc);
      if (amt > 0) setAmount(amt.toString());
    } catch {
      setOcrError('No se pudo leer la imagen. Intentá con otra foto.');
    } finally {
      setOcrLoading(false);
      if (imageRef.current) imageRef.current.value = '';
    }
  };

  const isCard = cardId !== null;
  const cuotasEnabled = isCard || !!sharedFolderId;

  const handleSubmit = () => {
    setSubmitted(true);
    if (!valid) return;
    const paidBy = sharedFolderId
      ? (paidByMe ? currentUserId : (partnerId || 'partner'))
      : null;
    onSave({
      id: existing?.id,
      cardId: cardId || null,
      amount: numAmount,
      description: description.trim(),
      date,
      categoryId,
      totalCuotas: cuotasEnabled ? totalCuotas : 1,
      currency,
      exchangeRate: currency === 'USD' ? numRate : null,
      tna: cardId ? numTna : 0,
      sharedFolderId: sharedFolderId || null,
      paidBy,
      receiptFile: receiptFile || null,
    });
  };

  const title = existing ? 'Editar gasto' : isCard ? 'Nueva compra' : 'Nuevo gasto';

  return (
    <div className="fixed inset-0 z-40 fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-zinc-950 rounded-t-3xl border-t border-zinc-800 max-h-[92vh] overflow-y-auto slide-up"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title-expense"
      >
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-900 px-5 py-4 flex items-center justify-between">
          <h3 id="modal-title-expense" className="text-zinc-100 text-lg font-medium">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 -mr-2 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-zinc-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!sharedFolderId && <FormSection label="Tarjeta">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCardId(null)}
                className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all border-2 ${
                  cardId === null
                    ? 'border-lime-300 bg-lime-300/10 text-lime-100'
                    : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                Sin tarjeta
              </button>
              {cards.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCardId(c.id)}
                  className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all border-2 ${
                    cardId === c.id
                      ? 'border-lime-300 bg-lime-300/10 text-lime-100'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                    style={{ background: c.color }}
                  />
                  {c.name}
                </button>
              ))}
            </div>
          </FormSection>}

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
              {/* TODO: F-04 peso formatting — add display/raw separation for es-AR thousand separators */}
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={amount}
                onChange={e => {
                  setAmount(e.target.value);
                  if (fieldErrors.amount) setFieldErrors(prev => { const { amount: _, ...rest } = prev; return rest; });
                }}
                onBlur={() => {
                  const n = parseFloat(amount);
                  if (!amount || isNaN(n) || n <= 0) {
                    setFieldErrors(prev => ({ ...prev, amount: 'Ingresá un monto válido' }));
                  } else {
                    setFieldErrors(prev => { const { amount: _, ...rest } = prev; return rest; });
                  }
                }}
                placeholder="0"
                className="flex-1 bg-transparent text-zinc-50 text-4xl font-serif-display outline-none placeholder:text-zinc-700 min-w-0"
                autoFocus
              />
            </div>

            {(submitted && numAmount <= 0 || fieldErrors.amount) && (
              <p className="text-xs text-red-400 mt-1.5">{fieldErrors.amount || 'Ingresá un monto mayor a 0'}</p>
            )}

            {currency === 'USD' && (
              <div className="mt-3 space-y-3">
                {ratesLoading && (
                  <div className="flex gap-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="flex-1 py-2 px-1 rounded-xl border border-zinc-800 bg-zinc-900 space-y-1.5">
                        <div className="h-2.5 bg-zinc-800 rounded animate-pulse w-10 mx-auto" />
                        <div className="h-4 bg-zinc-800 rounded animate-pulse w-16 mx-auto" />
                      </div>
                    ))}
                  </div>
                )}
                {!ratesLoading && rates && (
                  <>
                    <div className="flex gap-2">
                      {RATE_LABELS.map(({ key, label }) =>
                        rates[key] ? (
                          <button
                            key={key}
                            onClick={() => handleSelectRate(key, rates[key])}
                            className={`flex-1 py-2 px-1 rounded-xl border text-center transition-all ${
                              selectedRateKey === key
                                ? 'border-lime-300 bg-lime-300/10'
                                : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                            }`}
                          >
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                              {label}
                            </div>
                            <div className="text-sm font-medium tabular-nums text-zinc-100 mt-0.5">
                              $ {rates[key].toLocaleString('es-AR')}
                            </div>
                          </button>
                        ) : null,
                      )}
                    </div>
                    {rates?.stale && (
                      <span className="text-amber-400/80 text-[10px]">⚠ Cotización podría no estar actualizada</span>
                    )}
                  </>
                )}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Tipo de cambio
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={exchangeRate}
                    onChange={e => {
                      setExchangeRate(e.target.value);
                      setSelectedRateKey(null);
                    }}
                    placeholder="ej. 1200"
                    className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-600 transition-colors"
                  />
                  {submitted && numRate <= 0 && (
                    <p className="text-xs text-red-400 mt-1.5">Ingresá el tipo de cambio</p>
                  )}
                  {numAmount > 0 && numRate > 1 && (
                    <div className="text-xs text-zinc-500 mt-1.5 tabular-nums">
                      ≈ {formatARS(numAmount * numRate)} ARS
                    </div>
                  )}
                </div>
              </div>
            )}
          </FormSection>

          <FormSection label="Descripción">
            <div className="flex gap-2">
              <input
                type="text"
                value={description}
                onChange={e => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) setFieldErrors(prev => { const { description: _, ...rest } = prev; return rest; });
                }}
                onBlur={() => {
                  if (!description.trim()) {
                    setFieldErrors(prev => ({ ...prev, description: 'Ingresá una descripción' }));
                  } else {
                    setFieldErrors(prev => { const { description: _, ...rest } = prev; return rest; });
                  }
                }}
                placeholder="ej. Supermercado"
                className={`flex-1 bg-zinc-900 border rounded-xl px-3 py-3 text-zinc-100 outline-none transition-colors ${fieldErrors.description ? 'border-red-500/60 focus:border-red-400' : 'border-zinc-800 focus:border-zinc-600'}`}
              />
              <button
                type="button"
                onClick={() => imageRef.current?.click()}
                disabled={ocrLoading}
                title="Escanear ticket con cámara"
                className="px-3 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 disabled:opacity-50 transition-all"
              >
                {ocrLoading ? <Loader2 size={18} className="animate-spin" /> : <ScanLine size={18} />}
              </button>
            </div>
            {(submitted && !description.trim() || fieldErrors.description) && (
              <p className="text-xs text-red-400 mt-1.5">{fieldErrors.description || 'Ingresá una descripción'}</p>
            )}
            {ocrError && <p className="text-xs text-red-400 mt-1.5">{ocrError}</p>}
            {ocrLoading && <p className="text-xs text-zinc-500 mt-1.5">Leyendo imagen…</p>}
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => handleOcrFile(e.target.files?.[0])}
            />
          </FormSection>

          <FormSection label="Categoría">
            <div className="flex flex-wrap gap-2">
              {(showAllCategories ? categories : categories.slice(0, 8)).map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCategoryId(c.id); setCatSuggestion(null); }}
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
            {categories.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllCategories(v => !v)}
                className="text-zinc-500 text-xs hover:text-zinc-400 transition-colors py-1"
              >
                {showAllCategories ? '▲ Ver menos' : `▼ Ver más (${categories.length - 8})`}
              </button>
            )}
            {catSuggesting && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                <Loader2 size={11} className="animate-spin" /> Sugiriendo categoría…
              </div>
            )}
            {catSuggestion && catSuggestion.id !== categoryId && (
              <button
                onClick={() => { setCategoryId(catSuggestion.id); setCatSuggestion(null); }}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-lime-300/10 border border-lime-300/30 text-lime-300 hover:bg-lime-300/20 transition-colors"
              >
                <Sparkles size={11} />
                Sugerida: {catSuggestion.emoji} {catSuggestion.name}
              </button>
            )}
            {submitted && !categoryId && (
              <p className="text-xs text-red-400 mt-1.5">Seleccioná una categoría</p>
            )}
          </FormSection>

          <FormSection label="Fecha">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-zinc-100 outline-none focus:border-zinc-600 transition-colors [color-scheme:dark]"
            />
          </FormSection>

          {cuotasEnabled && (
            <FormSection
              label="Cuotas"
              hint={totalCuotas === 1 ? '1 pago' : `${totalCuotas}x`}
            >
              <div className="flex gap-2 flex-wrap">
                {CUOTA_OPTIONS.map(n => (
                  <button
                    key={n}
                    onClick={() => setTotalCuotas(n)}
                    className={`min-w-[48px] h-11 px-3 rounded-xl text-sm font-medium transition-all ${
                      totalCuotas === n
                        ? (sharedFolderId ? 'bg-violet-400 text-zinc-950' : 'bg-lime-300 text-zinc-950')
                        : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {n === 1 ? '1' : `${n}x`}
                  </button>
                ))}
              </div>
            </FormSection>
          )}

          {isCard && totalCuotas > 1 && (
            <FormSection label="Interés">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasInterest}
                    onChange={e => setHasInterest(e.target.checked)}
                    className="w-4 h-4 accent-lime-300"
                  />
                  <span className="text-sm text-zinc-200">¿Lleva interés?</span>
                </label>
                {hasInterest && (
                  <div className="mt-3">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                      TNA (%)
                      <span title="Tasa Nominal Anual — la tasa de interés anual que cobra la tarjeta por cuotas" className="cursor-help text-zinc-600 hover:text-zinc-400">?</span>
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={tna}
                      onChange={e => setTna(e.target.value)}
                      placeholder="ej. 80"
                      className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-600 transition-colors"
                    />
                    {numTna > 0 && totalARS > 0 && (
                      <div className="text-xs text-zinc-500 mt-2 space-y-1 tabular-nums">
                        <div className="flex justify-between">
                          <span>Cuota:</span>
                          <span className="text-zinc-300">{formatARS(cuotaAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total con interés:</span>
                          <span className="text-zinc-300">{formatARS(totalWithInterest)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Interés total:</span>
                          <span className="text-amber-400">+{formatARS(totalInterest)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </FormSection>
          )}

          {sharedFolderId && (
            <FormSection label="¿Quién pagó?">
              <div className="flex gap-2">
                <button
                  onClick={() => setPaidByMe(true)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                    paidByMe
                      ? 'border-violet-400 bg-violet-400/10 text-violet-200'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Yo
                </button>
                <button
                  onClick={() => setPaidByMe(false)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                    !paidByMe
                      ? 'border-violet-400 bg-violet-400/10 text-violet-200'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Mi pareja
                </button>
              </div>
            </FormSection>
          )}

          {cuotasEnabled && totalCuotas > 1 && totalARS > 0 && !hasInterest && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>{totalCuotas} cuotas de</span>
                <span className="text-zinc-100 font-medium tabular-nums">
                  {formatARS(cuotaAmount)}
                </span>
              </div>
            </div>
          )}

          <FormSection label="Comprobante (opcional)">
            {receiptPreview ? (
              <div className="relative w-20 h-20">
                <img src={receiptPreview} alt="comprobante" className="w-20 h-20 object-cover rounded-xl" />
                <button
                  onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-100"
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => receiptRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-all"
              >
                <Camera size={16} />
                Adjuntar foto
              </button>
            )}
            <input
              ref={receiptRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => handleReceiptFile(e.target.files?.[0])}
            />
          </FormSection>

          <button
            onClick={handleSubmit}
            disabled={!valid || ocrLoading}
            className={`w-full font-medium py-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all ${
              sharedFolderId
                ? 'bg-violet-400 text-zinc-950 enabled:hover:bg-violet-300 enabled:active:scale-[0.98]'
                : 'bg-lime-300 text-zinc-950 enabled:hover:bg-lime-200 enabled:active:scale-[0.98]'
            }`}
          >
            {existing ? 'Guardar cambios' : sharedFolderId ? 'Agregar gasto compartido' : isCard ? 'Agregar compra' : 'Agregar gasto'}
          </button>
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}

export default AddExpenseModal;
