import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/projectsAPI';
import { useAuthStore } from '../stores/authStore';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'sonner';
import {
  Plus, Search, Edit2, UserX, UserCheck, X, Save, Eye, EyeOff, Shield
} from 'lucide-react';

const ROLES = ['ADMIN', 'DIRECTOR', 'PM', 'TEAM_MEMBER'];
const ROLE_LABELS = {
  ADMIN:       'Admin',
  DIRECTOR:    'Director',
  PM:          'Project Manager',
  TEAM_MEMBER: 'Team Member',
};
const ROLE_COLORS = {
  ADMIN:       'bg-red-100 text-red-700',
  DIRECTOR:    'bg-purple-100 text-purple-700',
  PM:          'bg-indigo-100 text-indigo-700',
  TEAM_MEMBER: 'bg-blue-100 text-blue-700',
};

const EMPTY_FORM = {
  username: '', email: '', password: '', first_name: '',
  last_name: '', phone: '', role: 'TEAM_MEMBER', position: '', department: '',
};

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = me?.role === 'ADMIN';

  // TEAM_MEMBER has no access to global user management
  useEffect(() => {
    if (me?.role === 'TEAM_MEMBER') navigate('/dashboard', { replace: true });
  }, [me]);

  const [users, setUsers]           = useState([]);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [showPass, setShowPass]     = useState(false);
  const [confirm, setConfirm]       = useState(null);

  const load = (s = search, r = roleFilter) => {
    const params = {};
    if (s) params.search = s;
    if (r) params.role   = r;
    projectsAPI.getUsers(params)
      .then((res) => setUsers(res.data))
      .catch(() => toast.error('Error al cargar usuarios'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { load(search, roleFilter); }, [search, roleFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      username: u.username, email: u.email, password: '',
      first_name: u.first_name || '', last_name: u.last_name || '',
      phone: u.phone || '', role: u.role,
      position: u.position || '', department: u.department || '',
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await projectsAPI.adminUpdateUser(editing.id, payload);
        toast.success('Usuario actualizado');
      } else {
        await projectsAPI.adminCreateUser(form);
        toast.success('Usuario creado');
      }
      closeModal();
      load();
    } catch (err) {
      const errors = err?.response?.data?.errors;
      if (errors) Object.values(errors).forEach((m) => toast.error(m));
      else toast.error(err?.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    try {
      if (u.is_active) {
        await projectsAPI.adminDeleteUser(u.id);
        toast.success('Usuario desactivado');
      } else {
        await projectsAPI.adminActivateUser(u.id);
        toast.success('Usuario activado');
      }
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error');
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Gestión de Usuarios</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{users.length} usuarios en total</p>
            </div>
          </div>
          {isAdmin && (
            <button onClick={openCreate}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm">
              <Plus size={16} /> Nuevo Usuario
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Buscar por nombre, usuario o email..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todos los roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando...</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rol</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cargo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  {isAdmin && <th className="px-4 py-3 w-24" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">Sin resultados</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                          {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100">{u.first_name} {u.last_name}</p>
                          <p className="text-xs text-slate-400">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{u.position || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(u)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Editar">
                            <Edit2 size={14} />
                          </button>
                          {u.id !== me?.id && (
                            <button
                              onClick={() => setConfirm({
                                title: u.is_active ? 'Desactivar usuario' : 'Activar usuario',
                                body: `¿${u.is_active ? 'Desactivar' : 'Activar'} a ${u.first_name || u.username}?`,
                                danger: u.is_active,
                                onConfirm: () => toggleActive(u),
                              })}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title={u.is_active ? 'Desactivar' : 'Activar'}>
                              {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">
                {editing ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
                  <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Apellido</label>
                  <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Usuario *</label>
                  <input required value={form.username} onChange={(e) => set('username', e.target.value)}
                    disabled={!!editing}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                  <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Contraseña {editing ? '(dejar vacío para no cambiar)' : '*'}
                  </label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'}
                      value={form.password} onChange={(e) => set('password', e.target.value)}
                      required={!editing}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
                  <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                    placeholder="+52 55 XXXX XXXX"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Rol del sistema</label>
                  <select value={form.role} onChange={(e) => set('role', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cargo / Puesto</label>
                  <input value={form.position} onChange={(e) => set('position', e.target.value)}
                    placeholder="Desarrollador Senior, QA Engineer..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Departamento</label>
                  <input value={form.department} onChange={(e) => set('department', e.target.value)}
                    placeholder="Ingeniería, QA, Consultoría..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  <Save size={14} />
                  {saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear usuario')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </Layout>
  );
}
