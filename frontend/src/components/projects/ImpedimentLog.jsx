import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X, Check, AlertOctagon } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

const STATUS_OPTS     = ['ABIERTO', 'EN_PROCESO', 'RESUELTO'];
const PRIORITY_OPTS   = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];

const STATUS_COLORS = {
  ABIERTO:    'bg-red-100 text-red-700',
  EN_PROCESO: 'bg-amber-100 text-amber-700',
  RESUELTO:   'bg-emerald-100 text-emerald-700',
};
const PRIORITY_COLORS = {
  BAJA:    'bg-slate-100 text-slate-600',
  MEDIA:   'bg-blue-100 text-blue-700',
  ALTA:    'bg-amber-100 text-amber-700',
  CRITICA: 'bg-red-100 text-red-700',
};

const EMPTY = {
  title: '', description: '', status: 'ABIERTO', priority: 'MEDIA',
  sprint_id: '', assigned_to: '',
};

export default function ImpedimentLog({ projectId, isManager }) {
  const [items, setItems]       = useState([]);
  const [sprints, setSprints]   = useState([]);
  const [users, setUsers]       = useState([]);
  const [form, setForm]         = useState({ ...EMPTY, project_id: projectId });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filterStatus, setFilter] = useState('');
  const [confirm, setConfirm]   = useState(null);

  const load = () =>
    Promise.all([
      projectsAPI.getImpediments(projectId, filterStatus ? { status: filterStatus } : {}),
      projectsAPI.getSprints(projectId),
      projectsAPI.getMembers(projectId),
    ]).then(([ir, sr, mr]) => {
      setItems(ir.data);
      setSprints(sr.data);
      setUsers(mr.data);
    }).finally(() => setLoading(false));

  useEffect(() => { load(); }, [projectId, filterStatus]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        sprint_id:   form.sprint_id   || null,
        assigned_to: form.assigned_to || null,
      };
      await projectsAPI.createImpediment(payload);
      toast.success('Impedimento registrado');
      setForm({ ...EMPTY, project_id: projectId });
      setShowForm(false);
      load();
    } catch { toast.error('Error al registrar impedimento'); }
  };

  const remove = (id) =>
    setConfirm({
      title: 'Eliminar impedimento',
      body: '¿Eliminar este impedimento del log?',
      onConfirm: async () => {
        try { await projectsAPI.deleteImpediment(id); load(); }
        catch { toast.error('Error al eliminar'); }
      },
    });

  const startEdit = (item) => { setEditId(item.id); setEditForm({ ...item }); };
  const saveEdit  = async () => {
    try {
      await projectsAPI.updateImpediment(editId, editForm);
      toast.success('Impedimento actualizado');
      setEditId(null);
      load();
    } catch { toast.error('Error al actualizar'); }
  };

  const changeStatus = async (id, status) => {
    try { await projectsAPI.updateImpediment(id, { status }); load(); }
    catch {}
  };

  const open  = items.filter((i) => i.status === 'ABIERTO').length;
  const inProg = items.filter((i) => i.status === 'EN_PROCESO').length;

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-700">Log de Impedimentos ({items.length})</h3>
          {(open + inProg) > 0 && (
            <p className="text-xs text-red-600 font-medium mt-0.5">
              <AlertOctagon size={11} className="inline mr-1" />
              {open} abierto{open !== 1 ? 's' : ''}, {inProg} en proceso
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">Todos</option>
            {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {isManager && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
            >
              <Plus size={14} /> Nuevo
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={submit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="¿Qué está bloqueando al equipo?"
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Sprint</label>
              <select
                value={form.sprint_id}
                onChange={(e) => setForm({ ...form, sprint_id: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">Sin sprint</option>
                {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Asignado a</label>
              <select
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">Sin asignar</option>
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.first_name} {u.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-3 py-2">Cancelar</button>
            <button type="submit" className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Registrar</button>
          </div>
        </form>
      )}

      {/* List */}
      {items.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">Sin impedimentos registrados</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isEdit = editId === item.id;
            return (
              <div
                key={item.id}
                className={`border rounded-xl p-4 bg-white transition-opacity ${item.status === 'RESUELTO' ? 'opacity-60' : ''}`}
              >
                {isEdit ? (
                  <div className="space-y-2">
                    <input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    />
                    <textarea
                      rows={2}
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none resize-none"
                    />
                    <div className="grid grid-cols-3 gap-2">
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
                      <select
                        value={editForm.assigned_to || ''}
                        onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value || null })}
                        className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none"
                      >
                        <option value="">Sin asignar</option>
                        {users.map((u) => (
                          <option key={u.user_id} value={u.user_id}>{u.first_name} {u.last_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                      <button onClick={saveEdit} className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-1">
                        <Check size={12} /> Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${item.status === 'RESUELTO' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                        )}
                      </div>
                      {isManager && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => startEdit(item)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => remove(item.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[item.priority]}`}>
                        {item.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status]}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                      {item.sprint_name && (
                        <span className="text-xs text-slate-400">Sprint: {item.sprint_name}</span>
                      )}
                      {(item.assignee_first || item.reporter_first) && (
                        <span className="text-xs text-slate-400 ml-auto">
                          {item.assignee_first
                            ? `→ ${item.assignee_first} ${item.assignee_last}`
                            : `Reportado por ${item.reporter_first} ${item.reporter_last}`}
                        </span>
                      )}
                    </div>

                    {item.status !== 'RESUELTO' && isManager && (
                      <div className="mt-2 flex gap-2">
                        {item.status === 'ABIERTO' && (
                          <button
                            onClick={() => changeStatus(item.id, 'EN_PROCESO')}
                            className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                          >
                            Marcar en proceso →
                          </button>
                        )}
                        {item.status !== 'RESUELTO' && (
                          <button
                            onClick={() => changeStatus(item.id, 'RESUELTO')}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            Marcar resuelto ✓
                          </button>
                        )}
                      </div>
                    )}

                    {item.resolved_at && (
                      <p className="text-xs text-slate-400 mt-1">Resuelto: {item.resolved_at}</p>
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
