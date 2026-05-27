import { useEffect, useState, useCallback } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  TrendingDown, Zap, Flag, ChevronDown, RefreshCw,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

const CustomBurndownTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{fmtDate(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value !== null ? `${p.value}h` : '—'}
        </p>
      ))}
    </div>
  );
};

const CustomVelocityTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}h
        </p>
      ))}
    </div>
  );
};

// ── SprintSelector ─────────────────────────────────────────────────────────
function SprintSelector({ sprints, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = sprints.find((s) => s.id === value);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300
                   bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-w-[160px]">
        <Flag size={13} className="text-indigo-500 flex-shrink-0" />
        <span className="flex-1 text-left truncate">
          {selected ? `Sprint ${selected.number}: ${selected.name}` : 'Seleccionar sprint…'}
        </span>
        <ChevronDown size={13} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                        rounded-xl shadow-xl min-w-[240px] py-1 max-h-64 overflow-y-auto">
          {sprints.map((s) => (
            <button key={s.id}
              onClick={() => { onChange(s.id); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors
                ${s.id === value ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/50 dark:bg-indigo-900/20' : 'text-slate-700 dark:text-slate-300'}`}>
              <p className="font-medium">Sprint {s.number}: {s.name}</p>
              {s.start_date && s.end_date && (
                <p className="text-xs text-slate-400 mt-0.5">{fmtDate(s.start_date)} — {fmtDate(s.end_date)}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function SprintMetrics({ projectId }) {
  const [sprints, setSprints]   = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [burndown, setBurndown] = useState(null);
  const [velocity, setVelocity] = useState([]);
  const [loadingBd, setLoadingBd] = useState(false);
  const [loadingVel, setLoadingVel] = useState(false);

  // Load sprints list
  useEffect(() => {
    projectsAPI.getSprints(projectId).then((r) => {
      const list = r.data || [];
      setSprints(list);
      // Default: active sprint or last one
      const active = list.find((s) => s.status === 'ACTIVO') || list[list.length - 1];
      if (active) setSelectedId(active.id);
    });
  }, [projectId]);

  // Load velocity
  useEffect(() => {
    if (!projectId) return;
    setLoadingVel(true);
    projectsAPI.getSprintVelocity(projectId)
      .then((r) => setVelocity(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingVel(false));
  }, [projectId]);

  // Load burndown when sprint selected
  const loadBurndown = useCallback((id) => {
    if (!id) return;
    setLoadingBd(true);
    projectsAPI.getSprintBurndown(id)
      .then((r) => setBurndown(r.data))
      .catch(() => setBurndown(null))
      .finally(() => setLoadingBd(false));
  }, []);

  useEffect(() => { loadBurndown(selectedId); }, [selectedId, loadBurndown]);

  // ── Prepare burndown data ──
  const burndownData = (burndown?.burndown || []).map((d) => ({
    date:  d.date,
    Ideal: d.ideal,
    Real:  d.real,
  }));

  // ── Prepare velocity data ──
  const velocityData = velocity.map((v) => ({
    name:       `S${v.sprint_number}`,
    fullName:   `Sprint ${v.sprint_number}: ${v.sprint_name}`,
    Completadas: v.completed_hours,
    Planificadas: v.total_hours,
    pct:        v.completion_rate,
  }));
  const avgVelocity = velocity.length > 0
    ? Math.round(velocity.reduce((s, v) => s + v.completed_hours, 0) / velocity.length * 10) / 10
    : 0;

  // ── Completion stats for selected sprint ──
  const sprint      = burndown?.sprint;
  const totalHours  = burndown?.total_hours ?? 0;
  const today       = new Date().toISOString().slice(0, 10);
  const lastRealPt  = [...(burndown?.burndown || [])].reverse().find((d) => d.real !== null);
  const remaining   = lastRealPt?.real ?? totalHours;
  const completedPct = totalHours > 0 ? Math.round((1 - remaining / totalHours) * 100) : 0;

  const isActive = sprint?.status === 'ACTIVO';
  const isPast   = sprint?.end_date && sprint.end_date < today;

  return (
    <div className="space-y-6">

      {/* ── Header: sprint selector ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Métricas del sprint</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Burndown chart y velocidad del equipo</p>
        </div>
        <SprintSelector sprints={sprints} value={selectedId} onChange={setSelectedId} />
      </div>

      {/* ── Burndown ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-indigo-500" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Burndown Chart</h4>
            {isActive && (
              <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Activo
              </span>
            )}
          </div>
          {/* KPIs del sprint */}
          {sprint && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{totalHours}h</p>
                <p className="text-xs text-slate-400">Total estimado</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${completedPct >= 80 ? 'text-emerald-600' : 'text-indigo-600'}`}>{completedPct}%</p>
                <p className="text-xs text-slate-400">Completado</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${remaining > 0 && isPast ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}`}>
                  {remaining}h
                </p>
                <p className="text-xs text-slate-400">Restantes</p>
              </div>
            </div>
          )}
        </div>

        {loadingBd ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            <RefreshCw size={16} className="animate-spin mr-2" /> Cargando...
          </div>
        ) : !selectedId ? (
          <div className="text-center text-slate-400 text-sm py-12">Selecciona un sprint para ver el burndown</div>
        ) : burndownData.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-12">Sin datos de tareas para este sprint</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={burndownData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
              <YAxis unit="h" tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomBurndownTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
              <Line
                type="monotone" dataKey="Ideal" stroke="#94a3b8" strokeWidth={1.5}
                strokeDasharray="6 3" dot={false} name="Ideal" />
              <Line
                type="monotone" dataKey="Real" stroke="#6366f1" strokeWidth={2.5}
                dot={{ r: 3, fill: '#6366f1' }} connectNulls={false} name="Real" />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* How to read */}
        <p className="text-xs text-slate-400 mt-3">
          La línea <span className="text-slate-500 font-medium">gris discontinua</span> es el ritmo ideal.
          La línea <span className="text-indigo-500 font-medium">azul sólida</span> es el avance real del equipo.
          Cuanto más abajo esté la línea azul, más adelantados van.
        </p>
      </div>

      {/* ── Velocity ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Velocidad del equipo</h4>
          </div>
          {avgVelocity > 0 && (
            <div className="text-right">
              <p className="text-lg font-bold text-amber-600">{avgVelocity}h</p>
              <p className="text-xs text-slate-400">Velocidad promedio / sprint</p>
            </div>
          )}
        </div>

        {loadingVel ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            <RefreshCw size={16} className="animate-spin mr-2" /> Cargando...
          </div>
        ) : velocityData.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-12">Sin sprints completados todavía</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, velocityData.length * 40)}>
            <BarChart data={velocityData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis unit="h" tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomVelocityTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Planificadas" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Planificadas" />
              <Bar dataKey="Completadas"  fill="#f59e0b" radius={[4, 4, 0, 0]} name="Completadas" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {velocityData.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {velocityData.slice(-4).map((v, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-900/40 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">{v.fullName}</p>
                <p className="text-base font-bold text-amber-600 mt-0.5">{v.Completadas}h</p>
                <div className="mt-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${Math.min(100, v.Planificadas > 0 ? (v.Completadas / v.Planificadas) * 100 : 0)}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{v.pct}% del plan</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
