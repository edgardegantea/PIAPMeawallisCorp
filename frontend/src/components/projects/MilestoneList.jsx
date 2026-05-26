import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Plus, Trash2, CheckCircle2, Circle, Edit2, X, Check, Download } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';
import { downloadCSV } from '../../utils/csv';

const EMPTY = { project_id: '', title: '', description: '', due_date: '' };

export default function MilestoneList({ projectId, isManager = false }) {
  const [milestones, setMilestones] = useState([]);
  const [form, setForm]             = useState({ ...EMPTY, project_id: projectId });
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [loading, setLoading]       = useState(true);
  const [confirm, setConfirm]       = useState(null);

  const load = () => {
    projectsAPI.getMilestones(projectId)
      .then((r) => setMilestones(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await projectsAPI.createMilestone(form);
      toast.success('Hito creado');
      setForm({ ...EMPTY, project_id: projectId });
      setShowForm(false);
      load();
    } catch { toast.error('Error al crear hito'); }
  };

  const startEdit = (m) => {
    setEditId(m.id);
    setEditForm({ title: m.title, description: m.description, due_date: m.due_date });
  };

  const saveEdit = async () => {
    try {
      await projectsAPI.updateMilestone(editId, editForm);
      toast.success('Hito actualizado');
      setEditId(null);
      load();
    } catch { toast.error('Error al actualizar'); }
  };

  const toggle = async (id) => {
    try {
      await projectsAPI.completeMilestone(id);
      load();
    } catch { toast.error('Error'); }
  };

  const remove = (id) => setConfirm({
    title: 'Eliminar hito',
    body: '¿Eliminar este hito del proyecto?',
    onConfirm: async () => {
      try {
        await projectsAPI.deleteMilestone(id);
        setMilestones((m) => m.filter((ms) => ms.id !== id));
      } catch { toast.error('Error al eliminar'); }
    },
  });

  // Group: pending first, completed last
  const pending   = milestones.filter((m) => !parseInt(m.is_completed));
  const completed = milestones.filter((m) => parseInt(m.is_completed));

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-700">Hitos ({milestones.length})</h3>
          <p className="text-xs text-slate-400">{completed.length} completados · {pending.length} pendientes</p>
        </div>
        <div className="flex gap-2">
          {milestones.length > 0 && (
            <button onClick={() => downloadCSV(milestones, [
              { key: 'title',        label: 'Título' },
              { key: 'due_date',     label: 'Fecha Límite' },
              { key: 'is_completed', label: 'Completado' },
              { key: 'description',  label: 'Descripción' },
            ], 'hitos')}
              className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              <Download size={14} /> CSV
            </button>
          )}
          {isManager && (
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              <Plus size={14} /> Nuevo Hito
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {milestones.length > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progreso de hitos</span>
            <span>{completed.length}/{milestones.length}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${milestones.length > 0 ? (completed.length / milestones.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="bg-slate-50 rounded-xl p-4 mb-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha límite *</label>
              <input type="date" required value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2">Cancelar</button>
            <button type="submit" className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Crear</button>
          </div>
        </form>
      )}

      {milestones.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">
          No hay hitos aún. Los hitos marcan momentos clave del proyecto.
        </p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-slate-200" />

          <div className="space-y-4 pl-10">
            {[...pending, ...completed].map((m) => {
              const isDone    = parseInt(m.is_completed);
              const isOverdue = !isDone && m.due_date && new Date(m.due_date) < new Date();
              return (
                <div key={m.id} className="relative">
                  {/* Circle on timeline */}
                  <div className={`absolute -left-10 top-1 flex items-center justify-center w-7 h-7 rounded-full border-2
                    ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : isOverdue ? 'bg-red-50 border-red-400' : 'bg-white border-slate-300'}`}>
                    {isDone
                      ? <CheckCircle2 size={14} />
                      : <Circle size={14} className={isOverdue ? 'text-red-400' : 'text-slate-300'} />
                    }
                  </div>

                  <div className={`border rounded-xl p-4 transition-all
                    ${isDone ? 'border-emerald-200 bg-emerald-50' : isOverdue ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
                    {editId === m.id ? (
                      <div className="space-y-2">
                        <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                            className="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <input value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Descripción"
                            className="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                          <button onClick={saveEdit} className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-1">
                            <Check size={12} /> Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${isDone ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>
                            {m.title}
                          </p>
                          {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
                          <p className={`text-xs mt-1 font-medium ${isOverdue ? 'text-red-500' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {isOverdue ? '⚠ Vencido: ' : isDone ? '✓ Completado: ' : 'Fecha límite: '}
                            {isDone && m.completed_at ? m.completed_at.slice(0, 10) : m.due_date}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isManager && (
                            <button onClick={() => toggle(m.id)}
                              title={isDone ? 'Marcar como pendiente' : 'Marcar como completado'}
                              className={`p-1.5 rounded-lg text-xs font-medium transition-colors
                                ${isDone ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'}`}>
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          {isManager && (
                            <button onClick={() => startEdit(m)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                              <Edit2 size={14} />
                            </button>
                          )}
                          {isManager && (
                            <button onClick={() => remove(m.id)}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
