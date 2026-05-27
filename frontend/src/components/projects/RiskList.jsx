import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X, Check, Download, LayoutGrid, List } from 'lucide-react';
import { downloadCSV } from '../../utils/csv';
import ConfirmModal from '../ConfirmModal';

// ── Constantes ───────────────────────────────────────────────────────────────
const PROB_OPTS   = ['BAJA', 'MEDIA', 'ALTA'];
const IMPACT_OPTS = ['BAJO', 'MEDIO', 'ALTO'];

const PROB_COLORS = {
  BAJA:  { bg: 'bg-green-100 text-green-700',   dot: 'bg-green-500'  },
  MEDIA: { bg: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500'  },
  ALTA:  { bg: 'bg-red-100   text-red-700',     dot: 'bg-red-500'    },
};
const IMPACT_COLORS = {
  BAJO:  { bg: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400'  },
  MEDIO: { bg: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500'  },
  ALTO:  { bg: 'bg-red-100   text-red-700',     dot: 'bg-red-500'    },
};
const STATUS_COLORS = {
  ACTIVO:        'bg-red-100    text-red-700',
  EN_MITIGACION: 'bg-amber-100  text-amber-700',
  MITIGADO:      'bg-blue-100   text-blue-700',
  CERRADO:       'bg-emerald-100 text-emerald-700',
};

const CATEGORY_LABELS = {
  TECNICO:      'Técnico',
  CRONOGRAMA:   'Cronograma',
  PRESUPUESTO:  'Presupuesto',
  EXTERNO:      'Externo',
  RECURSOS:     'Recursos',
  CALIDAD:      'Calidad',
  OTRO:         'Otro',
};
const CATEGORY_COLORS = {
  TECNICO:     'bg-blue-100 text-blue-700',
  CRONOGRAMA:  'bg-purple-100 text-purple-700',
  PRESUPUESTO: 'bg-emerald-100 text-emerald-700',
  EXTERNO:     'bg-orange-100 text-orange-700',
  RECURSOS:    'bg-indigo-100 text-indigo-700',
  CALIDAD:     'bg-teal-100 text-teal-700',
  OTRO:        'bg-slate-100 text-slate-600',
};

/** Returns a risk-level descriptor based on probability × impact */
function riskLevel(prob, impact) {
  if (prob === 'ALTA'  && impact === 'ALTO')  return { label: 'CRÍTICO', cls: 'bg-red-600 text-white',         score: 9 };
  if (prob === 'ALTA'  && impact === 'MEDIO') return { label: 'ALTO',    cls: 'bg-red-100 text-red-700',       score: 6 };
  if (prob === 'MEDIA' && impact === 'ALTO')  return { label: 'ALTO',    cls: 'bg-red-100 text-red-700',       score: 6 };
  if (prob === 'BAJA'  && impact === 'ALTO')  return { label: 'MEDIO',   cls: 'bg-amber-100 text-amber-700',   score: 3 };
  if (prob === 'ALTA'  && impact === 'BAJO')  return { label: 'MEDIO',   cls: 'bg-amber-100 text-amber-700',   score: 3 };
  if (prob === 'MEDIA' && impact === 'MEDIO') return { label: 'MEDIO',   cls: 'bg-amber-100 text-amber-700',   score: 4 };
  if (prob === 'MEDIA' && impact === 'BAJO')  return { label: 'BAJO',    cls: 'bg-slate-100 text-slate-600',   score: 2 };
  if (prob === 'BAJA'  && impact === 'MEDIO') return { label: 'BAJO',    cls: 'bg-slate-100 text-slate-600',   score: 2 };
  return                                             { label: 'BAJO',    cls: 'bg-slate-100 text-slate-600',   score: 1 };
}

/** Background cell colour for the 3×3 matrix */
function matrixCellBg(prob, impact) {
  const s = riskLevel(prob, impact).score;
  if (s >= 9) return 'bg-red-100   dark:bg-red-900/30   border-red-200   dark:border-red-800';
  if (s >= 6) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
  if (s >= 3) return 'bg-amber-50  dark:bg-amber-900/20 border-amber-200  dark:border-amber-800';
  return              'bg-green-50  dark:bg-green-900/20 border-green-200  dark:border-green-800';
}

const PROB_LABEL  = { BAJA: 'Baja',  MEDIA: 'Media', ALTA: 'Alta'  };
const IMPACT_LABEL = { BAJO: 'Bajo', MEDIO: 'Medio', ALTO: 'Alto' };

const EMPTY = {
  project_id: '', description: '', category: 'OTRO',
  probability: 'MEDIA', impact: 'MEDIO',
  mitigation_plan: '', response_plan: '', status: 'ACTIVO', due_date: '',
};

// ── Risk Matrix ───────────────────────────────────────────────────────────────
function RiskMatrix({ risks }) {
  const active = risks.filter((r) => r.status !== 'CERRADO');

  return (
    <div className="mb-6">
      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        Matriz de Riesgo (impacto × probabilidad)
      </h4>
      <div className="overflow-x-auto">
        <table className="border-collapse min-w-[320px] w-full">
          <thead>
            <tr>
              <th className="w-16 h-8" />
              {IMPACT_OPTS.map((imp) => (
                <th key={imp} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 pb-1 w-1/3">
                  {IMPACT_LABEL[imp]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Rows are ALTA → MEDIA → BAJA so high prob is at top */}
            {[...PROB_OPTS].reverse().map((prob) => (
              <tr key={prob}>
                <td className="pr-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {PROB_LABEL[prob]}
                </td>
                {IMPACT_OPTS.map((impact) => {
                  const inCell = active.filter((r) => r.probability === prob && r.impact === impact);
                  const cellBg = matrixCellBg(prob, impact);
                  return (
                    <td key={impact}
                      className={`border ${cellBg} rounded p-1 text-center align-middle h-16 min-w-[80px]`}>
                      {inCell.length === 0 ? (
                        <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {inCell.map((r) => {
                            const level = riskLevel(r.probability, r.impact);
                            return (
                              <span key={r.id}
                                title={r.description}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold cursor-default
                                  ${level.score >= 9 ? 'bg-red-600 text-white' : level.score >= 6 ? 'bg-red-500 text-white' : level.score >= 3 ? 'bg-amber-400 text-white' : 'bg-slate-300 text-slate-700'}`}>
                                {inCell.indexOf(r) + 1}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {[
          { label: 'Crítico', cls: 'bg-red-100 border-red-200'   },
          { label: 'Alto',    cls: 'bg-orange-50 border-orange-200' },
          { label: 'Medio',   cls: 'bg-amber-50 border-amber-200'  },
          { label: 'Bajo',    cls: 'bg-green-50 border-green-200'  },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded border ${cls}`} />
            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Form ────────────────────────────────────────────────────────────────────
function RiskForm({ initial, projectId, members = [], onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ ...initial, project_id: projectId });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
      className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 mb-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Description */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Descripción *</label>
          <textarea required rows={2} value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="¿Qué podría salir mal?"
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none
                       bg-white dark:bg-slate-800 dark:text-slate-100" />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Categoría</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                       focus:outline-none bg-white dark:bg-slate-800 dark:text-slate-100">
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Owner */}
        {members.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Responsable</label>
            <select value={form.owner_id || ''} onChange={(e) => set('owner_id', e.target.value || null)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                         focus:outline-none bg-white dark:bg-slate-800 dark:text-slate-100">
              <option value="">— Sin asignar —</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.first_name} {m.last_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Probability */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Probabilidad</label>
          <select value={form.probability} onChange={(e) => set('probability', e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white dark:bg-slate-800 dark:text-slate-100">
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
          </select>
        </div>

        {/* Impact */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Impacto</label>
          <select value={form.impact} onChange={(e) => set('impact', e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white dark:bg-slate-800 dark:text-slate-100">
            <option value="BAJO">Bajo</option>
            <option value="MEDIO">Medio</option>
            <option value="ALTO">Alto</option>
          </select>
        </div>

        {/* Due date */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Fecha límite mitigación</label>
          <input type="date" value={form.due_date || ''} onChange={(e) => set('due_date', e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white dark:bg-slate-800 dark:text-slate-100" />
        </div>

        {/* Mitigation plan */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Plan de Mitigación</label>
          <textarea rows={2} value={form.mitigation_plan || ''}
            onChange={(e) => set('mitigation_plan', e.target.value)}
            placeholder="¿Cómo reducir la probabilidad o el impacto?"
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none bg-white dark:bg-slate-800 dark:text-slate-100" />
        </div>

        {/* Response plan */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Plan de Respuesta (si se materializa)</label>
          <textarea rows={2} value={form.response_plan || ''}
            onChange={(e) => set('response_plan', e.target.value)}
            placeholder="¿Qué hacer si el riesgo se convierte en problema?"
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none bg-white dark:bg-slate-800 dark:text-slate-100" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="text-sm text-slate-500 px-3 py-2 hover:text-slate-700">Cancelar</button>
        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
          {loading ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RiskList({ projectId, isManager = false }) {
  const [risks, setRisks]         = useState([]);
  const [members, setMembers]     = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState(null);
  const [editForm, setEditForm]   = useState({});
  const [confirm, setConfirm]     = useState(null);
  const [view, setView]           = useState('list'); // 'list' | 'matrix'
  const [statusFilter, setStatusFilter] = useState('active'); // 'all' | 'active' | 'closed'

  const load = () => {
    Promise.all([
      projectsAPI.getRisks(projectId),
      projectsAPI.getMembers(projectId),
    ]).then(([rr, mr]) => {
      setRisks(rr.data);
      setMembers(mr.data || []);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [projectId]);

  const submit = async (form) => {
    setSaving(true);
    try {
      await projectsAPI.createRisk(form);
      toast.success('Riesgo registrado');
      setShowForm(false);
      load();
    } catch { toast.error('Error al guardar'); }
    finally  { setSaving(false); }
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await projectsAPI.updateRisk(editId, editForm);
      toast.success('Riesgo actualizado');
      setEditId(null);
      load();
    } catch { toast.error('Error al actualizar'); }
    finally  { setSaving(false); }
  };

  const remove = (id) => setConfirm({
    title: 'Eliminar riesgo',
    body: '¿Eliminar este riesgo del proyecto?',
    onConfirm: async () => {
      try { await projectsAPI.deleteRisk(id); load(); }
      catch { toast.error('Error al eliminar'); }
    },
  });

  const changeStatus = async (id, status) => {
    try { await projectsAPI.updateRisk(id, { status }); load(); } catch {}
  };

  // ── Stats ──
  const critCount   = risks.filter((r) => r.probability === 'ALTA' && r.impact === 'ALTO' && r.status === 'ACTIVO').length;
  const activeCount = risks.filter((r) => r.status !== 'CERRADO').length;

  // ── Filtered list ──
  const visibleRisks = risks.filter((r) => {
    if (statusFilter === 'active')  return r.status !== 'CERRADO';
    if (statusFilter === 'closed')  return r.status === 'CERRADO';
    return true;
  }).sort((a, b) => {
    const la = riskLevel(a.probability, a.impact).score;
    const lb = riskLevel(b.probability, b.impact).score;
    return lb - la;
  });

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">
            Riesgos ({risks.length})
          </h3>
          {critCount > 0 && (
            <p className="text-xs text-red-600 font-medium mt-0.5">
              ⚠ {critCount} riesgo{critCount !== 1 ? 's' : ''} crítico{critCount !== 1 ? 's' : ''} activo{critCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <button onClick={() => setView('list')}
              className={`px-2.5 py-1.5 text-xs transition-colors flex items-center gap-1
                ${view === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              <List size={13} /> Lista
            </button>
            <button onClick={() => setView('matrix')}
              className={`px-2.5 py-1.5 text-xs transition-colors flex items-center gap-1
                ${view === 'matrix' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              <LayoutGrid size={13} /> Matriz
            </button>
          </div>

          {/* Status filter */}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs
                       bg-white dark:bg-slate-800 dark:text-slate-300 focus:outline-none">
            <option value="active">Activos ({activeCount})</option>
            <option value="all">Todos ({risks.length})</option>
            <option value="closed">Cerrados</option>
          </select>

          {/* CSV */}
          {risks.length > 0 && (
            <button onClick={() => downloadCSV(risks, [
              { key: 'description',    label: 'Descripción'     },
              { key: 'category',       label: 'Categoría',   transform: (v) => CATEGORY_LABELS[v] ?? v },
              { key: 'probability',    label: 'Probabilidad'    },
              { key: 'impact',         label: 'Impacto'         },
              { key: 'status',         label: 'Estado'          },
              { key: 'mitigation_plan', label: 'Plan Mitigación' },
              { key: 'response_plan',  label: 'Plan Respuesta'  },
              { key: 'due_date',       label: 'Fecha Límite'    },
            ], 'riesgos')}
              className="flex items-center gap-1.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700
                         text-slate-600 dark:text-slate-400 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              <Download size={13} /> CSV
            </button>
          )}

          {isManager && (
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
              <Plus size={13} /> Nuevo Riesgo
            </button>
          )}
        </div>
      </div>

      {/* ── New risk form ─────────────────────────────────────────── */}
      {showForm && (
        <RiskForm
          initial={EMPTY}
          projectId={projectId}
          members={members}
          onSubmit={submit}
          onCancel={() => setShowForm(false)}
          loading={saving}
        />
      )}

      {/* ── Matrix view ───────────────────────────────────────────── */}
      {view === 'matrix' && <RiskMatrix risks={risks} />}

      {/* ── List view ─────────────────────────────────────────────── */}
      {risks.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">Sin riesgos registrados</p>
      ) : visibleRisks.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">Sin riesgos en esta vista</p>
      ) : (
        <div className="space-y-3">
          {visibleRisks.map((r, rIdx) => {
            const level  = riskLevel(r.probability, r.impact);
            const isEdit = editId === r.id;
            const owner  = members.find((m) => String(m.user_id) === String(r.owner_id));

            return (
              <div key={r.id}
                className={`border rounded-xl p-4 transition-colors
                  ${r.status === 'CERRADO'
                    ? 'opacity-60 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>

                {isEdit ? (
                  <RiskForm
                    initial={editForm}
                    projectId={projectId}
                    members={members}
                    onSubmit={saveEdit}
                    onCancel={() => setEditId(null)}
                    loading={saving}
                  />
                ) : (
                  <>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {/* Matrix reference number */}
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs flex items-center justify-center font-semibold mt-0.5">
                          {rIdx + 1}
                        </span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">{r.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${level.cls}`}>
                          {level.label}
                        </span>
                        {isManager && (
                          <>
                            <button onClick={() => { setEditId(r.id); setEditForm({ ...r }); }}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => remove(r.id)}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Badges row */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {r.category && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[r.category] ?? 'bg-slate-100 text-slate-600'}`}>
                          {CATEGORY_LABELS[r.category] ?? r.category}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROB_COLORS[r.probability]?.bg}`}>
                        P: {r.probability}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${IMPACT_COLORS[r.impact]?.bg}`}>
                        I: {r.impact}
                      </span>
                      {owner && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center font-bold">
                            {(owner.first_name?.[0] || '') + (owner.last_name?.[0] || '')}
                          </span>
                          {owner.first_name} {owner.last_name}
                        </span>
                      )}
                      {r.due_date && (
                        <span className={`text-xs ${new Date(r.due_date) < new Date() && r.status !== 'MITIGADO' && r.status !== 'CERRADO' ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                          📅 {new Date(r.due_date + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                      <select value={r.status} onChange={(e) => changeStatus(r.id, e.target.value)}
                        className="ml-auto text-xs border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5
                                   focus:outline-none bg-white dark:bg-slate-800 dark:text-slate-300">
                        <option value="ACTIVO">Activo</option>
                        <option value="EN_MITIGACION">En Mitigación</option>
                        <option value="MITIGADO">Mitigado</option>
                        <option value="CERRADO">Cerrado</option>
                      </select>
                    </div>

                    {/* Plans */}
                    {r.mitigation_plan && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic bg-slate-50 dark:bg-slate-900/30 rounded px-2 py-1.5">
                        🛡 <span className="font-medium not-italic text-slate-600 dark:text-slate-300">Mitigación:</span> {r.mitigation_plan}
                      </p>
                    )}
                    {r.response_plan && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 italic bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1.5">
                        ⚡ <span className="font-medium not-italic text-slate-600 dark:text-slate-300">Respuesta:</span> {r.response_plan}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
