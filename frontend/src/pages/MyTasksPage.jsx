import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../services/projectsAPI';
import Layout from '../components/Layout';
import { toast } from 'sonner';
import {
  CheckCircle2, Clock, AlertTriangle, Flag, Calendar,
  FolderKanban, Zap, Filter, RefreshCw,
} from 'lucide-react';

// ─── Constantes ────────────────────────────────────────────────────────────────
const STATUS_OPTS = [
  { value: '',            label: 'Activas (sin completadas)' },
  { value: 'PENDIENTE',   label: 'Pendiente'   },
  { value: 'EN_PROGRESO', label: 'En Progreso' },
  { value: 'BLOQUEADA',   label: 'Bloqueada'   },
  { value: 'COMPLETADA',  label: 'Completada'  },
];

const STATUS_COLORS = {
  PENDIENTE:   { bg: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400',  label: 'Pendiente'   },
  EN_PROGRESO: { bg: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500',   label: 'En Progreso' },
  BLOQUEADA:   { bg: 'bg-red-100 text-red-700',       dot: 'bg-red-500',    label: 'Bloqueada'   },
  COMPLETADA:  { bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: 'Completada'  },
};

const PRIORITY_STYLES = {
  BAJA:    { label: 'Baja',    bg: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400',  border: 'border-l-slate-300'  },
  MEDIA:   { label: 'Media',   bg: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500',   border: 'border-l-blue-400'   },
  ALTA:    { label: 'Alta',    bg: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500',  border: 'border-l-amber-400'  },
  CRITICA: { label: 'Crítica', bg: 'bg-red-100 text-red-700',       dot: 'bg-red-500',    border: 'border-l-red-500'    },
};

// ─── Componente principal ──────────────────────────────────────────────────────
export default function MyTasksPage() {
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState(null); // id de tarea actualizándose

  const load = (status = statusFilter) => {
    setLoading(true);
    const params = status ? { status } : {};
    projectsAPI.getMyTasks(params)
      .then((r) => setTasks(r.data))
      .catch(() => toast.error('Error al cargar tareas'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const changeStatus = async (task, newStatus) => {
    setUpdating(task.id);
    try {
      await projectsAPI.updateTask(task.id, { status: newStatus });
      toast.success(`Tarea marcada como ${STATUS_COLORS[newStatus]?.label || newStatus}`);
      load();
    } catch {
      toast.error('Error al actualizar');
    } finally { setUpdating(null); }
  };

  // ── Estadísticas rápidas ─────────────────────────────────────────────────────
  const allActive = tasks; // ya filtradas por el backend
  const blocked   = allActive.filter((t) => t.status === 'BLOQUEADA').length;
  const overdue   = allActive.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'COMPLETADA').length;
  const inProgress = allActive.filter((t) => t.status === 'EN_PROGRESO').length;

  // ── Agrupar por proyecto ─────────────────────────────────────────────────────
  const grouped = tasks.reduce((acc, t) => {
    const key = t.project_id;
    if (!acc[key]) acc[key] = { project_id: t.project_id, project_name: t.project_name, project_code: t.project_code, tasks: [] };
    acc[key].tasks.push(t);
    return acc;
  }, {});

  const projects = Object.values(grouped).sort((a, b) => a.project_name.localeCompare(b.project_name));

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mis Tareas</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {loading ? 'Cargando…' : `${tasks.length} tarea${tasks.length !== 1 ? 's' : ''} asignada${tasks.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={() => load()} disabled={loading}
            className="flex items-center gap-1.5 text-sm border border-slate-300 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {/* KPI chips */}
        {!loading && tasks.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'En Progreso', value: inProgress,  color: 'bg-blue-50 text-blue-700 border-blue-200',   icon: Zap        },
              { label: 'Bloqueadas',  value: blocked,     color: 'bg-red-50 text-red-700 border-red-200',       icon: AlertTriangle },
              { label: 'Vencidas',    value: overdue,     color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock      },
            ].map(({ label, value, color, icon: Icon }) => value > 0 && (
              <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${color}`}>
                <Icon size={12} /> {value} {label}
              </div>
            ))}
          </div>
        )}

        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-400 flex-shrink-0" />
          {STATUS_OPTS.map(({ value, label }) => (
            <button key={value} onClick={() => setStatusFilter(value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors
                ${statusFilter === value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">
            <RefreshCw size={32} className="mx-auto mb-3 animate-spin opacity-40" />
            <p>Cargando tareas...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle2 size={48} className="mx-auto text-emerald-300 mb-3" />
            <p className="text-slate-500 font-medium">
              {statusFilter ? `Sin tareas con estado "${STATUS_COLORS[statusFilter]?.label || statusFilter}"` : '¡Todo al día! Sin tareas activas asignadas.'}
            </p>
            <Link to="/projects" className="mt-3 inline-block text-indigo-600 hover:underline text-sm">
              Ver proyectos →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {projects.map(({ project_id, project_name, project_code, tasks: ptasks }) => (
              <div key={project_id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">

                {/* Project header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderKanban size={15} className="text-indigo-500 flex-shrink-0" />
                    <Link to={`/projects/${project_id}`}
                      className="text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-indigo-600 transition-colors truncate">
                      {project_name}
                    </Link>
                    <span className="text-xs text-slate-400 font-mono flex-shrink-0">{project_code}</span>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {ptasks.length} tarea{ptasks.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Tasks */}
                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                  {ptasks.map((task) => {
                    const pri      = PRIORITY_STYLES[task.priority];
                    const st       = STATUS_COLORS[task.status];
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'COMPLETADA';
                    const isUpd    = updating === task.id;

                    return (
                      <div key={task.id}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-l-4 ${pri?.border || 'border-l-transparent'}`}>

                        {/* Status toggle button */}
                        <button
                          onClick={() => changeStatus(task, task.status === 'COMPLETADA' ? 'PENDIENTE' : 'COMPLETADA')}
                          disabled={isUpd}
                          title={task.status === 'COMPLETADA' ? 'Marcar pendiente' : 'Marcar completada'}
                          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                            ${task.status === 'COMPLETADA'
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 hover:border-emerald-400'} ${isUpd ? 'opacity-50' : ''}`}>
                          {task.status === 'COMPLETADA' && <CheckCircle2 size={12} />}
                        </button>

                        {/* Task info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 flex-wrap">
                            <Link to={`/projects/${project_id}?tab=kanban`}
                              className={`text-sm font-medium hover:text-indigo-600 transition-colors truncate
                                ${task.status === 'COMPLETADA' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                              {task.title}
                            </Link>
                          </div>

                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {/* Sprint */}
                            {task.sprint_name && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Zap size={10} /> {task.sprint_name}
                              </span>
                            )}
                            {/* Due date */}
                            {task.due_date && (
                              <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                                <Calendar size={10} />
                                {isOverdue ? 'Vencida: ' : ''}{task.due_date}
                              </span>
                            )}
                            {/* Hours */}
                            {task.estimated_hours > 0 && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Clock size={10} /> {task.time_logged || 0}h / {task.estimated_hours}h
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: priority + status + quick-change */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {pri && (
                            <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium ${pri.bg}`}>
                              {pri.label}
                            </span>
                          )}
                          <select
                            value={task.status}
                            onChange={(e) => changeStatus(task, e.target.value)}
                            disabled={isUpd}
                            className={`text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isUpd ? 'opacity-50' : ''}`}>
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="EN_PROGRESO">En Progreso</option>
                            <option value="BLOQUEADA">Bloqueada</option>
                            <option value="COMPLETADA">Completada</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
