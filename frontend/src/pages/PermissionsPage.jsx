import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/projectsAPI';
import { useAuthStore } from '../stores/authStore';
import Layout from '../components/Layout';
import { toast } from 'sonner';
import {
  Shield, Users, Building2, BarChart2,
  Search, ChevronDown, Check, RefreshCw,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const SYSTEM_ROLES = ['ADMIN', 'DIRECTOR', 'PM', 'TEAM_MEMBER'];

const SYSTEM_ROLE_META = {
  ADMIN:       { label: 'Administrador', color: 'bg-red-100 text-red-700',      desc: 'Acceso total al sistema' },
  DIRECTOR:    { label: 'Director',      color: 'bg-purple-100 text-purple-700', desc: 'Dirige proyectos, ve todo' },
  PM:          { label: 'Project Manager', color: 'bg-blue-100 text-blue-700',  desc: 'Gestiona sprints y equipo' },
  TEAM_MEMBER: { label: 'Team Member',   color: 'bg-slate-100 text-slate-600',  desc: 'Ve solo sus tareas asignadas' },
};

const PROJECT_ROLE_META = {
  PM:           { label: 'PM',           color: 'bg-purple-100 text-purple-700' },
  DESARROLLADOR:{ label: 'Desarrollador',color: 'bg-blue-100 text-blue-700'    },
  TESTER:       { label: 'Tester',       color: 'bg-green-100 text-green-700'  },
  ANALISTA:     { label: 'Analista',     color: 'bg-amber-100 text-amber-700'  },
  STAKEHOLDER:  { label: 'Stakeholder',  color: 'bg-slate-100 text-slate-600'  },
};

const PROJECT_STATUS_COLOR = {
  INICIACION:    'bg-indigo-100 text-indigo-700',
  PLANIFICACION: 'bg-purple-100 text-purple-700',
  EJECUCION:     'bg-blue-100 text-blue-700',
  MONITOREO:     'bg-amber-100 text-amber-700',
  CIERRE:        'bg-emerald-100 text-emerald-700',
  PAUSADO:       'bg-slate-100 text-slate-600',
  CANCELADO:     'bg-red-100 text-red-700',
};

const TABS = [
  { id: 'roles',    label: 'Roles del Sistema', icon: Shield },
  { id: 'teams',    label: 'Equipos de Proyecto', icon: Users },
  { id: 'groups',   label: 'Departamentos',      icon: Building2 },
  { id: 'stats',    label: 'Resumen',            icon: BarChart2 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function RoleBadge({ role, type = 'system' }) {
  const meta = type === 'system' ? SYSTEM_ROLE_META[role] : PROJECT_ROLE_META[role];
  if (!meta) return <span className="text-xs text-slate-400">{role}</span>;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function Avatar({ first, last, size = 'md' }) {
  const initials = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center flex-shrink-0`}>
      {initials || '?'}
    </div>
  );
}

// ── Tab: Roles del Sistema ────────────────────────────────────────────────────

function SystemRolesTab({ users, onRoleChange }) {
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('');
  const [saving, setSaving]   = useState(null);

  const displayed = useMemo(() => {
    return users.filter((u) => {
      const matchSearch = !search ||
        `${u.first_name} ${u.last_name} ${u.username} ${u.email}`.toLowerCase().includes(search.toLowerCase());
      const matchRole = !filter || u.role === filter;
      return matchSearch && matchRole;
    });
  }, [users, search, filter]);

  const handleChange = async (user, newRole) => {
    if (newRole === user.role) return;
    setSaving(user.id);
    try {
      await projectsAPI.adminUpdateUser(user.id, { role: newRole });
      onRoleChange(user.id, newRole);
      toast.success(`Rol de ${user.first_name} actualizado a ${SYSTEM_ROLE_META[newRole]?.label}`);
    } catch {
      toast.error('Error al actualizar el rol');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">Todos los roles</option>
          {SYSTEM_ROLES.map((r) => (
            <option key={r} value={r}>{SYSTEM_ROLE_META[r].label}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400">{displayed.length} usuario{displayed.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Role definitions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        {SYSTEM_ROLES.map((r) => {
          const meta  = SYSTEM_ROLE_META[r];
          const count = users.filter((u) => u.role === r).length;
          return (
            <button key={r} onClick={() => setFilter(filter === r ? '' : r)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                filter === r ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
              <p className="text-xs text-slate-500 mt-1.5">{meta.desc}</p>
              <p className="text-lg font-bold text-slate-800 mt-1">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Email</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Departamento</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Rol del Sistema</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayed.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Sin resultados</td></tr>
            ) : displayed.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar first={u.first_name} last={u.last_name} />
                    <div>
                      <p className="font-medium text-slate-800">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-slate-400">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{u.email}</td>
                <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{u.department || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {saving === u.id ? (
                    <RefreshCw size={14} className="animate-spin text-indigo-500" />
                  ) : (
                    <div className="relative inline-block">
                      <select value={u.role || 'TEAM_MEMBER'}
                        onChange={(e) => handleChange(u, e.target.value)}
                        className={`text-xs font-semibold pl-2 pr-6 py-1 rounded-full border-0 cursor-pointer
                          focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none
                          ${SYSTEM_ROLE_META[u.role]?.color ?? 'bg-slate-100 text-slate-600'}`}>
                        {SYSTEM_ROLES.map((r) => (
                          <option key={r} value={r}>{SYSTEM_ROLE_META[r].label}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Equipos de Proyecto ──────────────────────────────────────────────────

function TeamsTab({ teams, loading }) {
  const [search, setSearch] = useState('');

  // Group by project
  const byProject = useMemo(() => {
    const map = {};
    teams.forEach((m) => {
      if (!map[m.project_id]) {
        map[m.project_id] = {
          project_id: m.project_id,
          project_name: m.project_name,
          project_code: m.project_code,
          project_status: m.project_status,
          members: [],
        };
      }
      map[m.project_id].members.push(m);
    });
    return Object.values(map).filter((p) => {
      if (!search) return true;
      return p.project_name.toLowerCase().includes(search.toLowerCase()) ||
        p.members.some((m) => `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase()));
    });
  }, [teams, search]);

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Cargando equipos...</p>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proyecto o persona..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <span className="text-xs text-slate-400">{byProject.length} proyecto{byProject.length !== 1 ? 's' : ''}</span>
      </div>

      {byProject.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-10">Sin equipos de proyecto activos</p>
      ) : (
        <div className="space-y-4">
          {byProject.map((proj) => (
            <div key={proj.project_id} className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Project header */}
              <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">{proj.project_code}</span>
                  <span className="font-semibold text-slate-800 text-sm">{proj.project_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PROJECT_STATUS_COLOR[proj.project_status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {proj.project_status}
                  </span>
                  <span className="text-xs text-slate-400">{proj.members.length} miembro{proj.members.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Members */}
              <div className="divide-y divide-slate-100">
                {proj.members.map((m) => (
                  <div key={m.id} className="px-4 py-2.5 flex items-center gap-3">
                    <Avatar first={m.first_name} last={m.last_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{m.first_name} {m.last_name}</p>
                      <p className="text-xs text-slate-400 truncate">{m.email}</p>
                    </div>
                    <RoleBadge role={m.project_role} type="project" />
                    <RoleBadge role={m.system_role} type="system" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Departamentos (Grupos) ───────────────────────────────────────────────

function GroupsTab({ users }) {
  const [search, setSearch] = useState('');

  const byDept = useMemo(() => {
    const filtered = users.filter((u) => {
      if (!search) return true;
      return `${u.first_name} ${u.last_name} ${u.department ?? ''}`.toLowerCase().includes(search.toLowerCase());
    });
    const map = {};
    filtered.forEach((u) => {
      const dept = u.department?.trim() || 'Sin departamento';
      if (!map[dept]) map[dept] = [];
      map[dept].push(u);
    });
    return Object.entries(map).sort(([a], [b]) => {
      if (a === 'Sin departamento') return 1;
      if (b === 'Sin departamento') return -1;
      return a.localeCompare(b);
    });
  }, [users, search]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar persona o departamento..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <span className="text-xs text-slate-400">{byDept.length} grupo{byDept.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-4">
        {byDept.map(([dept, members]) => (
          <div key={dept} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-slate-400" />
                <span className="font-semibold text-slate-700 text-sm">{dept}</span>
              </div>
              <span className="text-xs text-slate-400">{members.length} miembro{members.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-0 divide-slate-100">
              {members.map((u) => (
                <div key={u.id} className="px-4 py-2.5 flex items-center gap-3 border-b border-slate-100 last:border-0">
                  <Avatar first={u.first_name} last={u.last_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{u.first_name} {u.last_name}</p>
                    <p className="text-xs text-slate-400 truncate">{u.position || u.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <RoleBadge role={u.role} type="system" />
                    {!u.is_active && (
                      <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">Inactivo</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Resumen / Stats ──────────────────────────────────────────────────────

function StatsTab({ users, teams }) {
  const byRole = SYSTEM_ROLES.map((r) => ({
    role: r,
    meta: SYSTEM_ROLE_META[r],
    count: users.filter((u) => u.role === r).length,
    active: users.filter((u) => u.role === r && u.is_active).length,
  }));

  const projectSet = new Set(teams.map((t) => t.project_id));
  const byProjectRole = Object.entries(
    teams.reduce((acc, t) => {
      acc[t.project_role] = (acc[t.project_role] || 0) + 1;
      return acc;
    }, {})
  ).sort(([, a], [, b]) => b - a);

  const topUsers = Object.entries(
    teams.reduce((acc, t) => {
      const key = `${t.user_id}`;
      if (!acc[key]) acc[key] = { ...t, count: 0 };
      acc[key].count++;
      return acc;
    }, {})
  )
    .map(([, v]) => v)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Usuarios totales',   value: users.length,                              color: 'bg-indigo-100 text-indigo-700' },
          { label: 'Usuarios activos',   value: users.filter((u) => u.is_active).length,   color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Proyectos con equipo', value: projectSet.size,                          color: 'bg-blue-100 text-blue-700' },
          { label: 'Asignaciones totales', value: teams.length,                             color: 'bg-amber-100 text-amber-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* System roles breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Roles del Sistema</h3>
          <div className="space-y-3">
            {byRole.map(({ role, meta, count, active }) => (
              <div key={role} className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-28 text-center ${meta.color}`}>
                  {meta.label}
                </span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: users.length ? `${(count / users.length) * 100}%` : '0%' }} />
                </div>
                <span className="text-sm font-semibold text-slate-700 w-6 text-right">{count}</span>
                <span className="text-xs text-slate-400 w-14">({active} activos)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Project roles breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Roles en Proyectos</h3>
          <div className="space-y-3">
            {byProjectRole.map(([role, count]) => {
              const meta = PROJECT_ROLE_META[role];
              return (
                <div key={role} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-28 text-center ${meta?.color ?? 'bg-slate-100 text-slate-600'}`}>
                    {meta?.label ?? role}
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full transition-all"
                      style={{ width: teams.length ? `${(count / teams.length) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 w-6 text-right">{count}</span>
                </div>
              );
            })}
            {byProjectRole.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Sin asignaciones de proyecto</p>
            )}
          </div>
        </div>
      </div>

      {/* Most active members */}
      {topUsers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Miembros con más proyectos</h3>
          <div className="space-y-2">
            {topUsers.map((u, i) => (
              <div key={u.user_id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                <Avatar first={u.first_name} last={u.last_name} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{u.first_name} {u.last_name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={u.system_role} type="system" />
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {u.count} proyecto{u.count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const { user }   = useAuthStore();
  const navigate   = useNavigate();
  const [tab, setTab]         = useState('roles');
  const [users, setUsers]     = useState([]);
  const [teams, setTeams]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'ADMIN') { navigate('/dashboard'); return; }

    projectsAPI.getUsers()
      .then((r) => setUsers(r.data))
      .catch(() => toast.error('Error al cargar usuarios'))
      .finally(() => setLoading(false));

    projectsAPI.adminGetTeams()
      .then((r) => setTeams(r.data))
      .catch(() => toast.error('Error al cargar equipos'))
      .finally(() => setTeamsLoading(false));
  }, []);

  const handleRoleChange = (userId, newRole) => {
    setUsers((all) => all.map((u) => u.id === userId ? { ...u, role: newRole } : u));
  };

  const reload = () => {
    setLoading(true);
    setTeamsLoading(true);
    Promise.all([
      projectsAPI.getUsers().then((r) => setUsers(r.data)),
      projectsAPI.adminGetTeams().then((r) => setTeams(r.data)),
    ])
      .catch(() => toast.error('Error al recargar'))
      .finally(() => { setLoading(false); setTeamsLoading(false); });
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Permisos y Roles</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de roles del sistema, equipos y grupos de la organización</p>
            </div>
          </div>
          <button onClick={reload}
            className="flex items-center gap-1.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">Cargando...</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
                    ${tab === id
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === 'roles'  && <SystemRolesTab users={users} onRoleChange={handleRoleChange} />}
              {tab === 'teams'  && <TeamsTab teams={teams} loading={teamsLoading} />}
              {tab === 'groups' && <GroupsTab users={users} />}
              {tab === 'stats'  && <StatsTab users={users} teams={teams} />}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
