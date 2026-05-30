import { useEffect, useRef, useState, useCallback } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { Send, Trash2, MessageSquare, RefreshCw } from 'lucide-react';

export default function ProjectChatView({ projectId }) {
  const { user }              = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [body, setBody]       = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef                = useRef(null);
  const pollRef               = useRef(null);
  const lastIdRef             = useRef(0);

  const load = useCallback((initial = false) => {
    const after = initial ? 0 : lastIdRef.current;
    projectsAPI.getChat(projectId, after || undefined)
      .then((r) => {
        const msgs = r.data ?? [];
        if (initial) {
          setMessages(msgs);
        } else if (msgs.length > 0) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            return [...prev, ...msgs.filter((m) => !ids.has(m.id))];
          });
        }
        if (msgs.length > 0) {
          lastIdRef.current = Math.max(...msgs.map((m) => m.id));
        }
      })
      .catch(() => {})
      .finally(() => { if (initial) setLoading(false); });
  }, [projectId]);

  useEffect(() => {
    load(true);
    pollRef.current = setInterval(() => load(false), 5000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await projectsAPI.sendChat(projectId, body.trim());
      setBody('');
      load(false);
    } catch { toast.error('Error al enviar mensaje'); }
    finally { setSending(false); }
  };

  const remove = async (id) => {
    await projectsAPI.deleteChat(id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const today = new Date().toDateString();

  return (
    <div className="flex flex-col h-[520px] bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <MessageSquare size={16} className="text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Chat del proyecto</h3>
        <button onClick={() => load(true)} className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-center text-sm text-slate-400">Cargando mensajes…</p>}
        {!loading && messages.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin mensajes aún. ¡Sé el primero!</p>
          </div>
        )}
        {messages.map((m, i) => {
          const isMe       = m.user_id === user?.id;
          const msgDate    = new Date(m.created_at).toDateString();
          const showDate   = i === 0 || new Date(messages[i-1].created_at).toDateString() !== msgDate;
          const timeLabel  = new Date(m.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
          return (
            <div key={m.id}>
              {showDate && (
                <div className="text-center my-2">
                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-0.5 rounded-full">
                    {msgDate === today ? 'Hoy' : new Date(m.created_at).toLocaleDateString('es', { day: 'numeric', month: 'long' })}
                  </span>
                </div>
              )}
              <div className={`flex gap-2 group ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${isMe ? 'bg-indigo-500' : 'bg-slate-400'}`}>
                  {(m.user_name || m.username || '?')[0].toUpperCase()}
                </div>
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && <span className="text-[10px] text-slate-400 mb-0.5 ml-1">{m.user_name || m.username}</span>}
                  <div className={`px-3 py-2 rounded-2xl text-sm break-words ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-sm'}`}>
                    {m.body}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 mx-1">{timeLabel}</span>
                </div>
                {isMe && (
                  <button onClick={() => remove(m.id)}
                    className="self-center opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex gap-2 p-3 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe un mensaje…"
          className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button type="submit" disabled={sending || !body.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
