import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X, Check, ExternalLink, Tag } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

const STATUS_COLORS = {
  BORRADOR:   'bg-slate-100  text-slate-600',
  EN_REVISION:'bg-amber-100  text-amber-700',
  APROBADO:   'bg-emerald-100 text-emerald-700',
  OBSOLETO:   'bg-red-100    text-red-600',
};

const DOC_TYPES = [
  'REQUERIMIENTOS', 'ARQUITECTURA', 'DISEÑO', 'API',
  'BASE_DATOS', 'MANUAL_USUARIO', 'MANUAL_TECNICO',
  'PRUEBAS', 'DESPLIEGUE', 'OTRO',
];
const STATUSES = ['BORRADOR', 'EN_REVISION', 'APROBADO', 'OBSOLETO'];

const DOC_TYPE_LABELS = {
  REQUERIMIENTOS: 'Requerimientos', ARQUITECTURA: 'Arquitectura', DISEÑO: 'Diseño',
  API: 'API', BASE_DATOS: 'Base de Datos', MANUAL_USUARIO: 'Manual de Usuario',
  MANUAL_TECNICO: 'Manual Técnico', PRUEBAS: 'Pruebas', DESPLIEGUE: 'Despliegue', OTRO: 'Otro',
};

const EMPTY = {
  title: '', doc_type: 'OTRO', version: '1.0',
  status: 'BORRADOR', description: '', file_url: '', tags: '',
};

export default function TechnicalDocList({ projectId, isManager = false }) {
  const [docs, setDocs]         = useState([]);
  const [form, setForm]         = useState({ ...EMPTY });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading]   = useState(true);
  const [confirm, setConfirm]   = useState(null);
  const [filterType, setFilterType] = useState('');

  const load = () =>
    projectsAPI.getTechnicalDocs(projectId)
      .then((r) => setDocs(r.data.data ?? []))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [projectId]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await projectsAPI.createTechnicalDoc(projectId, form);
      toast.success('Documento técnico registrado');
      setForm({ ...EMPTY });
      setShowForm(false);
      load();
    } catch { toast.error('Error al crear documento'); }
  };

  const startEdit = (d) => {
    setEditId(d.id);
    setEditForm({
      title: d.title, doc_type: d.doc_type, version: d.version,
      status: d.status, description: d.description || '',
      file_url: d.file_url || '', tags: d.tags || '',
    });
  };

  const saveEdit = async () => {
    try {
      await projectsAPI.updateTechnicalDoc(editId, editForm);
      toast.success('Documento actualizado');
      setEditId(null);
      load();
    } catch { toast.error('Error al actualizar'); }
  };

  const remove = (id) => setConfirm({
    title: 'Eliminar documento',
    body: '¿Eliminar este documento técnico del proyecto?',
    onConfirm: async () => {
      try { await projectsAPI.deleteTechnicalDoc(id); load(); }
      catch { toast.error('Error al eliminar'); }
    },
  });

  const approvedCount = docs.filter((d) => d.status === 'APROBADO').length;
  const filtered = filterType ? docs.filter((d) => d.doc_type === filterType) : docs;

  // Group by doc_type for summary counts
  const typeCounts = docs.reduce((acc, d) => {
    acc[d.doc_type] = (acc[d.doc_type] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-700">Documentación Técnica ({docs.length})</h3>
          {approvedCount > 0 && (
            <p className="text-xs text-emerald-600 font-medium mt-0.5">{approvedCount} aprobado{approvedCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        {isManager && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Plus size={14} /> Nuevo Documento
          </button>
        )}
      </div>

      {/* Type filter chips */}
      {docs.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button onClick={() => setFilterType('')}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors
              ${!filterType ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-600 hover:border-indigo-400'}`}>
            Todos ({docs.length})
          </button>
          {Object.entries(typeCounts).map(([type, count]) => (
            <button key={type} onClick={() => setFilterType(type === filterType ? '' : type)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                ${filterType === type ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-600 hover:border-indigo-400'}`}>
              {DOC_TYPE_LABELS[type] || type} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={submit} className="bg-slate-50 rounded-xl p-4 mb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej. Documento de Arquitectura del Sistema"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de documento</label>
              <select value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {DOC_TYPES.map((t) => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Versión</label>
              <input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="1.0"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tags</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="Ej. backend, api, v2"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Resumen del contenido del documento..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">URL del archivo</label>
              <input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                placeholder="https://..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2">Cancelar</button>
            <button type="submit" className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Registrar</button>
          </div>
        </form>
      )}

      {/* List */}
      {docs.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">
          Sin documentación técnica. Añade diagramas, manuales, especificaciones y más.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">Sin documentos de este tipo.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const isEdit = editId === d.id;
            return (
              <div key={d.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                {isEdit ? (
                  <EditDocForm form={editForm} setForm={setEditForm}
                    onSave={saveEdit} onCancel={() => setEditId(null)} />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">{d.title}</span>
                          <span className="text-xs text-slate-400 font-mono">v{d.version}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            {DOC_TYPE_LABELS[d.doc_type] || d.doc_type}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status]}`}>
                            {d.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      {isManager && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => startEdit(d)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => remove(d.id)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {d.description && (
                      <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded px-2 py-1.5 line-clamp-2">
                        {d.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {d.tags && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Tag size={11} />
                          {d.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                            <span key={tag} className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {d.file_url && (
                        <a href={d.file_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                          <ExternalLink size={11} /> Ver archivo
                        </a>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}

function EditDocForm({ form, setForm, onSave, onCancel }) {
  return (
    <div className="space-y-2">
      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      <div className="grid grid-cols-2 gap-2">
        <select value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
          className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none">
          {['REQUERIMIENTOS','ARQUITECTURA','DISEÑO','API','BASE_DATOS','MANUAL_USUARIO','MANUAL_TECNICO','PRUEBAS','DESPLIEGUE','OTRO'].map((t) => (
            <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none">
          {['BORRADOR','EN_REVISION','APROBADO','OBSOLETO'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })}
          placeholder="Versión"
          className="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
        <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
          placeholder="Tags (separados por coma)"
          className="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
      </div>
      <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Descripción..."
        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none resize-none" />
      <input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })}
        placeholder="URL del archivo"
        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
        <button onClick={onSave}
          className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-1">
          <Check size={12} /> Guardar
        </button>
      </div>
    </div>
  );
}
