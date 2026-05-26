import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../services/projectsAPI';
import Layout from '../components/Layout';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, CalendarDays, Flag, CheckCircle2, AlertTriangle, Clock,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const TASK_STYLE = {
  PENDIENTE:   'bg-slate-100 text-slate-600 border-slate-200',
  EN_PROGRESO: 'bg-blue-100 text-blue-700 border-blue-200',
  BLOQUEADA:   'bg-red-100 text-red-700 border-red-200',
  COMPLETADA:  'bg-slate-100 text-slate-400 border-slate-100 line-through',
};

const PRIORITY_DOT = {
  CRITICA: 'bg-red-500', ALTA: 'bg-amber-500', MEDIA: 'bg-blue-400', BAJA: 'bg-slate-300',
};

// ─── Legend chip ───────────────────────────────────────────────────────────────
function LegendChip({ color, label }) {
  return (
    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${color}`}>
      {label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [data, setData]   = useState({ tasks: [], milestones: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]  = useState('all'); // all | tasks | milestones

  useEffect(() => {
    setLoading(true);
    projectsAPI.getCalendar(year, month)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Error al cargar el calendario'))
      .finally(() => setLoading(false));
  }, [year, month]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); };

  // ── Build calendar grid ─────────────────────────────────────────────────────
  const firstDay     = new Date(year, month - 1, 1);
  const daysInMonth  = new Date(year, month, 0).getDate();
  const startDow     = (firstDay.getDay() + 6) % 7; // 0=Mon

  // Group events by day number
  const allItems = [
    ...(filter !== 'milestones' ? data.tasks      : []),
    ...(filter !== 'tasks'      ? data.milestones  : []),
  ];
  const byDay = {};
  allItems.forEach((item) => {
    if (!item.due_date) return;
    const d = parseInt(item.due_date.split('-')[2], 10);
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(item);
  });

  // Build cell array: null = empty leading cell, number = day
  const cells = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayY = now.getFullYear();
  const todayM = now.getMonth() + 1;
  const todayD = now.getDate();
  const isCurrentMonth = todayY === year && todayM === month;

  const totalItems = data.tasks.length + data.milestones.length;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-5">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarDays size={24} className="text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Calendario</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {loading ? 'Cargando…' : `${totalItems} evento${totalItems !== 1 ? 's' : ''} en ${MONTH_NAMES[month - 1]}`}
              </p>
            </div>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-2">
            <button onClick={prevMonth}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToday}
              className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
              Hoy
            </button>
            <button onClick={nextMonth}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ── Month title + filter ─────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">
            {MONTH_NAMES[month - 1]} {year}
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Legend */}
            <LegendChip color="bg-blue-100 text-blue-700 border-blue-200"    label="Tarea activa" />
            <LegendChip color="bg-slate-100 text-slate-400 border-slate-100" label="Completada" />
            <LegendChip color="bg-red-100 text-red-600 border-red-200"       label="Bloqueada" />
            <LegendChip color="bg-purple-100 text-purple-700 border-purple-200" label="◆ Hito" />

            {/* Filter */}
            <div className="flex gap-1 ml-2">
              {[['all','Todo'],['tasks','Tareas'],['milestones','Hitos']].map(([val, lbl]) => (
                <button key={val} onClick={() => setFilter(val)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                    filter === val ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Calendar grid ────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
            {DAY_NAMES.map((d) => (
              <div key={d}
                className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 py-3">
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="h-96 flex items-center justify-center text-slate-400">
              <CalendarDays size={32} className="animate-pulse opacity-40" />
            </div>
          ) : (
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-700">
              {cells.map((day, idx) => {
                if (day === null) {
                  return (
                    <div key={`empty-${idx}`}
                      className="min-h-28 p-1 bg-slate-50/50 dark:bg-slate-900/20" />
                  );
                }

                const dayItems = byDay[day] || [];
                const isToday  = isCurrentMonth && day === todayD;
                const isPast   = new Date(year, month - 1, day) < new Date(todayY, todayM - 1, todayD);
                const hasOverdue = dayItems.some(
                  (i) => i.item_type === 'task' && i.status !== 'COMPLETADA' && isPast
                );

                return (
                  <div key={day}
                    className={`min-h-28 p-1.5 flex flex-col transition-colors
                      ${isToday ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : ''}
                      ${isPast && !isToday ? 'bg-slate-50/40 dark:bg-slate-900/10' : ''}`}>

                    {/* Day number */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full
                        ${isToday
                          ? 'bg-indigo-600 text-white'
                          : isPast
                            ? 'text-slate-300 dark:text-slate-600'
                            : 'text-slate-600 dark:text-slate-300'}`}>
                        {day}
                      </span>
                      {hasOverdue && (
                        <AlertTriangle size={11} className="text-red-400 flex-shrink-0" title="Tareas vencidas" />
                      )}
                    </div>

                    {/* Events (show up to 3, then +N) */}
                    <div className="space-y-0.5 flex-1">
                      {dayItems.slice(0, 3).map((item, i) => {
                        const isMilestone = item.item_type === 'milestone';
                        const isOverdueBadge = item.item_type === 'task'
                          && item.status !== 'COMPLETADA'
                          && isPast;

                        const cls = isMilestone
                          ? (parseInt(item.is_completed)
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-purple-100 text-purple-700 border-purple-200')
                          : (isOverdueBadge
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : (TASK_STYLE[item.status] || 'bg-slate-100 text-slate-600 border-slate-200'));

                        const tabParam = isMilestone ? 'milestones' : 'kanban';

                        return (
                          <Link key={`${item.item_type}-${item.id}`}
                            to={`/projects/${item.project_id}?tab=${tabParam}`}
                            title={`${item.title} — ${item.project_name}`}
                            className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border truncate
                              hover:opacity-80 transition-opacity ${cls}`}>
                            {isMilestone
                              ? <Flag size={9} className="flex-shrink-0" />
                              : item.priority && (
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[item.priority] || 'bg-slate-300'}`} />
                                )
                            }
                            <span className="truncate">{item.title}</span>
                          </Link>
                        );
                      })}
                      {dayItems.length > 3 && (
                        <span className="text-xs text-slate-400 pl-1.5">
                          +{dayItems.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Summary list ─────────────────────────────────────────────── */}
        {!loading && totalItems > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              Todos los eventos de {MONTH_NAMES[month - 1]}
            </h3>
            <div className="space-y-1">
              {allItems
                .sort((a, b) => a.due_date.localeCompare(b.due_date))
                .map((item) => {
                  const isMilestone = item.item_type === 'milestone';
                  const today0 = new Date(todayY, todayM - 1, todayD);
                  const itemDate = new Date(item.due_date);
                  const isPastItem = itemDate < today0;
                  const isOverdueItem = isPastItem && !isMilestone && item.status !== 'COMPLETADA';
                  const isOverdueMilestone = isPastItem && isMilestone && !parseInt(item.is_completed);

                  return (
                    <Link key={`${item.item_type}-${item.id}`}
                      to={`/projects/${item.project_id}?tab=${isMilestone ? 'milestones' : 'kanban'}`}
                      className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <span className="text-xs text-slate-400 font-mono w-16 flex-shrink-0">
                        {item.due_date.slice(5)} {/* MM-DD */}
                      </span>
                      <span className="flex-shrink-0">
                        {isMilestone
                          ? <Flag size={13} className={parseInt(item.is_completed) ? 'text-emerald-500' : isOverdueMilestone ? 'text-red-400' : 'text-purple-500'} />
                          : item.status === 'COMPLETADA'
                            ? <CheckCircle2 size={13} className="text-emerald-400" />
                            : isOverdueItem
                              ? <AlertTriangle size={13} className="text-red-400" />
                              : <Clock size={13} className="text-blue-400" />
                        }
                      </span>
                      <span className={`text-sm flex-1 truncate ${
                        item.status === 'COMPLETADA' || parseInt(item.is_completed)
                          ? 'line-through text-slate-400'
                          : isOverdueItem || isOverdueMilestone
                            ? 'text-red-600 font-medium'
                            : 'text-slate-700 dark:text-slate-200'
                      }`}>
                        {item.title}
                      </span>
                      <span className="text-xs text-slate-400 truncate max-w-[120px] flex-shrink-0">
                        {item.project_code}
                      </span>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        {!loading && totalItems === 0 && (
          <div className="text-center py-16">
            <CalendarDays size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Sin eventos en {MONTH_NAMES[month - 1]} {year}
            </p>
            <button onClick={nextMonth}
              className="mt-3 text-indigo-600 hover:underline text-sm">
              Ver siguiente mes →
            </button>
          </div>
        )}

      </div>
    </Layout>
  );
}
