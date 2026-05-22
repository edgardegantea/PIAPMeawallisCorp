import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectsAPI } from '../../services/projectsAPI';
import Layout from '../../components/Layout';
import { toast } from 'sonner';
import { Save, ArrowLeft, Info, Calendar, Users, Target, AlertTriangle } from 'lucide-react';

const STATUSES = [
  { value: 'INICIACION',   label: 'Iniciación' },
  { value: 'PLANIFICACION',label: 'Planificación' },
  { value: 'EJECUCION',    label: 'Ejecución' },
  { value: 'MONITOREO',    label: 'Monitoreo' },
  { value: 'CIERRE',       label: 'Cierre' },
  { value: 'PAUSADO',      label: 'Pausado' },
  { value: 'CANCELADO',    label: 'Cancelado' },
];

const PRIORITIES = [
  { value: 'BAJA',   label: 'Baja',    color: 'text-slate-500' },
  { value: 'MEDIA',  label: 'Media',   color: 'text-blue-600'  },
  { value: 'ALTA',   label: 'Alta',    color: 'text-amber-600' },
  { value: 'CRITICA',label: 'Crítica', color: 'text-red-600'   },
];

const EMPTY = {
  code: '', name: '', description: '',
  category_id: '', status: 'INICIACION', priority: 'MEDIA',
  director_id: '', sponsor_id: '',
  planned_start_date: '', planned_end_date: '',
  actual_start_date: '',  actual_end_date: '',
  planned_budget: '', actual_budget: '0',
  completion_percentage: '0',
  objectives: '', scope: '', deliverables: '',
  identified_risks: '', constraints: '', assumptions: '', notes: '',
  client_name: '', client_representative: '', client_email: '',
  client_phone: '', client_address: '', client_rfc: '',
  client_tax_regime: '', client_cfdi_usage: '',
  client_billing_email: '', client_zip_code: '',
  developer_representative: '', project_manager_name: '',
};

const TABS = [
  { id: 'general',      label: 'General',             icon: Info },
  { id: 'dates',        label: 'Fechas y Presupuesto', icon: Calendar },
  { id: 'client',       label: 'Cliente',              icon: Users },
  { id: 'scope',        label: 'Alcance y Objetivos',  icon: Target },
  { id: 'risks',        label: 'Riesgos y Notas',      icon: AlertTriangle },
];

