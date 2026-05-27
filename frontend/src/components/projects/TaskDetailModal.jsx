import { useEffect, useRef, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import {
  X, Send, Trash2, Clock, Flag, Calendar, Users, CheckSquare,
  Plus, Tag, AlarmClock, MessageSquare, Save,
} from 'lucide-react';

const PRIORITY_STYLES = {
  BAJA:    { label: 'Baja',    bg: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400' },
  MEDIA:   { label: 'Media',   bg: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  ALTA:    { label: 'Alta',    bg: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  CRITICA: { label: 'Crítica', bg: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
};
const STATUS_OPTIONS = ['PENDIENTE','EN_PROGRESO','BLOQUEADA','COMPLETADA'];

const LABEL_PALETTE = [
  '#ef4444','#f97316','#eab308','#22c55e',
  '#06b6d4','#6366f1','#8b5cf6','#ec4899','#64748b',
];

const TABS = [
  { id: 'detalles',    icon: Flag,          label: 'Detalles' },
  { id: 'checklist',   icon: CheckSquare,   label: 'Checklist' },
  { id: 'tiempo',      icon: AlarmClock,    label: 'Tiempo' },
  { id: 'comentarios', icon: MessageSquare, label: 'Comentarios' },
];

const AVATAR_COLORS = ['bg-indigo-500','bg-purple-500','bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500'];

export default function TaskDetailModal({ task, projectId, onClose, onSaved }) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('detalles');
  const [form, setForm]           = useState({ ...task });
  const [members, setMembers]     = useState([]);
  const [saving, setSaving]       = useState(false);

  // Multi-assignee state — initialized from task.assignees or task.assigned_to
  const [assignees, setAssignees] = useState(() => {
    if (task.assignees?.length > 0) return task.assignees.map((a) => String(a.user_id));
    return task.assigned_to ? [String(task.assigned_to)] : [];
  });

  // ── Checklist ──────────────────────────────────────────────
  const [checklists, setChecklists]   = useState([]);
  const [newItemText, setNewItemText] = useState('');
  const [addingItem, setAddingItem]   = useState(false);

  // ── Time logs ──────────────────────────────────────────────
  const [timeLogs, setTimeLogs]       = useState([]);
  const [timeForm, setTimeForm]       = useState({ hours: '', work_date: new Date().toISOString().slice(0,10), description: '' });
  const [addingTime, setAddingTime]   = useState(false);

  // ── Comments ───────────────────────────────────────────────
  const [comments, setComments]   = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingCmt, setLoadingCmt] = useState(true);

  // ── Labels ─────────────────────────────────────────────────
  const parseLabels = () => {
    try { return JSON.parse(form.labels || '[]') || []; }
    catch { return []; }
  };
  const labels = parseLabels();

  const [labelInput, setLabelInput] = useState('');
  const [labelColor, setLabelColor] = useState(LABEL_PALETTE[5]);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const labelRef = useRef(null);

  // ──────────────────────────────────────────────────────────

  useEffect(() => {
    // Comments
    projectsAPI.getTaskComments(task.id)
      .then((r) => setComments(r.data))
      .catch(() => {})
      .finally(() => setLoadingCmt(false));

    // Checklists
    projectsAPI.getChecklists(task.id)
      .then((r) => setChecklists(r.data)).catch(() => {});

    // Time logs
    projectsAPI.getTimeLogs(task.id)
      .then((r) => setTimeLogs(r.data)).catch(() => {});

    // Members
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

  // Close label picker on outside click
  useEffect(() => {
    const h = (e) => { if (labelRef.current && !labelRef.current.contains(e.target)) setShowLabelPicker(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggleAssignee = (uid) => {
    const s = String(uid);
    setAssignees((prev) =>
      prev.includes(s) ? prev.filter((id) => id !== s) : [...prev, s]
    );
  };

  // ── Save ───────────────────────────────────────────────────
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

  // ── Labels ─────────────────────────────────────────────────
  const addLabel = () => {
    const name = labelInput.trim();
    if (!name) return;
    const exists = labels.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (exists) { setLabelInput(''); return; }
    const updated = [...labels, { name, color: labelColor }];
    setForm({ ...form, labels: JSON.stringify(updated) });
    setLabelInput('');
  };
  const removeLabel = (name) => {
    const updated = labels.filter((l) => l.name !== name);
    setForm({ ...form, labels: JSON.stringify(updated) });
  };

  // ── Checklists ─────────────────────────────────────────────
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
    try {
      await projectsAPI.updateChecklist(item.id, { is_done: updated.is_done });
    } catch { setChecklists((c) => c.map((i) => i.id === item.id ? item : i)); }
  };

  const deleteCheckItem = async (id) => {
    setChecklists((c) => c.filter((i) => i.id !== id));
    try { await projectsAPI.deleteChecklist(id); }
    catch { toast.error('Error al eliminar'); }
  };

  const doneCount  = checklists.filter((c) => c.is_done).length;
  const checkPct   = checklists.length ? Math.round((doneCount / checklists.length) * 100) : 0;

  // ── Time logs ──────────────────────────────────────────────
  const submitTimeLog = async (e) => {
    e.preventDefault();
    if (!timeForm.hours || parseFloat(timeForm.hours) <= 0) {
      toast.error('Ingresa las horas trabajadas'); return;
    }
    setAddingTime(true);
    try {
      const r = await projectsAPI.createTimeLog(task.id, timeForm);
      setTimeLogs((t) => [...t, r.data]);
      setTimeForm({ hours: '', work_date: new Date().toISOString().slice(0,10), description: '' });
      // Update local form time_logged
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
    catch { if (log) setTimeLogs((t) => [...t, log]); }
  };

  const totalLogged = timeLogs.reduce((s, l) => s + parseFloat(l.hours || 0), 0);

  // ── Comments ───────────────────────────────────────────────
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

  const pri = PRIORITY_STYLES[form.priority] || PRIORITY_STYLES.MEDIA;

  // ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-xs text-slate-400 mb-0.5">Tarea #{task.id}</p>
            <h2 className="text-base font-semibold text-slate-800 line-clamp-2">{task.title}</h2>
            {/* Label pills */}
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {labels.map((l) => (
                  <span key={l.name}
                    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white"
                    style={{ background: l.color }}>
                    {l.name}
                    <button type="button" onClick={() => removeLabel(l.name)}
                      className="opacity-70 hover:opacity-100 ml-0.5">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-2">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
                ${activeTab === id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Icon size={13} />
              {label}
              {id === 'checklist' && checklists.length > 0 && (
                <span className="ml-0.5 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0 rounded-full">
                  {doneCount}/{checklists.length}
                </span>
              )}
              {id === 'comentarios' && comments.length > 0 && (
                <span className="ml-0.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0 rounded-full">
                  {comments.length}
                </span>
              )}
              {id === 'tiempo' && totalLogged > 0 && (
                <span className="ml-0.5 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0 rounded-full">
                  {totalLogged.toFixed(1)}h
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── DETALLES ──────────────────────────────────── */}
          {activeTab === 'detalles' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
                <textarea rows={3} value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              {/* Multi-assignee */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
                  <Users size={12} />
                  Asignados
                  {assignees.length > 0 && (
                    <span className="ml-1 bg-indigo-100 text-indigo-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      {assignees.length}
                    </span>
                  )}
                </label>

                {/* Selected chips */}
                {assignees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {assignees.map((uid, i) => {
                      const m = members.find((mb) => String(mb.user_id || mb.id) === uid);
                      if (!m) return null;
                      return (
                        <span key={uid}
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[8px] font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                            {(m.first_name?.[0] || '')}{(m.last_name?.[0] || '')}
                          </span>
                          {m.first_name} {m.last_name}
                          <button type="button" onClick={() => toggleAssignee(uid)}
                            className="opacity-60 hover:opacity-100 ml-0.5">
                            <X size={10} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Member checkbox list */}
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {members.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">Sin miembros disponibles</p>
                  ) : (
                    members.map((m, i) => {
                      const uid     = String(m.user_id || m.id);
                      const checked = assignees.includes(uid);
                      return (
                        <label key={uid}
                          className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors
                            ${checked ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                          <input type="checkbox" checked={checked}
                            onChange={() => toggleAssignee(uid)}
                            className="accent-indigo-600 flex-shrink-0" />
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center
                            text-[10px] font-bold text-white flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                            {(m.first_name?.[0] || '')}{(m.last_name?.[0] || '')}
                          </div>
                          <span className="text-sm text-slate-700 leading-tight">
                            {m.first_name} {m.last_name}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Status / Priority / Due date */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {STATUS_OPTIONS.map((s) => <option key={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1">
                    <Flag size={12} /> Prioridad
                  </label>
                  <select value={form.priority || 'MEDIA'} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {Object.entries(PRIORITY_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1">
                    <Calendar size={12} /> Fecha límite
                  </label>
                  <input type="date" value={form.due_date || ''}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1">
                    <Clock size={12} /> Horas estimadas
                  </label>
                  <input type="number" min="0" step="0.5" value={form.estimated_hours || 0}
                    onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1">
                    <Clock size={12} /> Horas registradas
                  </label>
                  <input type="number" min="0" step="0.5" value={form.time_logged || 0} readOnly
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500" />
                </div>
              </div>

              {form.estimated_hours > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progreso de tiempo</span>
                    <span>{parseFloat(form.time_logged || 0).toFixed(1)}h / {form.estimated_hours}h</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((form.time_logged || 0) / form.estimated_hours) * 100)}%`,
                        background: (form.time_logged || 0) > form.estimated_hours ? '#ef4444' : '#6366f1',
                      }} />
                  </div>
                </div>
              )}

              {/* Labels section */}
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-2">
                  <Tag size={12} /> Etiquetas
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {labels.map((l) => (
                    <span key={l.name}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white"
                      style={{ background: l.color }}>
                      {l.name}
                      <button onClick={() => removeLabel(l.name)} className="opacity-70 hover:opacity-100">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2" ref={labelRef}>
                  <div className="relative">
                    <button type="button" onClick={() => setShowLabelPicker(!showLabelPicker)}
                      className="w-8 h-[34px] rounded-lg border border-slate-300 flex-shrink-0"
                      style={{ background: labelColor }} />
                    {showLabelPicker && (
                      <div className="absolute z-10 top-full mt-1 left-0 bg-white border border-slate-200 rounded-xl shadow-lg p-2 flex flex-wrap gap-1.5 w-48">
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
                    placeholder="Nueva etiqueta... (Enter)"
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button type="button" onClick={addLabel}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors flex-shrink-0">
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CHECKLIST ─────────────────────────────────── */}
          {activeTab === 'checklist' && (
            <div>
              {checklists.length > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{doneCount} de {checklists.length} completados</span>
                    <span className="font-semibold">{checkPct}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${checkPct}%` }} />
                  </div>
                </div>
              )}

              <div className="space-y-1.5 mb-4">
                {checklists.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6">
                    Sin items en el checklist. Agrega el primero abajo.
                  </p>
                )}
                {checklists.map((item) => (
                  <div key={item.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 group">
                    <input type="checkbox" checked={!!item.is_done}
                      onChange={() => toggleCheck(item)}
                      className="w-4 h-4 rounded accent-indigo-600 cursor-pointer flex-shrink-0" />
                    <span className={`flex-1 text-sm transition-all ${item.is_done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {item.text}
                    </span>
                    <button onClick={() => deleteCheckItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add item */}
              <div className="flex gap-2">
                <input value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem(); } }}
                  placeholder="Nuevo item… (Enter para agregar)"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button onClick={addCheckItem} disabled={addingItem || !newItemText.trim()}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0">
                  <Plus size={13} /> Agregar
                </button>
              </div>
            </div>
          )}

          {/* ── TIEMPO ───────────────────────────────────── */}
          {activeTab === 'tiempo' && (
            <div>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-indigo-600">{parseFloat(form.estimated_hours || 0).toFixed(1)}h</p>
                  <p className="text-xs text-slate-500 mt-0.5">Estimadas</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-emerald-600">{totalLogged.toFixed(1)}h</p>
                  <p className="text-xs text-slate-500 mt-0.5">Registradas</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${totalLogged > (form.estimated_hours || 0) ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <p className={`text-lg font-bold ${totalLogged > (form.estimated_hours || 0) ? 'text-red-600' : 'text-slate-600'}`}>
                    {Math.abs(parseFloat(form.estimated_hours || 0) - totalLogged).toFixed(1)}h
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {totalLogged > (form.estimated_hours || 0) ? 'Excedido' : 'Restante'}
                  </p>
                </div>
              </div>

              {/* Log list */}
              <div className="space-y-2 mb-5">
                {timeLogs.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Sin registros de tiempo aún</p>
                ) : timeLogs.map((l) => (
                  <div key={l.id}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl group">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <AlarmClock size={14} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-indigo-700">{parseFloat(l.hours).toFixed(1)}h</span>
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
                      <p className="text-xs text-slate-500 mt-0.5">
                        {l.first_name || l.username} {l.last_name}
                        {l.description && <span> — {l.description}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add time log */}
              <form onSubmit={submitTimeLog} className="bg-indigo-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Registrar tiempo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Horas <span className="text-red-500">*</span></label>
                    <input type="number" min="0.5" max="24" step="0.5" required
                      value={timeForm.hours}
                      onChange={(e) => setTimeForm({ ...timeForm, hours: e.target.value })}
                      placeholder="1.5"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Fecha</label>
                    <input type="date"
                      value={timeForm.work_date}
                      onChange={(e) => setTimeForm({ ...timeForm, work_date: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Descripción del trabajo</label>
                  <input value={timeForm.description}
                    onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })}
                    placeholder="¿En qué trabajaste?"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                </div>
                <button type="submit" disabled={addingTime}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                  {addingTime ? 'Registrando...' : '+ Registrar horas'}
                </button>
              </form>
            </div>
          )}

          {/* ── COMENTARIOS ───────────────────────────────── */}
          {activeTab === 'comentarios' && (
            <div>
              {loadingCmt ? (
                <p className="text-xs text-slate-400">Cargando...</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Sin comentarios aún</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3 group">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 flex-shrink-0">
                        {(c.first_name?.[0] || c.username?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-700">
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
                        <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line">{c.body}</p>
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
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                <button onClick={postComment} disabled={!newComment.trim()}
                  className="self-end bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2 rounded-lg">
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${pri.bg}`}>
            <span className={`w-2 h-2 rounded-full ${pri.dot}`} /> {pri.label}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
              Cancelar
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60
                text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              <Save size={13} />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
