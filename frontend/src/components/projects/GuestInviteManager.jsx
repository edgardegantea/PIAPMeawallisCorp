import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Link2, Plus, Trash2, Copy, X, Loader2, ExternalLink } from 'lucide-react';

export default function GuestInviteManager({ projectId, isManager }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm]       = useState({ label: 'Acceso de cliente', expires_at: '' });
  const [showForm, setShowForm] = useState(false);
  const [newInvite, setNewInvite] = useState(null);

  const load = () =>
    projectsAPI.getInvites(projectId)
      .then((r) => setInvites(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [projectId]);

  const create = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const r = await projectsAPI.createInvite(projectId, form);
      setNewInvite(r.data);
      toast.success('Enlace de acceso creado');
      setShowForm(false); load();
    } catch { toast.error('Error al crear enlace'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    await projectsAPI.deleteInvite(id);
    toast.success('Enlace eliminado'); load();
  };

  const copy = (url) => {
    navigator.clipboard.writeText(url).then(() => toast.success('URL copiada'));
  };

  const inputCls = 'w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 size={18} className="text-indigo-500" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">Acceso de invitado</h3>
        </div>
        {isManager && (
          <button onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={14} /> Crear enlace
          </button>
        )}
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-3 text-sm text-indigo-700 dark:text-indigo-300">
        Los enlaces de invitado permiten ver el proyecto en modo solo lectura sin necesidad de cuenta.
        Ideal para compartir avances con clientes.
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 border border-slate-200 dark:border-slate-600 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Etiqueta</label>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Expira (opcional)</label>
            <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={inputCls} />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-3 py-2 hover:text-slate-700 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
              {saving && <Loader2 size={12} className="animate-spin" />} Crear enlace
            </button>
          </div>
        </form>
      )}

      {newInvite && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">✓ Enlace creado</p>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-emerald-200 dark:border-emerald-700">
            <span className="text-xs font-mono text-slate-600 dark:text-slate-300 flex-1 truncate">{newInvite.url}</span>
            <button onClick={() => copy(newInvite.url)} className="text-indigo-600 hover:text-indigo-800 flex-shrink-0"><Copy size={13} /></button>
            <a href={newInvite.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 flex-shrink-0"><ExternalLink size={13} /></a>
          </div>
          <button onClick={() => setNewInvite(null)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"><X size={11} /> Cerrar</button>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-slate-400 text-sm">Cargando…</div> : invites.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Link2 size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin enlaces de acceso creados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invites.map((inv) => {
            const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
            return (
              <div key={inv.id} className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3 ${!inv.is_active || expired ? 'opacity-60' : ''}`}>
                <Link2 size={14} className="text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{inv.label || 'Enlace'}</p>
                  <p className="text-xs text-slate-400 font-mono truncate">{inv.url}</p>
                  {inv.expires_at && (
                    <p className={`text-[10px] mt-0.5 ${expired ? 'text-red-500' : 'text-slate-400'}`}>
                      {expired ? 'Expirado' : 'Expira'}: {new Date(inv.expires_at).toLocaleString('es')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => copy(inv.url)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"><Copy size={14} /></button>
                  <a href={inv.url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"><ExternalLink size={14} /></a>
                  {isManager && (
                    <button onClick={() => remove(inv.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
