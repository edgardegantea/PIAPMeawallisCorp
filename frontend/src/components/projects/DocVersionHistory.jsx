import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { Download, History, ChevronDown, ChevronUp } from 'lucide-react';

function fmtSize(b) {
  if (!b) return '';
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function DocVersionHistory({ docId }) {
  const [versions, setVersions] = useState([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    projectsAPI.getTechDocVersions(docId)
      .then((r) => setVersions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, docId]);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors">
        <History size={12} />
        Historial de versiones
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {open && (
        <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-slate-100 dark:border-slate-700">
          {loading && <p className="text-xs text-slate-400">Cargando…</p>}
          {!loading && versions.length === 0 && (
            <p className="text-xs text-slate-400 italic">Sin versiones anteriores</p>
          )}
          {versions.map((v) => (
            <div key={v.id} className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                v{v.version_label || '?'}
              </span>
              <span className="truncate flex-1">{v.original_name}</span>
              {v.size_bytes && <span className="text-slate-400">{fmtSize(v.size_bytes)}</span>}
              <span className="text-slate-300 dark:text-slate-600">
                {v.created_at?.slice(0, 10)}
              </span>
              <a href={projectsAPI.getTechDocVersionDownloadUrl(v.id)}
                download={v.original_name}
                className="text-indigo-500 hover:text-indigo-700 flex-shrink-0"
                title="Descargar versión">
                <Download size={12} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
