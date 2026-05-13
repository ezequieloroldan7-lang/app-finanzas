import { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, UserCircle2 } from 'lucide-react';
import { buildFinancialContext, sendChatMessage } from '../lib/ai';
import { fetchRates } from '../lib/cotizacion';

const WELCOME = '¡Hola! Soy tu asistente financiero. Analicé tus datos y estoy listo para ayudarte con consejos sobre tus gastos, inversiones y hábitos. ¿En qué puedo ayudarte? 💰';

const SUGGESTIONS = [
  '¿En qué categoría gasto más?',
  '¿Cómo puedo ahorrar más este mes?',
  'Dame tips para reducir mis gastos fijos',
  '¿Mis gastos recurrentes son razonables?',
];

function ChatIA({ expenses, cards, categories, recurring, budget, savingsGoal, onOpenProfile }) {
  const [rates, setRates] = useState(null);
  const [messages, setMessages] = useState([{ role: 'assistant', text: WELCOME }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    fetchRates().then(setRates).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  const send = async (text) => {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    setInput('');
    setLastError('');

    const currentMessages = [...messages];
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const context = buildFinancialContext({ expenses, cards, categories, recurring, budget, rates, savingsGoal });
      const history = currentMessages
        .slice(1)
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.text }],
        }));

      const reply = await sendChatMessage(null, userMsg, history, context);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      const msg = err?.message || String(err);
      setLastError(msg);
      const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('rate_limit');
      let errorText;
      if (isQuota) {
        errorText = '⚠️ Límite de requests alcanzado. Esperá un momento e intentá de nuevo.';
      } else {
        errorText = '❌ No pude conectarme con el asistente. Revisá tu conexión o intentá de nuevo.';
      }
      setMessages(prev => [...prev, { role: 'assistant', text: errorText }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-zinc-950" style={{ height: 'calc(100dvh - 52px)' }}>
      <header className="shrink-0 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-900 px-5 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-medium">VUE Finanzas</div>
            <h1 className="text-2xl text-zinc-50 font-serif-display mt-0.5">Asistente IA</h1>
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

      {lastError && (
        <div className="shrink-0 mx-4 mt-3 px-4 py-2.5 rounded-2xl bg-red-950/40 border border-red-900/40 text-xs text-red-400" role="alert">
          {lastError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-lime-300/10 border border-lime-300/25 flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
                <Bot size={13} className="text-lime-300" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-zinc-800 text-zinc-100 rounded-br-sm'
                  : 'bg-zinc-900 text-zinc-200 rounded-bl-sm'
              }`}
            >
              {msg.text}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
                <User size={13} className="text-zinc-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 justify-start" aria-label="El asistente está escribiendo">
            <div className="w-7 h-7 rounded-full bg-lime-300/10 border border-lime-300/25 flex items-center justify-center shrink-0" aria-hidden="true">
              <Bot size={13} className="text-lime-300" />
            </div>
            <div className="bg-zinc-900 rounded-2xl rounded-bl-sm px-4 py-3.5">
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {messages.length === 1 && !loading && (
          <div className="pt-2">
            <p className="text-xs text-zinc-600 mb-2 px-1">Sugerencias rápidas</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 bg-zinc-950 border-t border-zinc-900 px-4 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Preguntá sobre tus finanzas…"
            rows={1}
            aria-label="Mensaje para el asistente"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-600 placeholder:text-zinc-700 transition-colors resize-none leading-relaxed"
            style={{ overflowY: 'auto' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            aria-label="Enviar mensaje"
            className="w-11 h-11 rounded-2xl bg-lime-300 text-zinc-950 flex items-center justify-center disabled:opacity-30 hover:bg-lime-200 transition-all shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatIA;