export default function ProjectFormPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = Boolean(id);

  const [form, setForm]       = useState(EMPTY);
  const [categories, setCats] = useState([]);
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState('general');

  useEffect(() => {
    Promise.all([projectsAPI.getCategories(), projectsAPI.getUsers()]).then(([c, u]) => {
      setCats(c.data);
      setUsers(u.data);
    });

    if (isEdit) {
      projectsAPI.getProject(id).then((r) => {
        const p = r.data;
        setForm({
          code:                  p.code              ?? '',
          name:                  p.name              ?? '',
          description:           p.description       ?? '',
          category_id:           p.category_id       ?? '',
          status:                p.status            ?? 'INICIACION',
          priority:              p.priority          ?? 'MEDIA',
          director_id:           p.director_id       ?? '',
          sponsor_id:            p.sponsor_id        ?? '',
          planned_start_date:    p.planned_start_date ?? '',
          planned_end_date:      p.planned_end_date  ?? '',
          actual_start_date:     p.actual_start_date ?? '',
          actual_end_date:       p.actual_end_date   ?? '',
          planned_budget:        p.planned_budget    ?? '0',
          actual_budget:         p.actual_budget     ?? '0',
          completion_percentage: p.completion_percentage ?? '0',
          objectives:            p.objectives        ?? '',
          scope:                 p.scope             ?? '',
          deliverables:          p.deliverables      ?? '',
          identified_risks:      p.identified_risks  ?? '',
          constraints:           p.constraints       ?? '',
          assumptions:           p.assumptions       ?? '',
          notes:                 p.notes             ?? '',
          client_name:           p.client_name       ?? '',
          client_representative: p.client_representative ?? '',
          client_email:          p.client_email      ?? '',
          client_phone:          p.client_phone      ?? '',
          client_address:        p.client_address    ?? '',
          client_rfc:            p.client_rfc        ?? '',
          client_tax_regime:     p.client_tax_regime ?? '',
          client_cfdi_usage:     p.client_cfdi_usage ?? '',
          client_billing_email:  p.client_billing_email ?? '',
          client_zip_code:       p.client_zip_code   ?? '',
          developer_representative: p.developer_representative ?? '',
          project_manager_name:  p.project_manager_name ?? '',
        });
      });
    }
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await projectsAPI.updateProject(id, form);
        toast.success('Proyecto actualizado');
        navigate(`/projects/${id}`);
      } else {
        const r = await projectsAPI.createProject(form);
        toast.success('Proyecto creado');
        navigate(`/projects/${r.data.id}`);
      }
    } catch (err) {
      const errors = err?.response?.data?.errors;
      if (errors) Object.values(errors).forEach((m) => toast.error(m));
      else toast.error(err?.response?.data?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  // ── Field helpers ──────────────────────────────────────────────
  const inp = (key, label, type = 'text', required = false, placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type={type} required={required} value={form[key] ?? ''}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
          focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" />
    </div>
  );

  const ta = (key, label, rows = 3, required = false, placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <textarea rows={rows} required={required} value={form[key] ?? ''}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
          focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-shadow" />
    </div>
  );

  const sel = (key, label, options, required = false) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select required={required} value={form[key] ?? ''}
        onChange={(e) => set(key, e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
          focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
        {options}
      </select>
    </div>
  );

  // Count filled fields per tab for progress hints
  const filled = {
    general: [form.code, form.name, form.description, form.category_id, form.director_id].filter(Boolean).length,
    dates:   [form.planned_start_date, form.planned_end_date, form.planned_budget].filter(Boolean).length,
    client:  [form.client_name, form.client_email].filter(Boolean).length,
    scope:   [form.objectives, form.scope].filter(Boolean).length,
    risks:   [form.identified_risks, form.constraints, form.assumptions].filter(Boolean).length,
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {isEdit ? 'Editar Proyecto' : 'Nuevo Proyecto'}
            </h1>
            {isEdit && <p className="text-sm text-slate-500">Código: {form.code}</p>}
          </div>
        </div>

        <form onSubmit={handle}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">

            {/* Tab bar */}
            <div className="flex border-b border-slate-100 dark:border-slate-700 overflow-x-auto">
              {TABS.map(({ id: tid, label, icon: Icon }) => {
                const count = filled[tid] ?? 0;
                return (
                  <button key={tid} type="button" onClick={() => setTab(tid)}
                    className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
                      ${tab === tid
                        ? 'border-b-2 border-indigo-600 text-indigo-600'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <Icon size={14} />
                    {label}
                    {count > 0 && (
                      <span className="ml-1 w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-semibold">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-6">

              {/* ── TAB: General ─────────────────────────────── */}
              {tab === 'general' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    {inp('code', 'Código del Proyecto', 'text', true, 'EJ-2026')}
                    {inp('name', 'Nombre del Proyecto', 'text', true, 'Nombre descriptivo del proyecto')}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {sel('category_id', 'Categoría', (
                      <>
                        <option value="">Seleccionar...</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </>
                    ), true)}

                    {sel('status', 'Estado', STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    )))}

                    {sel('priority', 'Prioridad', PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    )))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {sel('director_id', 'Director del Proyecto', (
                      <>
                        <option value="">Seleccionar director...</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.first_name} {u.last_name} — {u.role}
                          </option>
                        ))}
                      </>
                    ), true)}

                    {sel('sponsor_id', 'Patrocinador (Sponsor)', (
                      <>
                        <option value="">Sin patrocinador</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.first_name} {u.last_name}
                          </option>
                        ))}
                      </>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {inp('project_manager_name',     'Nombre del PM Responsable', 'text', false, 'Nombre completo')}
                    {inp('developer_representative', 'Representante del Equipo',  'text', false, 'Nombre del líder técnico')}
                  </div>

                  {ta('description', 'Descripción del Proyecto', 4, true, 'Descripción general del proyecto, su propósito y contexto...')}
                </div>
              )}

              {/* ── TAB: Fechas y Presupuesto ─────────────────── */}
              {tab === 'dates' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">📅 Fechas Planificadas</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {inp('planned_start_date', 'Inicio Planificado', 'date', true)}
                      {inp('planned_end_date',   'Fin Planificado',    'date', true)}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">✅ Fechas Reales</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {inp('actual_start_date', 'Inicio Real', 'date')}
                      {inp('actual_end_date',   'Fin Real',    'date')}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">💰 Presupuesto</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {inp('planned_budget', 'Presupuesto Planificado ($)', 'number', true, '0.00')}
                      {inp('actual_budget',  'Presupuesto Ejecutado ($)',   'number', false, '0.00')}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">📊 Avance</h3>
                    <div className="max-w-xs">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Porcentaje de Completitud: <span className="text-indigo-600 font-semibold">{form.completion_percentage}%</span>
                      </label>
                      <input type="range" min="0" max="100" step="5"
                        value={form.completion_percentage ?? 0}
                        onChange={(e) => set('completion_percentage', e.target.value)}
                        className="w-full accent-indigo-600" />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                        <div className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${form.completion_percentage ?? 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: Cliente ──────────────────────────────── */}
              {tab === 'client' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">👤 Datos del Cliente</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {inp('client_name',           'Nombre / Empresa del Cliente', 'text', false, 'Nombre o razón social')}
                      {inp('client_representative', 'Representante del Cliente',    'text', false, 'Contacto principal')}
                      {inp('client_email',          'Correo del Cliente',           'email',false, 'contacto@empresa.com')}
                      {inp('client_billing_email',  'Correo de Facturación',        'email',false, 'facturacion@empresa.com')}
                      {inp('client_phone',          'Teléfono del Cliente',         'tel',  false, '+52 55 XXXX XXXX')}
                      {inp('client_zip_code',       'Código Postal',                'text', false, '06600')}
                    </div>
                    <div className="mt-4">
                      {ta('client_address', 'Dirección del Cliente', 2, false, 'Calle, número, colonia, ciudad...')}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">🧾 Datos Fiscales (para CFDI)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {inp('client_rfc',        'RFC del Cliente',     'text', false, 'XAXX010101000')}
                      {inp('client_tax_regime', 'Régimen Fiscal',      'text', false, 'Ej: 601 - General de Ley PM')}
                      {inp('client_cfdi_usage',  'Uso de CFDI',        'text', false, 'Ej: G03 - Gastos en general')}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: Alcance y Objetivos ──────────────────── */}
              {tab === 'scope' && (
                <div className="space-y-4">
                  {ta('objectives', 'Objetivos del Proyecto', 4, true,
                    '1. Objetivo principal\n2. Objetivo secundario\n3. ...')}
                  {ta('scope', 'Alcance', 4, true,
                    'Módulos, funcionalidades y sistemas que incluye este proyecto...')}
                  {ta('deliverables', 'Entregables', 4, false,
                    '• Entregable 1\n• Entregable 2\n• Documentación técnica...')}
                </div>
              )}

              {/* ── TAB: Riesgos y Notas ─────────────────────── */}
              {tab === 'risks' && (
                <div className="space-y-4">
                  {ta('identified_risks', 'Riesgos Identificados', 4, false,
                    '• Riesgo 1: descripción y impacto\n• Riesgo 2: ...')}
                  {ta('constraints', 'Restricciones y Limitaciones', 3, false,
                    'Presupuesto fijo, fechas inamovibles, recursos limitados...')}
                  {ta('assumptions', 'Supuestos del Proyecto', 3, false,
                    'Condiciones que se asumen verdaderas para la planificación...')}
                  {ta('notes', 'Notas Adicionales', 3, false,
                    'Información adicional relevante para el equipo...')}
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-400">
                {TABS.findIndex((t) => t.id === tab) + 1} de {TABS.length} —
                {tab !== 'risks'
                  ? <> usa las pestañas para completar todos los campos</>
                  : <> ¡Todo listo para guardar!</>}
              </p>
              <div className="flex items-center gap-3">
                {TABS.findIndex((t) => t.id === tab) > 0 && (
                  <button type="button" onClick={() => setTab(TABS[TABS.findIndex((t) => t.id === tab) - 1].id)}
                    className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                    ← Anterior
                  </button>
                )}
                {TABS.findIndex((t) => t.id === tab) < TABS.length - 1 && (
                  <button type="button" onClick={() => setTab(TABS[TABS.findIndex((t) => t.id === tab) + 1].id)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors font-medium">
                    Siguiente →
                  </button>
                )}
                <button type="submit" disabled={loading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700
                    disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
                  <Save size={16} />
                  {loading ? 'Guardando...' : (isEdit ? 'Actualizar Proyecto' : 'Crear Proyecto')}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
