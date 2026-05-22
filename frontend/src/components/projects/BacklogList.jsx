import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

const PRIORITY_COLORS = {
  BAJA:  'bg-green-100 text-green-700',
  MEDIA: 'bg-blue-100 text-blue-700',
  ALTA:  'bg-amber-100 text-amber-700',
};
const STATUS_COLORS = {
  BACKLOG:    'bg-slate-100 text-slate-600',
  EN_SPRINT:  'bg-blue-100 text-blue-700',
  COMPLETADA: 'bg-emerald-100 text-emerald-700',
};

const EMPTY = { project_id: '', title: '', description: '', acceptance_criteria: '', priority: 'MEDIA', story_points: 0 };

export default function BacklogList({ projectId }) {
  const [items, setItems]         = useState([]);
  const [sprints, setSprints]     = useState([]);
  const [form, setForm]           = useState({ ...EMPTY, project_id: projectId });
  const [showForm, setShowForm]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [confirm, setConfirm]     = useState(null);
  const [assignTarget, setAssign] = useState({}); // { [itemId]: sprintId }

  const load = () => {
    Promise.all([
      projectsAPI.getBacklogItems(projectId),
      projectsAPI.getSprints(projectId),
    ]).then(([bi, sp]) => {
      setItems(bi.data);
      setSprints(sp.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await projectsAPI.createBacklogItem(form);
      toast.success('Historia creada');
      setForm({ ...EMPTY, project_id: projectId });
      setShowForm(false);
      load();
    } catch { toast.error('Error al crear historia'); }
  };

  const remove = (id) => setConfirm({
    title: 'Eliminar historia',
    body: '¿Eliminar esta historia del backlog?',
    onConfirm: async () => {
      try { await projectsAPI.deleteBacklogItem(id); load(); }
      catch { toast.error('Error al eliminar'); }
    },
  });

  const changeStatus = async (id, status) => {
    try { await projectsAPI.updateBacklogItem(id, { status }); load(); }
    catch { toast.error('Error'); }
  };

  const assignToSprint = async (itemId) => {
    const sprintId = assignTarget[itemId];
    if (!sprintId) return;
    try {
      await projectsAPI.updateBacklogItem(itemId, { sprint_id: sprintId, status: 'EN_SPRINT' });
      toast.success('Historia asignada al sprint');
      load();
    } catch { toast.error('Error al asignar'); }
  };

  // KPI counts
  const counts = items.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});
  const totalPoints = items.reduce((s, i) => s + (parseInt(i.story_points) || 0), 0);

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-700">Product Backlog ({items.length})</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {counts.BACKLOG || 0} en backlog · {counts.EN_SPRINT || 0} en sprint · {counts.COMPLETADA || 0} completadas · {totalPoints} pts totales
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg">
          <Plus size={14} /> Nueva Historia
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-slate-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Como [rol], quiero [acción] para [beneficio]"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Prioridad</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Story Points</label>
            <input type="number" min="0" max="100" value={form.story_points}
              onChange={(e) => setForm({ ...form, story_points: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Criterios de Aceptación</label>
            <textarea rows={2} value={form.acceptance_criteria} onChange={(e) => setForm({ ...form, acceptance_criteria: e.target.value })}
              placeholder="Dado que... Cuando... Entonces..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-3 py-2">Cancelar</button>
            <button type="submit" className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Crear</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">Backlog vacío — agrega historias de usuario</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id}
              className={`border rounded-xl p-4 transition-colors
                ${item.status === 'COMPLETADA' ? 'bg-emerald-50 border-emerald-200 opacity-70' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className="flex items-start gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${PRIORITY_COLORS[item.priority]}`}>
                  {item.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.status === 'COMPLETADA' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                  {item.acceptance_criteria && (
                    <p className="text-xs text-slate-400 mt-1 italic line-clamp-1">
                      ✓ {item.acceptance_criteria}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {item.story_points || 0}p
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                <select value={item.status}
                  onChange={(e) => changeStatus(item.id, e.target.value)}
                  className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400">
                  <option value="BACKLOG">Backlog</option>
                  <option value="EN_SPRINT">En Sprint</option>
                  <option value="COMPLETADA">Completada</option>
                </select>

                {/* Assign to sprint */}
                {sprints.length > 0 && item.status !== 'COMPLETADA' && (
                  <div className="flex items-center gap-1 ml-2">
                    <select
                      value={assignTarget[item.id] || ''}
                      onChange={(e) => setAssign({ ...assignTarget, [item.id]: e.target.value })}
                      className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400">
                      <option value="">→ Asignar sprint</option>
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          Sprint {s.number}: {s.name}
                        </option>
                      ))}
                    </select>
                    {assignTarget[item.id] && (
                      <button onClick={() => assignToSprint(item.id)}
                        className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                        <ArrowRight size={11} /> Asignar
                      </button>
                    )}
                  </div>
                )}

                <button onClick={() => remove(item.id)}
                  className="ml-auto text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
