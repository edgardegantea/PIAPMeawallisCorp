/**
 * Earned Value Management (EVM) widget.
 * Computes CPI, SPI, EAC from project data passed as props.
 *
 * Props: project { planned_budget, actual_budget, completion_percentage, planned_end_date, planned_start_date }
 */
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';

function Metric({ label, value, sub, good, bad }) {
  const color = value === null ? 'text-slate-400'
    : good !== undefined && value >= good ? 'text-emerald-600 dark:text-emerald-400'
    : bad  !== undefined && value <= bad  ? 'text-red-600 dark:text-red-400'
    : 'text-amber-600 dark:text-amber-400';

  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value !== null ? value : '—'}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

export default function EVMWidget({ project }) {
  if (!project) return null;

  const BAC  = parseFloat(project.planned_budget ?? 0);
  const AC   = parseFloat(project.actual_budget  ?? 0);
  const pct  = parseFloat(project.completion_percentage ?? 0) / 100;

  if (BAC <= 0) return null; // No budget defined

  const EV   = BAC * pct;                     // Earned Value
  const PV   = (() => {                        // Planned Value (time-based)
    if (!project.planned_start_date || !project.planned_end_date) return EV;
    const start  = new Date(project.planned_start_date);
    const end    = new Date(project.planned_end_date);
    const today  = new Date();
    const total  = (end - start) || 1;
    const elapsed= Math.min(today - start, total);
    return BAC * (elapsed / total);
  })();

  const CPI  = AC > 0 ? (EV / AC)       : null;  // Cost Performance Index
  const SPI  = PV > 0 ? (EV / PV)       : null;  // Schedule Performance Index
  const CV   = EV - AC;                           // Cost Variance
  const SV   = EV - PV;                           // Schedule Variance
  const EAC  = CPI && CPI > 0 ? BAC / CPI : null; // Estimate at Completion

  const fmt  = (n) => n !== null ? n.toFixed(2) : null;
  const fmtK = (n) => n !== null ? '$' + Math.round(n).toLocaleString() : null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <DollarSign size={16} className="text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">EVM — Valor Ganado</h3>
        <span className="text-xs text-slate-400 ml-auto">BAC: ${Math.round(BAC).toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric label="CPI" value={fmt(CPI)} sub="Índice costo" good={1.0} bad={0.9} />
        <Metric label="SPI" value={fmt(SPI)} sub="Índice plazo" good={1.0} bad={0.9} />
        <Metric label="CV"  value={fmtK(CV)} sub="Variación costo" good={0} bad={-1} />
        <Metric label="EAC" value={fmtK(EAC)} sub="Costo estimado final" />
      </div>

      <div className="text-xs text-slate-400 space-y-0.5">
        <div className="flex justify-between">
          <span>EV (Valor Ganado)</span>
          <span className="font-medium text-slate-600 dark:text-slate-300">${Math.round(EV).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>PV (Valor Planeado)</span>
          <span className="font-medium text-slate-600 dark:text-slate-300">${Math.round(PV).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>AC (Costo Real)</span>
          <span className={`font-medium ${AC > EV ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>${Math.round(AC).toLocaleString()}</span>
        </div>
      </div>

      {CPI !== null && (
        <p className={`text-xs font-medium flex items-center gap-1 ${CPI >= 1 ? 'text-emerald-600' : CPI >= 0.9 ? 'text-amber-600' : 'text-red-600'}`}>
          {CPI >= 1 ? <TrendingUp size={12} /> : CPI >= 0.9 ? <Minus size={12} /> : <TrendingDown size={12} />}
          {CPI >= 1 ? 'Proyecto bajo presupuesto' : CPI >= 0.9 ? 'Presupuesto ligeramente excedido' : 'Proyecto sobre presupuesto — atención requerida'}
        </p>
      )}
    </div>
  );
}
