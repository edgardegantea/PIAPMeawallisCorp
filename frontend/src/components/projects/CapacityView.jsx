import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Users, TrendingUp, Edit2, Check, X } from 'lucide-react';

export default function CapacityView({ sprintId, sprintName, isManager }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [editId,  setEditId]  = useState(null);
  const [editHours, setEditHours] = useState('');

  const load = () =>
    projectsAPI.getCapacity(sprintId)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { if (sprintId) load(); }, [sprintId]);

  const saveCapacity = async (userId) => {
    try {
      await projectsAPI.upsertCapacity(sprintId, { user_id: userId, available_hours: parseFloat(editHours) || 40 });
      toast.success('Capacidad actualizada');
      setEditId(null); load();
    } catch { toast.error('Error al actualizar'); }
  };

  if (!sprintId) return <p className="text-slate-400 text-sm text-center py-8">Selecciona un sprint activo para ver la capacidad.</p>;
  if (loading)   return <div className="text-center py-8 text-slate-400 text-sm">Cargando…</div>;
  if (!data)     return null;

  const overloaded = data.utilization_pct > 100;
  const safe       = data.utilization_pct <= 80;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 text-center">
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{data.total_available}h</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Capacidad total</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 text-center">
          <p className={`text-xl font-bold ${overloaded ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>{data.total_assigned}h</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Horas asignadas</p>
        </div>
        <div className={`rounded-xl shadow-sm p-4 text-center ${overloaded ? 'bg-red-50 dark:bg-red-900/20' : safe ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
          <p className={`text-xl font-bold ${overloaded ? 'text-red-600' : safe ? 'text-emerald-600' : 'text-amber-600'}`}>{data.utilization_pct}%</p>
          <p className={`text-xs ${overloaded ? 'text-red-500' : safe ? 'text-emerald-600' : 'text-amber-600'}`}>Utilización</p>
        </div>
      </div>

      {/* Overall bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>Capacidad del sprint</span>
          <span className={`font-medium ${overloaded ? 'text-red-600' : ''}`}>{data.total_assigned}h / {data.total_available}h</span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${overloaded ? 'bg-red-500' : safe ? 'bg-emerald-500' : 'bg-amber-400'}`}
            style={{ width: `${Math.min(100, data.utilization_pct)}%` }} />
        </div>
        {overloaded && <p className="text-xs text-red-500 mt-1">⚠ El equipo está sobrecargado. Considera mover tareas al siguiente sprint.</p>}
      </div>

      {/* Member rows */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <span>Miembro</span><span className="text-center">Disponible</span><span className="text-center">Asignadas</span><span className="text-center">Pts.</span><span className="text-center">Carga</span>
          </div>
        </div>
        {data.members.map((m) => {
          const avail   = (float = parseFloat)(m.available_hours) || 40;
          const assign  = parseFloat(m.assigned_hours) || 0;
          const pct     = avail > 0 ? Math.min(100, Math.round((assign / avail) * 100)) : 0;
          const isOver  = pct > 100;
          const initials = ((m.first_name?.[0] || '') + (m.last_name?.[0] || '')).toUpperCase() || '?';
          const isEditing = editId === m.user_id;

          return (
            <div key={m.user_id} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
              <div className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-2 items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">{initials}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{m.first_name} {m.last_name}</p>
                    <p className="text-[10px] text-slate-400">@{m.username}</p>
                  </div>
                </div>
                <div className="text-center flex items-center justify-center gap-1">
                  {isEditing ? (
                    <>
                      <input type="number" value={editHours} onChange={(e) => setEditHours(e.target.value)}
                        className="w-14 text-xs border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 text-center bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none" />
                      <button onClick={() => saveCapacity(m.user_id)} className="text-emerald-600"><Check size={12} /></button>
                      <button onClick={() => setEditId(null)} className="text-slate-400"><X size={12} /></button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-0.5">
                      {avail}h
                      {isManager && (
                        <button onClick={() => { setEditId(m.user_id); setEditHours(String(avail)); }}
                          className="text-slate-300 hover:text-indigo-600 ml-0.5"><Edit2 size={10} /></button>
                      )}
                    </span>
                  )}
                </div>
                <span className="text-center text-xs text-slate-600 dark:text-slate-300">{assign}h</span>
                <span className="text-center text-xs text-slate-600 dark:text-slate-300">{m.assigned_points || 0}</span>
                <div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <p className={`text-[10px] text-center mt-0.5 ${isOver ? 'text-red-500' : 'text-slate-400'}`}>{pct}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
