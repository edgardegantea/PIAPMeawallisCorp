import { useEffect, useRef, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import {
  Plus, Trash2, Edit2, X, Check, ExternalLink, Tag,
  FileText, FileSpreadsheet, Presentation, Image, Archive,
  Upload, Download, File, Loader2, Link,
} from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

/* ── constants ─────────────────────────────────────────────────────────── */

const STATUS_COLORS = {
  BORRADOR:    'bg-slate-100  text-slate-600  dark:bg-slate-700  dark:text-slate-400',
  EN_REVISION: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30 dark:text-amber-400',
  APROBADO:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  OBSOLETO:    'bg-red-100    text-red-600    dark:bg-red-900/30  dark:text-red-400',
};

const DOC_TYPES = [
  'REQUERIMIENTOS','ARQUITECTURA','DISEÑO','API',
  'BASE_DATOS','MANUAL_USUARIO','MANUAL_TECNICO','PRUEBAS','DESPLIEGUE','OTRO',
];
const STATUSES = ['BORRADOR','EN_REVISION','APROBADO','OBSOLETO'];

const DOC_TYPE_LABELS = {
  REQUERIMIENTOS:'Requerimientos', ARQUITECTURA:'Arquitectura', DISEÑO:'Diseño',
  API:'API', BASE_DATOS:'Base de Datos', MANUAL_USUARIO:'Manual de Usuario',
  MANUAL_TECNICO:'Manual Técnico', PRUEBAS:'Pruebas', DESPLIEGUE:'Despliegue', OTRO:'Otro',
};

const EMPTY = {
  title:'', doc_type:'OTRO', version:'1.0',
  status:'BORRADOR', description:'', file_url:'', tags:'',
};

/* ── helpers ────────────────────────────────────────────────────────────── */

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function DocIcon({ mime, size = 16 }) {
  if (!mime) return <File size={size} className="text-slate-400" />;
  if (mime.includes('pdf'))          return <FileText       size={size} className="text-red-500" />;
  if (mime.includes('word') || mime.includes('document'))
                                     return <FileText       size={size} className="text-blue-500" />;
  if (mime.includes('sheet') || mime.includes('excel'))
                                     return <FileSpreadsheet size={size} className="text-emerald-600" />;
  if (mime.includes('presentation') || mime.includes('powerpoint'))
                                     return <Presentation   size={size} className="text-orange-500" />;
  if (mime.startsWith('image/'))     return <Image          size={size} className="text-purple-500" />;
  if (mime.includes('zip'))          return <Archive        size={size} className="text-amber-500" />;
  return <File size={size} className="text-slate-400" />;
}

/* ── File drop zone ─────────────────────────────────────────────────────── */

function FilePicker({ file, setFile, fileUrl, setFileUrl }) {
  const inputRef  = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState(fileUrl ? 'url' : 'file'); // 'file' | 'url'

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); setFileUrl(''); }
  };

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex gap-1 text-xs">
        <button type="button"
          onClick={() => { setMode('file'); setFileUrl(''); }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors
            ${mode === 'file' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-500 hover:border-indigo-400 dark:border-slate-600 dark:text-slate-400'}`}>
          <Upload size={11} /> Subir archivo
        </button>
        <button type="button"
          onClick={() => { setMode('url'); setFile(null); }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors
            ${mode === 'url' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-500 hover:border-indigo-400 dark:border-slate-600 dark:text-slate-400'}`}>
          <Link size={11} /> URL externa
        </button>
      </div>

      {mode === 'file' ? (
        file ? (
          /* Selected file preview */
          <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3">
            <DocIcon mime={file.type} size={20} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
              <p className="text-xs text-slate-400">{fmtSize(file.size)}</p>
            </div>
            <button type="button" onClick={() => { setFile(null); }} className="text-slate-400 hover:text-red-500">
              <X size={14} />
            </button>
          </div>
        ) : (
          /* Drop zone */
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-colors
              ${dragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                         : 'border-slate-200 dark:border-slate-600 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
            <Upload size={22} className="mx-auto mb-2 text-slate-300 dark:text-slate-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Arrastra un archivo o <span className="text-indigo-600 font-medium">haz clic para seleccionar</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, PPT, imágenes, ZIP — máx 30 MB</p>
          </div>
        )
      ) : (
        /* URL input */
        <input
          type="url"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="https://drive.google.com/... o SharePoint, Confluence, etc."
          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      )}

      <input ref={inputRef} type="file" className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip"
        onChange={(e) => { if (e.target.files[0]) { setFile(e.target.files[0]); setFileUrl(''); } }} />
    </div>
  );
}

/* ── Field input helper ──────────────────────────────────────────────────── */

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';

/* ── Main component ─────────────────────────────────────────────────────── */

export default function TechnicalDocList({ projectId, isManager = false }) {
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [filterType, setFilterType] = useState('');
  const [confirm, setConfirm]   = useState(null);

  // Create form state
  const [form, setForm]       = useState({ ...EMPTY });
  const [file, setFile]       = useState(null);
  const [fileUrl, setFileUrl] = useState('');

  // Edit form state
  const [editForm, setEditForm]         = useState({});
  const [editFile, setEditFile]         = useState(null);
  const [editFileUrl, setEditFileUrl]   = useState('');

  const load = () =>
    projectsAPI.getTechnicalDocs(projectId)
      .then((r) => setDocs(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [projectId]);

  /* ── Submit create ── */
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      if (file)    fd.append('file', file);
      if (fileUrl) fd.set('file_url', fileUrl);

      await projectsAPI.uploadTechnicalDoc(projectId, fd);
      toast.success('Documento técnico registrado');
      setForm({ ...EMPTY }); setFile(null); setFileUrl('');
      setShowForm(false); load();
    } catch { toast.error('Error al crear documento'); }
    finally { setSaving(false); }
  };

  /* ── Submit edit ── */
  const saveEdit = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(editForm).forEach(([k, v]) => { if (v !== '' && v != null) fd.append(k, v); });
      if (editFile)    fd.append('file', editFile);
      if (editFileUrl) fd.set('file_url', editFileUrl);

      await projectsAPI.updateTechnicalDoc(editId, fd);
      toast.success('Documento actualizado');
      setEditId(null); setEditFile(null); setEditFileUrl('');
      load();
    } catch { toast.error('Error al actualizar'); }
    finally { setSaving(false); }
  };

  const startEdit = (d) => {
    setEditId(d.id);
    setEditForm({
      title: d.title, doc_type: d.doc_type, version: d.version,
      status: d.status, description: d.description || '', tags: d.tags || '',
    });
    setEditFile(null);
    setEditFileUrl(d.file_url || '');
  };

  const remove = (d) => setConfirm({
    title: 'Eliminar documento',
    body: `¿Eliminar "${d.title}"? Se eliminará también el archivo del servidor.`,
    onConfirm: async () => {
      try { await projectsAPI.deleteTechnicalDoc(d.id); toast.success('Documento eliminado'); load(); }
      catch { toast.error('Error al eliminar'); }
    },
  });

  /* ── Derived ── */
  const approvedCount = docs.filter((d) => d.status === 'APROBADO').length;
  const typeCounts    = docs.reduce((acc, d) => ({ ...acc, [d.doc_type]: (acc[d.doc_type] || 0) + 1 }), {});
  const filtered      = filterType ? docs.filter((d) => d.doc_type === filterType) : docs;

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Cargando…</p>;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">
            Documentación Técnica <span className="text-slate-400 font-normal">({docs.length})</span>
          </h3>
          {approvedCount > 0 && (
            <p className="text-xs text-emerald-600 mt-0.5">
              {approvedCount} aprobado{approvedCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {isManager && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Plus size={14} /> Nuevo documento
          </button>
        )}
      </div>

      {/* Type filter chips */}
      {docs.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterType('')}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors
              ${!filterType ? 'bg-indigo-600 text-white border-indigo-600'
                           : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-400'}`}>
            Todos ({docs.length})
          </button>
          {Object.entries(typeCounts).map(([type, count]) => (
            <button key={type} onClick={() => setFilterType(type === filterType ? '' : type)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                ${filterType === type ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-400'}`}>
              {DOC_TYPE_LABELS[type] || type} ({count})
            </button>
          ))}
        </div>
      )}

      {/* ── Create form ── */}
      {showForm && (
        <form onSubmit={submit}
          className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-5 space-y-4 border border-slate-200 dark:border-slate-600">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nuevo documento técnico</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Título *">
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej. Documento de Arquitectura del Sistema"
                className={inputCls} />
            </Field>
            <Field label="Tipo de documento">
              <select value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
                className={inputCls}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={inputCls}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Versión">
              <input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="1.0" className={inputCls} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Tags (separados por coma)">
                <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="backend, api, v2" className={inputCls} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Descripción">
                <textarea rows={2} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Resumen del contenido del documento…"
                  className={inputCls + ' resize-none'} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Archivo o URL">
                <FilePicker file={file} setFile={setFile} fileUrl={fileUrl} setFileUrl={setFileUrl} />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setFile(null); setFileUrl(''); }}
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 px-3 py-2 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
              {saving && <Loader2 size={13} className="animate-spin" />}
              Registrar documento
            </button>
          </div>
        </form>
      )}

      {/* ── Doc list ── */}
      {docs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sin documentación técnica aún.</p>
          <p className="text-xs mt-1">Añade diagramas, manuales, especificaciones de API y más.</p>
          {isManager && !showForm && (
            <button onClick={() => setShowForm(true)}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Subir primer documento
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">Sin documentos de este tipo.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const hasFile = !!d.stored_name;
            const hasUrl  = !!d.file_url;
            const isEdit  = editId === d.id;

            return (
              <div key={d.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">

                {isEdit ? (
                  /* ── Edit form inline ── */
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <Field label="Título">
                          <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className={inputCls} />
                        </Field>
                      </div>
                      <Field label="Tipo">
                        <select value={editForm.doc_type} onChange={(e) => setEditForm({ ...editForm, doc_type: e.target.value })}
                          className={inputCls}>
                          {DOC_TYPES.map((t) => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
                        </select>
                      </Field>
                      <Field label="Estado">
                        <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className={inputCls}>
                          {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </Field>
                      <Field label="Versión">
                        <input value={editForm.version} onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
                          className={inputCls} />
                      </Field>
                      <Field label="Tags">
                        <input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                          placeholder="tag1, tag2" className={inputCls} />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Descripción">
                          <textarea rows={2} value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className={inputCls + ' resize-none'} />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field label="Reemplazar archivo o URL">
                          <FilePicker file={editFile} setFile={setEditFile} fileUrl={editFileUrl} setFileUrl={setEditFileUrl} />
                        </Field>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button onClick={() => setEditId(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded transition-colors">
                        <X size={15} />
                      </button>
                      <button onClick={saveEdit} disabled={saving}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Doc card ── */
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <DocIcon mime={d.mime_type} size={20} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{d.title}</span>
                          <span className="text-xs text-slate-400 font-mono">v{d.version}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                            {DOC_TYPE_LABELS[d.doc_type] || d.doc_type}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status]}`}>
                            {d.status.replace('_', ' ')}
                          </span>
                          {hasFile && (
                            <span className="text-xs text-slate-400">{fmtSize(d.size_bytes)}</span>
                          )}
                        </div>

                        {d.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">{d.description}</p>
                        )}

                        {/* Tags */}
                        {d.tags && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            <Tag size={10} className="text-slate-400" />
                            {d.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                              <span key={tag} className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Filename for uploaded files */}
                        {hasFile && d.original_name && (
                          <p className="text-[10px] text-slate-400 mt-1 truncate">{d.original_name}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Download / open */}
                        {hasFile && (
                          <a href={projectsAPI.getTechnicalDocDownloadUrl(d.id)}
                            download={d.original_name}
                            className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                            title="Descargar archivo">
                            <Download size={15} />
                          </a>
                        )}
                        {hasUrl && !hasFile && (
                          <a href={d.file_url} target="_blank" rel="noreferrer"
                            className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                            title="Abrir enlace">
                            <ExternalLink size={15} />
                          </a>
                        )}
                        {isManager && (
                          <>
                            <button onClick={() => startEdit(d)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => remove(d)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
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
