import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import {
  Plus, X, Save, Trash2, ChevronDown, ChevronUp,
  Calendar, MapPin, Users, FileText, CheckSquare, ClipboardList,
  Edit2, UserCheck,
} from 'lucide-react';

const MEETING_TYPES = [
  { value: 'PLANNING',      label: 'Sprint Planning',    color: 'bg-indigo-100 text-indigo-700' },
  { value: 'KICKOFF',       label: 'Kickoff',            color: 'bg-violet-100 text-violet-700' },
  { value: 'REVIEW',        label: 'Sprint Review',      color: 'bg-blue-100 text-blue-700'    },
  { value: 'RETROSPECTIVE', label: 'Retrospectiva',      color: 'bg-emerald-100 text-emerald-700' },
  { value: 'STANDUP',       label: 'Daily Standup',      color: 'bg-amber-100 text-amber-700'  },
  { value: 'STEERING',      label: 'Steering Committee', color: 'bg-rose-100 text-rose-700'    },
  { value: 'OTHER',         label: 'Otra reunión',       color: 'bg-slate-100 text-slate-600'  },
];

function typeInfo(type) {
  return MEETING_TYPES.find((t) => t.value === type) ?? MEETING_TYPES[MEETING_TYPES.length - 1];
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
}

const EMPTY_FORM = {
  title: '', type: 'OTHER', meeting_date: new Date().toISOString().slice(0, 10),
  location: '', attendees: '', agenda: '', decisions: '', notes: '',
  action_items: [{ task: '', responsible: '', due_date: '' }],
};

