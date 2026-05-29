import { useEffect, useState, useCallback } from 'react';
import { projectsAPI } from '../services/projectsAPI';
import Layout from '../components/Layout';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import {
  LayoutTemplate, Plus, Pencil, Trash2, FolderOpen,
  ChevronDown, ChevronUp, X, Loader2, Copy, Rocket,
} from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  description: '',
  category_id: '',
  is_public: true,
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function CreateProjectModal({ template, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: `${template.name} - Copia`,
    start_date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await projectsAPI.createProjectFromTemplate(template.id, form);
      toast.success('Proyecto creado desde plantilla');
      onCreated();
    } catch {
      toast.error('Error al crear proyecto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Crear proyecto desde "${template.name}"`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nombre del proyecto *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Fecha de inicio</label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 border border-slate-300 dark:border-slate-600 text-sm rounded-lg py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg py-2 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving && <Loader2 size={14} className="animate-spin" />}
            <Rocket size={14} /> Crear proyecto
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TemplateForm({ initial, categories, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const inp = (k, label, type = 'text', required = false) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}{required && ' *'}</label>
      <input
        required={required}
        type={type}
        value={form[k]}
        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {inp('name', 'Nombre', 'text', true)}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Descripción</label>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Categoría</label>
        <select
          value={form.category_id}
          onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Sin categoría</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_public"
          checked={!!form.is_public}
          onChange={(e) => setForm((f) => ({ ...f, is_public: e.target.checked }))}
          className="rounded"
        />
        <label htmlFor="is_public" className="text-sm text-slate-600 dark:text-slate-300">Plantilla pública (visible para todos)</label>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 border border-slate-300 dark:border-slate-600 text-sm rounded-lg py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg py-2 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
          {saving && <Loader2 size={14} className="animate-spin" />}
          Guardar
        </button>
      </div>
    </form>
  );
}

export default function TemplatesPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [templates,   setTemplates]   = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [projects,    setProjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);

  const [showCreate,  setShowCreate]  = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [deleteItem,  setDeleteItem]  = useState(null);
  const [useItem,     setUseItem]     = useState(null);  // create project modal

  // "save from project" panel
  const [showSaveFrom,  setShowSaveFrom]  = useState(false);
  const [saveFromTpl,   setSaveFromTpl]   = useState('');
  const [saveFromPrj,   setSaveFromPrj]   = useState('');
  const [savingFrom,    setSavingFrom]    = useState(false);

  // expanded card (show JSON preview)
  const [expandedId,  setExpandedId]  = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      projectsAPI.getTemplates(),
      projectsAPI.getCategories(),
      projectsAPI.getProjects({ per_page: 100 }),
    ])
      .then(([t, c, p]) => {
        setTemplates(t.data?.data ?? t.data ?? []);
        setCategories(c.data ?? []);
        setProjects(p.data?.data ?? []);
      })
      .catch(() => toast.error('Error al cargar plantillas'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── CRUD ── */
  const handleCreate = async (form) => {
    try {
      await projectsAPI.createTemplate(form);
      toast.success('Plantilla creada');
      setShowCreate(false);
      load();
    } catch { toast.error('Error al crear plantilla'); }
  };

  const handleEdit = async (form) => {
    try {
      await projectsAPI.updateTemplate(editItem.id, form);
      toast.success('Plantilla actualizada');
      setEditItem(null);
      load();
    } catch { toast.error('Error al actualizar plantilla'); }
  };

  const handleDelete = async () => {
    try {
      await projectsAPI.deleteTemplate(deleteItem.id);
      toast.success('Plantilla eliminada');
      setDeleteItem(null);
      load();
    } catch { toast.error('Error al eliminar plantilla'); }
  };

  const handleSaveFrom = async () => {
    if (!saveFromTpl || !saveFromPrj) return;
    setSavingFrom(true);
    try {
      await projectsAPI.saveProjectAsTemplate(saveFromTpl, saveFromPrj);
      toast.success('Proyecto guardado como plantilla');
      setShowSaveFrom(false);
      setSaveFromTpl(''); setSaveFromPrj('');
      load();
    } catch { toast.error('Error al guardar plantilla'); }
    finally { setSavingFrom(false); }
  };

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const tplData = (tpl) => {
    try { return typeof tpl.template_data === 'string' ? JSON.parse(tpl.template_data) : (tpl.template_data ?? {}); }
    catch { return {}; }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <LayoutTemplate size={20} className="text-indigo-500" />
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Plantillas de proyecto</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Reutiliza estructuras de sprints, tareas e hitos</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isAdmin && (
              <button onClick={() => setShowSaveFrom(true)}
                className="flex items-center gap-1.5 border border-indigo-300 text-indigo-600 dark:text-indigo-400 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <FolderOpen size={14} /> Guardar proyecto como plantilla
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
                <Plus size={14} /> Nueva plantilla
              </button>
            )}
          </div>
        </div>

        {/* Templates grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando…</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <LayoutTemplate size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay plantillas creadas aún.</p>
            {isAdmin && (
              <button onClick={() => setShowCreate(true)}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Crear primera plantilla
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => {
              const data      = tplData(tpl);
              const sprCount  = (data.sprints  ?? []).length;
              const tskCount  = (data.tasks    ?? []).length;
              const mstCount  = (data.milestones ?? []).length;
              const expanded  = expandedId === tpl.id;

              return (
                <div key={tpl.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{tpl.name}</h3>
                        {tpl.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{tpl.description}</p>
                        )}
                      </div>
                      {tpl.is_public ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">Pública</span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">Privada</span>
                      )}
                    </div>

                    {tpl.category_id && (
                      <span className="inline-block text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded mb-2">
                        {categoryMap[tpl.category_id] ?? 'Categoría'}
                      </span>
                    )}

                    <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                      {sprCount > 0 && <span>{sprCount} sprint{sprCount > 1 ? 's' : ''}</span>}
                      {tskCount > 0 && <span>{tskCount} tarea{tskCount > 1 ? 's' : ''}</span>}
                      {mstCount > 0 && <span>{mstCount} hito{mstCount > 1 ? 's' : ''}</span>}
                      {!sprCount && !tskCount && !mstCount && <span className="italic">Sin estructura guardada</span>}
                    </div>

                    {/* Expandable JSON preview */}
                    {(sprCount > 0 || tskCount > 0 || mstCount > 0) && (
                      <button
                        onClick={() => setExpandedId(expanded ? null : tpl.id)}
                        className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5">
                        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {expanded ? 'Ocultar detalle' : 'Ver detalle'}
                      </button>
                    )}

                    {expanded && (
                      <div className="mt-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 max-h-40 overflow-y-auto space-y-1">
                        {(data.sprints ?? []).map((s, i) => (
                          <div key={i}><span className="text-blue-500">Sprint:</span> {s.name}</div>
                        ))}
                        {(data.tasks ?? []).map((t, i) => (
                          <div key={i}><span className="text-emerald-500">Tarea:</span> {t.title}</div>
                        ))}
                        {(data.milestones ?? []).map((m, i) => (
                          <div key={i}><span className="text-amber-500">Hito:</span> {m.name}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <button
                      onClick={() => setUseItem(tpl)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                      <Copy size={12} /> Crear proyecto
                    </button>
                    {isAdmin && (
                      <>
                        <button onClick={() => setEditItem(tpl)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteItem(tpl)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Create modal ── */}
        {showCreate && (
          <Modal title="Nueva plantilla" onClose={() => setShowCreate(false)}>
            <TemplateForm categories={categories} onSave={handleCreate} onCancel={() => setShowCreate(false)} />
          </Modal>
        )}

        {/* ── Edit modal ── */}
        {editItem && (
          <Modal title="Editar plantilla" onClose={() => setEditItem(null)}>
            <TemplateForm
              initial={{ name: editItem.name, description: editItem.description ?? '', category_id: editItem.category_id ?? '', is_public: !!editItem.is_public }}
              categories={categories}
              onSave={handleEdit}
              onCancel={() => setEditItem(null)}
            />
          </Modal>
        )}

        {/* ── Delete confirm ── */}
        {deleteItem && (
          <Modal title="Eliminar plantilla" onClose={() => setDeleteItem(null)}>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              ¿Eliminar la plantilla <strong>"{deleteItem.name}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteItem(null)}
                className="flex-1 border border-slate-300 dark:border-slate-600 text-sm rounded-lg py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg py-2 transition-colors">
                Eliminar
              </button>
            </div>
          </Modal>
        )}

        {/* ── Create project from template modal ── */}
        {useItem && (
          <CreateProjectModal
            template={useItem}
            onClose={() => setUseItem(null)}
            onCreated={() => { setUseItem(null); }}
          />
        )}

        {/* ── Save project as template panel ── */}
        {showSaveFrom && (
          <Modal title="Guardar proyecto como plantilla" onClose={() => setShowSaveFrom(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Plantilla destino *</label>
                <select
                  value={saveFromTpl}
                  onChange={(e) => setSaveFromTpl(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Seleccionar plantilla…</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Proyecto origen *</label>
                <select
                  value={saveFromPrj}
                  onChange={(e) => setSaveFromPrj(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Seleccionar proyecto…</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <p className="text-xs text-slate-400">Se copiarán los sprints, tareas e hitos del proyecto seleccionado.</p>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowSaveFrom(false)}
                  className="flex-1 border border-slate-300 dark:border-slate-600 text-sm rounded-lg py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSaveFrom} disabled={!saveFromTpl || !saveFromPrj || savingFrom}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg py-2 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                  {savingFrom && <Loader2 size={14} className="animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </Modal>
        )}

      </div>
    </Layout>
  );
}
