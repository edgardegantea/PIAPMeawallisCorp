import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { projectsAPI } from '../services/projectsAPI';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'sonner';
import {
  FolderKanban, CheckCircle, AlertTriangle, TrendingUp, Zap,
  Users, UserPlus, Search, Edit2, UserX, UserCheck, X, Save,
  Eye, EyeOff, Shield, Briefcase, Building2, Phone, Mail,
  ChevronUp, ChevronDown, ChevronsUpDown, CalendarDays, Clock,
  ListTodo,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

// ─── Constantes ────────────────────────────────────────────
const STATUS_COLORS = {
  INICIACION: '#6366f1', PLANIFICACION: '#8b5cf6', EJECUCION: '#3b82f6',
  MONITOREO: '#f59e0b', CIERRE: '#10b981', PAUSADO: '#94a3b8', CANCELADO: '#ef4444',
};
const STATUS_LABELS = {
  INICIACION: 'Iniciación', PLANIFICACION: 'Planificación', EJECUCION: 'Ejecución',
  MONITOREO: 'Monitoreo', CIERRE: 'Cierre', PAUSADO: 'Pausado', CANCELADO: 'Cancelado',
};

const TEAM_ROLES  = ['ADMIN', 'DIRECTOR', 'PM', 'TEAM_MEMBER'];
const ROLE_LABELS = { ADMIN: 'Admin', DIRECTOR: 'Director', PM: 'Project Manager', TEAM_MEMBER: 'Team Member' };
const ROLE_COLORS = {
  ADMIN:       { badge: 'bg-red-100 text-red-700',      dot: 'bg-red-500',    avatar: 'bg-red-500' },
  DIRECTOR:    { badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500', avatar: 'bg-purple-500' },
  PM:          { badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500', avatar: 'bg-indigo-500' },
  TEAM_MEMBER: { badge: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400',   avatar: 'bg-blue-400' },
};

const EMPTY_FORM = {
  username: '', email: '', password: '', first_name: '',
  last_name: '', phone: '', role: 'TEAM_MEMBER', position: '', department: '',
};

const PAGE_SIZE = 10;

// ─── Componente principal ───────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin  = user?.role === 'ADMIN';
  const canManage = ['ADMIN', 'DIRECTOR'].includes(user?.role);

  // ── Dashboard stats ──────────────────────────────────────
  const [stats, setStats]       = useState(null);
  const [projects, setProjects] = useState([]);
  const [velocity, setVelocity] = useState([]);
  const [dashLoading, setDashLoading] = useState(true);

  // ── Upcoming tasks (next 7 days) ─────────────────────────
  const [upcoming, setUpcoming]         = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);

  // ── Team ─────────────────────────────────────────────────
  const [members, setMembers]         = useState([]);
  const [teamSearch, setTeamSearch]   = useState('');
  const [roleFilter, setRoleFilter]   = useState('');
  const [teamLoading, setTeamLoading] = useState(true);
  const [sortField, setSortField]     = useState('first_name');
  const [sortDir, setSortDir]         = useState('asc');
  const [page, setPage]               = useState(1);

  // ── Modal crear/editar ───────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [showPass, setShowPass]   = useState(false);

  // ── Confirm modal ────────────────────────────────────────
  const [confirm, setConfirm] = useState(null);

  // ─────────────────────────────────────────────────────────

  const loadTeam = (search = teamSearch, role = roleFilter) => {
    setTeamLoading(true);
    const params = {};
    if (search) params.search = search;
    if (role)   params.role   = role;
    projectsAPI.getUsers(params)
      .then((r) => { setMembers(r.data); setPage(1); })
      .catch(() => {})
      .finally(() => setTeamLoading(false));
  };

  useEffect(() => {
    Promise.all([
      projectsAPI.getStatistics(),
      projectsAPI.getProjects(),
    ]).then(async ([s, p]) => {
      setStats(s.data);
      setProjects(p.data.slice(0, 5));
      const first = p.data.find((pr) => pr.status === 'EJECUCION') || p.data[0];
      if (first) {
        try {
          const vr = await projectsAPI.getSprintVelocity(first.id);
          setVelocity(vr.data.slice(-6));
        } catch { /* sin sprints */ }
      }
    }).finally(() => setDashLoading(false));

    loadTeam('', '');

    // Upcoming tasks (next 7 days)
    projectsAPI.getMyTasks({})
      .then((r) => {
        const today7 = new Date();
        today7.setDate(today7.getDate() + 7);
        today7.setHours(23, 59, 59, 999);
        const filtered = (r.data || [])
          .filter((t) => t.due_date && new Date(t.due_date) <= today7)
          .sort((a, b) => a.due_date.localeCompare(b.due_date))
          .slice(0, 8);
        setUpcoming(filtered);
      })
      .catch(() => {})
      .finally(() => setUpcomingLoading(false));
  }, []);

  // Debounce search
  const searchTimer = useRef(null);
  const handleSearch = (val) => {
    setTeamSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadTeam(val, roleFilter), 300);
  };
  const handleRoleFilter = (val) => {
    setRoleFilter(val);
    loadTeam(teamSearch, val);
  };

  // ── Sort ─────────────────────────────────────────────────
  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = [...members].sort((a, b) => {
    const va = (a[sortField] || '').toString().toLowerCase();
    const vb = (b[sortField] || '').toString().toLowerCase();
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Modal helpers ────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowPass(false);
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      username:   u.username,
      email:      u.email,
      password:   '',
      first_name: u.first_name   || '',
      last_name:  u.last_name    || '',
      phone:      u.phone        || '',
      role:       u.role,
      position:   u.position     || '',
      department: u.department   || '',
    });
    setShowPass(false);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const submitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await projectsAPI.adminUpdateUser(editing.id, payload);
        toast.success('Miembro actualizado');
      } else {
        await projectsAPI.adminCreateUser(form);
        toast.success('Miembro creado');
      }
      closeModal();
      setTeamSearch('');
      setRoleFilter('');
      loadTeam('', '');
    } catch (err) {
      const errors = err?.response?.data?.errors;
      if (errors) Object.values(errors).forEach((m) => toast.error(m));
      else toast.error(err?.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const toggleActive = (u) => setConfirm({
    title:     u.is_active ? 'Desactivar miembro' : 'Activar miembro',
    body:      `¿${u.is_active ? 'Desactivar' : 'Activar'} a ${u.first_name || u.username}?`,
    danger:    !!u.is_active,
    onConfirm: async () => {
      try {
        if (u.is_active) await projectsAPI.adminDeleteUser(u.id);
        else             await projectsAPI.adminActivateUser(u.id);
        toast.success(u.is_active ? 'Miembro desactivado' : 'Miembro activado');
        loadTeam('', '');
        setTeamSearch('');
        setRoleFilter('');
      } catch (err) { toast.error(err?.response?.data?.message || 'Error'); }
    },
  });

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ── Computed ─────────────────────────────────────────────
  const activeMembers = members.filter((m) => m.is_active);
  const roleCounts    = TEAM_ROLES.reduce((acc, r) => {
    acc[r] = activeMembers.filter((m) => m.role === r).length;
    return acc;
  }, {});

  const chartData = stats?.by_status?.map((s) => ({
    name:  STATUS_LABELS[s.status] || s.status,
    value: parseInt(s.count),
    color: STATUS_COLORS[s.status] || '#94a3b8',
  })) || [];

  const projCards = [
    { label: 'Total Proyectos', value: stats?.total ?? '—',   icon: FolderKanban, color: 'bg-indigo-500' },
    { label: 'En Ejecución',    value: stats?.by_status?.find(s => s.status === 'EJECUCION')?.count ?? 0, icon: TrendingUp, color: 'bg-blue-500' },
    { label: 'Vencidos',        value: stats?.overdue ?? 0,    icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Cerrados',        value: stats?.by_status?.find(s => s.status === 'CIERRE')?.count ?? 0, icon: CheckCircle, color: 'bg-emerald-500' },
  ];

  // ── Sort icon helper ─────────────────────────────────────
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown size={13} className="text-slate-300 ml-0.5" />;
    return sortDir === 'asc'
      ? <ChevronUp   size={13} className="text-indigo-500 ml-0.5" />
      : <ChevronDown size={13} className="text-indigo-500 ml-0.5" />;
  };

  // ────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-6">

        {/* ── Encabezado ─────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Bienvenido, {user?.first_name || user?.username} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Vista general de proyectos y equipo</p>
        </div>

        {dashLoading ? (
          <div className="text-center py-20 text-slate-400">Cargando...</div>
        ) : (
          <>
            {/* ── KPI cards ────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {projCards.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5 flex items-center gap-4">
                  <div className={`${color} p-3 rounded-lg text-white flex-shrink-0`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Charts ───────────────────────────────── */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
                <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">Proyectos por Estado</h2>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-sm text-center py-8">Sin datos aún</p>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={16} className="text-indigo-500" />
                  <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Velocidad de Sprints</h2>
                </div>
                {velocity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={velocity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="sprint_name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="h" />
                      <Tooltip formatter={(v, n) => [`${v}h`, n === 'completed_hours' ? 'Completadas' : 'Total']} />
                      <Bar dataKey="total_hours"     fill="#e2e8f0" radius={[4,4,0,0]} name="total_hours" />
                      <Bar dataKey="completed_hours" fill="#6366f1" radius={[4,4,0,0]} name="completed_hours" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-sm text-center py-8">Sin sprints con datos aún.</p>
                )}
              </div>
            </div>

            {/* ── Proyectos recientes ───────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">Proyectos Recientes</h2>
                <Link to="/projects" className="text-xs text-indigo-600 hover:underline">Ver todos →</Link>
              </div>
              {projects.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Sin proyectos aún</p>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                  {projects.map((p) => (
                    <Link key={p.id} to={`/projects/${p.id}`}
                      className="flex items-center gap-4 py-3 px-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors group">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: STATUS_COLORS[p.status] || '#94a3b8' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-400 transition-colors">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.code} · {STATUS_LABELS[p.status]}</p>
                      </div>
                      <div className="w-28 flex-shrink-0">
                        <div className="flex justify-end text-xs text-slate-400 mb-0.5">
                          <span className="font-medium">{p.completion_percentage}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${p.completion_percentage}%`, background: STATUS_COLORS[p.status] || '#6366f1' }} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Próximos vencimientos ────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-indigo-500" />
              <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                Próximos Vencimientos
              </h2>
            </div>
            <Link to="/my-tasks"
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              <ListTodo size={12} /> Ver todas →
            </Link>
          </div>
          {upcomingLoading ? (
            <p className="text-slate-400 text-sm text-center py-6">Cargando...</p>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle size={32} className="mx-auto text-emerald-300 mb-2" />
              <p className="text-slate-500 text-sm">Sin tareas con vencimiento en los próximos 7 días 🎉</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
              {upcoming.map((t) => {
                const dueDate  = new Date(t.due_date);
                const today0   = new Date(); today0.setHours(0,0,0,0);
                const diffDays = Math.ceil((dueDate - today0) / 86400000);
                const isOverdue = diffDays < 0;
                const isDueToday = diffDays === 0;
                const isDueSoon  = diffDays <= 2 && diffDays >= 0;

                return (
                  <Link key={t.id}
                    to={`/projects/${t.project_id}?tab=kanban`}
                    className="flex items-center gap-3 py-2.5 px-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    {/* Due badge */}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${
                      isOverdue  ? 'bg-red-100 text-red-700'
                      : isDueToday ? 'bg-amber-100 text-amber-700'
                      : isDueSoon  ? 'bg-orange-100 text-orange-700'
                      : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isOverdue
                        ? `${Math.abs(diffDays)}d vencida`
                        : isDueToday ? 'Hoy'
                        : `${diffDays}d`}
                    </span>
                    {/* Task title */}
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 truncate">
                      {t.title}
                    </span>
                    {/* Project */}
                    <span className="text-xs text-slate-400 font-mono flex-shrink-0">
                      {t.project_code}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════
            SECCIÓN: GESTIÓN DEL EQUIPO
        ════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">

          {/* ── Header ────────────────────────────────── */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                  <Users size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {user?.role === 'TEAM_MEMBER' ? 'Mi Equipo' : 'Equipo de Trabajo'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeMembers.length} miembro{activeMembers.length !== 1 ? 's' : ''}
                    {user?.role !== 'TEAM_MEMBER' && members.length !== activeMembers.length
                      ? ` · ${members.length - activeMembers.length} inactivo${members.length - activeMembers.length !== 1 ? 's' : ''}`
                      : ''}
                    {user?.role !== 'TEAM_MEMBER' && ` · ${members.length} en total`}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <button onClick={openCreate}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700
                    text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0">
                  <UserPlus size={15} /> Nuevo Miembro
                </button>
              )}
            </div>

            {/* ── Chips de roles / stats ─────────────── */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {TEAM_ROLES.filter((r) => roleCounts[r] > 0).map((r) => {
                const rc  = ROLE_COLORS[r];
                const active = roleFilter === r;
                return (
                  <button key={r} onClick={() => handleRoleFilter(active ? '' : r)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                      border transition-all
                      ${active
                        ? `${rc.badge} border-current shadow-sm scale-105`
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
                    {ROLE_LABELS[r]}
                    <span className={`ml-0.5 font-bold ${active ? '' : 'text-slate-400'}`}>
                      {roleCounts[r]}
                    </span>
                  </button>
                );
              })}
              {roleFilter && (
                <button onClick={() => handleRoleFilter('')}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={11} /> Limpiar filtro
                </button>
              )}
            </div>
          </div>

          {/* ── Barra de búsqueda ─────────────────────── */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={teamSearch}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar por nombre, usuario o correo..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400" />
              {teamSearch && (
                <button onClick={() => { setTeamSearch(''); loadTeam('', roleFilter); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">
              {sorted.length} resultado{sorted.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ── Tabla ─────────────────────────────────── */}
          {teamLoading ? (
            <div className="text-center py-16 text-slate-400">Cargando equipo...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users size={36} className="mx-auto mb-3 opacity-25" />
              <p className="text-sm font-medium">
                {teamSearch || roleFilter ? 'Sin resultados para los filtros aplicados' : 'Sin miembros registrados'}
              </p>
              {isAdmin && !teamSearch && !roleFilter && (
                <button onClick={openCreate}
                  className="mt-3 text-sm text-indigo-600 hover:underline">
                  Agregar el primer miembro
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3">
                        <button onClick={() => toggleSort('first_name')}
                          className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700">
                          Miembro <SortIcon field="first_name" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3">
                        <button onClick={() => toggleSort('role')}
                          className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700">
                          Rol <SortIcon field="role" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3">
                        <button onClick={() => toggleSort('position')}
                          className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700">
                          Cargo / Depto <SortIcon field="position" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Contacto
                      </th>
                      <th className="text-left px-4 py-3">
                        <button onClick={() => toggleSort('is_active')}
                          className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700">
                          Estado <SortIcon field="is_active" />
                        </button>
                      </th>
                      {isAdmin && (
                        <th className="px-4 py-3 w-28 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">
                          Acciones
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginated.map((m) => {
                      const rc       = ROLE_COLORS[m.role] ?? ROLE_COLORS.TEAM_MEMBER;
                      const initials = ((m.first_name?.[0] || '') + (m.last_name?.[0] || '')).toUpperCase()
                        || m.username?.[0]?.toUpperCase() || '?';

                      return (
                        <tr key={m.id}
                          className={`hover:bg-slate-50 transition-colors ${!m.is_active ? 'opacity-50' : ''}`}>

                          {/* Miembro */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center
                                text-sm font-bold text-white flex-shrink-0 ${rc.avatar}`}>
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 truncate leading-snug">
                                  {m.first_name || ''} {m.last_name || ''}
                                  {!m.first_name && !m.last_name && (
                                    <span className="text-slate-500">{m.username}</span>
                                  )}
                                </p>
                                <p className="text-xs text-slate-400 truncate">@{m.username}</p>
                              </div>
                            </div>
                          </td>

                          {/* Rol */}
                          <td className="px-4 py-3">
                            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${rc.badge}`}>
                              {ROLE_LABELS[m.role] ?? m.role}
                            </span>
                          </td>

                          {/* Cargo / Depto */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              {m.position && (
                                <p className="flex items-center gap-1 text-xs text-slate-700 truncate max-w-[180px]">
                                  <Briefcase size={11} className="text-slate-400 flex-shrink-0" />
                                  {m.position}
                                </p>
                              )}
                              {m.department && (
                                <p className="flex items-center gap-1 text-xs text-slate-500 truncate max-w-[180px]">
                                  <Building2 size={11} className="text-slate-400 flex-shrink-0" />
                                  {m.department}
                                </p>
                              )}
                              {!m.position && !m.department && (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </div>
                          </td>

                          {/* Contacto */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              <p className="flex items-center gap-1 text-xs text-slate-600 truncate max-w-[200px]">
                                <Mail size={11} className="text-slate-400 flex-shrink-0" />
                                <a href={`mailto:${m.email}`}
                                  className="hover:text-indigo-600 hover:underline truncate"
                                  onClick={(e) => e.stopPropagation()}>
                                  {m.email}
                                </a>
                              </p>
                              {m.phone && (
                                <p className="flex items-center gap-1 text-xs text-slate-500">
                                  <Phone size={11} className="text-slate-400 flex-shrink-0" />
                                  {m.phone}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Estado */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full
                              ${m.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {m.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>

                          {/* Acciones (admin) */}
                          {isAdmin && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEdit(m)}
                                  title="Editar información"
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                  <Edit2 size={14} />
                                </button>
                                {m.id !== user?.id && (
                                  <button
                                    onClick={() => toggleActive(m)}
                                    title={m.is_active ? 'Desactivar' : 'Activar'}
                                    className={`p-1.5 rounded-lg transition-colors
                                      ${m.is_active
                                        ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                                    {m.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Paginación ─────────────────────────── */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Página {page} de {totalPages} · {sorted.length} registros
                  </span>
                  <div className="flex items-center gap-1">
                    <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50
                        disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      Anterior
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const pageNum = totalPages <= 5
                        ? i + 1
                        : page <= 3 ? i + 1
                        : page >= totalPages - 2 ? totalPages - 4 + i
                        : page - 2 + i;
                      return (
                        <button key={pageNum} onClick={() => setPage(pageNum)}
                          className={`w-8 h-7 text-xs rounded-lg transition-colors
                            ${page === pageNum
                              ? 'bg-indigo-600 text-white font-medium'
                              : 'border border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                          {pageNum}
                        </button>
                      );
                    })}
                    <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50
                        disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Footer ────────────────────────────────── */}
          <div className="px-6 py-3 border-t border-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {sorted.length} resultado{sorted.length !== 1 ? 's' : ''}
              {(teamSearch || roleFilter) && (
                <button onClick={() => { setTeamSearch(''); handleRoleFilter(''); }}
                  className="ml-2 text-indigo-500 hover:text-indigo-700 hover:underline">
                  Limpiar filtros
                </button>
              )}
            </span>
            {isAdmin && (
              <Link to="/users"
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline">
                <Shield size={12} /> Gestión avanzada →
              </Link>
            )}
          </div>
        </div>

      </div>

      {/* ════════════════ MODAL CREAR / EDITAR ════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                  ${editing ? 'bg-indigo-100' : 'bg-emerald-100'}`}>
                  {editing
                    ? <Edit2 size={16} className="text-indigo-600" />
                    : <UserPlus size={16} className="text-emerald-600" />}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-800">
                    {editing ? 'Editar Miembro' : 'Nuevo Miembro del Equipo'}
                  </h2>
                  {editing && (
                    <p className="text-xs text-slate-400">
                      @{editing.username}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={closeModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitForm} className="p-6 space-y-6">

              {/* ── Datos personales ──────────────────── */}
              <section>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Datos Personales
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
                    <input value={form.first_name} onChange={(e) => setF('first_name', e.target.value)}
                      placeholder="Juan"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                        focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Apellido</label>
                    <input value={form.last_name} onChange={(e) => setF('last_name', e.target.value)}
                      placeholder="Pérez"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                        focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Usuario <span className="text-red-500">*</span>
                    </label>
                    <input required value={form.username}
                      onChange={(e) => setF('username', e.target.value)}
                      disabled={!!editing}
                      placeholder="juan.perez"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                        focus:outline-none focus:ring-2 focus:ring-indigo-500
                        disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed" />
                    {editing && (
                      <p className="text-xs text-slate-400 mt-0.5">El usuario no puede modificarse</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="tel" value={form.phone} onChange={(e) => setF('phone', e.target.value)}
                        placeholder="+52 55 XXXX XXXX"
                        className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Correo electrónico <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="email" required value={form.email}
                        onChange={(e) => setF('email', e.target.value)}
                        placeholder="juan@empresa.com"
                        className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Rol y área ────────────────────────── */}
              <section>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Rol y Área
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Rol del sistema</label>
                    <select value={form.role} onChange={(e) => setF('role', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      {TEAM_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Cargo / Puesto</label>
                    <div className="relative">
                      <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={form.position} onChange={(e) => setF('position', e.target.value)}
                        placeholder="Desarrollador Senior"
                        className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Departamento</label>
                    <div className="relative">
                      <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={form.department} onChange={(e) => setF('department', e.target.value)}
                        placeholder="Ingeniería, QA, Consultoría..."
                        className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Contraseña ────────────────────────── */}
              <section>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Contraseña
                  {editing && (
                    <span className="ml-1 font-normal normal-case text-slate-400">
                      (dejar vacío para no cambiar)
                    </span>
                  )}
                </p>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setF('password', e.target.value)}
                    required={!editing}
                    placeholder={editing ? '••••••••' : 'Mínimo 8 caracteres'}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm
                      focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </section>

              {/* ── Botones ───────────────────────────── */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={closeModal}
                  className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg
                    hover:bg-slate-100 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700
                    disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg
                    transition-colors">
                  <Save size={14} />
                  {saving ? 'Guardando...' : (editing ? 'Guardar Cambios' : 'Crear Miembro')}
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
