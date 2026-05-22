import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import {
  Activity, CheckCircle2, Plus, Edit2, Trash2, Flag,
  AlertTriangle, Users, RefreshCw,
} from 'lucide-react';

const ACTION_META = {
  task_created:       { icon: Plus,          color: 'bg-indigo-100 text-indigo-600',  label: 'Tarea creada' },
  task_status_changed:{ icon: RefreshCw,     color: 'bg-blue-100 text-blue-600',      label: 'Estado cambiado' },
  task_completed:     { icon: CheckCircle2,  color: 'bg-emerald-100 text-emerald-600',label: 'Tarea completada' },
  milestone_completed:{ icon: Flag,          color: 'bg-purple-100 text-purple-600',  label: 'Hito completado' },
  risk_created:       { icon: AlertTriangle, color: 'bg-amber-100 text-amber-600',    label: 'Riesgo identificado' },
  incident_created:   { icon: AlertTriangle, color: 'bg-red-100 text-red-600',        label: 'Incidencia reportada' },
  incident_updated:   { icon: Edit2,         color: 'bg-orange-100 text-orange-600',  label: 'Incidencia actualizada' },
  default:            { icon: Activity,      color: 'bg-slate-100 text-slate-600',    label: 'Actividad' },
};

function timeSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (mins < 1)   return 'ahora mismo';
  if (mins < 60)  return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 7)   return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

export default function ActivityFeed({ projectId }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const PER_PAGE = 15;

  const load = () => {
    setLoading(true);
    projectsAPI.getActivity(projectId)
      .then((r) => setItems(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  if (loading) return <div className="text-center py-20 text-slate-400">Cargando actividad...</div>;

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <Activity size={40} className="mx-auto mb-3 opacity-30" />
        <p>Sin actividad registrada aún.</p>
        <p className="text-xs mt-1">Las acciones sobre tareas, hitos, riesgos e incidencias aparecerán aquí.</p>
      </div>
    );
  }

  const paginated  = items.slice(0, page * PER_PAGE);
  const hasMore    = paginated.length < items.length;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-indigo-500" />
          <h3 className="font-semibold text-slate-700">Actividad del Proyecto</h3>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <button onClick={load} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Actualizar">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="divide-y divide-slate-50">
        {paginated.map((item, idx) => {
          const meta   = ACTION_META[item.action] || ACTION_META.default;
          const Icon   = meta.icon;
          const initials = ((item.first_name?.[0] || '') + (item.last_name?.[0] || '')).toUpperCase()
            || item.username?.[0]?.toUpperCase() || '?';

          return (
            <div key={item.id || idx} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
              {/* Action icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                <Icon size={14} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 leading-snug">{item.description}</p>
                <div className="flex items-center gap-3 mt-1">
                  {item.username && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                        {initials}
                      </span>
                      {item.first_name || item.username}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{timeSince(item.created_at)}</span>
                </div>
              </div>

              {/* Time */}
              <span className="text-xs text-slate-300 flex-shrink-0 hidden sm:block">
                {new Date(item.created_at).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'2-digit' })}
              </span>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="px-5 py-4 border-t border-slate-100 text-center">
          <button onClick={() => setPage((p) => p + 1)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline">
            Cargar más ({items.length - paginated.length} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
