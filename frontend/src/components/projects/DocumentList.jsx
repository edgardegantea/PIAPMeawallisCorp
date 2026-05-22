import { useEffect, useRef, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Upload, Trash2, FileText, Download } from 'lucide-react';

export default function DocumentList({ projectId }) {
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = () => projectsAPI.getDocuments(projectId).then((r) => setDocs(r.data)).finally(() => setLoading(false));
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

  const remove = async (id) => {
    if (!confirm('¿Eliminar documento?')) return;
    try { await projectsAPI.deleteDocument(id); load(); } catch { toast.error('Error'); }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Documentos ({docs.length})</h3>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-2 rounded-lg">
          <Upload size={14} /> {uploading ? 'Subiendo...' : 'Subir Documento'}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={upload} />
      </div>

      {docs.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">Sin documentos adjuntos</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50">
              <FileText size={18} className="text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                <p className="text-xs text-slate-400">{doc.file_name} · {formatSize(doc.file_size)}</p>
              </div>
              <button onClick={() => remove(doc.id)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
