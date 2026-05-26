import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X, Check, Download } from 'lucide-react';
import { downloadCSV } from '../../utils/csv';
import ConfirmModal from '../ConfirmModal';

const PROB_COLORS = {
  BAJA:  { bg: 'bg-green-100  text-green-700',  dot: 'bg-green-500'  },
  MEDIA: { bg: 'bg-amber-100  text-amber-700',  dot: 'bg-amber-500'  },
  ALTA:  { bg: 'bg-red-100    text-red-700',    dot: 'bg-red-500'    },
};
const IMPACT_COLORS = {
  BAJO:  { bg: 'bg-slate-100  text-slate-600',  dot: 'bg-slate-400'  },
  MEDIO: { bg: 'bg-amber-100  text-amber-700',  dot: 'bg-amber-500'  },
  ALTO:  { bg: 'bg-red-100    text-red-700',    dot: 'bg-red-500'    },
};
const STATUS_COLORS = {
  ACTIVO:        'bg-red-100    text-red-700',
  EN_MITIGACION: 'bg-amber-100  text-amber-700',
  MITIGADO:      'bg-blue-100   text-blue-700',
  CERRADO:       'bg-emerald-100 text-emerald-700',
};

// Risk severity: ALTA prob + ALTO impact = CRITICO
function riskLevel(prob, impact) {
  if (prob === 'ALTA'  && impact === 'ALTO')  return { label: 'CRÍTICO',  cls: 'bg-red-600 text-white' };
  if (prob === 'ALTA'  && impact === 'MEDIO') return { label: 'ALTO',     cls: 'bg-red-100 text-red-700' };
  if (prob === 'MEDIA' && impact === 'ALTO')  return { label: 'ALTO',     cls: 'bg-red-100 text-red-700' };
  if (prob === 'BAJA'  && impact === 'ALTO')  return { label: 'MEDIO',    cls: 'bg-amber-100 text-amber-700' };
  if (prob === 'ALTA'  && impact === 'BAJO')  return { label: 'MEDIO',    cls: 'bg-amber-100 text-amber-700' };
  if (prob === 'MEDIA' && impact === 'MEDIO') return { label: 'MEDIO',    cls: 'bg-amber-100 text-amber-700' };
  return                                             { label: 'BAJO',     cls: 'bg-slate-100 text-slate-600' };
}

const EMPTY = { project_id: '', description: '', probability: 'MEDIA', impact: 'MEDIO', mitigation_plan: '', status: 'ACTIVO' };

