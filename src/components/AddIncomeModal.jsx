import { useState } from 'react';
import { X } from 'lucide-react';
import { formatARS } from '../lib/formatters';
import FormSection from './FormSection';

function AddIncomeModal({ existing, incomeCategories, onSave, onClose }) {
  const [amount, setAmount] = useState(existing?.amount?.toString() || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [date, setDate] = useState(existing?.date || new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId || incomeCategories[0]?.id || '',
  );
  const [currency, setCurrency] = useState(existing?.currency || 'ARS');
  const [exchangeRate, setExchangeRate] = useState(existing?.exchangeRate?.toString() || '');

  const numAmount = parseFloat(amount) || 0;
  const numRate = parseFloat(exchangeRate) || 1;
  const totalARS = currency === 'USD' ? numAmount * numRate : numAmount;

  const valid =
    numAmount > 0 &&
    description.trim() &&
    categoryId &&
    (currency !== 'USD' || numRate > 0);

  const handleSubmit = () => {
    if (!valid) return;
    onSave({
      ...(existing || {}),
      amount: numAmount,
      description: description.trim(),
      date,
      categoryId,
      currency,
      exchangeRate: currency === 'USD' ? numRate : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="income-modal-title"
        className="w-full max-w-lg bg-zinc-900 rounded-t-3xl px-5 pt-5 pb-10 space-y-5 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 id="income-modal-title" className="text-lg font-medium text-zinc-100">
            {existing ? 'Editar ingreso' : 'Nuevo ingreso'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Moneda */}
        <FormSection label="Moneda">
          <div className="flex gap-2">
            {['ARS', 'USD'].map(c => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  currency === c
                    ? 'bg-lime-300 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </FormSection>

        {/* Monto */}
        <FormSection label="Monto">
          <input
            id="income-amount"
            type="number"
            inputMode="decimal"
            placeholder="0"
            min="0"
            aria-label="Monto"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-zinc-800 text-zinc-100 rounded-xl px-4 py-3 text-right text-xl tabular-nums outline-none focus:ring-2 focus:ring-lime-300/40"
          />
          {currency === 'USD' && numAmount > 0 && numRate > 0 && (
            <div className="text-right text-xs text-zinc-500 mt-1">
              ≈ {formatARS(totalARS)} ARS
            </div>
          )}
        </FormSection>

        {/* Tipo de cambio si USD */}
        {currency === 'USD' && (
          <FormSection label="Tipo de cambio (ARS por USD)">
            <input
              id="income-exchange-rate"
              type="number"
              inputMode="decimal"
              placeholder="0"
              min="0"
              aria-label="Tipo de cambio (ARS por USD)"
              value={exchangeRate}
              onChange={e => setExchangeRate(e.target.value)}
              className="w-full bg-zinc-800 text-zinc-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-lime-300/40"
            />
          </FormSection>
        )}

        {/* Descripción */}
        <FormSection label="Descripción">
          <input
            id="income-description"
            type="text"
            placeholder="Ej: Sueldo mayo"
            aria-label="Descripción"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-zinc-800 text-zinc-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-lime-300/40"
          />
        </FormSection>

        {/* Fecha */}
        <FormSection label="Fecha">
          <input
            id="income-date"
            type="date"
            aria-label="Fecha"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-zinc-800 text-zinc-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-lime-300/40 [color-scheme:dark]"
          />
        </FormSection>

        {/* Categoría */}
        <FormSection label="Categoría">
          <div className="grid grid-cols-3 gap-2">
            {incomeCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs transition-colors ${
                  categoryId === cat.id
                    ? 'bg-lime-300/10 border border-lime-300/40 text-lime-300'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </FormSection>

        <button
          onClick={handleSubmit}
          disabled={!valid}
          className="w-full py-4 rounded-2xl bg-lime-300 text-zinc-950 font-medium text-sm transition-all disabled:opacity-40 hover:bg-lime-200 active:scale-[0.98]"
        >
          {existing ? 'Guardar cambios' : 'Agregar ingreso'}
        </button>
      </div>
    </div>
  );
}

export default AddIncomeModal;
