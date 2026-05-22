import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Plus, Trash2, User, Download } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';
import { downloadCSV } from '../../utils/csv';

const ROLES = ['PM','DESARROLLADOR','TESTER','ANALISTA','STAKEHOLDER'];
const ROLE_COLORS = {
  PM:           'bg-purple-100 text-purple-700',
  DESARROLLADOR:'bg-blue-100 text-blue-700',
  TESTER:       'bg-green-100 text-green-700',
  ANALISTA:     'bg-amber-100 text-amber-700',
  STAKEHOLDER:  'bg-slate-100 text-slate-600',
};

export default function MemberList({ projectId, isManager = true }) {
  const [members, setMembers]   = useState([]);
  const [users, setUsers]       = useState([]);
  const [form, setForm]         = useState({ project_id: projectId, user_id: '', role: 'DESARROLLADOR' });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [confirm, setConfirm]   = useState(null);

  const load = () => {
    Promise.all([projectsAPI.getMembers(projectId), projectsAPI.getUsers()])
      .then(([m, u]) => { setMembers(m.data); setUsers(u.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await projectsAPI.addMember(form);
      toast.success('Miembro agregado');
      setForm({ project_id: projectId, user_id: '', role: 'DESARROLLADOR' });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error al agregar');
    }
  };

  const changeRole = async (memberId, role) => {
    try {
      await projectsAPI.updateMember(memberId, { role });
      setMembers((all) => all.map((m) => m.id === memberId ? { ...m, role } : m));
      toast.success('Rol actualizado');
    } catch { toast.error('Error al cambiar rol'); }
  };

  const remove = (id, name) => setConfirm({
    title: 'Remover miembro',
    body: `¿Remover a ${name} del proyecto?`,
    danger: true,
    onConfirm: async () => {
      try { await projectsAPI.removeMember(id); load(); }
      catch { toast.error('Error al remover'); }
    },
  });

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  const memberUserIds = members.map((m) => m.user_id);
  const availableUsers = users.filter((u) => !memberUserIds.includes(u.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Equipo ({members.length})</h3>
        <div className="flex gap-2">
          {members.length > 0 && (
            <button onClick={() => downloadCSV(members, [
              { key: 'first_name', label: 'Nombre' },
              { key: 'last_name',  label: 'Apellido' },
              { key: 'email',      label: 'Email' },
              { key: 'role',       label: 'Rol' },
            ], 'equipo')}
              className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              <Download size={14} /> CSV
            </button>
          )}
          {isManager && (
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg">
              <Plus size={14} /> Agregar Miembro
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-slate-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Usuario *</label>
            <select required value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Seleccionar...</option>
              {availableUsers.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.username})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-3 py-2">Cancelar</button>
            <button type="submit" className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Agregar</button>
          </div>
        </form>
      )}

      {members.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">Sin miembros asignados</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                <User size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{m.first_name} {m.last_name}</p>
                <p className="text-xs text-slate-400">{m.email}</p>
              </div>
              {isManager ? (
                <select value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value)}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-shrink-0 ${ROLE_COLORS[m.role]}`}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[m.role]}`}>
                  {m.role}
                </span>
              )}
              {isManager && (
                <button onClick={() => remove(m.id, `${m.first_name} ${m.last_name}`)}
                  className="text-red-400 hover:text-red-600 flex-shrink-0 p-1 hover:bg-red-50 rounded transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