/* ─── ActionItemsEditor ──────────────────────────────────────────────────── */
function ActionItemsEditor({ items, onChange }) {
  const add = () => onChange([...items, { task: '', responsible: '', due_date: '' }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const set = (i, field, val) => onChange(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-start">
          <input placeholder="Acción / tarea" value={item.task}
            onChange={(e) => set(i, 'task', e.target.value)}
            className="col-span-5 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100" />
          <input placeholder="Responsable" value={item.responsible}
            onChange={(e) => set(i, 'responsible', e.target.value)}
            className="col-span-4 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100" />
          <input type="date" value={item.due_date}
            onChange={(e) => set(i, 'due_date', e.target.value)}
            className="col-span-2 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100" />
          <button type="button" onClick={() => remove(i)}
            className="col-span-1 text-slate-400 hover:text-red-500 pt-1.5 flex justify-center">
            <X size={13} />
          </button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 mt-1">
        <Plus size={12} /> Agregar acción
      </button>
    </div>
  );
}

/* ─── MeetingForm ─────────────────────────────────────────────────────────── */
function MeetingForm({ projectId, initial, onSaved, onCancel }) {
  const [form, setForm] = useState(() => {
    if (!initial) return EMPTY_FORM;
    return {
      ...EMPTY_FORM,
      ...initial,
      attendees:    Array.isArray(initial.attendees)    ? initial.attendees.join(', ')    : (initial.attendees ?? ''),
      action_items: Array.isArray(initial.action_items) && initial.action_items.length > 0
        ? initial.action_items
        : [{ task: '', responsible: '', due_date: '' }],
    };
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.meeting_date) {
      toast.error('El título y la fecha son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        attendees:    form.attendees ? form.attendees.split(',').map((s) => s.trim()).filter(Boolean) : [],
        action_items: form.action_items.filter((a) => a.task.trim()),
      };
      if (initial?.id) {
        await projectsAPI.updateMeeting(initial.id, payload);
        toast.success('Acta actualizada');
      } else {
        await projectsAPI.createMeeting(projectId, payload);
        toast.success('Acta creada');
      }
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Título *</label>
          <input required value={form.title} onChange={(e) => set('title', e.target.value)}
            placeholder="ej. Sprint Planning — Sprint 3"
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Tipo de reunión</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100">
            {MEETING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Fecha *</label>
          <input type="date" required value={form.meeting_date} onChange={(e) => set('meeting_date', e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            <MapPin size={11} className="inline mr-1" />Lugar / Link
          </label>
          <input value={form.location} onChange={(e) => set('location', e.target.value)}
            placeholder="Sala de juntas, Google Meet, Teams…"
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            <Users size={11} className="inline mr-1" />Asistentes (separados por coma)
          </label>
          <input value={form.attendees} onChange={(e) => set('attendees', e.target.value)}
            placeholder="Ana García, Luis Pérez, María López…"
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            <FileText size={11} className="inline mr-1" />Agenda / Temas tratados
          </label>
          <textarea value={form.agenda} onChange={(e) => set('agenda', e.target.value)} rows={3}
            placeholder="1. Revisión de avance\n2. Bloqueos\n3. Próximos pasos"
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100 resize-none" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            <CheckSquare size={11} className="inline mr-1" />Decisiones tomadas
          </label>
          <textarea value={form.decisions} onChange={(e) => set('decisions', e.target.value)} rows={3}
            placeholder="Decisiones clave acordadas en la reunión…"
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100 resize-none" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            <UserCheck size={11} className="inline mr-1" />Acciones / Compromisos
          </label>
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide grid grid-cols-12 gap-2 mb-1 px-0.5">
            <span className="col-span-5">Tarea / acción</span>
            <span className="col-span-4">Responsable</span>
            <span className="col-span-2">Fecha límite</span>
          </div>
          <ActionItemsEditor
            items={form.action_items}
            onChange={(v) => set('action_items', v)}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Notas adicionales</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100 resize-none" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">Cancelar</button>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Save size={14} />
          {saving ? 'Guardando…' : (initial?.id ? 'Actualizar acta' : 'Guardar acta')}
        </button>
      </div>
    </form>
  );
}

/* ─── MeetingCard ─────────────────────────────────────────────────────────── */
function MeetingCard({ meeting, isManager, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const ti = typeInfo(meeting.type);
  const attendees    = Array.isArray(meeting.attendees)    ? meeting.attendees    : [];
  const actionItems  = Array.isArray(meeting.action_items) ? meeting.action_items : [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ti.color}`}>{ti.label}</span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar size={10} /> {fmtDate(meeting.meeting_date)}
            </span>
            {meeting.location && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin size={10} /> {meeting.location}
              </span>
            )}
          </div>
          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{meeting.title}</p>
          {attendees.length > 0 && (
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Users size={10} /> {attendees.slice(0, 4).join(', ')}{attendees.length > 4 ? ` +${attendees.length - 4}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isManager && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                <Edit2 size={13} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                <Trash2 size={13} />
              </button>
            </>
          )}
          <button className="p-1.5 text-slate-400">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-4">
          {meeting.agenda && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <FileText size={10} /> Agenda
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{meeting.agenda}</p>
            </div>
          )}
          {meeting.decisions && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <CheckSquare size={10} /> Decisiones
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{meeting.decisions}</p>
            </div>
          )}
          {actionItems.length > 0 && actionItems.some((a) => a.task) && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <UserCheck size={10} /> Acciones / Compromisos
              </p>
              <div className="space-y-1.5">
                {actionItems.filter((a) => a.task).map((a, i) => (
                  <div key={i}
                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/40 rounded-lg px-3 py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-200 flex-1">{a.task}</span>
                    {a.responsible && (
                      <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0">
                        <UserCheck size={10} /> {a.responsible}
                      </span>
                    )}
                    {a.due_date && (
                      <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                        <Calendar size={10} /> {a.due_date}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {meeting.notes && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notas</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{meeting.notes}</p>
            </div>
          )}
          {meeting.created_by_name?.trim() && (
            <p className="text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
              Creada por {meeting.created_by_name.trim()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main MeetingMinutes component ──────────────────────────────────────── */
export default function MeetingMinutes({ projectId, isManager }) {
  const [meetings, setMeetings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');

  const load = () => {
    setLoading(true);
    projectsAPI.getMeetings(projectId)
      .then((r) => setMeetings(r.data))
      .catch(() => toast.error('Error al cargar actas'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta acta permanentemente?')) return;
    try {
      await projectsAPI.deleteMeeting(id);
      toast.success('Acta eliminada');
      setMeetings((m) => m.filter((x) => x.id !== id));
    } catch { toast.error('Error al eliminar'); }
  };

  const filtered = typeFilter ? meetings.filter((m) => m.type === typeFilter) : meetings;

  const typeCounts = MEETING_TYPES.reduce((acc, t) => {
    acc[t.value] = meetings.filter((m) => m.type === t.value).length;
    return acc;
  }, {});

  if (loading) return <p className="text-slate-400 text-sm text-center py-12">Cargando actas…</p>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-indigo-500" />
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Actas de reunión</h2>
            <p className="text-xs text-slate-400">{meetings.length} acta{meetings.length !== 1 ? 's' : ''} registrada{meetings.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {isManager && !showForm && (
          <button onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Plus size={14} /> Nueva acta
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <MeetingForm
          projectId={projectId}
          initial={editTarget}
          onSaved={() => { setShowForm(false); setEditTarget(null); load(); }}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* Type filter pills */}
      {meetings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTypeFilter('')}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              typeFilter === '' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-600 hover:border-slate-400'
            }`}>
            Todas ({meetings.length})
          </button>
          {MEETING_TYPES.filter((t) => typeCounts[t.value] > 0).map((t) => (
            <button key={t.value} onClick={() => setTypeFilter(typeFilter === t.value ? '' : t.value)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                typeFilter === t.value ? `${t.color} border-current` : 'border-slate-300 text-slate-600 hover:border-slate-400'
              }`}>
              {t.label} ({typeCounts[t.value]})
            </button>
          ))}
        </div>
      )}

      {/* Meetings list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {meetings.length === 0 ? 'Aún no hay actas de reunión' : 'Sin actas con ese filtro'}
          </p>
          {meetings.length === 0 && isManager && (
            <p className="text-xs text-slate-400 mt-1">Crea la primera acta con el botón "Nueva acta"</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <MeetingCard
              key={m.id}
              meeting={m}
              isManager={isManager}
              onEdit={() => { setEditTarget(m); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              onDelete={() => handleDelete(m.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
