import { useEffect, useRef, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { useTimer, formatElapsed } from '../../hooks/useTimer';
import {
  X, Send, Trash2, Clock, Flag, Calendar, Users, CheckSquare,
  Plus, Tag, AlarmClock, MessageSquare, Save,
  Play, Square, Link2, Link2Off, AlertOctagon, CheckCircle2,
  ArrowRight, Circle,
} from 'lucide-react';

// ── Constantes ───────────────────────────────────────────────────────────────
const PRIORITY_STYLES = {
  BAJA:    { label: 'Baja',    bg: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400' },
  MEDIA:   { label: 'Media',   bg: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'  },
  ALTA:    { label: 'Alta',    bg: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  CRITICA: { label: 'Crítica', bg: 'bg-red-100 text-red-700',      dot: 'bg-red-500'   },
};
const STATUS_OPTIONS = ['PENDIENTE', 'EN_PROGRESO', 'BLOQUEADA', 'COMPLETADA'];
const STATUS_STYLE = {
  PENDIENTE:   { dot: 'bg-slate-400',   label: 'Pendiente'   },
  EN_PROGRESO: { dot: 'bg-blue-500',    label: 'En progreso' },
  BLOQUEADA:   { dot: 'bg-red-500',     label: 'Bloqueada'   },
  COMPLETADA:  { dot: 'bg-emerald-500', label: 'Completada'  },
};

const LABEL_PALETTE = [
  '#ef4444','#f97316','#eab308','#22c55e',
  '#06b6d4','#6366f1','#8b5cf6','#ec4899','#64748b',
];

const TABS = [
  { id: 'detalles',      icon: Flag,         label: 'Detalles'     },
  { id: 'checklist',     icon: CheckSquare,  label: 'Checklist'    },
  { id: 'tiempo',        icon: AlarmClock,   label: 'Tiempo'       },
  { id: 'dependencias',  icon: Link2,        label: 'Deps'         },
  { id: 'comentarios',   icon: MessageSquare,label: 'Comentarios'  },
];

const AVATAR_COLORS = [
  'bg-indigo-500','bg-purple-500','bg-blue-500','bg-emerald-500',
  'bg-amber-500', 'bg-rose-500',
];

// ── Dep type labels ───────────────────────────────────────────────────────────
const DEP_TYPE_LABEL = { BLOCKS: 'Bloquea', RELATED: 'Relacionada' };

// ── TaskStatusChip ────────────────────────────────────────────────────────────
function TaskStatusChip({ status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.PENDIENTE;
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <span className="text-slate-500">{s.label}</span>
    </span>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function TaskDetailModal({ task, projectId, onClose, onSaved }) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('detalles');
  const [form, setForm]           = useState({ ...task });
  const [members, setMembers]     = useState([]);
  const [saving, setSaving]       = useState(false);

  // Multi-assignee
  const [assignees, setAssignees] = useState(() => {
    if (task.assignees?.length > 0) return task.assignees.map((a) => String(a.user_id));
    return task.assigned_to ? [String(task.assigned_to)] : [];
  });

  // Checklist
  const [checklists, setChecklists]   = useState([]);
  const [newItemText, setNewItemText] = useState('');
  const [addingItem, setAddingItem]   = useState(false);

  // Time logs
  const [timeLogs, setTimeLogs]   = useState([]);
  const [timeForm, setTimeForm]   = useState({
    hours: '', work_date: new Date().toISOString().slice(0, 10), description: '',
  });
  const [addingTime, setAddingTime]   = useState(false);
  const [timerDesc, setTimerDesc]     = useState('');

  // Timer hook
  const timer = useTimer(task.id);

  // Dependencies
  const [deps, setDeps]           = useState({ blockers: [], blocking: [] });
  const [depsLoading, setDepsLoading] = useState(false);
  const [depSearch, setDepSearch] = useState('');
  const [depResults, setDepResults] = useState([]);
  const [depSearching, setDepSearching] = useState(false);
  const [depType, setDepType]     = useState('BLOCKS');
  const [addDepMode, setAddDepMode] = useState(null); // 'blocker' | 'blocked'
  const depSearchRef = useRef(null);

  // Comments
  const [comments, setComments]       = useState([]);
  const [newComment, setNewComment]   = useState('');
  const [loadingCmt, setLoadingCmt]   = useState(true);

  // Labels
  const parseLabels = () => {
    try { return JSON.parse(form.labels || '[]') || []; }
    catch { return []; }
  };
  const labels = parseLabels();
  const [labelInput, setLabelInput]           = useState('');
  const [labelColor, setLabelColor]           = useState(LABEL_PALETTE[5]);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const labelRef = useRef(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    projectsAPI.getTaskComments(task.id)
      .then((r) => setComments(r.data)).catch(() => {}).finally(() => setLoadingCmt(false));

    projectsAPI.getChecklists(task.id)
      .then((r) => setChecklists(r.data)).catch(() => {});

    projectsAPI.getTimeLogs(task.id)
      .then((r) => setTimeLogs(r.data)).catch(() => {});

    if (projectId) {
      projectsAPI.getMembers(projectId)
        .then((r) => setMembers(r.data)).catch(() => {});
    } else {
      projectsAPI.getUsers()
        .then((r) => setMembers(r.data.map((u) => ({
          user_id: u.id, first_name: u.first_name,
          last_name: u.last_name, username: u.username,
        })))).catch(() => {});
    }
  }, [task.id, projectId]);

  // Load dependencies when tab opens
  useEffect(() => {
    if (activeTab !== 'dependencias') return;
    setDepsLoading(true);
    projectsAPI.getTaskDependencies(task.id)
      .then((r) => setDeps(r.data))
      .catch(() => {})
      .finally(() => setDepsLoading(false));
  }, [activeTab, task.id]);

  // Close label picker on outside click
  useEffect(() => {
    const h = (e) => {
      if (labelRef.current && !labelRef.current.contains(e.target)) setShowLabelPicker(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Close dep search on outside click
  useEffect(() => {
    const h = (e) => {
      if (depSearchRef.current && !depSearchRef.current.contains(e.target)) {
        setDepResults([]);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Search tasks for dep (debounced)
  useEffect(() => {
    if (!addDepMode || depSearch.length < 2) { setDepResults([]); return; }
    const t = setTimeout(() => {
      setDepSearching(true);
      projectsAPI.search(depSearch)
        .then((r) => {
          const tasks = (r.data?.tasks || []).filter((t) => t.id !== task.id);
          setDepResults(tasks);
        })
        .catch(() => {})
        .finally(() => setDepSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [depSearch, addDepMode, task.id]);

  // ── Assignees ──────────────────────────────────────────────────────────────
  const toggleAssignee = (uid) => {
    const s = String(uid);
    setAssignees((prev) => prev.includes(s) ? prev.filter((id) => id !== s) : [...prev, s]);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    try {
      await projectsAPI.updateTask(task.id, {
        title: form.title, description: form.description,
        status: form.status, priority: form.priority,
        due_date: form.due_date || null,
        estimated_hours: form.estimated_hours,
        assignees: assignees.map(Number),
        labels: form.labels || '[]',
      });
      toast.success('Tarea guardada');
      onSaved?.();
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  // ── Labels ─────────────────────────────────────────────────────────────────
  const addLabel = () => {
    const name = labelInput.trim();
    if (!name) return;
    if (labels.find((l) => l.name.toLowerCase() === name.toLowerCase())) { setLabelInput(''); return; }
    setForm({ ...form, labels: JSON.stringify([...labels, { name, color: labelColor }]) });
    setLabelInput('');
  };
  const removeLabel = (name) =>
    setForm({ ...form, labels: JSON.stringify(labels.filter((l) => l.name !== name)) });

  // ── Checklist ──────────────────────────────────────────────────────────────
  const addCheckItem = async () => {
    const text = newItemText.trim();
    if (!text) return;
    setAddingItem(true);
    try {
      const r = await projectsAPI.createChecklist(task.id, { text, sort_order: checklists.length });
      setChecklists((c) => [...c, r.data]);
      setNewItemText('');
    } catch { toast.error('Error al agregar'); }
    finally { setAddingItem(false); }
  };
  const toggleCheck = async (item) => {
    const updated = { ...item, is_done: item.is_done ? 0 : 1 };
    setChecklists((c) => c.map((i) => i.id === item.id ? updated : i));
    try { await projectsAPI.updateChecklist(item.id, { is_done: updated.is_done }); }
    catch { setChecklists((c) => c.map((i) => i.id === item.id ? item : i)); }
  };
  const deleteCheckItem = async (id) => {
    setChecklists((c) => c.filter((i) => i.id !== id));
    try { await projectsAPI.deleteChecklist(id); }
    catch { toast.error('Error al eliminar'); }
  };
  const doneCount = checklists.filter((c) => c.is_done).length;
  const checkPct  = checklists.length ? Math.round((doneCount / checklists.length) * 100) : 0;

  // ── Time logs ──────────────────────────────────────────────────────────────
  const submitTimeLog = async (e) => {
    e.preventDefault();
    if (!timeForm.hours || parseFloat(timeForm.hours) <= 0) {
      toast.error('Ingresa las horas trabajadas'); return;
    }
    setAddingTime(true);
    try {
      const r = await projectsAPI.createTimeLog(task.id, timeForm);
      setTimeLogs((t) => [r.data, ...t]);
      setTimeForm({ hours: '', work_date: new Date().toISOString().slice(0, 10), description: '' });
      const total = timeLogs.reduce((s, l) => s + parseFloat(l.hours), 0) + parseFloat(timeForm.hours);
      setForm((f) => ({ ...f, time_logged: total.toFixed(2) }));
      toast.success('Tiempo registrado');
    } catch { toast.error('Error al registrar tiempo'); }
    finally { setAddingTime(false); }
  };

  const deleteTimeLog = async (id) => {
    const log = timeLogs.find((l) => l.id === id);
    setTimeLogs((t) => t.filter((l) => l.id !== id));
    try { await projectsAPI.deleteTimeLog(id); }
    catch { if (log) setTimeLogs((t) => [log, ...t]); }
  };

  // ── Timer actions ──────────────────────────────────────────────────────────
  const handleTimerStart = () => {
    timer.start(timerDesc);
    toast.success('⏱ Timer iniciado');
  };

  const handleTimerStop = async () => {
    const hours = timer.stop();
    const today = new Date().toISOString().slice(0, 10);
    try {
      const r = await projectsAPI.createTimeLog(task.id, {
        hours: parseFloat(hours.toFixed(2)),
        work_date: today,
        description: timerDesc || 'Registrado con timer',
      });
      setTimeLogs((t) => [r.data, ...t]);
      setForm((f) => ({ ...f, time_logged: (parseFloat(f.time_logged || 0) + hours).toFixed(2) }));
      setTimerDesc('');
      toast.success(`✅ ${hours.toFixed(2)}h registradas`);
    } catch { toast.error('Error al guardar el tiempo'); }
  };

  const handleTimerCancel = () => {
    timer.cancel();
    toast('Timer cancelado');
  };

  // ── Dependencies ───────────────────────────────────────────────────────────
  const addDependency = async (otherTask) => {
    try {
      const body = addDepMode === 'blocker'
        ? { blocker_id: otherTask.id, type: depType }   // otherTask bloquea a THIS
        : { blocked_id: otherTask.id, type: depType };  // THIS bloquea a otherTask

      await projectsAPI.createTaskDependency(task.id, body);
      toast.success('Dependencia agregada');
      setDepSearch(''); setDepResults([]);
      setAddDepMode(null);
      // Reload
      const r = await projectsAPI.getTaskDependencies(task.id);
      setDeps(r.data);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al agregar dependencia';
      toast.error(msg);
    }
  };

  const removeDep = async (id) => {
    try {
      await projectsAPI.deleteTaskDependency(id);
      setDeps((d) => ({
        blockers: d.blockers.filter((b) => b.id !== id),
        blocking: d.blocking.filter((b) => b.id !== id),
      }));
    } catch { toast.error('Error al eliminar dependencia'); }
  };

  // ── Comments ───────────────────────────────────────────────────────────────
  const postComment = async () => {
    const body = newComment.trim();
    if (!body) return;
    try {
      const r = await projectsAPI.createTaskComment(task.id, { body });
      setComments((c) => [...c, r.data]);
      setNewComment('');
    } catch { toast.error('Error al publicar'); }
  };
  const deleteComment = async (id) => {
    try {
      await projectsAPI.deleteTaskComment(id);
      setComments((c) => c.filter((cm) => cm.id !== id));
    } catch { toast.error('Error al eliminar'); }
  };

  const totalLogged = timeLogs.reduce((s, l) => s + parseFloat(l.hours || 0), 0);
  const pri = PRIORITY_STYLES[form.priority] || PRIORITY_STYLES.MEDIA;
  const hasBlockers = deps.blockers.filter((b) => b.status !== 'COMPLETADA').length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-xs text-slate-400 mb-0.5">Tarea #{task.id}</p>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">{task.title}</h2>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {/* Label pills */}
              {labels.map((l) => (
                <span key={l.name}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white"
                  style={{ background: l.color }}>
                  {l.name}
                  <button type="button" onClick={() => removeLabel(l.name)} className="opacity-70 hover:opacity-100 ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              ))}
              {/* Blocked indicator */}
              {hasBlockers && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  <AlertOctagon size={10} /> Bloqueada
                </span>
              )}
              {/* Active timer chip */}
              {timer.isRunning && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {formatElapsed(timer.elapsed)}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-100 dark:border-slate-700 px-2 overflow-x-auto">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap
                ${activeTab === id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              <Icon size={13} />
              {label}
              {id === 'checklist' && checklists.length > 0 && (
                <span className="ml-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 rounded-full">
                  {doneCount}/{checklists.length}
                </span>
              )}
              {id === 'comentarios' && comments.length > 0 && (
                <span className="ml-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 rounded-full">
                  {comments.length}
                </span>
              )}
              {id === 'tiempo' && totalLogged > 0 && (
                <span className="ml-0.5 text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 rounded-full">
                  {totalLogged.toFixed(1)}h
                </span>
              )}
              {id === 'dependencias' && (deps.blockers.length + deps.blocking.length) > 0 && (
                <span className="ml-0.5 text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 rounded-full">
                  {deps.blockers.length + deps.blocking.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── DETALLES ──────────────────────────────────────────── */}
          {activeTab === 'detalles' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Título</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500
                             bg-white dark:bg-slate-700 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Descripción</label>
                <textarea rows={3} value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none
                             bg-white dark:bg-slate-700 dark:text-slate-100" />
              </div>

              {/* Multi-assignee */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  <Users size={12} /> Asignados
                  {assignees.length > 0 && (
                    <span className="ml-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      {assignees.length}
                    </span>
                  )}
                </label>
                {assignees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {assignees.map((uid, i) => {
                      const m = members.find((mb) => String(mb.user_id || mb.id) === uid);
                      if (!m) return null;
                      return (
                        <span key={uid}
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[8px] font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                            {(m.first_name?.[0] || '')}{(m.last_name?.[0] || '')}
                          </span>
                          {m.first_name} {m.last_name}
                          <button type="button" onClick={() => toggleAssignee(uid)} className="opacity-60 hover:opacity-100 ml-0.5">
                            <X size={10} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700 max-h-40 overflow-y-auto">
                  {members.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">Sin miembros disponibles</p>
                  ) : members.map((m, i) => {
                    const uid     = String(m.user_id || m.id);
                    const checked = assignees.includes(uid);
                    return (
                      <label key={uid}
                        className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors
                          ${checked ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleAssignee(uid)} className="accent-indigo-600 flex-shrink-0" />
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                          {(m.first_name?.[0] || '')}{(m.last_name?.[0] || '')}
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300 leading-tight">
                          {m.first_name} {m.last_name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Status / Priority / Due date */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Estado</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100">
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <Flag size={12} /> Prioridad
                  </label>
                  <select value={form.priority || 'MEDIA'} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100">
                    {Object.entries(PRIORITY_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <Calendar size={12} /> Fecha límite
                  </label>
                  <input type="date" value={form.due_date || ''}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100" />
                </div>
              </div>

              {/* Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <Clock size={12} /> Horas estimadas
                  </label>
                  <input type="number" min="0" step="0.5" value={form.estimated_hours || 0}
                    onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100" />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <Clock size={12} /> Horas registradas
                  </label>
                  <input type="number" min="0" step="0.5" value={form.time_logged || 0} readOnly
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400" />
                </div>
              </div>

              {form.estimated_hours > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progreso de tiempo</span>
                    <span>{parseFloat(form.time_logged || 0).toFixed(1)}h / {form.estimated_hours}h</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((form.time_logged || 0) / form.estimated_hours) * 100)}%`,
                        background: (form.time_logged || 0) > form.estimated_hours ? '#ef4444' : '#6366f1',
                      }} />
                  </div>
                </div>
              )}

              {/* Labels */}
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  <Tag size={12} /> Etiquetas
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {labels.map((l) => (
                    <span key={l.name}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white"
                      style={{ background: l.color }}>
                      {l.name}
                      <button onClick={() => removeLabel(l.name)} className="opacity-70 hover:opacity-100"><X size={10} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2" ref={labelRef}>
                  <div className="relative">
                    <button type="button" onClick={() => setShowLabelPicker(!showLabelPicker)}
                      className="w-8 h-[34px] rounded-lg border border-slate-300 dark:border-slate-600 flex-shrink-0"
                      style={{ background: labelColor }} />
                    {showLabelPicker && (
                      <div className="absolute z-10 top-full mt-1 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-2 flex flex-wrap gap-1.5 w-48">
                        {LABEL_PALETTE.map((c) => (
                          <button key={c} type="button"
                            onClick={() => { setLabelColor(c); setShowLabelPicker(false); }}
                            className={`w-7 h-7 rounded-full border-2 transition-all ${labelColor === c ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-110'}`}
                            style={{ background: c }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <input value={labelInput} onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } }}
                    placeholder="Nueva etiqueta… (Enter)"
                    className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100" />
                  <button type="button" onClick={addLabel}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors flex-shrink-0">
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CHECKLIST ──────────────────────────────────────────── */}
          {activeTab === 'checklist' && (
            <div>
              {checklists.length > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>{doneCount} de {checklists.length} completados</span>
                    <span className="font-semibold">{checkPct}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${checkPct}%` }} />
                  </div>
                </div>
              )}
              <div className="space-y-1.5 mb-4">
                {checklists.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6">Sin items. Agrega el primero abajo.</p>
                )}
                {checklists.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 group">
                    <input type="checkbox" checked={!!item.is_done} onChange={() => toggleCheck(item)}
                      className="w-4 h-4 rounded accent-indigo-600 cursor-pointer flex-shrink-0" />
                    <span className={`flex-1 text-sm transition-all ${item.is_done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {item.text}
                    </span>
                    <button onClick={() => deleteCheckItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newItemText} onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem(); } }}
                  placeholder="Nuevo item… (Enter para agregar)"
                  className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100" />
                <button onClick={addCheckItem} disabled={addingItem || !newItemText.trim()}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0">
                  <Plus size={13} /> Agregar
                </button>
              </div>
            </div>
          )}

          {/* ── TIEMPO ─────────────────────────────────────────────── */}
          {activeTab === 'tiempo' && (
            <div className="space-y-5">
              {/* KPI strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-indigo-600">{parseFloat(form.estimated_hours || 0).toFixed(1)}h</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Estimadas</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-emerald-600">{totalLogged.toFixed(1)}h</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Registradas</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${totalLogged > (form.estimated_hours || 0) ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-700/50'}`}>
                  <p className={`text-lg font-bold ${totalLogged > (form.estimated_hours || 0) ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'}`}>
                    {Math.abs(parseFloat(form.estimated_hours || 0) - totalLogged).toFixed(1)}h
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {totalLogged > (form.estimated_hours || 0) ? 'Excedido' : 'Restante'}
                  </p>
                </div>
              </div>

              {/* ── TIMER en tiempo real ── */}
              <div className={`rounded-xl p-4 border-2 transition-colors
                ${timer.isRunning
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30'}`}>

                {timer.isRunning ? (
                  /* Running state */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Timer activo</span>
                      </div>
                      <span className="font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatElapsed(timer.elapsed)}
                      </span>
                    </div>
                    {timer.description && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 italic">"{timer.description}"</p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={handleTimerStop}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                        <Square size={14} /> Detener y guardar
                      </button>
                      <button onClick={handleTimerCancel}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Idle state */
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Play size={12} /> Iniciar timer
                    </p>
                    <input
                      value={timerDesc}
                      onChange={(e) => setTimerDesc(e.target.value)}
                      placeholder="¿En qué vas a trabajar? (opcional)"
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
                    <button onClick={handleTimerStart}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                      <Play size={14} /> Iniciar timer
                    </button>
                  </div>
                )}
              </div>

              {/* Log list */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Historial</p>
                {timeLogs.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Sin registros de tiempo aún</p>
                ) : timeLogs.map((l) => (
                  <div key={l.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl group">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                      <AlarmClock size={14} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">{parseFloat(l.hours).toFixed(1)}h</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{l.work_date}</span>
                          {(user?.id === l.user_id || user?.id === Number(l.user_id)) && (
                            <button onClick={() => deleteTimeLog(l.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {l.first_name || l.username} {l.last_name}
                        {l.description && <span> — {l.description}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Manual log */}
              <form onSubmit={submitTimeLog} className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Registrar manualmente</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Horas *</label>
                    <input type="number" min="0.5" max="24" step="0.5" required
                      value={timeForm.hours} onChange={(e) => setTimeForm({ ...timeForm, hours: e.target.value })}
                      placeholder="1.5"
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Fecha</label>
                    <input type="date" value={timeForm.work_date}
                      onChange={(e) => setTimeForm({ ...timeForm, work_date: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Descripción del trabajo</label>
                  <input value={timeForm.description} onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })}
                    placeholder="¿En qué trabajaste?"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <button type="submit" disabled={addingTime}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                  {addingTime ? 'Registrando…' : '+ Registrar horas'}
                </button>
              </form>
            </div>
          )}

          {/* ── DEPENDENCIAS ───────────────────────────────────────── */}
          {activeTab === 'dependencias' && (
            <div className="space-y-5">
              {depsLoading ? (
                <p className="text-sm text-slate-400 text-center py-8">Cargando dependencias…</p>
              ) : (
                <>
                  {/* Blocked by */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertOctagon size={12} className="text-red-400" /> Bloqueada por
                        {deps.blockers.length > 0 && (
                          <span className="ml-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0 rounded-full text-[10px]">
                            {deps.blockers.length}
                          </span>
                        )}
                      </h4>
                      <button onClick={() => setAddDepMode(addDepMode === 'blocker' ? null : 'blocker')}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                        <Plus size={11} /> Agregar bloqueador
                      </button>
                    </div>

                    {deps.blockers.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                        Sin bloqueadores — esta tarea puede avanzar libremente
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {deps.blockers.map((b) => (
                          <div key={b.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border
                              ${b.status === 'COMPLETADA'
                                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
                                : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}`}>
                            {b.status === 'COMPLETADA'
                              ? <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                              : <AlertOctagon  size={15} className="text-red-500 flex-shrink-0" />
                            }
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-1">
                                #{b.task_id} {b.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <TaskStatusChip status={b.status} />
                                <span className={`text-xs px-1.5 rounded ${b.type === 'BLOCKS' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                  {DEP_TYPE_LABEL[b.type]}
                                </span>
                              </div>
                            </div>
                            <button onClick={() => removeDep(b.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors p-1 flex-shrink-0">
                              <Link2Off size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Blocks */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ArrowRight size={12} className="text-amber-400" /> Bloquea a
                        {deps.blocking.length > 0 && (
                          <span className="ml-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0 rounded-full text-[10px]">
                            {deps.blocking.length}
                          </span>
                        )}
                      </h4>
                      <button onClick={() => setAddDepMode(addDepMode === 'blocked' ? null : 'blocked')}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                        <Plus size={11} /> Agregar bloqueado
                      </button>
                    </div>

                    {deps.blocking.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                        Esta tarea no bloquea a ninguna otra
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {deps.blocking.map((b) => (
                          <div key={b.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                            <Circle size={15} className="text-amber-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-1">
                                #{b.task_id} {b.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <TaskStatusChip status={b.status} />
                              </div>
                            </div>
                            <button onClick={() => removeDep(b.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors p-1 flex-shrink-0">
                              <Link2Off size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Search panel */}
                  {addDepMode && (
                    <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 space-y-3" ref={depSearchRef}>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                        {addDepMode === 'blocker' ? '¿Qué tarea bloquea a esta?' : '¿Qué tarea bloquea esta?'}
                      </p>

                      {/* Type selector */}
                      <div className="flex gap-2">
                        {['BLOCKS', 'RELATED'].map((t) => (
                          <button key={t} onClick={() => setDepType(t)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                              ${depType === t ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'}`}>
                            {t === 'BLOCKS' ? '🔒 Bloquea' : '🔗 Relacionada'}
                          </button>
                        ))}
                      </div>

                      {/* Search input */}
                      <div className="relative">
                        <input
                          autoFocus
                          value={depSearch}
                          onChange={(e) => setDepSearch(e.target.value)}
                          placeholder="Buscar tarea por título…"
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
                        {depSearching && (
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400">Buscando…</span>
                        )}
                        {depResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                            {depResults.map((t) => (
                              <button key={t.id} onClick={() => addDependency(t)}
                                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">#{t.id} {t.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <TaskStatusChip status={t.status} />
                                  {t.project_name && <span className="text-xs text-slate-400">{t.project_name}</span>}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => { setAddDepMode(null); setDepSearch(''); setDepResults([]); }}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                        Cancelar
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── COMENTARIOS ────────────────────────────────────────── */}
          {activeTab === 'comentarios' && (
            <div>
              {loadingCmt ? (
                <p className="text-xs text-slate-400">Cargando…</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Sin comentarios aún</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3 group">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex-shrink-0">
                        {(c.first_name?.[0] || c.username?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {c.first_name} {c.last_name || c.username}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {new Date(c.created_at).toLocaleDateString('es')}
                            </span>
                            {(user?.id === c.user_id || user?.id === Number(c.user_id)) && (
                              <button onClick={() => deleteComment(c.id)}
                                className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100">
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 whitespace-pre-line">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                  placeholder="Escribe un comentario… (Enter para enviar)"
                  rows={2}
                  className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white dark:bg-slate-700 dark:text-slate-100" />
                <button onClick={postComment} disabled={!newComment.trim()}
                  className="self-end bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2 rounded-lg">
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${pri.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
            {pri.label}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg transition-colors">
              Cerrar
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
              <Save size={13} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
