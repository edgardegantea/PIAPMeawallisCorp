import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Layers, Zap, GripVertical } from 'lucide-react';

const PRIORITY_DOT = {
  BAJA: 'bg-slate-400', MEDIA: 'bg-blue-500', ALTA: 'bg-amber-500', CRITICA: 'bg-red-500',
};
const STATUS_BADGE = {
  PLANEADO: 'bg-slate-100 text-slate-600',
  ACTIVO:   'bg-emerald-100 text-emerald-700',
  CERRADO:  'bg-slate-200 text-slate-500',
};

export default function SprintPlanningView({ projectId }) {
  const [backlog, setBacklog]     = useState([]);
  const [sprints, setSprints]     = useState([]);
  const [selSprint, setSelSprint] = useState(null);
  const [sprintItems, setSprintItems] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [moving, setMoving]       = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [bl, sp] = await Promise.all([
        projectsAPI.getBacklogItems(projectId),
        projectsAPI.getSprints(projectId),
      ]);
      const allItems = bl.data;
      setBacklog(allItems.filter((i) => !i.sprint_id));
      setSprints(sp.data);
      const current = sp.data.find((s) => s.status === 'ACTIVO') || sp.data.find((s) => s.status === 'PLANEADO') || sp.data[0];
      if (current) {
        setSelSprint(current);
        setSprintItems(allItems.filter((i) => String(i.sprint_id) === String(current.id)));
      }
    } catch { toast.error('Error al cargar datos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  const changeSprint = (sprint) => {
    setSelSprint(sprint);
    projectsAPI.getBacklogItems(projectId).then((r) => {
      const all = r.data;
      setBacklog(all.filter((i) => !i.sprint_id));
      setSprintItems(all.filter((i) => String(i.sprint_id) === String(sprint.id)));
    });
  };

  const moveToSprint = async (item) => {
    setMoving(item.id);
    try {
      await projectsAPI.updateBacklogItem(item.id, { sprint_id: selSprint.id, status: 'EN_SPRINT' });
      setBacklog((b) => b.filter((i) => i.id !== item.id));
      setSprintItems((s) => [...s, { ...item, sprint_id: selSprint.id, status: 'EN_SPRINT' }]);
      toast.success('Historia movida al sprint');
    } catch { toast.error('Error al mover historia'); }
    finally { setMoving(null); }
  };

  const moveToBacklog = async (item) => {
    setMoving(item.id);
    try {
      await projectsAPI.updateBacklogItem(item.id, { sprint_id: null, status: 'BACKLOG' });
      setSprintItems((s) => s.filter((i) => i.id !== item.id));
      setBacklog((b) => [...b, { ...item, sprint_id: null, status: 'BACKLOG' }]);
      toast.success('Historia regresada al backlog');
    } catch { toast.error('Error al mover historia'); }
    finally { setMoving(null); }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Cargando...</div>;

  const sprintPts   = sprintItems.reduce((s, i) => s + (i.story_points || 0), 0);
  const backlogPts  = backlog.reduce((s, i) => s + (i.story_points || 0), 0);

  return (
    <div className="space-y-4">
      {/* Sprint selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">Sprint:</span>
        {sprints.length === 0 ? (
          <span className="text-sm text-slate-400">No hay sprints. Crea uno primero en la pestaña Sprints.</span>
        ) : sprints.map((s) => (
          <button key={s.id} onClick={() => changeSprint(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
              ${selSprint?.id === s.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : `${STATUS_BADGE[s.status] || 'bg-white text-slate-600'} border-slate-200 hover:border-indigo-300`}`}>
            <Zap size={11} /> {s.name}
            <span className="opacity-70">({s.status})</span>
          </button>
        ))}
      </div>

      {sprints.length === 0 ? null : (
        <div className="grid md:grid-cols-2 gap-4">

          {/* ── Backlog ─────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-slate-500" />
                <span className="font-semibold text-slate-700 text-sm">Product Backlog</span>
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{backlog.length}</span>
              </div>
              <span className="text-xs text-slate-400">{backlogPts} pts</span>
            </div>

            {backlog.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Layers size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin historias en el backlog</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[calc(100vh-320px)] overflow-y-auto">
                {backlog.map((item) => (
                  <div key={item.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[item.priority] || 'bg-slate-400'}`} />
                        <p className="text-sm text-slate-700 truncate font-medium">{item.title}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 ml-4">
                        {item.story_points > 0 && <span>{item.story_points} pts</span>}
                        <span className="capitalize">{item.priority?.toLowerCase()}</span>
                      </div>
                    </div>
                    {selSprint && (
                      <button onClick={() => moveToSprint(item)}
                        disabled={moving === item.id}
                        title={`Mover a ${selSprint.name}`}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs
                          bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg
                          transition-all flex-shrink-0 disabled:opacity-50">
                        <ArrowRight size={12} />
                        Al sprint
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Sprint ──────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-indigo-600" />
                <span className="font-semibold text-indigo-700 text-sm">
                  {selSprint ? selSprint.name : 'Selecciona un sprint'}
                </span>
                {selSprint && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    {sprintItems.length}
                  </span>
                )}
              </div>
              {selSprint && (
                <div className="flex items-center gap-2 text-xs text-indigo-500">
                  <span>{sprintPts} pts</span>
                  {selSprint.capacity > 0 && (
                    <span className={sprintPts > selSprint.capacity ? 'text-red-500 font-semibold' : ''}>
                      / {selSprint.capacity}h cap.
                    </span>
                  )}
                </div>
              )}
            </div>

            {!selSprint ? (
              <div className="text-center py-10 text-slate-400 text-sm">Selecciona un sprint</div>
            ) : sprintItems.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Zap size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sprint vacío. Mueve historias desde el backlog.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[calc(100vh-320px)] overflow-y-auto">
                {sprintItems.map((item) => (
                  <div key={item.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[item.priority] || 'bg-slate-400'}`} />
                        <p className={`text-sm truncate font-medium ${item.status === 'COMPLETADA' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {item.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 ml-4">
                        {item.story_points > 0 && <span>{item.story_points} pts</span>}
                        <span className={`px-1.5 py-0 rounded-full ${
                          item.status === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-600' :
                          item.status === 'EN_SPRINT'  ? 'bg-indigo-100 text-indigo-600' :
                          'bg-slate-100 text-slate-600'}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => moveToBacklog(item)}
                      disabled={moving === item.id}
                      title="Regresar al backlog"
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs
                        bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500
                        px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 disabled:opacity-50">
                      <ArrowLeft size={12} />
                      Backlog
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
