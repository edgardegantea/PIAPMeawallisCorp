import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { projectsAPI } from '../services/projectsAPI';
import { Shield, Calendar, Users, Flag, AlertTriangle, CheckCircle2, Clock, CircleDot } from 'lucide-react';

const STATUS_LABELS = {
  PLANIFICACION:'Planificación', EJECUCION:'Ejecución', SEGUIMIENTO:'Seguimiento',
  CIERRE:'Cierre', COMPLETADO:'Completado', CANCELADO:'Cancelado',
};

export default function GuestPage() {
  const { token }           = useParams();
  const [data,    setData]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]  = useState('');

  useEffect(() => {
    projectsAPI.getGuestView(token)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.message || 'Enlace no válido'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-slate-400">Cargando…</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm max-w-sm">
        <Shield size={40} className="mx-auto mb-3 text-red-400" />
        <h1 className="text-lg font-bold text-slate-800 mb-2">Enlace no válido</h1>
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    </div>
  );

  const { project, sprints, milestones, risks, task_stats, invite } = data;

  const taskCounts = task_stats.reduce((acc, r) => ({ ...acc, [r.status]: parseInt(r.cnt) }), {});
  const totalTasks = Object.values(taskCounts).reduce((s, n) => s + n, 0);
  const doneTasks  = taskCounts['COMPLETADA'] || 0;
  const pct        = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <Shield size={18} className="text-indigo-500" />
        <span className="text-sm text-slate-500">Vista de solo lectura —</span>
        <span className="text-sm font-semibold text-slate-700">{project.name}</span>
        {invite?.label && <span className="text-xs text-slate-400 ml-auto">Acceso: {invite.label}</span>}
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Project header */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
              <p className="text-slate-500 mt-1">{project.description}</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full whitespace-nowrap">
              {STATUS_LABELS[project.status] ?? project.status}
            </span>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between text-sm text-slate-500 mb-2">
              <span>Avance general</span>
              <span className="font-semibold">{pct}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-indigo-500' : 'bg-amber-400'}`}
                style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { icon: CheckCircle2, label: 'Completadas', value: doneTasks, color: 'text-emerald-600' },
              { icon: Clock,        label: 'En progreso', value: taskCounts['EN_PROGRESO'] || 0, color: 'text-indigo-600' },
              { icon: CircleDot,    label: 'Pendientes',  value: taskCounts['PENDIENTE']   || 0, color: 'text-slate-500'  },
              { icon: AlertTriangle,label: 'Bloqueadas',  value: taskCounts['BLOQUEADA']   || 0, color: 'text-red-500'   },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                <Icon size={20} className={`mx-auto mb-1 ${color}`} />
                <p className="text-xl font-bold text-slate-800">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sprints */}
        {sprints.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-500" /> Sprints
            </h2>
            <div className="space-y-2">
              {sprints.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.start_date} → {s.end_date}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.status === 'ACTIVO' ? 'bg-indigo-100 text-indigo-700' :
                    s.status === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Flag size={16} className="text-purple-500" /> Hitos
            </h2>
            <div className="space-y-2">
              {milestones.map((m) => {
                const overdue = !m.is_completed && m.due_date && new Date(m.due_date) < new Date();
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                    {m.is_completed
                      ? <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                      : <Flag size={16} className={`flex-shrink-0 ${overdue ? 'text-red-400' : 'text-purple-400'}`} />}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${m.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{m.title}</p>
                      <p className={`text-xs ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                        {m.due_date} {overdue ? '— vencido' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400">
          Vista de solo lectura generada por MaeWallisCorp Gestión de Proyectos
        </p>
      </div>
    </div>
  );
}
