import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { projectsAPI } from '../services/projectsAPI';
import Layout from '../components/Layout';
import { toast } from 'sonner';
import {
  CheckCircle2, Clock, AlertTriangle, Zap, FolderKanban,
  TrendingUp, ListTodo, ChevronRight, Activity, Users,
  CalendarDays, Flag, BarChart2, ArrowRight, Circle,
} from 'lucide-react';

// ── Constantes ──────────────────────────────────────────────────────────────
const STATUS_ACCENT = {
  INICIACION:    { bar: 'bg-indigo-500',  text: 'text-indigo-600',  badge: 'bg-indigo-100 text-indigo-700'  },
  PLANIFICACION: { bar: 'bg-violet-500',  text: 'text-violet-600',  badge: 'bg-violet-100 text-violet-700'  },
  EJECUCION:     { bar: 'bg-blue-500',    text: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700'      },
  MONITOREO:     { bar: 'bg-amber-500',   text: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700'    },
  CIERRE:        { bar: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700'},
  PAUSADO:       { bar: 'bg-slate-400',   text: 'text-slate-500',   badge: 'bg-slate-100 text-slate-600'    },
  CANCELADO:     { bar: 'bg-red-400',     text: 'text-red-500',     badge: 'bg-red-100 text-red-600'        },
};
const STATUS_LABEL = {
  INICIACION: 'Iniciación', PLANIFICACION: 'Planificación', EJECUCION: 'Ejecución',
  MONITOREO: 'Monitoreo', CIERRE: 'Cierre', PAUSADO: 'Pausado', CANCELADO: 'Cancelado',
};
const PRIORITY_STYLE = {
  CRITICA: { dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700',       label: 'Crítica'  },
  ALTA:    { dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700',   label: 'Alta'     },
  MEDIA:   { dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700',     label: 'Media'    },
  BAJA:    { dot: 'bg-slate-300',  badge: 'bg-slate-100 text-slate-600',   label: 'Baja'     },
};
const TASK_STATUS_STYLE = {
  PENDIENTE:   { dot: 'bg-slate-400', label: 'Pendiente'   },
  EN_PROGRESO: { dot: 'bg-blue-500',  label: 'En Progreso' },
  BLOQUEADA:   { dot: 'bg-red-500',   label: 'Bloqueada'   },
  COMPLETADA:  { dot: 'bg-emerald-500', label: 'Completada' },
};
const AVATAR_COLORS = [
  'bg-indigo-500','bg-violet-500','bg-blue-500','bg-emerald-500',
  'bg-amber-500', 'bg-rose-500',  'bg-teal-500','bg-cyan-500',
];
const ACTION_ICON = {
  'task.created':        { icon: ListTodo,      color: 'text-blue-500'    },
  'task.status_changed': { icon: CheckCircle2,  color: 'text-emerald-500' },
  'risk.created':        { icon: AlertTriangle, color: 'text-amber-500'   },
  'sprint.created':      { icon: Flag,          color: 'text-indigo-500'  },
  'project.created':     { icon: FolderKanban,  color: 'text-violet-500'  },
};

function avatarInitials(user) {
  if (!user) return '?';
  const fn = user.first_name || '';
  const ln = user.last_name  || '';
  return (fn[0] || '') + (ln[0] || '') || (user.username?.[0] || '?');
}
function greet(name) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return `${g}, ${name} 👋`;
}
function daysLeft(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr + 'T12:00:00') - new Date()) / 86400000);
  return diff;
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return `Hace ${Math.floor(diff / 86400)}d`;
}

// ── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'bg-indigo-500', textColor = 'text-indigo-600' }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 flex items-center gap-3">
      <div className={`${color} p-2.5 rounded-lg text-white flex-shrink-0`}><Icon size={18} /></div>
      <div className="min-w-0">
        <p className={`text-xl font-bold ${textColor} dark:text-slate-100`}>{value ?? 0}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function AlertBanner({ alerts }) {
  const [dismissed, setDismissed] = useState([]);
  if (!alerts?.length) return null;
  const visible = alerts.filter((_, i) => !dismissed.includes(i));
  if (!visible.length) return null;

  const severityStyles = {
    error:   'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  };
  const iconStyles = { error: 'text-red-500', warning: 'text-amber-500' };

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => dismissed.includes(i) ? null : (
        <div key={i}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${severityStyles[a.severity] || severityStyles.warning}`}>
          <AlertTriangle size={15} className={`flex-shrink-0 mt-0.5 ${iconStyles[a.severity] || iconStyles.warning}`} />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-slate-800 dark:text-slate-100">{a.title}:</span>{' '}
            <span className="text-slate-600 dark:text-slate-300">{a.body}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {a.link && (
              <Link to={a.link} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                Ver →
              </Link>
            )}
            <button onClick={() => setDismissed(p => [...p, i])}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectMiniCard({ project }) {
  const accent = STATUS_ACCENT[project.status] ?? STATUS_ACCENT.EJECUCION;
  const days   = daysLeft(project.planned_end_date);
  const pct    = Math.min(100, Math.max(0, project.completion_percentage ?? 0));

  let daysBadge = null;
  if (days !== null) {
    if (days < 0)      daysBadge = <span className="text-xs font-medium text-red-600">Vencido</span>;
    else if (days <= 7) daysBadge = <span className="text-xs font-medium text-amber-600">{days}d</span>;
    else                daysBadge = <span className="text-xs text-slate-400">{days}d</span>;
  }

  return (
    <Link to={`/projects/${project.id}`}
      className="group block bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700
                 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 overflow-hidden">
      {/* Progress bar top */}
      <div className="h-1 bg-slate-100 dark:bg-slate-700">
        <div className={`h-full ${accent.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-xs font-mono text-slate-400">{project.project_code ?? project.code}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${accent.badge}`}>
            {STATUS_LABEL[project.status] ?? project.status}
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1 transition-colors">
          {project.name}
        </p>
        {project.category_name && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: project.category_color || '#6366f1' }} />
            <p className="text-xs text-slate-400 truncate">{project.category_name}</p>
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-500">{pct}% completado</span>
          {daysBadge}
        </div>
      </div>
    </Link>
  );
}

function TaskRow({ task, onStatusChange, updating }) {
  const today  = new Date().toISOString().slice(0, 10);
  const isOver = task.due_date && task.due_date < today;
  const p      = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.BAJA;
  const s      = TASK_STATUS_STYLE[task.status] ?? TASK_STATUS_STYLE.PENDIENTE;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors
      ${isOver ? 'border-red-100 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/30'
               : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>

      {/* Priority dot */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${p.dot}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-1">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-slate-400">{task.project_code}</span>
          {task.due_date && (
            <span className={`text-xs ${isOver ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
              {isOver ? '⚠ ' : ''}{fmtDate(task.due_date)}
            </span>
          )}
          <span className={`flex items-center gap-1 text-xs`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            <span className="text-slate-400">{s.label}</span>
          </span>
        </div>
      </div>

      {/* Quick complete */}
      {task.status !== 'COMPLETADA' && (
        <button
          disabled={updating === task.id}
          onClick={() => onStatusChange(task, 'COMPLETADA')}
          title="Marcar como completada"
          className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-slate-300 dark:border-slate-600
                     hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20
                     flex items-center justify-center transition-colors group/btn">
          <CheckCircle2 size={14} className="text-slate-300 dark:text-slate-600 group-hover/btn:text-emerald-500 transition-colors" />
        </button>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user }     = useAuthStore();
  const navigate     = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const load = () => {
    setLoading(true);
    projectsAPI.getDashboard()
      .then((r) => setData(r.data))
      .catch(() => toast.error('Error al cargar el dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const changeStatus = async (task, newStatus) => {
    setUpdating(task.id);
    try {
      await projectsAPI.updateTask(task.id, { status: newStatus });
      toast.success('Tarea completada ✓');
      load();
    } catch { toast.error('Error al actualizar'); }
    finally  { setUpdating(null); }
  };

  const firstName = user?.first_name || user?.username || 'Usuario';
  const avatarColor = AVATAR_COLORS[(user?.id ?? 0) % AVATAR_COLORS.length];
  const initials    = avatarInitials(user);

  // ── Skeleton ──
  if (loading) return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-6 animate-pulse">
        <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="h-72 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    </Layout>
  );

  const ts       = data?.tasks_summary      ?? {};
  const tasks    = data?.urgent_tasks       ?? [];
  const projects = data?.my_projects        ?? [];
  const alerts   = data?.alerts             ?? [];
  const activity = data?.recent_activity    ?? [];
  const hoursW   = data?.hours_this_week    ?? 0;
  const completedW = data?.completed_week   ?? 0;

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-6">

        {/* ── Hero greeting ──────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-indigo-700 dark:to-violet-800 rounded-2xl p-5 sm:p-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{greet(firstName)}</h1>
            <p className="text-indigo-200 text-sm mt-1">
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {ts.en_progreso > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-indigo-100">
                  <Zap size={12} className="text-yellow-300" />
                  {ts.en_progreso} tarea{ts.en_progreso !== 1 ? 's' : ''} en progreso
                </span>
              )}
              {hoursW > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-indigo-100">
                  <Clock size={12} />
                  {hoursW}h esta semana
                </span>
              )}
              {completedW > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-indigo-100">
                  <CheckCircle2 size={12} className="text-emerald-300" />
                  {completedW} completada{completedW !== 1 ? 's' : ''} esta semana
                </span>
              )}
            </div>
          </div>
          <div className={`${avatarColor} w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg`}>
            {initials.toUpperCase()}
          </div>
        </div>

        {/* ── Alerts ─────────────────────────────────────────────────── */}
        {alerts.length > 0 && <AlertBanner alerts={alerts} />}

        {/* ── KPI strip ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={ListTodo}     label="Tareas activas"   value={ts.total}       color="bg-indigo-500" textColor="text-indigo-600" />
          <StatCard icon={Zap}          label="En progreso"      value={ts.en_progreso} color="bg-blue-500"   textColor="text-blue-600" />
          <StatCard icon={AlertTriangle}label="Bloqueadas"       value={ts.bloqueada}   color="bg-red-400"    textColor="text-red-600"
            sub={ts.overdue > 0 ? `${ts.overdue} vencida${ts.overdue !== 1 ? 's' : ''}` : undefined} />
          <StatCard icon={FolderKanban} label="Proyectos activos" value={projects.length} color="bg-emerald-500" textColor="text-emerald-600" />
        </div>

        {/* ── Two-column body ────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-5 gap-6">

          {/* ── Left: Mis tareas urgentes ─────── (col 3/5) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <ListTodo size={15} className="text-indigo-500" /> Mis tareas urgentes
                </h2>
                <Link to="/my-tasks" className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                  Ver todas <ArrowRight size={12} />
                </Link>
              </div>
              <div className="px-3 pb-3 space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">¡Sin tareas pendientes!</p>
                    <p className="text-xs text-slate-400 mt-0.5">Estás al día con todo.</p>
                  </div>
                ) : (
                  tasks.map((t) => (
                    <TaskRow key={t.id} task={t} onStatusChange={changeStatus} updating={updating} />
                  ))
                )}
              </div>
              {tasks.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2.5">
                  <Link to="/my-tasks"
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                    Ver las {ts.total} tareas activas <ChevronRight size={12} />
                  </Link>
                </div>
              )}
            </div>

            {/* ── Mis proyectos ─── */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FolderKanban size={15} className="text-indigo-500" /> Mis proyectos activos
                </h2>
                <Link to="/projects" className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                  Ver todos <ArrowRight size={12} />
                </Link>
              </div>
              <div className="px-3 pb-3">
                {projects.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderKanban size={28} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Sin proyectos activos asignados</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {projects.map((p) => <ProjectMiniCard key={p.id} project={p} />)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: actividad reciente ──── (col 2/5) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Quick actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Accesos rápidos</h2>
              <div className="space-y-2">
                {[
                  { label: 'Mis Tareas',   to: '/my-tasks',  icon: ListTodo,    color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' },
                  { label: 'Proyectos',    to: '/projects',  icon: FolderKanban, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
                  { label: 'Calendario',   to: '/calendar',  icon: CalendarDays, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
                  { label: 'Reportes',     to: '/reports',   icon: BarChart2,    color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
                ].map(({ label, to, icon: Icon, color }) => (
                  <Link key={to} to={to}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon size={15} />
                    </span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {label}
                    </span>
                    <ChevronRight size={13} className="ml-auto text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Actividad reciente */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
              <div className="px-4 pt-4 pb-2">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Activity size={15} className="text-indigo-500" /> Actividad reciente
                </h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {activity.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Sin actividad reciente</p>
                ) : (
                  activity.map((a, i) => {
                    const ai = ACTION_ICON[a.action] ?? { icon: Circle, color: 'text-slate-400' };
                    const IconC = ai.icon;
                    return (
                      <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <IconC size={14} className={`flex-shrink-0 mt-0.5 ${ai.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{a.description}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs text-indigo-500 font-medium">{a.project_code}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-xs text-slate-400">{timeAgo(a.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {activity.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2.5">
                  <Link to="/projects" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    Ver proyectos <ChevronRight size={12} />
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
}
