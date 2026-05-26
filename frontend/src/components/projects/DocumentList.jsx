import { useEffect, useRef, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Upload, Trash2, FileText, FileImage, FileSpreadsheet, FileCode, Download } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

function fileIcon(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return FileImage;
  if (['xls','xlsx','csv'].includes(ext)) return FileSpreadsheet;
  if (['js','jsx','ts','tsx','php','py','java','html','css','json','xml'].includes(ext)) return FileCode;
  return FileText;
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentList({ projectId, isManager = false }) {
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm]     = useState(null);
  const fileRef = useRef();

  const load = () =>
    projectsAPI.getDocuments(projectId)
      .then((r) => setDocs(r.data))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [projectId]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('project_id', projectId);
      fd.append('name', file.name);
      await projectsAPI.uploadDocument(fd);
      toast.success('Documento subido');
      load();
    } catch { toast.error('Error al subir documento'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const remove = (id, name) => setConfirm({
    title: 'Eliminar documento',
    body: `¿Eliminar "${name}"? Esta acción no se puede deshacer.`,
    onConfirm: async () => {
      try { await projectsAPI.deleteDocument(id); load(); }
      catch { toast.error('Error al eliminar'); }
    },
  });

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Documentos ({docs.length})</h3>
        {isManager && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-2 rounded-lg"
            >
              <Upload size={14} /> {uploading ? 'Subiendo...' : 'Subir Documento'}
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={upload} />
          </>
        )}
      </div>

      {docs.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">Sin documentos adjuntos</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => {
            const Icon = fileIcon(doc.file_name || doc.name);
            return (
              <div key={doc.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                  <p className="text-xs text-slate-400">
                    {doc.file_name && doc.file_name !== doc.name && `${doc.file_name} · `}
                    {formatSize(doc.file_size)}
                    {doc.created_at && ` · ${new Date(doc.created_at).toLocaleDateString('es-MX')}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      download
                      title="Descargar"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Download size={14} />
                    </a>
                  )}
                  {isManager && (
                    <button
                      onClick={() => remove(doc.id, doc.name)}
                      title="Eliminar"
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
