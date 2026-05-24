import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { ClipboardList, RotateCcw, ChevronDown } from 'lucide-react';

// ─── Sprint Review ────────────────────────────────────────────────────────────
function SprintReviewPanel({ sprint, isManager }) {
  const [data, setData]     = useState(null);
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty]   = useState(false);

  useEffect(() => {
    if (!sprint) return;
    projectsAPI.getSprintReview(sprint.id).then((r) => {
      const d = r.data || {};
      setData(d);
      setForm({
        project_id:           sprint.project_id,
        goal_achieved:        d.goal_achieved        ?? '',
        summary:              d.summary              ?? '',
        demonstrated_items:   d.demonstrated_items   ?? '',
        stakeholder_feedback: d.stakeholder_feedback ?? '',
        attendees:            d.attendees            ?? '',
        next_steps:           d.next_steps           ?? '',
      });
    });
  }, [sprint]);

  const change = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  const save = async () => {
    setSaving(true);
    try {
      await projectsAPI.updateSprintReview(sprint.id, form);
      toast.success('Sprint Review guardada');
      setDirty(false);
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  if (!sprint) return null;

  const fields = [
    { key: 'summary',              label: 'Resumen de la revisión',         rows: 3 },
    { key: 'demonstrated_items',   label: 'Ítems demostrados',              rows: 3 },
    { key: 'stakeholder_feedback', label: 'Feedback de stakeholders',       rows: 3 },
    { key: 'attendees',            label: 'Asistentes',                     rows: 2 },
    { key: 'next_steps',           label: 'Próximos pasos',                 rows: 2 },
  ];

  return (
    <div className="space-y-4">
      {/* Goal achieved */}
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-sm font-semibold text-slate-700 mb-2">¿Se alcanzó el objetivo del sprint?</p>
        <div className="flex gap-3">
          {['SI', 'NO', 'PARCIAL'].map((v) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="goal_achieved"
                value={v}
                checked={form.goal_achieved === v}
                onChange={() => change('goal_achieved', v)}
                disabled={!isManager}
                className="accent-indigo-600"
              />
              <span className={`text-sm font-medium ${
                v === 'SI'      ? 'text-emerald-700' :
                v === 'NO'      ? 'text-red-600'     : 'text-amber-600'
              }`}>{v === 'SI' ? 'Sí' : v === 'NO' ? 'No' : 'Parcial'}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Text fields */}
      {fields.map(({ key, label, rows }) => (
        <div key={key}>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">{label}</label>
          <textarea
            rows={rows}
            value={form[key] || ''}
            onChange={(e) => change(key, e.target.value)}
            disabled={!isManager}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:bg-slate-50 disabled:text-slate-500"
            placeholder={isManager ? `Escribe aquí...` : 'Sin registrar'}
          />
        </div>
      ))}

      {isManager && (
        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg"
          >
            {saving ? 'Guardando...' : 'Guardar Sprint Review'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sprint Retrospective ─────────────────────────────────────────────────────
const MOOD_LABELS = ['', '😞', '😕', '😐', '🙂', '😄'];

function SprintRetroPanel({ sprint, isManager }) {
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty]   = useState(false);

  useEffect(() => {
    if (!sprint) return;
    projectsAPI.getSprintRetro(sprint.id).then((r) => {
      const d = r.data || {};
      setForm({
        project_id:   sprint.project_id,
        went_well:    d.went_well    ?? '',
        to_improve:   d.to_improve   ?? '',
        action_items: d.action_items ?? '',
        team_mood:    d.team_mood    ?? '',
      });
    });
  }, [sprint]);

  const change = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  const save = async () => {
    setSaving(true);
    try {
      await projectsAPI.updateSprintRetro(sprint.id, form);
      toast.success('Retrospectiva guardada');
      setDirty(false);
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  if (!sprint) return null;

  const cols = [
    { key: 'went_well',    label: '✅ ¿Qué salió bien?',         color: 'border-emerald-200 bg-emerald-50' },
    { key: 'to_improve',   label: '🔧 ¿Qué mejorar?',            color: 'border-amber-200   bg-amber-50'   },
    { key: 'action_items', label: '🎯 Acciones de mejora',        color: 'border-indigo-200  bg-indigo-50'  },
  ];

  return (
    <div className="space-y-4">
      {/* Team mood */}
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">Ánimo del equipo</p>
        <div className="flex gap-4">
          {[1,2,3,4,5].map((n) => (
            <button
              key={n}
              onClick={() => isManager && change('team_mood', n)}
              disabled={!isManager}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-colors ${
                Number(form.team_mood) === n
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-transparent hover:border-slate-200'
              } disabled:cursor-default`}
            >
              <span className="text-2xl">{MOOD_LABELS[n]}</span>
              <span className="text-xs text-slate-500">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Three-column retro */}
      <div className="grid md:grid-cols-3 gap-4">
        {cols.map(({ key, label, color }) => (
          <div key={key} className={`border rounded-xl p-3 ${color}`}>
            <p className="text-xs font-semibold text-slate-700 mb-2">{label}</p>
            <textarea
              rows={6}
              value={form[key] || ''}
              onChange={(e) => change(key, e.target.value)}
              disabled={!isManager}
              placeholder={isManager ? 'Escribe aquí...' : 'Sin registrar'}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:text-slate-500"
            />
          </div>
        ))}
      </div>

      {isManager && (
        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg"
          >
            {saving ? 'Guardando...' : 'Guardar Retrospectiva'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SprintCeremonies({ projectId, isManager }) {
  const [sprints, setSprints]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [panel, setPanel]       = useState('review'); // 'review' | 'retro'
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    projectsAPI.getSprints(projectId).then((r) => {
      const list = r.data || [];
      setSprints(list);
      // Default to active sprint or first
      const active = list.find((s) => s.status === 'ACTIVO') || list[0] || null;
      setSelected(active);
    }).finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  if (sprints.length === 0) {
    return <p className="text-slate-400 text-sm text-center py-8">No hay sprints creados aún.</p>;
  }

  return (
    <div>
      {/* Sprint selector + panel switcher */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Sprint dropdown */}
        <div className="relative">
          <select
            value={selected?.id || ''}
            onChange={(e) => {
              const sp = sprints.find((s) => String(s.id) === e.target.value);
              setSelected(sp || null);
            }}
            className="appearance-none border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.status === 'ACTIVO' ? ' (activo)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Panel tabs */}
        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setPanel('review')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              panel === 'review' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ClipboardList size={14} /> Sprint Review
          </button>
          <button
            onClick={() => setPanel('retro')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-l border-slate-200 ${
              panel === 'retro' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <RotateCcw size={14} /> Retrospectiva
          </button>
        </div>
      </div>

      {/* Panel content */}
      {selected && panel === 'review' && (
        <SprintReviewPanel sprint={selected} isManager={isManager} />
      )}
      {selected && panel === 'retro' && (
        <SprintRetroPanel sprint={selected} isManager={isManager} />
      )}
    </div>
  );
}
