import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { CheckCircle2, Flag, Zap, Calendar } from 'lucide-react';

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}
function fmt(date) {
  return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

const SPRINT_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#3b82f6','#10b981','#f59e0b'];
const MILESTONE_COLORS = { completed: '#10b981', pending: '#6366f1', overdue: '#ef4444' };

export default function GanttView({ projectId, project }) {
  const [sprints, setSprints]       = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      projectsAPI.getSprints(projectId),
      projectsAPI.getMilestones(projectId),
    ]).then(([sp, ml]) => {
      setSprints(sp.data);
      setMilestones(ml.data);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="text-center py-20 text-slate-400">Cargando...</div>;

  // Determine timeline range
  const allDates = [
    ...(project?.planned_start_date ? [new Date(project.planned_start_date)] : []),
    ...(project?.planned_end_date   ? [new Date(project.planned_end_date)] : []),
    ...sprints.map((s) => new Date(s.start_date)),
    ...sprints.map((s) => new Date(s.end_date)),
    ...milestones.map((m) => new Date(m.due_date)),
  ].filter((d) => !isNaN(d));

  if (allDates.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <Calendar size={40} className="mx-auto mb-3 opacity-30" />
        <p>No hay sprints ni hitos con fechas para mostrar.</p>
      </div>
    );
  }

  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  // Add padding
  minDate.setDate(minDate.getDate() - 3);
  maxDate.setDate(maxDate.getDate() + 3);

  const totalDays = diffDays(minDate, maxDate) || 1;

  const pct   = (date) => Math.max(0, Math.min(100, (diffDays(minDate, date) / totalDays) * 100));
  const width = (start, end) => Math.max(1, ((diffDays(start, end) / totalDays) * 100));

  // Generate month markers
  const months = [];
  let cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cursor <= maxDate) {
    const pos = pct(cursor);
    months.push({
      label: cursor.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
      pct: pos,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const today     = new Date();
  const todayPct  = pct(today);
  const showToday = todayPct >= 0 && todayPct <= 100;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <Calendar size={18} className="text-indigo-500" />
        <h3 className="font-semibold text-slate-700">Línea de Tiempo</h3>
        <span className="text-xs text-slate-400">
          {fmt(minDate)} → {fmt(maxDate)} ({totalDays} días)
        </span>
      </div>

      <div className="p-5 overflow-x-auto">
        <div className="min-w-[600px]">

          {/* Month markers */}
          <div className="relative h-6 mb-2">
            {months.map((m, i) => (
              <div key={i} className="absolute top-0 flex flex-col items-start"
                style={{ left: `${m.pct}%` }}>
                <div className="h-full w-px bg-slate-200" />
                <span className="text-xs text-slate-400 whitespace-nowrap mt-0.5 -ml-4">{m.label}</span>
              </div>
            ))}
          </div>

          {/* Today line */}
          {showToday && (
            <div className="relative" style={{ height: 0 }}>
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 pointer-events-none"
                style={{ left: `${todayPct}%`, height: `${(sprints.length + milestones.length + 1) * 48}px` }}>
                <span className="absolute -top-5 -translate-x-1/2 text-xs text-red-500 font-semibold bg-white px-1 border border-red-200 rounded">
                  Hoy
                </span>
              </div>
            </div>
          )}

          {/* Project bar */}
          {project?.planned_start_date && project?.planned_end_date && (
            <div className="relative h-10 mb-3 flex items-center">
              <div className="w-28 flex-shrink-0 text-xs font-semibold text-slate-500 truncate pr-2">
                Proyecto
              </div>
              <div className="flex-1 relative h-5">
                <div className="absolute h-full rounded-full bg-indigo-200 opacity-60 border border-indigo-300"
                  style={{
                    left:  `${pct(project.planned_start_date)}%`,
                    width: `${width(project.planned_start_date, project.planned_end_date)}%`,
                  }}>
                  <div className="h-full rounded-full bg-indigo-500 opacity-40"
                    style={{ width: `${project.completion_percentage || 0}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Sprint bars */}
          {sprints.length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 pl-28">Sprints</p>
              {sprints.map((s, idx) => (
                <div key={s.id} className="relative h-10 mb-2 flex items-center group">
                  <div className="w-28 flex-shrink-0 text-xs text-slate-600 truncate pr-2 font-medium"
                    title={s.name}>
                    <div className="flex items-center gap-1">
                      <Zap size={11} className="text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{s.name}</span>
                    </div>
                    <span className={`text-xs ml-3 ${
                      s.status === 'ACTIVO' ? 'text-emerald-600' :
                      s.status === 'CERRADO' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="flex-1 relative h-7">
                    <div
                      className="absolute h-full rounded-lg flex items-center px-2 text-white text-xs font-medium overflow-hidden transition-all"
                      style={{
                        left:  `${pct(s.start_date)}%`,
                        width: `${Math.max(2, width(s.start_date, s.end_date))}%`,
                        background: SPRINT_COLORS[idx % SPRINT_COLORS.length],
                        opacity: s.status === 'CERRADO' ? 0.5 : 1,
                      }}>
                      <span className="truncate">{fmt(s.start_date)} – {fmt(s.end_date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Milestones */}
          {milestones.length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-4 mb-2 pl-28">Hitos</p>
              {milestones.map((m) => {
                const isOverdue  = !m.is_completed && new Date(m.due_date) < today;
                const color      = m.is_completed ? MILESTONE_COLORS.completed
                                 : isOverdue      ? MILESTONE_COLORS.overdue
                                 : MILESTONE_COLORS.pending;
                return (
                  <div key={m.id} className="relative h-10 mb-2 flex items-center group">
                    <div className="w-28 flex-shrink-0 text-xs text-slate-600 truncate pr-2"
                      title={m.title}>
                      <div className="flex items-center gap-1">
                        {m.is_completed
                          ? <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
                          : <Flag size={11} className={`flex-shrink-0 ${isOverdue ? 'text-red-400' : 'text-indigo-400'}`} />
                        }
                        <span className="truncate">{m.title}</span>
                      </div>
                    </div>
                    <div className="flex-1 relative h-7 flex items-center">
                      {/* Diamond marker */}
                      <div className="absolute flex items-center justify-center"
                        style={{ left: `calc(${pct(m.due_date)}% - 10px)`, top: '50%', transform: 'translateY(-50%)' }}>
                        <div className="w-5 h-5 rotate-45 rounded-sm flex-shrink-0 border-2 border-white shadow"
                          style={{ background: color }} />
                      </div>
                      <span className="absolute text-xs whitespace-nowrap"
                        style={{ left: `calc(${pct(m.due_date)}% + 12px)`, color }}>
                        {fmt(m.due_date)}
                        {isOverdue && ' ⚠️'}
                        {m.is_completed && ' ✓'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500" /> Sprints</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rotate-45 bg-emerald-500 inline-block" /> Hito completado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rotate-45 bg-indigo-500 inline-block" /> Hito pendiente</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rotate-45 bg-red-500 inline-block" /> Hito vencido</span>
        {showToday && <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-red-400 inline-block" /> Hoy</span>}
      </div>
    </div>
  );
}
