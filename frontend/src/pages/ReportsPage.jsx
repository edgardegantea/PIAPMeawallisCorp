import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../services/projectsAPI';
import Layout from '../components/Layout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import {
  FolderKanban, CheckCircle2, AlertTriangle, Clock,
  TrendingUp, DollarSign, Users, Flag,
} from 'lucide-react';

const STATUS_COLORS = {
  INICIACION: '#6366f1', PLANIFICACION: '#8b5cf6', EJECUCION: '#3b82f6',
  MONITOREO: '#f59e0b', CIERRE: '#10b981', PAUSADO: '#94a3b8', CANCELADO: '#ef4444',
};
const STATUS_LABELS = {
  INICIACION: 'Iniciación', PLANIFICACION: 'Planificación', EJECUCION: 'Ejecución',
  MONITOREO: 'Monitoreo', CIERRE: 'Cierre', PAUSADO: 'Pausado', CANCELADO: 'Cancelado',
};

function StatCard({ label, value, sub, icon: Icon, color = 'bg-indigo-500' }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className={`${color} p-3 rounded-lg text-white flex-shrink-0`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value ?? '—'}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsAPI.getReportOverview()
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-slate-400">Cargando reporte...</div>
      </Layout>
    );
  }

  const p   = data?.projects || {};
  const t   = data?.tasks    || {};
  const m   = data?.milestones || {};
  const r   = data?.risks    || {};
  const inc = data?.incidents || {};

  const byStatusChart = (data?.by_status || []).map((s) => ({
    name:  STATUS_LABELS[s.status] || s.status,
    value: parseInt(s.count),
    color: STATUS_COLORS[s.status] || '#94a3b8',
  }));

  const byCategoryChart = (data?.by_category || []).map((c) => ({
    name:  c.category,
    value: parseInt(c.count),
    fill:  c.color || '#6366f1',
  }));

  const hoursChart = (data?.hours_by_project || []).map((h) => ({
    name:        h.name.length > 18 ? h.name.slice(0, 16) + '…' : h.name,
    estimadas:   parseFloat(h.estimadas),
    registradas: parseFloat(h.registradas),
  }));

  const budgetUsed = p.presupuesto_total > 0
    ? Math.round((p.presupuesto_ejecutado / p.presupuesto_total) * 100)
    : 0;

  const taskCompletion = t.total > 0
    ? Math.round((t.completadas / t.total) * 100)
    : 0;

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reportes y Análisis</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Resumen ejecutivo de toda la organización</p>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Proyectos"    value={p.total}           icon={FolderKanban}  color="bg-indigo-500" />
          <StatCard label="En Ejecución"        value={p.en_ejecucion}    icon={TrendingUp}    color="bg-blue-500" />
          <StatCard label="Proyectos Vencidos"  value={p.vencidos}        icon={AlertTriangle} color="bg-red-500" />
          <StatCard label="Avance Promedio"     value={`${p.avance_promedio ?? 0}%`} icon={CheckCircle2} color="bg-emerald-500" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Tareas Totales"     value={t.total}         icon={Flag}         color="bg-slate-500" />
          <StatCard label="Tareas Completadas" value={t.completadas}   icon={CheckCircle2} color="bg-emerald-500" sub={`${taskCompletion}% completado`} />
          <StatCard label="Tareas Bloqueadas"  value={t.bloqueadas}    icon={AlertTriangle} color="bg-red-400" />
          <StatCard label="Tareas Vencidas"    value={t.vencidas}      icon={Clock}        color="bg-amber-500" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Horas Estimadas"    value={`${parseFloat(t.horas_estimadas||0).toFixed(0)}h`}   icon={Clock}        color="bg-indigo-400" />
          <StatCard label="Horas Registradas"  value={`${parseFloat(t.horas_registradas||0).toFixed(0)}h`} icon={Clock}        color="bg-purple-500"
            sub={t.horas_estimadas > 0 ? `${Math.round(t.horas_registradas/t.horas_estimadas*100)}% del plan` : undefined} />
          <StatCard label="Presupuesto Total"   value={`$${Number(p.presupuesto_total||0).toLocaleString()}`}   icon={DollarSign}   color="bg-slate-500" />
          <StatCard label="Presupuesto Ejecutado" value={`$${Number(p.presupuesto_ejecutado||0).toLocaleString()}`} icon={DollarSign} color="bg-blue-400" sub={`${budgetUsed}% del plan`} />
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Projects by status */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Proyectos por Estado</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byStatusChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {byStatusChart.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* By category pie */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Proyectos por Categoría</h2>
            {byCategoryChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={byCategoryChart} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                    {byCategoryChart.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">Sin datos</p>
            )}
          </div>
        </div>

        {/* Hours chart */}
        {hoursChart.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Horas por Proyecto (estimadas vs registradas)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hoursChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} unit="h" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v) => `${v}h`} />
                <Legend />
                <Bar dataKey="estimadas"   fill="#e2e8f0" radius={[0,4,4,0]} name="Estimadas" />
                <Bar dataKey="registradas" fill="#6366f1" radius={[0,4,4,0]} name="Registradas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Risk + Incidents + Milestones cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" /> Riesgos
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Total</span><span className="font-semibold">{r.total ?? 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Críticos activos</span><span className="font-semibold text-red-600">{r.criticos ?? 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Activos</span><span className="font-semibold text-amber-600">{r.activos ?? 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Mitigados</span><span className="font-semibold text-emerald-600">{r.mitigados ?? 0}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-500" /> Incidencias
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Total</span><span className="font-semibold">{inc.total ?? 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Críticas</span><span className="font-semibold text-red-600">{inc.criticas ?? 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Abiertas</span><span className="font-semibold text-amber-600">{inc.abiertas ?? 0}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Flag size={15} className="text-indigo-500" /> Hitos
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Total</span><span className="font-semibold">{m.total ?? 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Completados</span><span className="font-semibold text-emerald-600">{m.completados ?? 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Vencidos</span><span className="font-semibold text-red-600">{m.vencidos ?? 0}</span></div>
            </div>
            {m.total > 0 && (
              <div className="mt-3">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round(m.completados/m.total*100)}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{Math.round(m.completados/m.total*100)}% completados</p>
              </div>
            )}
          </div>
        </div>

        {/* Top projects table */}
        {data?.top_projects?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Proyectos por Avance</h2>
            <div className="space-y-3">
              {data.top_projects.map((proj) => (
                <Link key={proj.id} to={`/projects/${proj.id}`}
                  className="flex items-center gap-4 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: proj.category_color || '#6366f1' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{proj.name}</p>
                    <p className="text-xs text-slate-400">{proj.code} · {STATUS_LABELS[proj.status] || proj.status} · {proj.category_name}</p>
                  </div>
                  <div className="w-32 flex-shrink-0">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span></span><span className="font-medium text-slate-700">{proj.completion_percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${proj.completion_percentage}%` }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
