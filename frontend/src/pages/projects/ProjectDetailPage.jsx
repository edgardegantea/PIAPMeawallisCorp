import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../services/projectsAPI';
import Layout from '../../components/Layout';
import { toast } from 'sonner';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuthStore } from '../../stores/authStore';
import {
  ArrowLeft, Edit, Trash2, Users, AlertTriangle,
  Zap, ListChecks, FileText, BarChart2, Flag,
  CheckCircle2, Clock, TrendingUp, Calendar, Activity, Layers,
  ScrollText, BookOpen, Milestone, ShieldAlert, CheckSquare, Clapperboard,
} from 'lucide-react';
import SprintList from '../../components/projects/SprintList';
import BacklogList from '../../components/projects/BacklogList';
import KanbanBoard from '../../components/projects/KanbanBoard';
import RiskList from '../../components/projects/RiskList';
import IncidentList from '../../components/projects/IncidentList';
import MemberList from '../../components/projects/MemberList';
import DocumentList from '../../components/projects/DocumentList';
import MilestoneList from '../../components/projects/MilestoneList';
import SprintPlanningView from '../../components/projects/SprintPlanningView';
import GanttView from '../../components/projects/GanttView';
import WorkloadView from '../../components/projects/WorkloadView';
import ActivityFeed from '../../components/projects/ActivityFeed';
import ContractList from '../../components/projects/ContractList';
import TechnicalDocList from '../../components/projects/TechnicalDocList';
import EpicsList from '../../components/projects/EpicsList';
import ImpedimentLog from '../../components/projects/ImpedimentLog';
import DefinitionOfDone from '../../components/projects/DefinitionOfDone';
import SprintCeremonies from '../../components/projects/SprintCeremonies';

const STATUS_COLORS = {
  INICIACION: 'bg-indigo-100 text-indigo-700', PLANIFICACION: 'bg-purple-100 text-purple-700',
  EJECUCION:  'bg-blue-100 text-blue-700',     MONITOREO:     'bg-amber-100 text-amber-700',
  CIERRE:     'bg-emerald-100 text-emerald-700',PAUSADO:       'bg-slate-100 text-slate-600',
  CANCELADO:  'bg-red-100 text-red-700',
};

const ALL_TABS = [
  { id: 'overview',      label: 'Resumen',          icon: BarChart2,    managerOnly: false },
  { id: 'sprints',       label: 'Sprints',           icon: Zap,          managerOnly: false },
  { id: 'backlog',       label: 'Backlog',           icon: ListChecks,   managerOnly: false },
  { id: 'planning',      label: 'Planificación',     icon: Layers,       managerOnly: true  },
  { id: 'kanban',        label: 'Kanban',            icon: ListChecks,   managerOnly: false },
  { id: 'timeline',      label: 'Línea de Tiempo',   icon: Calendar,     managerOnly: true  },
  { id: 'milestones',    label: 'Hitos',             icon: Flag,         managerOnly: false },
  { id: 'workload',      label: 'Carga de Trabajo',  icon: Users,        managerOnly: true  },
  { id: 'risks',         label: 'Riesgos',           icon: AlertTriangle,managerOnly: true  },
  { id: 'incidents',     label: 'Incidencias',       icon: AlertTriangle,managerOnly: true  },
  { id: 'members',       label: 'Equipo',            icon: Users,        managerOnly: false },
  { id: 'documents',     label: 'Documentos',        icon: FileText,     managerOnly: false },
  { id: 'contracts',     label: 'Contratos',         icon: ScrollText,   managerOnly: true  },
  { id: 'technicaldocs', label: 'Docs Técnicos',     icon: BookOpen,     managerOnly: false },
  { id: 'activity',      label: 'Actividad',         icon: Activity,     managerOnly: false },
  // Scrum
  { id: 'epics',         label: 'Épicas',            icon: Milestone,    managerOnly: false },
  { id: 'impediments',   label: 'Impedimentos',      icon: ShieldAlert,  managerOnly: false },
  { id: 'dod',           label: 'Def. of Done',      icon: CheckSquare,  managerOnly: false },
  { id: 'ceremonies',    label: 'Ceremonias',        icon: Clapperboard, managerOnly: false },
];

