import { useRef, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Upload, Download, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function CSVImportModal({ projectId, onClose, onImported }) {
  const inputRef = useRef(null);
  const [file,     setFile]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await projectsAPI.importCSV(projectId, fd);
      setResult(r.data);
      if (r.data.created > 0) {
        toast.success(r.data.message);
        onImported?.();
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al importar');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Importar tareas desde CSV</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Download template */}
          <div className="flex items-start gap-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3">
            <Download size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">¿Primera vez?</p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">Descarga la plantilla CSV con el formato correcto.</p>
              <a href={`/api/projects/${projectId}/import/csv-template`} download="plantilla_tareas.csv"
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium mt-1.5 border border-indigo-300 dark:border-indigo-600 rounded-lg px-2.5 py-1 transition-colors">
                <Download size={11} /> Descargar plantilla
              </a>
            </div>
          </div>

          {/* File drop */}
          {file ? (
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3">
              <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={() => { setFile(null); setResult(null); }} className="text-slate-400 hover:text-red-500 transition-colors"><X size={14} /></button>
            </div>
          ) : (
            <div onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl px-4 py-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              <Upload size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-500" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Arrastra tu CSV o <span className="text-indigo-600 font-medium">haz clic</span></p>
              <p className="text-xs text-slate-400 mt-1">Columnas: title, status, priority, story_points, estimated_hours, due_date, assigned_to, sprint</p>
            </div>
          )}
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { if (e.target.files[0]) { setFile(e.target.files[0]); setResult(null); } }} />

          {/* Result */}
          {result && (
            <div className={`rounded-xl p-3 flex gap-3 ${result.created > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
              {result.created > 0 ? <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />}
              <div>
                <p className={`text-sm font-medium ${result.created > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>{result.message}</p>
                {result.errors?.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {result.errors.map((e, i) => <li key={i} className="text-xs text-red-500">{e}</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 border border-slate-300 dark:border-slate-600 text-sm rounded-lg py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300">
              Cerrar
            </button>
            <button onClick={handleImport} disabled={!file || loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg py-2 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Importar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
