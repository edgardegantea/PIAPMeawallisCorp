import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Target, Plus, Pencil, Trash2, ChevronDown, ChevronUp, X, Check, Loader2 } from 'lucide-react';

const STATUS_CONFIG = {
  ON_TRACK:  { label: 'En curso',      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  AT_RISK:   { label: 'En riesgo',     color: 'bg-amber-100  text-amber-700   dark:bg-amber-900/30  dark:text-amber-400',  dot: 'bg-amber-400'   },
  OFF_TRACK: { label: 'Fuera de plan', color: 'bg-red-100    text-red-700     dark:bg-red-900/30    dark:text-red-400',    dot: 'bg-red-500'     },
  COMPLETED: { label: 'Completado',    color: 'bg-slate-100  text-slate-600   dark:bg-slate-700     dark:text-slate-400',  dot: 'bg-slate-400'   },
};

function KRRow({ kr, isManager, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(kr.current_value);
  const pct = kr.target_value > 0 ? Math.min(100, Math.round((kr.current_value / kr.target_value) * 100)) : 0;

  const save = async () => {
    await onUpdate(kr.id, { current_value: parseFloat(val) });
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-50 dark:border-slate-700/30 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{kr.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-indigo-500' : 'bg-amber-400'}`}
              style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 whitespace-nowrap">{pct}%</span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {editing ? (
          <>
            <input type="number" value={val} onChange={(e) => setVal(e.target.value)}
              className="w-16 text-xs border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none" />
            <span className="text-xs text-slate-400">/ {kr.target_value} {kr.unit}</span>
            <button onClick={save} className="text-emerald-600 hover:text-emerald-800"><Check size={13} /></button>
            <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600"><X size={13} /></button>
          </>
        ) : (
          <>
            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {kr.current_value} / {kr.target_value} {kr.unit}
            </span>
            {isManager && (
              <>
                <button onClick={() => setEditing(true)} className="p-0.5 text-slate-300 hover:text-indigo-600"><Pencil size={11} /></button>
                <button onClick={() => onDelete(kr.id)} className="p-0.5 text-slate-300 hover:text-red-500"><Trash2 size={11} /></button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OKRCard({ obj, isManager, onDelete, onUpdateKR, onDeleteKR }) {
  const [expanded, setExpanded] = useState(true);
  const [addingKR, setAddingKR] = useState(false);
  const [krForm, setKRForm]     = useState({ title: '', target_value: 100, unit: '%' });
  const cfg = STATUS_CONFIG[obj.status] ?? STATUS_CONFIG.ON_TRACK;

  const addKR = async () => {
    if (!krForm.title.trim()) return;
    await projectsAPI.createKR(obj.id, krForm);
    setAddingKR(false); setKRForm({ title: '', target_value: 100, unit: '%' });
    toast.success('Key Result añadido');
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
              {obj.period && <span className="text-[10px] text-slate-400">{obj.period}</span>}
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{obj.title}</h3>
            {obj.description && <p className="text-xs text-slate-400 mt-0.5">{obj.description}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{obj.progress_pct}%</p>
              <p className="text-[10px] text-slate-400">progreso</p>
            </div>
            {isManager && (
              <button onClick={() => onDelete(obj.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
            )}
            <button onClick={() => setExpanded((v) => !v)} className="p-1 text-slate-400">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 border-t border-slate-100 dark:border-slate-700 pt-3">
            {obj.key_results?.map((kr) => (
              <KRRow key={kr.id} kr={kr} isManager={isManager}
                onUpdate={(id, d) => onUpdateKR(id, d).then(() => toast.success('Actualizado'))}
                onDelete={(id) => onDeleteKR(id)} />
            ))}
            {obj.key_results?.length === 0 && (
              <p className="text-xs text-slate-400 italic">Sin key results. Agrega uno.</p>
            )}
            {isManager && (
              addingKR ? (
                <div className="flex gap-2 mt-2 flex-wrap">
                  <input value={krForm.title} onChange={(e) => setKRForm({ ...krForm, title: e.target.value })}
                    placeholder="Título del Key Result" autoFocus
                    className="flex-1 min-w-[160px] text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input type="number" value={krForm.target_value} onChange={(e) => setKRForm({ ...krForm, target_value: e.target.value })}
                    className="w-20 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none" placeholder="Meta" />
                  <input value={krForm.unit} onChange={(e) => setKRForm({ ...krForm, unit: e.target.value })}
                    className="w-16 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none" placeholder="%" />
                  <button onClick={addKR} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors">Añadir</button>
                  <button onClick={() => setAddingKR(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => setAddingKR(true)}
                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-1 transition-colors">
                  <Plus size={11} /> Añadir Key Result
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OKRsView({ projectId, isManager }) {
  const [okrs, setOkrs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]        = useState({ title: '', description: '', period: '', status: 'ON_TRACK' });
  const [saving, setSaving]    = useState(false);

  const load = () =>
    projectsAPI.getOKRs(projectId)
      .then((r) => setOkrs(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [projectId]);

  const create = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await projectsAPI.createOKR(projectId, form);
      toast.success('Objetivo creado');
      setShowForm(false); setForm({ title: '', description: '', period: '', status: 'ON_TRACK' }); load();
    } catch { toast.error('Error al crear'); }
    finally { setSaving(false); }
  };

  const deleteOKR   = async (id) => { await projectsAPI.deleteOKR(id); load(); };
  const updateKR    = async (id, d) => { await projectsAPI.updateKR(id, d); load(); };
  const deleteKR    = async (id) => { await projectsAPI.deleteKR(id); load(); };

  const inputCls = 'w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-indigo-500" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">OKRs <span className="text-slate-400 font-normal">({okrs.length})</span></h3>
        </div>
        {isManager && (
          <button onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={14} /> Nuevo objetivo
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={create} className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 border border-slate-200 dark:border-slate-600 space-y-3">
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Objetivo *" className={inputCls} />
          <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descripción opcional" className={inputCls + ' resize-none'} />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}
              placeholder="Período (ej. Q2-2026)" className={inputCls} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-3 py-1.5 transition-colors hover:text-slate-700">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
              {saving && <Loader2 size={12} className="animate-spin" />} Crear
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando OKRs…</div>
      ) : okrs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Target size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin objetivos definidos aún.</p>
          <p className="text-xs mt-1">Define objetivos medibles vinculados al proyecto.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {okrs.map((obj) => (
            <OKRCard key={obj.id} obj={obj} isManager={isManager}
              onDelete={deleteOKR} onUpdateKR={updateKR} onDeleteKR={deleteKR} />
          ))}
        </div>
      )}
    </div>
  );
}
