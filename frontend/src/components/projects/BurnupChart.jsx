import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function BurnupChart({ sprintId, sprintName }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sprintId) return;
    projectsAPI.getSprintBurnup(sprintId)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sprintId]);

  if (loading) return <div className="text-center py-8 text-slate-400 text-sm">Cargando burnup…</div>;
  if (!data || !data.dates?.length) return <div className="text-center py-8 text-slate-400 text-sm">Sin datos de burnup.</div>;

  const chartData = data.dates.map((date, i) => ({
    date: date.slice(5), // MM-DD
    'Alcance total': data.total_scope[i],
    'Completado':    data.completed[i],
  }));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Burnup — {sprintName || 'Sprint'}
        </h3>
        <span className="text-xs text-slate-400 ml-auto">
          {data.total_points} puntos totales
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="scopeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#e0e7ff" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#e0e7ff" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="doneGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="Alcance total" stroke="#6366f1" strokeWidth={2}
            fill="url(#scopeGrad)" strokeDasharray="5 5" />
          <Area type="monotone" dataKey="Completado" stroke="#10b981" strokeWidth={2}
            fill="url(#doneGrad)" />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 text-center mt-2">
        La línea sólida (completado) idealmente alcanza la punteada (alcance).
      </p>
    </div>
  );
}
