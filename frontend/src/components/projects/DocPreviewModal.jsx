import { X, Download, ExternalLink } from 'lucide-react';
import { projectsAPI } from '../../services/projectsAPI';

/**
 * Inline preview for technical documents.
 * - PDF  → <iframe> (browser native viewer)
 * - Image → <img>
 * - Other → download prompt
 */
export default function DocPreviewModal({ doc, onClose }) {
  if (!doc) return null;

  const url  = projectsAPI.getTechnicalDocDownloadUrl(doc.id);
  const mime = doc.mime_type || '';
  const isPdf   = mime === 'application/pdf';
  const isImage = mime.startsWith('image/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{doc.title}</p>
            <p className="text-xs text-slate-400">{doc.original_name} · v{doc.version}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <a href={url} download={doc.original_name}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 rounded-lg px-3 py-1.5 transition-colors">
              <Download size={12} /> Descargar
            </a>
            {doc.file_url && (
              <a href={doc.file_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-400 rounded-lg px-3 py-1.5 transition-colors">
                <ExternalLink size={12} /> Abrir
              </a>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900">
          {isPdf && (
            <iframe
              src={url + '#toolbar=1&navpanes=0'}
              className="w-full h-full min-h-[60vh]"
              title={doc.title}
            />
          )}
          {isImage && (
            <div className="flex items-center justify-center h-full min-h-[50vh] p-4">
              <img src={url} alt={doc.title}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg" />
            </div>
          )}
          {!isPdf && !isImage && (
            <div className="flex flex-col items-center justify-center h-full min-h-[40vh] gap-4 text-slate-400">
              <p className="text-sm">Vista previa no disponible para este tipo de archivo.</p>
              <a href={url} download={doc.original_name}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                <Download size={15} /> Descargar archivo
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
