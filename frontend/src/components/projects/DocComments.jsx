import { useEffect, useRef, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { MessageSquare, Trash2, Send, ChevronDown, ChevronUp } from 'lucide-react';

export default function DocComments({ docId }) {
  const { user }              = useAuthStore();
  const [comments, setComments] = useState([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [body, setBody]       = useState('');
  const [sending, setSending] = useState(false);
  const endRef                = useRef(null);

  const load = () => {
    setLoading(true);
    projectsAPI.getTechDocComments(docId)
      .then((r) => setComments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load();
  }, [open, docId]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments, open]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await projectsAPI.createTechDocComment(docId, body.trim());
      setBody('');
      load();
    } catch { toast.error('Error al enviar comentario'); }
    finally { setSending(false); }
  };

  const remove = async (id) => {
    try {
      await projectsAPI.deleteTechDocComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch { toast.error('Error al eliminar'); }
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors">
        <MessageSquare size={12} />
        Comentarios {comments.length > 0 && !open ? `(${comments.length})` : ''}
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {open && (
        <div className="mt-2 space-y-3">
          {loading && <p className="text-xs text-slate-400 pl-1">Cargando…</p>}

          {!loading && comments.length === 0 && (
            <p className="text-xs text-slate-400 italic pl-1">Sin comentarios aún. Sé el primero.</p>
          )}

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2 group">
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5">
                  {(c.user_name || c.username || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {c.user_name || c.username}
                    </span>
                    <span className="text-[10px] text-slate-400">{c.created_at?.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{c.body}</p>
                </div>
                {user?.id === c.user_id && (
                  <button onClick={() => remove(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all flex-shrink-0 mt-1">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe un comentario…"
              className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button type="submit" disabled={sending || !body.trim()}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg transition-colors">
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
