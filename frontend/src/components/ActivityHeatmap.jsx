/**
 * GitHub-style activity heatmap for a user.
 * Fetches audit_logs for the user and renders a 52-week grid.
 */
import { useEffect, useState } from 'react';
import { projectsAPI } from '../services/projectsAPI';

function generateWeeks(entries) {
  // Build a map of date → count
  const counts = {};
  entries.forEach((e) => {
    const date = e.created_at?.slice(0, 10);
    if (date) counts[date] = (counts[date] || 0) + 1;
  });

  const maxCount = Math.max(1, ...Object.values(counts));

  // Generate 52 weeks (364 days) ending today
  const today    = new Date();
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - 363);
  // Align to Sunday
  startDay.setDate(startDay.getDate() - startDay.getDay());

  const weeks = [];
  let cur = new Date(startDay);
  while (cur <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cur.toISOString().slice(0, 10);
      const count   = counts[dateStr] || 0;
      const level   = count === 0 ? 0 : Math.ceil((count / maxCount) * 4);
      week.push({ date: dateStr, count, level });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return { weeks, maxCount };
}

const LEVEL_COLORS = [
  'bg-slate-100 dark:bg-slate-700',
  'bg-emerald-200 dark:bg-emerald-900/60',
  'bg-emerald-300 dark:bg-emerald-700',
  'bg-emerald-500 dark:bg-emerald-600',
  'bg-emerald-600 dark:bg-emerald-400',
];

export default function ActivityHeatmap({ userId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    // Use audit log filtered by user
    projectsAPI.getAuditLog({ user_id: userId, per_page: 1000 })
      .then((r) => setEntries(r.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="text-center py-6 text-slate-400 text-sm">Cargando actividad…</div>;

  const { weeks } = generateWeeks(entries);
  const totalEntries = entries.length;

  // Month labels
  const months = [];
  let lastMonth = '';
  weeks.forEach((week, wi) => {
    const month = new Date(week[0].date).toLocaleDateString('es', { month: 'short' });
    if (month !== lastMonth) { months.push({ label: month, idx: wi }); lastMonth = month; }
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Actividad — {totalEntries} acciones en el último año
        </p>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          Menos <div className="flex gap-0.5 mx-1">{LEVEL_COLORS.map((c, i) => <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />)}</div> Más
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="relative">
          {/* Month labels */}
          <div className="flex gap-0.5 mb-1 text-[10px] text-slate-400" style={{ paddingLeft: '2px' }}>
            {weeks.map((_, wi) => {
              const m = months.find((m) => m.idx === wi);
              return <div key={wi} className="w-3 text-center">{m ? m.label : ''}</div>;
            })}
          </div>

          {/* Grid: columns = weeks, rows = days */}
          <div className="flex gap-0.5">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <div
                    key={di}
                    onMouseEnter={() => setHovered(day)}
                    onMouseLeave={() => setHovered(null)}
                    className={`w-3 h-3 rounded-sm cursor-pointer transition-opacity hover:opacity-80 ${LEVEL_COLORS[day.level]}`}
                    title={`${day.date}: ${day.count} acciones`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Tooltip */}
          {hovered && hovered.count > 0 && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
              {hovered.count} acción{hovered.count > 1 ? 'es' : ''} el {hovered.date}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
