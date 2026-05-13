import { useRef, useState } from 'react';
import { Upload, Trash2, Download, FileText, File, Loader2, Sparkles, Plus, UserCircle2 } from 'lucide-react';
import { MONTH_NAMES } from '../constants';
import { recognizeResumen, recognizeFactura } from '../lib/recognizeResumen';

const TYPE_LABELS = {
  resumen: { label: 'Resúmenes', emoji: '💳' },
  factura: { label: 'Facturas', emoji: '📄' },
};

function ArchivosView({ files, cards, onUpload, onDelete, onDownload, onOpenImport, onAddExpense, onOpenProfile }) {
  const [section, setSection] = useState('resumen');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [meta, setMeta] = useState({ name: '', month: '', cardId: '', amount: '', notes: '', date: '' });
  const [recognizing, setRecognizing] = useState(false);
  const [scanError, setScanError] = useState('');
  const fileRef = useRef(null);

  const filteredFiles = files.filter(f => f.type === section);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPendingFile(file);
    setScanError('');
    setUploadError('');
    const baseName = file.name.replace(/\.(pdf|jpe?g|png|webp)$/i, '');
    setMeta({ name: baseName, month: '', cardId: '', amount: '', notes: '', date: new Date().toISOString().slice(0, 10) });
    setShowMetaModal(true);

    // Auto-scan only PDFs (recognizers are PDF-text based).
    if (file.type !== 'application/pdf') return;

    setRecognizing(true);
    try {
      if (section === 'resumen') {
        const rec = await recognizeResumen(file);
        if (rec.error) { setScanError(rec.error); }
        else {
          const matchedCard = rec.cardName
            ? cards.find(c => c.name.toLowerCase().includes(rec.cardName.toLowerCase()))
            : null;
          setMeta(m => ({
            ...m,
            month: rec.month || m.month,
            amount: rec.amount || m.amount,
            cardId: matchedCard ? matchedCard.id : m.cardId,
          }));
        }
      } else {
        const rec = await recognizeFactura(file);
        if (rec.error) { setScanError(rec.error); }
        else {
          setMeta(m => ({
            ...m,
            name: rec.service || m.name,
            amount: rec.amount || m.amount,
            date: rec.date || m.date,
          }));
        }
      }
    } catch (err) {
      setScanError(err?.message || 'Error al escanear el PDF');
    } finally {
      setRecognizing(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError('');
    setShowMetaModal(false);
    try {
      await onUpload(pendingFile, section, {
        name: meta.name || pendingFile.name,
        month: meta.month || null,
        cardId: meta.cardId || null,
        amount: meta.amount ? parseFloat(meta.amount) : null,
        notes: section === 'factura' && meta.date ? `date:${meta.date}` : (meta.notes || null),
      });
    } catch (err) {
      setUploadError(err?.message || 'Error al subir el archivo');
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  };

  const handleAddExpense = (file) => {
    // Parse date stored in notes (format "date:YYYY-MM-DD")
    const storedDate = file.notes?.startsWith('date:') ? file.notes.slice(5) : null;
    onAddExpense({
      description: file.name,
      amount: file.amount || 0,
      date: storedDate || new Date().toISOString().slice(0, 10),
    });
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const parseMonth = (m) => {
    if (!m) return '';
    const [y, mo] = m.split('-');
    return `${MONTH_NAMES[parseInt(mo, 10) - 1]} ${y}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-28">
      <header className="sticky top-0 z-20 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-900 px-5 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-medium">VUE Finanzas</div>
            <h1 className="text-2xl text-zinc-50 font-serif-display italic mt-0.5">Archivos</h1>
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

      <main className="px-5 pt-5 space-y-4">
        {/* Section selector */}
        <div className="flex gap-2">
          {Object.entries(TYPE_LABELS).map(([key, { label, emoji }]) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                section === key
                  ? 'bg-lime-300 text-zinc-950'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <span>{emoji}</span>
              {label}
            </button>
          ))}
        </div>

        {uploadError && (
          <div className="bg-red-950/40 border border-red-800/50 rounded-2xl px-4 py-3 text-sm text-red-300">
            {uploadError}
          </div>
        )}

        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full py-4 rounded-2xl border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          {uploading ? (
            <><Loader2 size={16} className="animate-spin" /> Subiendo…</>
          ) : (
            <><Upload size={16} /> Subir archivo (PDF o imagen)</>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {filteredFiles.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">{TYPE_LABELS[section].emoji}</div>
            <p className="text-zinc-500 mb-1">No hay {TYPE_LABELS[section].label.toLowerCase()} guardadas</p>
            <p className="text-xs text-zinc-600">
              {section === 'resumen'
                ? 'Subí los PDFs de tus resúmenes de tarjeta'
                : 'Subí facturas de servicios como gas, luz, internet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFiles.map(file => {
              const card = cards.find(c => c.id === file.cardId);
              const storedDate = file.notes?.startsWith('date:') ? file.notes.slice(5) : null;
              const displayNotes = file.notes?.startsWith('date:') ? null : file.notes;
              return (
                <div key={file.id} className="bg-zinc-900 rounded-2xl px-4 py-3.5 flex items-start gap-3">
                  <div className="mt-0.5 text-zinc-500 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-100 truncate font-medium">{file.name}</div>
                    <div className="text-xs text-zinc-600 mt-0.5 flex flex-wrap gap-x-2">
                      {file.month && <span>{parseMonth(file.month)}</span>}
                      {storedDate && <span>{formatDate(storedDate)}</span>}
                      {card && (
                        <span className="flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: card.color }} />
                          {card.name}
                        </span>
                      )}
                      {file.amount && <span>${file.amount.toLocaleString('es-AR')}</span>}
                      {displayNotes && <span className="text-zinc-700">{displayNotes}</span>}
                    </div>
                    <div className="text-[10px] text-zinc-700 mt-0.5">{formatDate(file.uploadedAt)}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {section === 'resumen' && (
                      <button
                        onClick={() => onOpenImport(file)}
                        className="p-1.5 rounded-full text-zinc-600 hover:text-lime-400 hover:bg-zinc-800 transition-colors"
                        title="Importar gastos"
                      >
                        <File size={14} />
                      </button>
                    )}
                    {section === 'factura' && onAddExpense && (
                      <button
                        onClick={() => handleAddExpense(file)}
                        className="p-1.5 rounded-full text-zinc-600 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                        title="Agregar como gasto"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => onDownload(file)}
                      className="p-1.5 rounded-full text-zinc-600 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(file.id)}
                      className="p-1.5 rounded-full text-zinc-700 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Meta modal */}
      {showMetaModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-900 rounded-t-3xl px-5 pt-5 pb-10 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-zinc-100">Información del archivo</h2>
              {recognizing && (
                <div className="flex items-center gap-1.5 text-xs text-lime-400 animate-pulse">
                  <Sparkles size={13} />
                  Reconociendo…
                </div>
              )}
            </div>

            {scanError && (
              <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl px-3 py-2 text-xs text-amber-300">
                ⚠️ {scanError} — completá los campos manualmente.
              </div>
            )}

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">
                {section === 'factura' ? 'Servicio' : 'Nombre'}
              </label>
              <input
                type="text"
                value={meta.name}
                onChange={e => setMeta(m => ({ ...m, name: e.target.value }))}
                className="w-full bg-zinc-800 text-zinc-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-lime-300/40"
              />
            </div>

            {section === 'resumen' && (
              <>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Mes</label>
                  <input
                    type="month"
                    value={meta.month}
                    onChange={e => setMeta(m => ({ ...m, month: e.target.value }))}
                    className="w-full bg-zinc-800 text-zinc-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-lime-300/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Tarjeta</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setMeta(m => ({ ...m, cardId: '' }))}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${!meta.cardId ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}
                    >
                      Sin tarjeta
                    </button>
                    {cards.map(card => (
                      <button
                        key={card.id}
                        onClick={() => setMeta(m => ({ ...m, cardId: card.id }))}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${meta.cardId === card.id ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}
                      >
                        {card.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {section === 'factura' && (
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Fecha de vencimiento</label>
                <input
                  type="date"
                  value={meta.date}
                  onChange={e => setMeta(m => ({ ...m, date: e.target.value }))}
                  className="w-full bg-zinc-800 text-zinc-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-lime-300/40"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Monto total</label>
              <input
                type="number"
                inputMode="decimal"
                value={meta.amount}
                onChange={e => setMeta(m => ({ ...m, amount: e.target.value }))}
                placeholder="0"
                className="w-full bg-zinc-800 text-zinc-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-lime-300/40"
              />
            </div>

            {section === 'resumen' && (
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Notas (opcional)</label>
                <input
                  type="text"
                  value={meta.notes}
                  onChange={e => setMeta(m => ({ ...m, notes: e.target.value }))}
                  placeholder="Ej: Servicio de gas - Julio"
                  className="w-full bg-zinc-800 text-zinc-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-lime-300/40"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowMetaModal(false); setPendingFile(null); setScanError(''); }}
                className="flex-1 py-3 rounded-2xl bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={recognizing}
                className="flex-1 py-3 rounded-2xl bg-lime-300 text-zinc-950 font-medium text-sm hover:bg-lime-200 transition-colors disabled:opacity-50"
              >
                {recognizing ? 'Escaneando…' : 'Subir archivo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArchivosView;
