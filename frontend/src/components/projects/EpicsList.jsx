import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

const STATUS_OPTS = ['ABIERTA', 'EN_PROGRESO', 'CERRADA'];
const PRIORITY_OPTS = ['BAJA', 'MEDIA', 'ALTA'];

const STATUS_COLORS = {
  ABIERTA:    'bg-blue-100 text-blue-700',
  EN_PROGRESO:'bg-amber-100 text-amber-700',
  CERRADA:    'bg-emerald-100 text-emerald-700',
};
const PRIORITY_COLORS = {
  BAJA:  'bg-slate-100 text-slate-600',
  MEDIA: 'bg-amber-100 text-amber-700',
  ALTA:  'bg-red-100 text-red-700',
};

const PALETTE = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

const EMPTY = { title: '', description: '', color: '#6366f1', status: 'ABIERTA', priority: 'MEDIA' };

export default function EpicsList({ projectId, isManager }) {
  const [epics, setEpics]       = useState([]);
  const [form, setForm]         = useState({ ...EMPTY, project_id: projectId });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirm, setConfirm]   = useState(null);

  const load = () =>
    projectsAPI.getEpics(projectId)
      .then((r) => setEpics(r.data))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [projectId]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await projectsAPI.createEpic(form);
      toast.success('Épica creada');
      setForm({ ...EMPTY, project_id: projectId });
      setShowForm(false);
      load();
    } catch { toast.error('Error al crear épica'); }
  };

  const remove = (id) =>
    setConfirm({
      title: 'Eliminar épica',
      body: 'Las historias de usuario vinculadas quedarán sin épica. ¿Continuar?',
      onConfirm: async () => {
        try { await projectsAPI.deleteEpic(id); load(); }
        catch { toast.error('Error al eliminar'); }
      },
    });

  const startEdit = (ep) => { setEditId(ep.id); setEditForm({ ...ep }); };
  const saveEdit  = async () => {
    try {
      await projectsAPI.updateEpic(editId, editForm);
      toast.success('Épica actualizada');
      setEditId(null);
      load();
    } catch { toast.error('Error al actualizar'); }
  };

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Épicas ({epics.length})</h3>
        {isManager && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
          >
            <Plus size={14} /> Nueva Épica
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="p. ej. Módulo de pagos"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prioridad</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                {PRIORITY_OPTS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                {STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-3 py-2">Cancelar</button>
            <button type="submit" className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Crear Épica</button>
          </div>
        </form>
      )}

      {epics.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">Sin épicas. Las épicas agrupan historias de usuario relacionadas.</p>
      ) : (
        <div className="space-y-3">
          {epics.map((ep) => {
            const isEdit = editId === ep.id;
            return (
              <div key={ep.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                {/* Color strip */}
                <div className="h-1.5" style={{ backgroundColor: ep.color }} />

                {isEdit ? (
                  <div className="p-4 space-y-3">
                    <input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <textarea
                      rows={2}
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none resize-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={editForm.priority}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                        className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none"
                      >
                        {PRIORITY_OPTS.map((p) => <option key={p}>{p}</option>)}
                      </select>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none"
                      >
                        {STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {PALETTE.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, color: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${editForm.color === c ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                      <button onClick={saveEdit} className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-1">
                        <Check size={12} /> Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ep.color }} />
                        <span className="font-medium text-slate-800 text-sm">{ep.title}</span>
                      </div>
                      {isManager && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => startEdit(ep)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => remove(ep.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {ep.description && (
                      <p className="text-xs text-slate-500 mt-1 ml-5">{ep.description}</p>
                    )}

                    <div className="flex items-center gap-2 mt-2 ml-5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ep.status]}`}>
                        {ep.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[ep.priority]}`}>
                        {ep.priority}
                      </span>
                      {ep.backlog_count != null && (
                        <span className="text-xs text-slate-400 ml-auto">
                          {ep.backlog_count} historia{ep.backlog_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
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
