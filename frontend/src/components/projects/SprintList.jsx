import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Plus, Trash2, BarChart2, X, Edit2, Check } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const STATUS_COLORS = {
  PLANEADO: 'bg-slate-100 text-slate-600',
  ACTIVO:   'bg-blue-100 text-blue-700',
  CERRADO:  'bg-emerald-100 text-emerald-700',
};

const EMPTY = { project_id: '', name: '', goal: '', start_date: '', end_date: '', capacity: 0, status: 'PLANEADO', velocity_target: 0 };

export default function SprintList({ projectId, isManager = false }) {
  const [sprints, setSprints]       = useState([]);
  const [form, setForm]             = useState({ ...EMPTY, project_id: projectId });
  const [showForm, setShowForm]     = useState(false);
  const [loading, setLoading]       = useState(true);
  const [burndownSprint, setBurndownSprint] = useState(null);
  const [loadingBd, setLoadingBd]   = useState(false);
  const [confirm, setConfirm]       = useState(null);
  const [editId, setEditId]         = useState(null);
  const [editForm, setEditForm]     = useState({});

  const load = () => {
    projectsAPI.getSprints(projectId).then((r) => setSprints(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await projectsAPI.createSprint(form);
      toast.success('Sprint creado');
      setForm({ ...EMPTY, project_id: projectId });
      setShowForm(false);
      load();
    } catch { toast.error('Error al crear sprint'); }
  };

  const remove = (id) => setConfirm({
    title: 'Eliminar sprint',
    body: '¿Eliminar este sprint y todas sus tareas?',
    onConfirm: async () => {
      try { await projectsAPI.deleteSprint(id); load(); }
      catch { toast.error('Error al eliminar'); }
    },
  });

  const changeStatus = async (id, status) => {
    try {
      await projectsAPI.updateSprint(id, { status });
      load();
    } catch { toast.error('Error'); }
  };

  const startEdit = (s) => {
    setEditId(s.id);
    setEditForm({ name: s.name, goal: s.goal || '', start_date: s.start_date, end_date: s.end_date, capacity: s.capacity || 0 });
  };

  const saveEdit = async () => {
    try {
      await projectsAPI.updateSprint(editId, editForm);
      toast.success('Sprint actualizado');
      setEditId(null);
      load();
    } catch { toast.error('Error al actualizar sprint'); }
  };

  const showBurndown = async (sprintId) => {
    setLoadingBd(true);
    try {
      const r = await projectsAPI.getSprintBurndown(sprintId);
      setBurndownSprint(r.data);
    } catch { toast.error('Error al cargar burndown'); }
    finally { setLoadingBd(false); }
  };

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Sprints ({sprints.length})</h3>
        {isManager && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Plus size={14} /> Nuevo Sprint
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-slate-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Inicio *</label>
            <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fin *</label>
            <input type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Capacidad (horas)</label>
            <input type="number" min="0" value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              placeholder="80"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estado inicial</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="PLANEADO">Planeado</option>
              <option value="ACTIVO">Activo</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Objetivo del Sprint</label>
            <textarea rows={2} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}
              placeholder="¿Qué se logrará al completar este sprint?"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2">Cancelar</button>
            <button type="submit" className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Crear</button>
          </div>
        </form>
      )}

      {/* Burndown chart panel */}
      {burndownSprint && (
        <div className="border border-slate-200 rounded-xl p-5 mb-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-700">
                Burndown — Sprint {burndownSprint.sprint.number}: {burndownSprint.sprint.name}
              </h4>
              <p className="text-xs text-slate-400">{burndownSprint.total_hours}h estimadas totales</p>
            </div>
            <button onClick={() => setBurndownSprint(null)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          {burndownSprint.burndown.length < 2 ? (
            <p className="text-sm text-slate-400 text-center py-4">No hay suficientes datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={burndownSprint.burndown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} unit="h" />
                <Tooltip formatter={(v) => v !== null ? `${v}h` : 'N/A'} labelFormatter={(l) => `Día ${l}`} />
                <Legend />
                <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="5 5"
                  name="Ideal" dot={false} />
                <Line type="monotone" dataKey="real" stroke="#6366f1"
                  name="Real" dot={{ r: 3 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {sprints.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">No hay sprints aún</p>
      ) : (
        <div className="space-y-3">
          {sprints.map((s) => (
            <div key={s.id} className="border border-slate-200 rounded-xl p-4">
              {editId === s.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                      <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Inicio</label>
                      <input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Fin</label>
                      <input type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Capacidad (h)</label>
                      <input type="number" min="0" value={editForm.capacity} onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Objetivo</label>
                      <textarea rows={2} value={editForm.goal} onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })}
                        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none resize-none" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={14} /></button>
                    <button onClick={saveEdit} className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-1">
                      <Check size={12} /> Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">Sprint {s.number}: {s.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {s.start_date} → {s.end_date}
                        {s.capacity > 0 && <span className="ml-2">· {s.capacity}h cap.</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => showBurndown(s.id)} disabled={loadingBd}
                        title="Ver burndown" className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded">
                        <BarChart2 size={16} />
                      </button>
                      {isManager && (
                        <button onClick={() => startEdit(s)} title="Editar sprint"
                          className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100">
                          <Edit2 size={14} />
                        </button>
                      )}
                      <select value={s.status} onChange={(e) => changeStatus(s.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none">
                        <option value="PLANEADO">Planeado</option>
                        <option value="ACTIVO">Activo</option>
                        <option value="CERRADO">Cerrado</option>
                      </select>
                      {isManager && (
                        <button onClick={() => remove(s.id)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {s.goal && <p className="text-xs text-slate-500 mt-2">{s.goal}</p>}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
