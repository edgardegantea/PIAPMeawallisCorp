import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import {
  Users, CheckCircle2, Clock, AlertOctagon, CircleDot,
  ChevronDown, ChevronUp, TrendingUp,
} from 'lucide-react';

const STATUS_META = {
  COMPLETADA:  { label: 'Completadas', color: '#10b981', bg: 'bg-emerald-100 text-emerald-700',  dot: 'bg-emerald-500' },
  EN_PROGRESO: { label: 'En progreso', color: '#6366f1', bg: 'bg-indigo-100 text-indigo-700',    dot: 'bg-indigo-500'  },
  PENDIENTE:   { label: 'Pendientes',  color: '#94a3b8', bg: 'bg-slate-100 text-slate-600',      dot: 'bg-slate-300'   },
  BLOQUEADA:   { label: 'Bloqueadas',  color: '#ef4444', bg: 'bg-red-100 text-red-700',          dot: 'bg-red-400'     },
};

const PRIORITY_DOT = {
  CRITICA: 'bg-red-500',
  ALTA:    'bg-orange-400',
  MEDIA:   'bg-yellow-400',
  BAJA:    'bg-slate-300',
};

function TaskChip({ task }) {
  const sm = STATUS_META[task.status] ?? STATUS_META.PENDIENTE;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600 text-xs">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sm.dot}`} />
      <span className="truncate text-slate-700 dark:text-slate-200 flex-1 min-w-0">{task.title}</span>
      {task.due_date && (
        <span className={`flex-shrink-0 ${isOverdue ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
          {new Date(task.due_date).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
        </span>
      )}
      {task.sprint_name && (
        <span className="flex-shrink-0 text-slate-400 hidden sm:inline">{task.sprint_name}</span>
      )}
    </div>
  );
}

function MemberRow({ m, maxTasks }) {
  const [expanded, setExpanded] = useState(false);
  const initials = ((m.first_name?.[0] || '') + (m.last_name?.[0] || '')).toUpperCase() || '?';
  const barW     = maxTasks > 0 ? (m.tasks_total / maxTasks) * 100 : 0;
  const doneW    = m.tasks_total > 0 ? (m.tasks_done        / m.tasks_total) * 100 : 0;
  const inProgW  = m.tasks_total > 0 ? (m.tasks_in_progress / m.tasks_total) * 100 : 0;
  const blockedW = m.tasks_total > 0 ? (m.tasks_blocked     / m.tasks_total) * 100 : 0;

  return (
    <div className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      {/* Main row */}
      <div
        className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
        onClick={() => m.recent_tasks?.length > 0 && setExpanded((v) => !v)}
      >
        <div className="grid grid-cols-[1fr_56px_56px_56px_56px_88px_88px_32px] gap-2 items-center">
          {/* Avatar + name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {m.first_name} {m.last_name}
              </p>
              <p className="text-xs text-slate-400 truncate">@{m.username} · {m.role}</p>
            </div>
          </div>

          {/* Counts */}
          <span className="text-center text-sm font-bold text-slate-700 dark:text-slate-200">{m.tasks_total}</span>
          <span className="text-center text-sm font-semibold text-emerald-600">{m.tasks_done}</span>
          <span className="text-center text-sm font-semibold text-indigo-600">{m.tasks_in_progress}</span>
          <span className={`text-center text-sm font-semibold ${m.tasks_blocked > 0 ? 'text-red-500' : 'text-slate-300 dark:text-slate-600'}`}>
            {m.tasks_blocked}
          </span>

          {/* Hours */}
          <span className="text-center text-xs text-slate-500">
            {m.hours_estimated > 0 ? `${m.hours_estimated}h est.` : '—'}
          </span>
          <span className={`text-center text-xs font-semibold ${m.over_budget ? 'text-red-500' : m.hours_logged > 0 ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>
            {m.hours_logged > 0 ? `${m.hours_logged.toFixed(1)}h reg.` : '—'}
            {m.over_budget && <span className="ml-0.5">⚠</span>}
          </span>

          {/* Expand toggle */}
          <div className="flex justify-center">
            {m.recent_tasks?.length > 0
              ? (expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />)
              : null}
          </div>
        </div>

        {/* Progress bar */}
        {m.tasks_total > 0 && (
          <div className="mt-2.5 ml-12 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${doneW}%` }} />
              <div className="h-full bg-indigo-500 transition-all"  style={{ width: `${inProgW}%` }} />
              <div className="h-full bg-red-400 transition-all"     style={{ width: `${blockedW}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 flex-shrink-0 w-8 text-right">{m.completion_pct}%</span>
          </div>
        )}
      </div>

      {/* Expanded: recent tasks */}
      {expanded && m.recent_tasks?.length > 0 && (
        <div className="px-5 pb-3 ml-12 space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Tareas activas</p>
          {m.recent_tasks.map((t) => <TaskChip key={t.id} task={t} />)}
        </div>
      )}
    </div>
  );
}

export default function WorkloadView({ projectId }) {
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    projectsAPI.getWorkload(projectId)
      .then((r) => setWorkload(r.data ?? r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="text-center py-20 text-slate-400">Cargando carga de trabajo…</div>;

  if (workload.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <Users size={40} className="mx-auto mb-3 opacity-30" />
        <p>No hay datos de carga de trabajo. Asigna tareas a los miembros del equipo.</p>
      </div>
    );
  }

  const maxTasks = Math.max(...workload.map((m) => m.tasks_total || 0), 1);

  // Summary totals
  const totals = workload.reduce((acc, m) => ({
    done:        acc.done        + (m.tasks_done        || 0),
    in_progress: acc.in_progress + (m.tasks_in_progress || 0),
    pending:     acc.pending     + (m.tasks_pending     || 0),
    blocked:     acc.blocked     + (m.tasks_blocked     || 0),
    hours_est:   acc.hours_est   + (m.hours_estimated   || 0),
    hours_log:   acc.hours_log   + (m.hours_logged      || 0),
  }), { done: 0, in_progress: 0, pending: 0, blocked: 0, hours_est: 0, hours_log: 0 });

  const summaryCards = [
    { key: 'done',        label: 'Completadas',  value: totals.done,        color: '#10b981', Icon: CheckCircle2 },
    { key: 'in_progress', label: 'En progreso',  value: totals.in_progress, color: '#6366f1', Icon: Clock },
    { key: 'pending',     label: 'Pendientes',   value: totals.pending,     color: '#94a3b8', Icon: CircleDot },
    { key: 'blocked',     label: 'Bloqueadas',   value: totals.blocked,     color: '#ef4444', Icon: AlertOctagon },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map(({ key, label, value, color, Icon }) => (
          <div key={key} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}20` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Hours summary */}
      {(totals.hours_est > 0 || totals.hours_log > 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm px-5 py-3 flex items-center gap-6 text-sm">
          <TrendingUp size={16} className="text-indigo-400 flex-shrink-0" />
          <span className="text-slate-500 dark:text-slate-400">
            Horas estimadas: <strong className="text-slate-700 dark:text-slate-200">{totals.hours_est}h</strong>
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            Horas registradas: <strong className={totals.hours_log > totals.hours_est && totals.hours_est > 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}>
              {totals.hours_log.toFixed(1)}h
            </strong>
          </span>
          {totals.hours_est > 0 && (
            <span className="text-slate-400 text-xs">
              ({Math.round((totals.hours_log / totals.hours_est) * 100)}% utilizado)
            </span>
          )}
        </div>
      )}

      {/* Member table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-[1fr_56px_56px_56px_56px_88px_88px_32px] gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <span>Miembro</span>
            <span className="text-center">Total</span>
            <span className="text-center text-emerald-600">✓</span>
            <span className="text-center text-indigo-600">▷</span>
            <span className="text-center text-red-500">⊘</span>
            <span className="text-center">Estimado</span>
            <span className="text-center">Registrado</span>
            <span />
          </div>
        </div>

        <div>
          {workload.map((m) => (
            <MemberRow key={m.user_id} m={m} maxTasks={maxTasks} />
          ))}
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-4 text-xs text-slate-500 bg-slate-50 dark:bg-slate-700/30">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Completadas</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /> En progreso</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Bloqueadas</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-200" /> Pendientes</span>
          <span className="ml-auto italic">Clic en un miembro para ver sus tareas activas</span>
        </div>
      </div>
    </div>
  );
}
