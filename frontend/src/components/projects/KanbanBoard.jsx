import { useEffect, useRef, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { Plus, Trash2, Flag, Calendar, Clock, GripVertical, Download, User } from 'lucide-react';
import { downloadCSV } from '../../utils/csv';
import TaskDetailModal from './TaskDetailModal';

const COLUMNS = [
  { id: 'PENDIENTE',   label: 'Pendiente',   color: 'border-slate-300',  bg: 'bg-slate-50',   header: 'bg-slate-100 text-slate-600',  drop: 'border-slate-400  bg-slate-100'  },
  { id: 'EN_PROGRESO', label: 'En Progreso', color: 'border-blue-300',   bg: 'bg-blue-50',    header: 'bg-blue-100 text-blue-700',    drop: 'border-blue-400   bg-blue-100'   },
  { id: 'BLOQUEADA',   label: 'Bloqueada',   color: 'border-red-300',    bg: 'bg-red-50',     header: 'bg-red-100 text-red-700',      drop: 'border-red-400    bg-red-100'    },
  { id: 'COMPLETADA',  label: 'Completada',  color: 'border-green-300',  bg: 'bg-green-50',   header: 'bg-green-100 text-green-700',  drop: 'border-green-400  bg-green-100'  },
];

const PRIORITY_STYLES = {
  BAJA:    { label: 'Baja',    dot: 'bg-slate-400',  text: 'text-slate-500',  bar: '#94a3b8' },
  MEDIA:   { label: 'Media',   dot: 'bg-blue-500',   text: 'text-blue-600',   bar: '#3b82f6' },
  ALTA:    { label: 'Alta',    dot: 'bg-amber-500',  text: 'text-amber-600',  bar: '#f59e0b' },
  CRITICA: { label: 'Crítica', dot: 'bg-red-500',    text: 'text-red-600',    bar: '#ef4444' },
};

const PRIORITIES = ['', 'BAJA', 'MEDIA', 'ALTA', 'CRITICA'];

export default function KanbanBoard({ projectId, isManager = true }) {
  const { user }                        = useAuthStore();
  const [sprints, setSprints]           = useState([]);
  const [tasks, setTasks]               = useState([]);
  const [sprintId, setSprintId]         = useState('');
  const [loading, setLoading]           = useState(true);
  const [newTask, setNewTask]           = useState({ column: '', title: '' });
  const [showNew, setShowNew]           = useState(null);
  const [priorityFilter, setPriority]   = useState('');
  const [onlyMine, setOnlyMine]         = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // ── Drag & drop state ──────────────────────────────────────
  const [draggingId, setDraggingId]     = useState(null);   // task.id being dragged
  const [dragOverCol, setDragOverCol]   = useState(null);   // column id hovered
  const dragCounter                     = useRef({});        // per-column enter counter

  // ──────────────────────────────────────────────────────────

  const loadTasks = (sid) => {
    if (sid) projectsAPI.getTasks({ sprint: sid }).then((r) => setTasks(r.data));
  };

  useEffect(() => {
    projectsAPI.getSprints(projectId).then((r) => {
      setSprints(r.data);
      const active = r.data.find((s) => s.status === 'ACTIVO') || r.data[0];
      if (active) { setSprintId(active.id); loadTasks(active.id); }
    }).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { loadTasks(sprintId); }, [sprintId]);

  const filteredTasks = tasks
    .filter((t) => !priorityFilter  || t.priority === priorityFilter)
    .filter((t) => !onlyMine        || (t.assignees || []).some((a) => String(a.user_id) === String(user?.id)));

  const addTask = async (status) => {
    const title = newTask.title.trim();
    if (!title) return;
    try {
      await projectsAPI.createTask({ sprint_id: sprintId, title, status });
      toast.success('Tarea creada');
      setShowNew(null);
      setNewTask({ column: '', title: '' });
      loadTasks(sprintId);
    } catch { toast.error('Error al crear tarea'); }
  };

  // Optimistic move — updates UI instantly, syncs to backend in background
  const moveTask = async (taskId, newStatus) => {
    const prev = tasks.find((t) => String(t.id) === String(taskId));
    if (!prev || prev.status === newStatus) return;

    setTasks((all) =>
      all.map((t) => (String(t.id) === String(taskId) ? { ...t, status: newStatus } : t))
    );
    try {
      await projectsAPI.updateTask(taskId, { status: newStatus });
    } catch {
      toast.error('Error al mover tarea');
      setTasks((all) =>
        all.map((t) => (String(t.id) === String(taskId) ? { ...t, status: prev.status } : t))
      );
    }
  };

  const removeTask = async (taskId) => {
    try {
      await projectsAPI.deleteTask(taskId);
      setTasks((t) => t.filter((tk) => tk.id !== taskId));
    } catch { toast.error('Error'); }
  };

  // ── DnD handlers ──────────────────────────────────────────

  const handleDragStart = (e, taskId) => {
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', String(taskId));
    // Slight delay so the ghost renders before the opacity kicks in
    setTimeout(() => {}, 0);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
    dragCounter.current = {};
  };

  // Using a counter to avoid flicker when cursor enters child elements
  const handleDragEnter = (e, colId) => {
    e.preventDefault();
    dragCounter.current[colId] = (dragCounter.current[colId] || 0) + 1;
    setDragOverCol(colId);
  };

  const handleDragLeave = (e, colId) => {
    dragCounter.current[colId] = (dragCounter.current[colId] || 1) - 1;
    if (dragCounter.current[colId] <= 0) {
      dragCounter.current[colId] = 0;
      setDragOverCol((prev) => (prev === colId ? null : prev));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, colId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) moveTask(taskId, colId);
    setDragOverCol(null);
    dragCounter.current = {};
    setDraggingId(null);
  };

  // ──────────────────────────────────────────────────────────

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  if (sprints.length === 0) {
    return <p className="text-slate-400 text-sm text-center py-8">Crea un sprint primero para usar el tablero Kanban</p>;
  }

  return (
    <div>
      {/* Filters bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Sprint:</label>
          <select value={sprintId} onChange={(e) => setSprintId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {sprints.map((s) => <option key={s.id} value={s.id}>Sprint {s.number}: {s.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Flag size={13} className="text-slate-400" />
          <label className="text-sm font-medium text-slate-600">Prioridad:</label>
          <select value={priorityFilter} onChange={(e) => setPriority(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todas</option>
            {PRIORITIES.filter(Boolean).map((p) => (
              <option key={p} value={p}>{PRIORITY_STYLES[p].label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setOnlyMine((v) => !v)}
          title={onlyMine ? 'Ver todas las tareas' : 'Ver solo mis tareas'}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors
            ${onlyMine
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
          <User size={13} /> {onlyMine ? 'Mis tareas' : 'Todas'}
        </button>
        <div className="ml-auto flex items-center gap-3">
          {filteredTasks.length > 0 && (
            <button onClick={() => downloadCSV(filteredTasks, [
              { key: 'title',               label: 'Título' },
              { key: 'status',              label: 'Estado' },
              { key: 'priority',            label: 'Prioridad' },
              { key: 'assignees', label: 'Asignados', transform: (v) => (v || []).map((a) => `${a.first_name} ${a.last_name}`).join(' | ') },
              { key: 'due_date',            label: 'Fecha Límite' },
              { key: 'estimated_hours',     label: 'Horas Estimadas' },
              { key: 'time_logged',         label: 'Horas Registradas' },
            ], 'tareas')}
              className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors">
              <Download size={12} /> CSV
            </button>
          )}
          <span className="text-xs text-slate-400">
            {filteredTasks.length} tarea{filteredTasks.length !== 1 ? 's' : ''}
            {draggingId && <span className="ml-2 text-indigo-400 font-medium animate-pulse">• arrastrando…</span>}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const { id, label, color, bg, header, drop } = col;
          const colTasks  = filteredTasks.filter((t) => t.status === id);
          const isTarget  = dragOverCol === id;
          const isDragging = draggingId !== null;

          return (
            <div
              key={id}
              onDragEnter={(e) => handleDragEnter(e, id)}
              onDragLeave={(e) => handleDragLeave(e, id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, id)}
              className={[
                'rounded-xl border-2 p-3 min-h-48 transition-all duration-150',
                isTarget
                  ? `${drop} shadow-lg scale-[1.01]`
                  : `${color} ${bg}`,
                isDragging && !isTarget ? 'opacity-80' : '',
              ].join(' ')}>

              {/* Column header */}
              <div className={`flex items-center justify-between mb-3 rounded-lg px-2 py-1 ${header}`}>
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-xs bg-white/70 rounded-full px-2 py-0.5 font-medium">
                  {colTasks.length}
                </span>
              </div>

              {/* Drop hint when empty column is targeted */}
              {isTarget && colTasks.length === 0 && (
                <div className="flex items-center justify-center h-16 border-2 border-dashed border-current opacity-40 rounded-lg mb-2">
                  <span className="text-xs font-medium">Soltar aquí</span>
                </div>
              )}

              <div className="space-y-2 mb-2">
                {colTasks.map((task) => {
                  const pri       = PRIORITY_STYLES[task.priority];
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'COMPLETADA';
                  const isBeingDragged = String(draggingId) === String(task.id);

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => !isBeingDragged && setSelectedTask(task)}
                      className={[
                        'bg-white rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing',
                        'hover:shadow-md transition-all duration-150 group select-none',
                        isBeingDragged ? 'opacity-30 scale-95 shadow-none' : 'hover:-translate-y-0.5',
                      ].join(' ')}>

                      {/* Drag handle + title */}
                      <div className="flex items-start gap-1.5">
                        <GripVertical
                          size={13}
                          className="text-slate-300 group-hover:text-slate-400 mt-0.5 flex-shrink-0 transition-colors"
                        />
                        <p className="text-xs font-medium text-slate-700 line-clamp-2 flex-1">{task.title}</p>
                      </div>

                      {/* Priority + due date */}
                      <div className="flex items-center gap-2 mt-1.5 pl-5">
                        {pri && (
                          <span className={`flex items-center gap-1 text-xs ${pri.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pri.dot}`} />
                            {pri.label}
                          </span>
                        )}
                        {task.due_date && (
                          <span className={`flex items-center gap-0.5 text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                            <Calendar size={10} />
                            {task.due_date}
                          </span>
                        )}
                      </div>

                      {/* Time progress bar */}
                      {task.estimated_hours > 0 && (
                        <div className="mt-1.5 pl-5">
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (task.time_logged / task.estimated_hours) * 100)}%`,
                                background: task.time_logged > task.estimated_hours ? '#ef4444' : '#6366f1',
                              }} />
                          </div>
                          <span className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5">
                            <Clock size={9} /> {task.time_logged || 0}h / {task.estimated_hours}h
                          </span>
                        </div>
                      )}

                      {/* Assignees (multi) */}
                      {(task.assignees || []).length > 0 && (
                        <div className="flex items-center gap-0.5 mt-1.5 pl-5">
                          {task.assignees.slice(0, 4).map((a, i) => (
                            <div key={a.user_id}
                              title={`${a.first_name} ${a.last_name}`}
                              className="w-5 h-5 rounded-full flex items-center justify-center
                                text-white text-[9px] font-bold ring-1 ring-white -ml-1 first:ml-0"
                              style={{ background: ['#6366f1','#8b5cf6','#3b82f6','#10b981','#f59e0b','#ec4899'][i % 6] }}>
                              {(a.first_name?.[0] || '')}{(a.last_name?.[0] || '')}
                            </div>
                          ))}
                          {task.assignees.length > 4 && (
                            <span className="text-[10px] text-slate-400 ml-1">
                              +{task.assignees.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Delete button — shown on hover, stops propagation */}
                      {isManager && (
                        <div className="flex justify-end mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => removeTask(task.id)}
                            className="text-red-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition-colors">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add task — managers only */}
              {isManager && (showNew === id ? (
                <div className="bg-white rounded-lg p-2 shadow-sm">
                  <input autoFocus value={newTask.title}
                    onChange={(e) => setNewTask({ column: id, title: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')  addTask(id);
                      if (e.key === 'Escape') setShowNew(null);
                    }}
                    placeholder="Título de tarea…"
                    className="w-full text-xs border-none outline-none text-slate-700" />
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => addTask(id)}
                      className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">Agregar</button>
                    <button onClick={() => setShowNew(null)}
                      className="text-xs text-slate-400 px-2 py-0.5">✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNew(id)}
                  className="w-full flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors">
                  <Plus size={12} /> Agregar tarea
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectId={projectId}
          onClose={() => setSelectedTask(null)}
          onSaved={() => { loadTasks(sprintId); setSelectedTask(null); }}
        />
      )}
    </div>
  );
}
