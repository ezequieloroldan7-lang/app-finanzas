import { useRef, useState } from 'react';
import { X, FileText, CheckSquare, Square, AlertCircle, Upload, Loader2 } from 'lucide-react';
import { parseResumen } from '../lib/parseResumen';
import { formatARS, formatUSD } from '../lib/formatters';

function ImportarResumenModal({ cards, categories, onImport, onClose }) {
  const [text, setText] = useState('');
  const [detected, setDetected] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [cardId, setCardId] = useState(cards[0]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  // Per-row category overrides. Falls back to global categoryId when not set.
  const [rowCategories, setRowCategories] = useState({});
  const [openCatRow, setOpenCatRow] = useState(null);
  const [step, setStep] = useState('paste'); // 'paste' | 'review'
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const fileInputRef = useRef(null);

  function resetReview(rows) {
    setDetected(rows);
    setSelected(new Set(rows.map(r => r.id)));
    setRowCategories({});
    setOpenCatRow(null);
    setStep('review');
  }

  const handleDetect = () => {
    resetReview(parseResumen(text));
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPdfError('');
    setPdfLoading(true);
    try {
      const { extractTextFromPdf } = await import('../lib/parsePdf');
      const extracted = await extractTextFromPdf(file);
      setText(extracted);
      resetReview(parseResumen(extracted));
    } catch (err) {
      setPdfError(err?.message || 'Error al procesar el PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const toggleAll = () => {
    if (selected.size === detected.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(detected.map(r => r.id)));
    }
  };

  const toggleRow = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleImport = () => {
    const toImport = detected
      .filter(r => selected.has(r.id))
      .map(r => ({ ...r, cardId, categoryId: rowCategories[r.id] ?? categoryId }));
    onImport(toImport);
    onClose();
  };

  // Resolve effective category for a row
  const getRowCat = (rowId) =>
    categories.find(c => c.id === (rowCategories[rowId] ?? categoryId));

  const card = cards.find(c => c.id === cardId);

  return (
    <div className="fixed inset-0 z-50 fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="importar-modal-title"
        className="absolute bottom-0 left-0 right-0 bg-zinc-950 rounded-t-3xl border-t border-zinc-800 max-h-[92vh] overflow-y-auto slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-900 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-sky-400" />
            <h3 id="importar-modal-title" className="text-zinc-100 text-lg font-medium">
              {step === 'paste' ? 'Importar resumen' : 'Revisá los gastos detectados'}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 -mr-2 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-zinc-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {step === 'paste' && (
            <>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
                <p className="text-xs text-zinc-400 mb-1">
                  Subí el PDF de tu resumen o pegá el texto.
                </p>
                <p className="text-[10px] text-zinc-600">
                  Funciona con la mayoría de los bancos argentinos (Visa, Mastercard, Naranja X, BBVA, Santander, Galicia…)
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handlePdfUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={pdfLoading}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-200 font-medium py-3.5 rounded-2xl hover:border-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pdfLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Procesando PDF...
                  </>
                ) : (
                  <>
                    <Upload size={16} className="text-sky-400" />
                    Subir resumen PDF
                  </>
                )}
              </button>

              {pdfError && (
                <div className="flex gap-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-900/40 rounded-xl px-3 py-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{pdfError}</span>
                </div>
              )}

              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                <div className="flex-1 h-px bg-zinc-900" />
                <span>o pegá el texto</span>
                <div className="flex-1 h-px bg-zinc-900" />
              </div>

              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={`Ejemplo:\n12/03/25  SUPERMERCADO COTO     45.000,00\n15/03/25  NETFLIX                8.900,00\n20/03/25  FARMACITY             12.500,00`}
                rows={10}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-zinc-200 text-sm font-mono outline-none focus:border-zinc-600 transition-colors resize-none placeholder:text-zinc-700"
              />

              <button
                onClick={handleDetect}
                disabled={text.trim().length < 10}
                className="w-full bg-sky-500 text-white font-medium py-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-sky-400 enabled:active:scale-[0.98] transition-all"
              >
                Detectar gastos
              </button>
            </>
          )}

          {step === 'review' && detected !== null && (
            <>
              {detected.length === 0 ? (
                <div className="bg-zinc-900 border border-amber-900/40 rounded-2xl p-5 flex gap-3">
                  <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-zinc-200 text-sm font-medium">No se detectaron gastos</p>
                    <p className="text-zinc-500 text-xs mt-1">
                      El formato del texto no coincide con los patrones reconocidos. Intentá copiar directamente desde el PDF o la web del banco.
                    </p>
                    <button
                      onClick={() => setStep('paste')}
                      className="mt-3 text-xs text-sky-400 hover:text-sky-300 font-medium"
                    >
                      ← Volver a pegar texto
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tarjeta y categoría por defecto */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5">
                        Tarjeta
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {cards.map(c => (
                          <button
                            key={c.id}
                            onClick={() => setCardId(c.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                              cardId === c.id
                                ? 'border-lime-300 bg-lime-300/10 text-lime-100'
                                : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: c.color }}
                            />
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5">
                        Categoría por defecto
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {categories.slice(0, 6).map(c => (
                          <button
                            key={c.id}
                            onClick={() => setCategoryId(c.id)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs border transition-all ${
                              categoryId === c.id
                                ? 'border-zinc-100 bg-zinc-100 text-zinc-950'
                                : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            {c.emoji} {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Select all */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={toggleAll}
                      className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      {selected.size === detected.length ? (
                        <CheckSquare size={14} className="text-lime-300" />
                      ) : (
                        <Square size={14} />
                      )}
                      {selected.size === detected.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                    </button>
                    <span className="text-xs text-zinc-500">
                      {selected.size} de {detected.length} seleccionados
                    </span>
                  </div>

                  {/* Row list */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
                    {detected.map(r => {
                      const on = selected.has(r.id);
                      const rowCat = getRowCat(r.id);
                      const isCatOpen = openCatRow === r.id;
                      const hasOverride = !!rowCategories[r.id];
                      return (
                        <div key={r.id} className={on ? '' : 'opacity-50'}>
                          {/* Main row */}
                          <div className="px-4 py-3 flex items-center gap-3">
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleRow(r.id)}
                              className="shrink-0"
                            >
                              {on
                                ? <CheckSquare size={16} className="text-lime-300" />
                                : <Square size={16} className="text-zinc-600" />
                              }
                            </button>

                            {/* Description + meta — also toggles selection */}
                            <button
                              onClick={() => toggleRow(r.id)}
                              className="flex-1 text-left min-w-0"
                            >
                              <div className={`text-sm font-medium truncate ${on ? 'text-zinc-100' : 'text-zinc-500'}`}>
                                {r.description}
                              </div>
                              <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                                <span>{r.date}</span>
                                {r.totalCuotas > 1 && (
                                  <span className="text-zinc-600">{r.totalCuotas} cuotas</span>
                                )}
                              </div>
                            </button>

                            {/* Category chip — opens per-row picker */}
                            <button
                              onClick={() => setOpenCatRow(isCatOpen ? null : r.id)}
                              className={`shrink-0 text-base leading-none px-1.5 py-1 rounded-lg border transition-colors ${
                                isCatOpen
                                  ? 'border-zinc-500 bg-zinc-800'
                                  : hasOverride
                                  ? 'border-sky-700/50 bg-sky-900/20'
                                  : 'border-zinc-800 hover:border-zinc-700'
                              }`}
                              title={rowCat?.name || 'Categoría'}
                            >
                              {rowCat?.emoji || '📦'}
                            </button>

                            {/* Amount */}
                            <div className={`text-sm font-medium tabular-nums shrink-0 ${on ? 'text-zinc-200' : 'text-zinc-600'}`}>
                              {r.currency === 'USD' ? formatUSD(r.amount) : formatARS(r.amount)}
                            </div>
                          </div>

                          {/* Inline category picker */}
                          {isCatOpen && (
                            <div className="px-4 pb-3 pt-1 flex flex-wrap gap-1.5 bg-zinc-800/40 border-t border-zinc-800">
                              {categories.map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    setRowCategories(prev => ({ ...prev, [r.id]: c.id }));
                                    setOpenCatRow(null);
                                  }}
                                  className={`px-2.5 py-1 rounded-xl text-xs border transition-all ${
                                    rowCat?.id === c.id
                                      ? 'border-zinc-100 bg-zinc-100 text-zinc-950'
                                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                                  }`}
                                >
                                  {c.emoji} {c.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Preview */}
                  {selected.size > 0 && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-zinc-400">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: card?.color || '#52525b' }}
                      />
                      <span>{card?.name}</span>
                      <span className="text-zinc-700">·</span>
                      <span>{selected.size} gasto{selected.size !== 1 ? 's' : ''}</span>
                      {Object.keys(rowCategories).filter(id => selected.has(id)).length > 0 && (
                        <span className="text-zinc-600">· categorías personalizadas</span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleImport}
                    disabled={selected.size === 0}
                    className="w-full bg-lime-300 text-zinc-950 font-medium py-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-lime-200 enabled:active:scale-[0.98] transition-all"
                  >
                    Importar {selected.size > 0 ? `${selected.size} gasto${selected.size !== 1 ? 's' : ''}` : ''}
                  </button>

                  <button
                    onClick={() => setStep('paste')}
                    className="w-full text-zinc-500 text-sm hover:text-zinc-300 py-2 transition-colors"
                  >
                    ← Volver a editar el texto
                  </button>
                </>
              )}
            </>
          )}

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

export default ImportarResumenModal;
