import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { Target, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function DeliveryPrediction({ projectId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsAPI.getDeliveryPrediction(projectId)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading || !data) return null;

  const isLate = data.predicted_date && data.planned_end_date && data.predicted_date > data.planned_end_date;
  const daysDiff = data.predicted_date && data.planned_end_date
    ? Math.ceil((new Date(data.predicted_date) - new Date(data.planned_end_date)) / 86_400_000)
    : null;

  const CONFIDENCE = { high: { label: 'Alta', color: 'text-emerald-600' }, medium: { label: 'Media', color: 'text-amber-600' }, low: { label: 'Baja', color: 'text-slate-400' } };
  const conf = CONFIDENCE[data.confidence] ?? CONFIDENCE.low;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Target size={16} className="text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Predicción de entrega</h3>
        <span className={`text-[10px] ml-auto font-medium ${conf.color}`}>Confianza: {conf.label} ({data.velocity_samples} sprints)</span>
      </div>

      {data.predicted_date ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">Fecha estimada de entrega</p>
              <p className={`text-lg font-bold ${isLate ? 'text-red-600' : 'text-emerald-600'}`}>
                {new Date(data.predicted_date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            {isLate
              ? <AlertCircle size={28} className="text-red-400 flex-shrink-0" />
              : <CheckCircle2 size={28} className="text-emerald-400 flex-shrink-0" />}
          </div>

          {daysDiff !== null && (
            <p className={`text-xs font-medium ${isLate ? 'text-red-500' : 'text-emerald-600'}`}>
              {isLate ? `⚠ ${daysDiff} días después de la fecha planeada` : `✓ ${-daysDiff} días antes de la fecha planeada`}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg py-1.5">
              <p className="font-bold text-slate-700 dark:text-slate-200">{data.remaining_points}</p>
              <p className="text-slate-400">pts. restantes</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg py-1.5">
              <p className="font-bold text-slate-700 dark:text-slate-200">{data.avg_velocity}</p>
              <p className="text-slate-400">pts./sprint</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg py-1.5">
              <p className="font-bold text-slate-700 dark:text-slate-200">{data.sprints_needed}</p>
              <p className="text-slate-400">sprints más</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">{data.message}</p>
      )}
    </div>
  );
}