export default function ProjectDetailPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const authUser   = useAuthStore((s) => s.user);
  const [project, setProject]   = useState(null);
  const [report, setReport]     = useState(null);
  const [tab, setTab]           = useState('overview');
  const [loading, setLoading]   = useState(true);
  const [confirm, setConfirm]   = useState(null);

  const loadProject = () => {
    Promise.all([
      projectsAPI.getProject(id),
      projectsAPI.getReportProject(id),
    ]).then(([pr, rr]) => {
      setProject(pr.data);
      setReport(rr.data);
    }).catch(() => toast.error('Error al cargar proyecto'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProject(); }, [id]);

  const handleDelete = () => {
    setConfirm({
      title: 'Eliminar proyecto',
      body: '¿Eliminar este proyecto? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await projectsAPI.deleteProject(id);
          toast.success('Proyecto eliminado');
          navigate('/projects');
        } catch { toast.error('Error al eliminar'); }
      },
    });
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div></Layout>;
  if (!project) return <Layout><div className="p-6 text-slate-500">Proyecto no encontrado</div></Layout>;

  // ADMIN or project director can manage the project
  const isManager =
    authUser?.role === 'ADMIN' ||
    authUser?.role === 'DIRECTOR' ||
    String(authUser?.id) === String(project.director_id) ||
    project.my_project_role === 'PM';
  const tabs = ALL_TABS.filter((t) => isManager || !t.managerOnly);

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/projects')} className="text-slate-400 hover:text-slate-700">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{project.code}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status]}`}>
                  {project.status}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{project.name}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {project.category_name} · Director: {project.director_first_name} {project.director_last_name}
              </p>
            </div>
          </div>
          {isManager && (
            <div className="flex gap-2">
              <Link to={`/projects/${id}/edit`}
                className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
                <Edit size={14} /> Editar
              </Link>
              <button onClick={handleDelete}
                className="flex items-center gap-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 mb-4">
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300 mb-2">
            <span>Progreso del proyecto</span>
            <span className="font-semibold">{project.completion_percentage}%</span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${project.completion_percentage}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-4 text-xs text-slate-500">
            <div><span className="font-medium text-slate-700">Inicio:</span> {project.planned_start_date}</div>
            <div><span className="font-medium text-slate-700">Fin planeado:</span> {project.planned_end_date}</div>
            {isManager && (
              <div><span className="font-medium text-slate-700">Presupuesto:</span> ${Number(project.planned_budget).toLocaleString()}</div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
          <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700">
            {tabs.map(({ id: tid, label }) => (
              <button key={tid} onClick={() => setTab(tid)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
                  ${tab === tid ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === 'overview'      && <ProjectOverview project={project} report={report} reload={loadProject} isManager={isManager} />}
            {tab === 'sprints'       && <SprintList         projectId={id} isManager={isManager} />}
            {tab === 'backlog'       && <BacklogList         projectId={id} isManager={isManager} />}
            {tab === 'planning'      && <SprintPlanningView  projectId={id} />}
            {tab === 'kanban'        && <KanbanBoard         projectId={id} isManager={isManager} />}
            {tab === 'timeline'      && <GanttView           projectId={id} project={project} />}
            {tab === 'milestones'    && <MilestoneList        projectId={id} isManager={isManager} />}
            {tab === 'workload'      && <WorkloadView         projectId={id} />}
            {tab === 'risks'         && <RiskList             projectId={id} />}
            {tab === 'incidents'     && <IncidentList         projectId={id} />}
            {tab === 'members'       && <MemberList           projectId={id} isManager={isManager} />}
            {tab === 'documents'     && <DocumentList         projectId={id} isManager={isManager} />}
            {tab === 'contracts'     && <ContractList         projectId={id} />}
            {tab === 'technicaldocs' && <TechnicalDocList     projectId={id} isManager={isManager} />}
            {tab === 'activity'      && <ActivityFeed         projectId={id} />}
            {tab === 'epics'         && <EpicsList            projectId={id} isManager={isManager} />}
            {tab === 'impediments'   && <ImpedimentLog        projectId={id} isManager={isManager} />}
            {tab === 'dod'           && <DefinitionOfDone     projectId={id} isManager={isManager} />}
            {tab === 'ceremonies'    && <SprintCeremonies     projectId={id} isManager={isManager} />}
          </div>
        </div>
      </div>

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </Layout>
  );
}

function ProjectOverview({ project, report, reload, isManager }) {
  const [progress, setProgress] = useState(project.completion_percentage);
  const [saving, setSaving] = useState(false);

  const saveProgress = async () => {
    setSaving(true);
    try {
      await projectsAPI.updateProgress(project.id, progress);
      toast.success('Progreso actualizado');
      reload();
    } catch { toast.error('Error al actualizar'); }
    finally { setSaving(false); }
  };

  const ts  = report?.task_stats || {};
  const spr = report?.sprints    || [];
  const activeSprint = spr.find((s) => s.status === 'ACTIVO');

  return (
    <div className="space-y-6">
      {/* KPI mini-cards */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Tareas Totales',    value: ts.total        || 0, icon: Flag,         color: 'bg-slate-100 text-slate-600' },
            { label: 'Completadas',       value: ts.completadas  || 0, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
            { label: 'Bloqueadas',        value: ts.bloqueadas   || 0, icon: AlertTriangle,color: 'bg-red-100 text-red-600' },
            { label: 'Horas registradas', value: `${parseFloat(ts.horas_registradas||0).toFixed(0)}h`,
              sub: `de ${parseFloat(ts.horas_estimadas||0).toFixed(0)}h`,
              icon: Clock, color: 'bg-blue-100 text-blue-700' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
              <div className={`${color} p-2 rounded-lg`}><Icon size={16} /></div>
              <div>
                <p className="text-lg font-bold text-slate-800 leading-tight">{value}</p>
                {sub && <p className="text-xs text-slate-400">{sub}</p>}
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active sprint banner */}
      {activeSprint && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Sprint activo: {activeSprint.sprint_name}
            </span>
            <span className="text-xs text-blue-600">
              {activeSprint.start_date} → {activeSprint.end_date}
            </span>
          </div>
          <div className="text-sm text-blue-700 font-semibold">
            {activeSprint.completed_tasks}/{activeSprint.total_tasks} tareas
          </div>
        </div>
      )}

      {/* Milestones quick summary */}
      {report?.milestones?.length > 0 && (
        <div className="bg-slate-50 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Hitos</h3>
          <div className="space-y-2">
            {report.milestones.slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${parseInt(m.is_completed) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span className={`text-sm flex-1 ${parseInt(m.is_completed) ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {m.title}
                </span>
                <span className="text-xs text-slate-400">{m.due_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project info grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Descripción</h3>
          <p className="text-sm text-slate-600 whitespace-pre-line">{project.description}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Objetivos</h3>
          <p className="text-sm text-slate-600 whitespace-pre-line">{project.objectives}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Alcance</h3>
          <p className="text-sm text-slate-600 whitespace-pre-line">{project.scope}</p>
        </div>
        {project.client_name && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Cliente</h3>
            <p className="text-sm text-slate-600">{project.client_name}</p>
            {project.client_email && <p className="text-sm text-slate-500">{project.client_email}</p>}
            {project.client_phone && <p className="text-sm text-slate-500">{project.client_phone}</p>}
          </div>
        )}
      </div>

      {isManager && (
        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Actualizar Progreso</h3>
          <div className="flex items-center gap-4">
            <input type="range" min="0" max="100" value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="flex-1" />
            <span className="text-sm font-semibold text-slate-700 w-10">{progress}%</span>
            <button onClick={saveProgress} disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
