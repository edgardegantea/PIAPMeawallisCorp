import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { projectsAPI } from '../services/projectsAPI';
import {
  Briefcase, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, Users, ChevronRight, RefreshCw, Calendar,
} from 'lucide-react';

const STATUS_LABELS = {
  PLANIFICACION: 'Planificación', EJECUCION: 'Ejecución',
  SEGUIMIENTO: 'Seguimiento', CIERRE: 'Cierre', COMPLETADO: 'Completado', CANCELADO: 'Cancelado',
};

const RAG_CONFIG = {
  GREEN: { label: 'En curso', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
  AMBER: { label: 'Atención', color: 'bg-amber-400',  text: 'text-amber-700',   bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-200 dark:border-amber-800'   },
  RED:   { label: 'En riesgo', color: 'bg-red-500',   text: 'text-red-700',     bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-800'       },
};

function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600',
    emerald:'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
    amber:  'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
    red:    'bg-red-100 dark:bg-red-900/30 text-red-600',
  };
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filterRag, setFilterRag] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = () => {
    setLoading(true);
    projectsAPI.getPortfolio()
      .then((r) => setProjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const displayed = projects.filter((p) => {
    if (filterRag    && p.rag    !== filterRag)    return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  // Summary stats
  const total     = projects.length;
  const active    = projects.filter((p) => p.status === 'EJECUCION').length;
  const atRisk    = projects.filter((p) => p.rag === 'RED').length;
  const completed = projects.filter((p) => p.status === 'COMPLETADO').length;
  const avgCompletion = total
    ? Math.round(projects.reduce((s, p) => s + (p.completion_pct || 0), 0) / total)
    : 0;

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Briefcase size={20} className="text-indigo-500" />
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Portfolio de Proyectos</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Vista ejecutiva cross-proyectos</p>
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Briefcase}     label="Proyectos totales"   value={total}          color="indigo" />
          <StatCard icon={TrendingUp}    label="En ejecución"        value={active}         color="emerald" />
          <StatCard icon={AlertTriangle} label="En riesgo"           value={atRisk}         color="red" />
          <StatCard icon={CheckCircle2}  label="Avance promedio"     value={avgCompletion + '%'} color="amber" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">Semáforo:</span>
          {['', 'GREEN', 'AMBER', 'RED'].map((rag) => (
            <button key={rag} onClick={() => setFilterRag(rag)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors
                ${filterRag === rag ? 'bg-indigo-600 text-white border-indigo-600'
                                   : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-indigo-400'}`}>
              {rag === ''      ? 'Todos'
               : rag === 'GREEN' ? '🟢 En curso'
               : rag === 'AMBER' ? '🟡 Atención'
               :                   '🔴 Riesgo'}
            </button>
          ))}
        </div>

        {/* Project grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando portfolio…</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 text-slate-400">Sin proyectos en este filtro.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayed.map((p) => {
              const rag = RAG_CONFIG[p.rag] ?? RAG_CONFIG.GREEN;
              const daysLeft = p.days_left;
              const isOverdue = daysLeft !== null && daysLeft < 0;

              return (
                <Link key={p.id} to={`/projects/${p.id}`}
                  className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border hover:shadow-md transition-shadow block ${rag.border}`}>
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${rag.color}`} />
                          <span className="text-xs font-mono text-slate-400">{p.code}</span>
                        </div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{p.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{p.director_name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rag.bg} ${rag.text}`}>
                          {rag.label}
                        </span>
                        <span className="text-[10px] text-slate-400">{STATUS_LABELS[p.status] ?? p.status}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <span>Avance</span>
                        <span className="font-semibold">{p.completion_pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          p.completion_pct >= 75 ? 'bg-emerald-500' :
                          p.completion_pct >= 40 ? 'bg-indigo-500' : 'bg-amber-400'
                        }`} style={{ width: `${p.completion_pct}%` }} />
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg py-1.5">
                        <p className="font-bold text-slate-700 dark:text-slate-200">{p.tasks_total}</p>
                        <p className="text-slate-400">tareas</p>
                      </div>
                      <div className={`rounded-lg py-1.5 ${p.tasks_blocked > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-700/50'}`}>
                        <p className={`font-bold ${p.tasks_blocked > 0 ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}`}>{p.tasks_blocked}</p>
                        <p className="text-slate-400">bloq.</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg py-1.5">
                        <p className="font-bold text-slate-700 dark:text-slate-200">{p.member_count}</p>
                        <p className="text-slate-400">miembros</p>
                      </div>
                    </div>

                    {/* Alerts */}
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {p.critical_risks > 0 && (
                        <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                          ⚠ {p.critical_risks} riesgo{p.critical_risks > 1 ? 's' : ''} crítico{p.critical_risks > 1 ? 's' : ''}
                        </span>
                      )}
                      {p.overdue_milestones > 0 && (
                        <span className="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                          {p.overdue_milestones} hito{p.overdue_milestones > 1 ? 's' : ''} vencido{p.overdue_milestones > 1 ? 's' : ''}
                        </span>
                      )}
                      {p.active_sprint && (
                        <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                          🏃 {p.active_sprint}
                        </span>
                      )}
                      {daysLeft !== null && (
                        <span className={`px-2 py-0.5 rounded-full font-medium ${isOverdue ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                          <Calendar size={9} className="inline mr-0.5" />
                          {isOverdue ? `Vencido ${-daysLeft}d` : `${daysLeft}d restantes`}
                        </span>
                      )}
                      {p.budget_pct !== null && p.budget_pct > 80 && (
                        <span className={`px-2 py-0.5 rounded-full font-medium ${p.budget_pct > 100 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                          💰 {p.budget_pct}% presupuesto
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400">
                    <span>{p.hours_logged > 0 ? `${parseFloat(p.hours_logged).toFixed(0)}h registradas` : 'Sin horas registradas'}</span>
                    <ChevronRight size={13} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
