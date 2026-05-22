import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../../services/projectsAPI';
import Layout from '../../components/Layout';
import { toast } from 'sonner';
import { Plus, Search, FolderKanban, Filter, X, Star } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const STATUS_COLORS = {
  INICIACION: 'bg-indigo-100 text-indigo-700', PLANIFICACION: 'bg-purple-100 text-purple-700',
  EJECUCION:  'bg-blue-100 text-blue-700',     MONITOREO:     'bg-amber-100 text-amber-700',
  CIERRE:     'bg-emerald-100 text-emerald-700',PAUSADO:       'bg-slate-100 text-slate-600',
  CANCELADO:  'bg-red-100 text-red-700',
};
const STATUS_LABELS = {
  INICIACION: 'Iniciación', PLANIFICACION: 'Planificación', EJECUCION: 'Ejecución',
  MONITOREO: 'Monitoreo', CIERRE: 'Cierre', PAUSADO: 'Pausado', CANCELADO: 'Cancelado',
};
const PRIORITY_COLORS = {
  BAJA: 'bg-slate-100 text-slate-600', MEDIA: 'bg-blue-100 text-blue-700',
  ALTA: 'bg-amber-100 text-amber-700', CRITICA: 'bg-red-100 text-red-700',
};
const STATUSES   = ['INICIACION','PLANIFICACION','EJECUCION','MONITOREO','CIERRE','PAUSADO','CANCELADO'];
const PRIORITIES = ['BAJA','MEDIA','ALTA','CRITICA'];

export default function ProjectsListPage() {
  const authUser = useAuthStore((s) => s.user);
  const canCreateProject = authUser?.role !== 'TEAM_MEMBER';

  const [projects, setProjects]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [status, setStatus]         = useState('');
  const [category, setCategory]     = useState('');
  const [priority, setPriority]     = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites]   = useState(new Set());
  const [onlyFavs, setOnlyFavs]     = useState(false);

  useEffect(() => {
    projectsAPI.getCategories().then((r) => setCategories(r.data)).catch(() => {});
    projectsAPI.getFavorites().then((r) => {
      setFavorites(new Set((r.data || []).map(Number)));
    }).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search)   params.search   = search;
    if (status)   params.status   = status;
    if (category) params.category = category;
    if (priority) params.priority = priority;

    projectsAPI.getProjects(Object.keys(params).length ? params : undefined)
      .then((r) => setProjects(r.data))
      .catch(() => toast.error('Error al cargar proyectos'))
      .finally(() => setLoading(false));
  }, [search, status, category, priority]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const clearFilters = () => {
    setSearch(''); setStatus(''); setCategory(''); setPriority(''); setOnlyFavs(false);
  };

  const toggleFavorite = async (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const r = await projectsAPI.toggleFavorite(projectId);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (r.data.is_favorite) next.add(Number(projectId));
        else next.delete(Number(projectId));
        return next;
      });
    } catch { toast.error('Error al actualizar favorito'); }
  };

  const hasFilters = search || status || category || priority || onlyFavs;
  const activeFilterCount = [status, category, priority].filter(Boolean).length + (onlyFavs ? 1 : 0);

  const visibleProjects = onlyFavs ? projects.filter((p) => favorites.has(Number(p.id))) : projects;

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Proyectos</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{visibleProjects.length} proyecto{visibleProjects.length !== 1 ? 's' : ''}</p>
          </div>
          {canCreateProject && (
            <Link to="/projects/new"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm">
              <Plus size={16} /> Nuevo Proyecto
            </Link>
          )}
        </div>

        {/* Search + filter bar */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Buscar por nombre o código..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
              ${showFilters || activeFilterCount > 0
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            <Filter size={15} />
            Filtros
            {activeFilterCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button onClick={() => setOnlyFavs((v) => !v)}
            title="Solo favoritos"
            className={`flex items-center gap-1.5 border rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
              ${onlyFavs ? 'border-amber-400 bg-amber-50 text-amber-600' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}>
            <Star size={15} className={onlyFavs ? 'fill-amber-400 text-amber-400' : ''} />
            Favoritos
          </button>
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm px-2">
              <X size={14} /> Limpiar
            </button>
          )}
        </div>

        {/* Expandable filter panel */}
        {showFilters && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4 flex flex-wrap gap-4">
            <div className="flex-1 min-w-36">
              <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100">
                <option value="">Todos</option>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-36">
              <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100">
                <option value="">Todas</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-36">
              <label className="block text-xs font-medium text-slate-600 mb-1">Prioridad</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100">
                <option value="">Todas</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {status && (
              <span className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
                {STATUS_LABELS[status]}
                <button onClick={() => setStatus('')}><X size={11} /></button>
              </span>
            )}
            {category && (
              <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                {categories.find(c => String(c.id) === String(category))?.name || 'Categoría'}
                <button onClick={() => setCategory('')}><X size={11} /></button>
              </span>
            )}
            {priority && (
              <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                Prioridad: {priority}
                <button onClick={() => setPriority('')}><X size={11} /></button>
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando...</div>
        ) : visibleProjects.length === 0 ? (
          <div className="text-center py-20">
            <FolderKanban size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">{hasFilters ? 'Sin resultados para los filtros seleccionados' : 'No hay proyectos aún'}</p>
            {hasFilters ? (
              <button onClick={clearFilters} className="mt-3 text-indigo-600 hover:underline text-sm">Limpiar filtros</button>
            ) : (
              <Link to="/projects/new" className="mt-3 inline-block text-indigo-600 hover:underline text-sm">Crear el primero</Link>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleProjects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 group relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-xs text-slate-400 font-mono">{p.code}</p>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 mt-0.5 line-clamp-2 group-hover:text-indigo-500 transition-colors">
                      {p.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => toggleFavorite(e, p.id)}
                      className="p-1 rounded-md hover:bg-slate-100 transition-colors"
                      title={favorites.has(Number(p.id)) ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
                      <Star size={14} className={favorites.has(Number(p.id))
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300 group-hover:text-slate-400'} />
                    </button>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${PRIORITY_COLORS[p.priority] || 'bg-slate-100 text-slate-600'}`}>
                      {p.priority}
                    </span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                  {p.category_name && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.category_color }} />
                      {p.category_name}
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progreso</span>
                    <span className="font-medium">{p.completion_percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${p.completion_percentage}%` }} />
                  </div>
                </div>

                {/* Dates */}
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Inicio: {p.planned_start_date}</span>
                  <span>Fin: {p.planned_end_date}</span>
                </div>

                {p.director_first_name && (
                  <p className="text-xs text-slate-400 mt-2">
                    Director: {p.director_first_name} {p.director_last_name}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
