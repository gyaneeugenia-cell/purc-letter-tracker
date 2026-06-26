import { useEffect, useRef, useState } from 'react';
import { Bot, Send, X, Sparkles } from 'lucide-react';
import { http } from '../../api/http.js';

const SUGGESTIONS = [
  'How many letters have we received vs dispatched?',
  'List all urgent letters with their institutions.',
  'Which directorate handles the most letters?',
  'How do I register a received letter?'
];

const WELCOME = {
  role: 'assistant',
  content:
    "Hello! I'm the PURC Tracker assistant. Ask me anything about how the program works, or ask me to analyse your letter records — for example counts, breakdowns by institution or directorate, urgent letters, and trends."
};

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  async function send(text) {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setError('');
    setInput('');
    const next = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setLoading(true);
    try {
      // Send recent turns for context (skip the static welcome message).
      const history = next.filter((m) => m !== WELCOME).slice(-10);
      const { data } = await http.post('/assistant/ask', { question, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI assistant"
        className="fixed bottom-5 right-5 z-[120] flex h-14 w-14 items-center justify-center rounded-full bg-purcBlue text-white shadow-lg shadow-blue-900/30 transition hover:scale-105 hover:bg-blue-700"
      >
        {open ? <X size={22} /> : <Bot size={24} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-[120] flex h-[560px] max-h-[80vh] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-purcBlue px-4 py-3 text-white dark:border-white/10">
            <Sparkles size={18} />
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">PURC Assistant</p>
              <p className="text-[11px] leading-tight text-blue-100">Ask questions or analyse your records</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-purcBlue text-white'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  Thinking…
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-200">
                {error}
              </div>
            )}

            {/* Suggestions only on a fresh conversation */}
            {messages.length === 1 && !loading && (
              <div className="space-y-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:border-purcBlue hover:text-purcBlue dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-end gap-2 border-t border-slate-100 p-3 dark:border-white/10"
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask a question…"
              className="max-h-28 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-purcBlue dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purcBlue text-white transition hover:bg-blue-700 disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
