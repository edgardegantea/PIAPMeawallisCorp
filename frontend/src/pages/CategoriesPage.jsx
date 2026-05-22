import { useEffect, useState } from 'react';
import { projectsAPI } from '../services/projectsAPI';
import Layout from '../components/Layout';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tag, X, Check } from 'lucide-react';

const PRESET_COLORS = [
  '#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a',
  '#a18cd1', '#f6d365', '#fda085', '#84fab0', '#30cfd0',
];

const EMPTY = { name: '', description: '', color: '#667eea' };

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null); // null = crear, obj = editar
  const [form, setForm]             = useState(EMPTY);
  const [saving, setSaving]         = useState(false);

  const load = () => {
    projectsAPI.getCategories()
      .then(r => setCategories(r.data))
      .catch(() => toast.error('Error al cargar categorías'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || '', color: cat.color });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('El nombre es requerido');
    setSaving(true);
    try {
      if (editing) {
        await projectsAPI.updateCategory(editing.id, form);
        toast.success('Categoría actualizada');
      } else {
        await projectsAPI.createCategory(form);
        toast.success('Categoría creada');
      }
      closeModal();
      load();
    } catch (err) {
      const errors = err?.response?.data?.errors;
      if (errors) Object.values(errors).forEach(m => toast.error(m));
      else toast.error(err?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    try {
      await projectsAPI.deleteCategory(cat.id);
      toast.success('Categoría eliminada');
      load();
    } catch {
      toast.error('No se puede eliminar: puede estar en uso');
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Categorías</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{categories.length} categorías configuradas</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
          >
            <Plus size={16} /> Nueva Categoría
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20">
            <Tag size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No hay categorías aún</p>
            <button onClick={openCreate} className="mt-3 text-indigo-600 hover:underline text-sm">
              Crear la primera
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                {/* Color strip + nombre */}
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1"
                    style={{ background: cat.color, ringColor: cat.color }}
                  />
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex-1 truncate">{cat.name}</h3>
                  <span
                    className="text-xs font-mono text-slate-400 flex-shrink-0"
                    style={{ color: cat.color }}
                  >
                    {cat.color}
                  </span>
                </div>

                {/* Descripción */}
                {cat.description ? (
                  <p className="text-sm text-slate-500 line-clamp-2">{cat.description}</p>
                ) : (
                  <p className="text-sm text-slate-300 italic">Sin descripción</p>
                )}

                {/* Preview del badge */}
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: cat.color + '22', color: cat.color }}
                  >
                    {cat.name}
                  </span>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => openEdit(cat)}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <Pencil size={14} /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">
                {editing ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej. Desarrollo Web"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción opcional..."
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                {/* Paleta predefinida */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                      style={{ background: c }}
                      title={c}
                    >
                      {form.color === c && (
                        <Check size={14} className="mx-auto text-white" strokeWidth={3} />
                      )}
                    </button>
                  ))}
                </div>
                {/* Input manual */}
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm({ ...form, color: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={e => setForm({ ...form, color: e.target.value })}
                    placeholder="#667eea"
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {/* Preview */}
                  <span
                    className="text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0"
                    style={{ background: form.color + '22', color: form.color }}
                  >
                    {form.name || 'Preview'}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  {saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
