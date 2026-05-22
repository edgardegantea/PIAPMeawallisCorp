import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { Users, CheckCircle2, Clock, AlertOctagon, CircleDot } from 'lucide-react';

const STATUS_META = {
  done:        { label: 'Completadas', color: '#10b981', bg: 'bg-emerald-100 text-emerald-700' },
  in_progress: { label: 'En progreso', color: '#6366f1', bg: 'bg-indigo-100 text-indigo-700' },
  pending:     { label: 'Pendientes',  color: '#94a3b8', bg: 'bg-slate-100 text-slate-600' },
  blocked:     { label: 'Bloqueadas',  color: '#ef4444', bg: 'bg-red-100 text-red-700' },
};

export default function WorkloadView({ projectId }) {
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    projectsAPI.getWorkload(projectId)
      .then((r) => setWorkload(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="text-center py-20 text-slate-400">Cargando carga de trabajo...</div>;

  if (workload.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <Users size={40} className="mx-auto mb-3 opacity-30" />
        <p>No hay datos de carga de trabajo. Asigna tareas a los miembros del equipo.</p>
      </div>
    );
  }

  const maxTasks = Math.max(...workload.map((m) => m.tasks_total || 0), 1);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const total = workload.reduce((s, m) => {
            const v = key === 'done' ? m.tasks_done
                    : key === 'in_progress' ? m.tasks_in_progress
                    : key === 'pending'     ? m.tasks_pending
                    : m.tasks_blocked;
            return s + (v || 0);
          }, 0);
          return (
            <div key={key} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${meta.color}20` }}>
                {key === 'done'        && <CheckCircle2 size={18} style={{ color: meta.color }} />}
                {key === 'in_progress' && <Clock        size={18} style={{ color: meta.color }} />}
                {key === 'pending'     && <CircleDot    size={18} style={{ color: meta.color }} />}
                {key === 'blocked'     && <AlertOctagon size={18} style={{ color: meta.color }} />}
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">{total}</p>
                <p className="text-xs text-slate-500">{meta.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Member rows */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-[1fr_80px_80px_80px_80px_100px_100px] gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>Miembro</span>
            <span className="text-center">Total</span>
            <span className="text-center text-emerald-600">Hechas</span>
            <span className="text-center text-indigo-600">En curso</span>
            <span className="text-center text-red-500">Bloq.</span>
            <span className="text-center">Horas est.</span>
            <span className="text-center">Horas reg.</span>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {workload.map((m) => {
            const initials = ((m.first_name?.[0] || '') + (m.last_name?.[0] || '')).toUpperCase()
              || m.username?.[0]?.toUpperCase() || '?';
            const barW = maxTasks > 0 ? ((m.tasks_total || 0) / maxTasks) * 100 : 0;
            const doneW = m.tasks_total > 0 ? ((m.tasks_done || 0) / m.tasks_total) * 100 : 0;
            const inProgW = m.tasks_total > 0 ? ((m.tasks_in_progress || 0) / m.tasks_total) * 100 : 0;
            const blockedW = m.tasks_total > 0 ? ((m.tasks_blocked || 0) / m.tasks_total) * 100 : 0;
            const overHours = parseFloat(m.hours_logged || 0) > parseFloat(m.hours_estimated || 0);

            return (
              <div key={m.user_id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="grid grid-cols-[1fr_80px_80px_80px_80px_100px_100px] gap-2 items-center">
                  {/* Member */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {m.first_name} {m.last_name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">@{m.username}</p>
                    </div>
                  </div>

                  <span className="text-center text-sm font-bold text-slate-700">{m.tasks_total || 0}</span>
                  <span className="text-center text-sm font-semibold text-emerald-600">{m.tasks_done || 0}</span>
                  <span className="text-center text-sm font-semibold text-indigo-600">{m.tasks_in_progress || 0}</span>
                  <span className={`text-center text-sm font-semibold ${(m.tasks_blocked || 0) > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                    {m.tasks_blocked || 0}
                  </span>
                  <span className="text-center text-xs text-slate-500">{parseFloat(m.hours_estimated || 0).toFixed(0)}h</span>
                  <span className={`text-center text-xs font-semibold ${overHours ? 'text-red-500' : 'text-slate-500'}`}>
                    {parseFloat(m.hours_logged || 0).toFixed(1)}h
                    {overHours && ' ⚠'}
                  </span>
                </div>

                {/* Mini stacked bar */}
                {m.tasks_total > 0 && (
                  <div className="mt-2 ml-12 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${doneW}%` }} />
                    <div className="h-full bg-indigo-500 transition-all" style={{ width: `${inProgW}%` }} />
                    <div className="h-full bg-red-400 transition-all" style={{ width: `${blockedW}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500 bg-slate-50">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completadas</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> En progreso</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Bloqueadas</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-200" /> Pendientes</span>
        </div>
      </div>
    </div>
  );
}
