import { useEffect, useState, useCallback } from 'react';
import { projectsAPI } from '../services/projectsAPI';
import Layout from '../components/Layout';
import { Shield, Search, ChevronLeft, ChevronRight, Calendar, User, Tag } from 'lucide-react';

const ENTITY_COLORS = {
  task:    'bg-indigo-100 text-indigo-700',
  project: 'bg-emerald-100 text-emerald-700',
  user:    'bg-purple-100 text-purple-700',
  sprint:  'bg-blue-100 text-blue-700',
};

const ACTION_COLORS = {
  created:        'bg-emerald-100 text-emerald-700',
  updated:        'bg-blue-100 text-blue-700',
  deleted:        'bg-red-100 text-red-700',
  status_changed: 'bg-amber-100 text-amber-700',
};

export default function AuditPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);

  const [filters, setFilters] = useState({
    entity_type: '',
    user_id: '',
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    to:   new Date().toISOString().slice(0, 10),
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, ...filters };
    Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
    projectsAPI.getAuditLog(params)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const setF = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-indigo-500" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Auditoría de acciones</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Historial completo de cambios en el sistema</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 flex flex-wrap gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-0.5">Tipo</label>
            <select value={filters.entity_type} onChange={(e) => setF('entity_type', e.target.value)}
              className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todos</option>
              {['task','project','user','sprint','comment'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-0.5">Desde</label>
            <input type="date" value={filters.from} onChange={(e) => setF('from', e.target.value)}
              className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-0.5">Hasta</label>
            <input type="date" value={filters.to} onChange={(e) => setF('to', e.target.value)}
              className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-end">
            <button onClick={load} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
              Filtrar
            </button>
          </div>
          {data && (
            <div className="flex items-end ml-auto">
              <span className="text-xs text-slate-400">{data.total} registro{data.total !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Cargando…</div>
          ) : !data || data.data.length === 0 ? (
            <div className="py-20 text-center text-slate-400">Sin registros de auditoría en este período</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {['Fecha / Hora','Usuario','Tipo','Acción','Descripción','IP'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.created_at?.slice(0, 10)}</p>
                        <p className="text-[10px] text-slate-400">{row.created_at?.slice(11, 19)}</p>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.user_name || '—'}</p>
                        <p className="text-[10px] text-slate-400">{row.username}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${ENTITY_COLORS[row.entity_type] || 'bg-slate-100 text-slate-600'}`}>
                          {row.entity_type}
                        </span>
                        {row.entity_id && <span className="text-[10px] text-slate-400 ml-1">#{row.entity_id}</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ACTION_COLORS[row.action] || 'bg-slate-100 text-slate-600'}`}>
                          {row.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-[250px]">
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{row.description || '—'}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] text-slate-400 font-mono">{row.ip_address || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl shadow-sm px-4 py-3">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 text-sm text-slate-500 disabled:opacity-40 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              <ChevronLeft size={15} /> Anterior
            </button>
            <span className="text-xs text-slate-400">Página {page} de {data.pages}</span>
            <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages}
              className="flex items-center gap-1 text-sm text-slate-500 disabled:opacity-40 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              Siguiente <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