export default function RiskList({ projectId, isManager = false }) {
  const [risks, setRisks]       = useState([]);
  const [form, setForm]         = useState({ ...EMPTY, project_id: projectId });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirm, setConfirm]   = useState(null);

  const load = () => projectsAPI.getRisks(projectId).then((r) => setRisks(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, [projectId]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await projectsAPI.createRisk(form);
      toast.success('Riesgo registrado');
      setForm({ ...EMPTY, project_id: projectId });
      setShowForm(false);
      load();
    } catch { toast.error('Error'); }
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

  const startEdit = (r) => { setEditId(r.id); setEditForm({ ...r }); };
  const saveEdit  = async () => {
    try {
      await projectsAPI.updateRisk(editId, editForm);
      toast.success('Riesgo actualizado');
      setEditId(null);
      load();
    } catch { toast.error('Error al actualizar'); }
  };

  // Summary counts
  const critCount = risks.filter((r) => r.probability === 'ALTA' && r.impact === 'ALTO' && r.status === 'ACTIVO').length;
  const activeCount = risks.filter((r) => r.status === 'ACTIVO').length;

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-700">Riesgos ({risks.length})</h3>
          {critCount > 0 && (
            <p className="text-xs text-red-600 font-medium mt-0.5">⚠ {critCount} riesgo{critCount !== 1 ? 's' : ''} crítico{critCount !== 1 ? 's' : ''} activo{critCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex gap-2">
          {risks.length > 0 && (
            <button onClick={() => downloadCSV(risks, [
              { key: 'description',    label: 'Descripción' },
              { key: 'probability',    label: 'Probabilidad' },
              { key: 'impact',         label: 'Impacto' },
              { key: 'status',         label: 'Estado' },
              { key: 'mitigation_plan',label: 'Plan de Mitigación' },
            ], 'riesgos')}
              className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              <Download size={14} /> CSV
            </button>
          )}
          {isManager && (
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg">
              <Plus size={14} /> Nuevo Riesgo
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-slate-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Descripción del Riesgo *</label>
            <textarea required rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="¿Qué podría salir mal?"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Probabilidad</label>
            <select value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="BAJA">Baja</option><option value="MEDIA">Media</option><option value="ALTA">Alta</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Impacto</label>
            <select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="BAJO">Bajo</option><option value="MEDIO">Medio</option><option value="ALTO">Alto</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Plan de Mitigación</label>
            <textarea rows={2} value={form.mitigation_plan}
              onChange={(e) => setForm({ ...form, mitigation_plan: e.target.value })}
              placeholder="¿Cómo reducir la probabilidad o el impacto?"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-3 py-2">Cancelar</button>
            <button type="submit" className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Registrar</button>
          </div>
        </form>
      )}

      {risks.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">Sin riesgos registrados</p>
      ) : (
        <div className="space-y-3">
          {/* Sort: active + critical first */}
          {[...risks].sort((a, b) => {
            const scoreA = (a.status === 'ACTIVO' ? 2 : 0) + (a.probability === 'ALTA' && a.impact === 'ALTO' ? 1 : 0);
            const scoreB = (b.status === 'ACTIVO' ? 2 : 0) + (b.probability === 'ALTA' && b.impact === 'ALTO' ? 1 : 0);
            return scoreB - scoreA;
          }).map((r) => {
            const level = riskLevel(r.probability, r.impact);
            const isEdit = editId === r.id;
            return (
              <div key={r.id}
                className={`border rounded-xl p-4 transition-colors
                  ${r.status === 'CERRADO' ? 'opacity-60 bg-slate-50 border-slate-200' : 'border-slate-200 bg-white'}`}>
                {isEdit ? (
                  <div className="space-y-2">
                    <textarea rows={2} value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={editForm.probability} onChange={(e) => setEditForm({ ...editForm, probability: e.target.value })}
                        className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none">
                        <option value="BAJA">Probabilidad: Baja</option>
                        <option value="MEDIA">Probabilidad: Media</option>
                        <option value="ALTA">Probabilidad: Alta</option>
                      </select>
                      <select value={editForm.impact} onChange={(e) => setEditForm({ ...editForm, impact: e.target.value })}
                        className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none">
                        <option value="BAJO">Impacto: Bajo</option>
                        <option value="MEDIO">Impacto: Medio</option>
                        <option value="ALTO">Impacto: Alto</option>
                      </select>
                    </div>
                    <textarea rows={2} value={editForm.mitigation_plan || ''}
                      onChange={(e) => setEditForm({ ...editForm, mitigation_plan: e.target.value })}
                      placeholder="Plan de mitigación..."
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                      <button onClick={saveEdit}
                        className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-1">
                        <Check size={12} /> Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-slate-700 flex-1">{r.description}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${level.cls}`}>
                          {level.label}
                        </span>
                        {isManager && (
                          <>
                            <button onClick={() => startEdit(r)}
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => remove(r.id)}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROB_COLORS[r.probability]?.bg}`}>
                        P: {r.probability}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${IMPACT_COLORS[r.impact]?.bg}`}>
                        I: {r.impact}
                      </span>
                      <select value={r.status} onChange={(e) => changeStatus(r.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded px-2 py-0.5 focus:outline-none ml-auto">
                        <option value="ACTIVO">Activo</option>
                        <option value="EN_MITIGACION">En Mitigación</option>
                        <option value="MITIGADO">Mitigado</option>
                        <option value="CERRADO">Cerrado</option>
                      </select>
                    </div>

                    {r.mitigation_plan && (
                      <p className="text-xs text-slate-500 mt-2 italic bg-slate-50 rounded px-2 py-1.5">
                        📋 {r.mitigation_plan}
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
