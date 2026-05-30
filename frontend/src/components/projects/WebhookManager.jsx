import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Webhook, Plus, Trash2, Play, Check, X, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

const EVENTS = [
  'task.created','task.status_changed','task.updated',
  'project.updated','sprint.started','sprint.completed',
  'risk.created','milestone.completed',
];

const EMPTY = { name: 'Mi Webhook', url: '', secret: '', events: ['task.status_changed'], is_active: true };

export default function WebhookManager({ projectId, isManager }) {
  const [webhooks, setWebhooks] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ ...EMPTY });
  const [saving,   setSaving]   = useState(false);
  const [testing,  setTesting]  = useState(null);

  const load = () =>
    projectsAPI.getWebhooks(projectId)
      .then((r) => setWebhooks(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [projectId]);

  const create = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await projectsAPI.createWebhook(projectId, form);
      toast.success('Webhook creado');
      setShowForm(false); setForm({ ...EMPTY }); load();
    } catch { toast.error('Error al crear webhook'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    await projectsAPI.deleteWebhook(id);
    toast.success('Webhook eliminado'); load();
  };

  const toggle = async (wh) => {
    await projectsAPI.updateWebhook(wh.id, { is_active: wh.is_active ? 0 : 1 });
    load();
  };

  const test = async (id) => {
    setTesting(id);
    try {
      const r = await projectsAPI.testWebhook(id);
      if (r.data.ok) toast.success(`Test exitoso — HTTP ${r.data.status}`);
      else toast.error(`Test fallido — HTTP ${r.data.status}`);
    } catch { toast.error('Error al probar webhook'); }
    finally { setTesting(null); }
  };

  const toggleEvent = (ev) => {
    setForm((f) => ({
      ...f, events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  };

  const inputCls = 'w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook size={18} className="text-indigo-500" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">Webhooks <span className="text-slate-400 font-normal">({webhooks.length})</span></h3>
        </div>
        {isManager && (
          <button onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={14} /> Nuevo webhook
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={create} className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 border border-slate-200 dark:border-slate-600 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nombre</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Secret (opcional)</label>
              <input value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} placeholder="HMAC-SHA256" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">URL * (POST)</label>
            <input required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://hooks.slack.com/…" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Eventos a escuchar</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {EVENTS.map((ev) => (
                <button key={ev} type="button" onClick={() => toggleEvent(ev)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${form.events.includes(ev) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-indigo-400'}`}>
                  {ev}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-3 py-2 hover:text-slate-700 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
              {saving && <Loader2 size={12} className="animate-spin" />} Crear
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-400">Cargando…</div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Webhook size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin webhooks configurados.</p>
          <p className="text-xs mt-1">Conecta con Slack, Zapier u otras herramientas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => {
            const events = typeof wh.events === 'string' ? JSON.parse(wh.events || '[]') : (wh.events ?? []);
            return (
              <div key={wh.id} className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border transition-colors ${wh.is_active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-700/50 opacity-60'}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{wh.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${wh.is_active ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                          {wh.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        {wh.last_response && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${wh.last_response >= 200 && wh.last_response < 300 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            HTTP {wh.last_response}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono truncate">{wh.url}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {events.map((ev) => (
                          <span key={ev} className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">{ev}</span>
                        ))}
                      </div>
                    </div>
                    {isManager && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => test(wh.id)} disabled={testing === wh.id}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-lg transition-colors">
                          {testing === wh.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />} Test
                        </button>
                        <button onClick={() => toggle(wh)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                          {wh.is_active ? <ToggleRight size={20} className="text-indigo-500" /> : <ToggleLeft size={20} />}
                        </button>
                        <button onClick={() => remove(wh.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
