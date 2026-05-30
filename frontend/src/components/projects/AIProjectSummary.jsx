import { useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Sparkles, Loader2, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const RISK_COLORS = {
  ALTA: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIA:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  BAJA: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

export default function AIProjectSummary({ projectId, isManager }) {
  const [summary, setSummary]     = useState('');
  const [risks,   setRisks]       = useState([]);
  const [loadingS, setLoadingS]   = useState(false);
  const [loadingR, setLoadingR]   = useState(false);
  const [showRisks, setShowRisks] = useState(false);
  const [lastGen,   setLastGen]   = useState('');

  const genSummary = async () => {
    setLoadingS(true);
    try {
      const r = await projectsAPI.getAISummary(projectId);
      setSummary(r.data.summary);
      setLastGen(r.data.generated_at);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Error al generar resumen';
      toast.error(msg.includes('ANTHROPIC_API_KEY') ? 'Configura ANTHROPIC_API_KEY en el .env del servidor' : msg);
    } finally { setLoadingS(false); }
  };

  const genRisks = async () => {
    setLoadingR(true);
    try {
      const r = await projectsAPI.getAIRisks(projectId);
      setRisks(r.data.risks ?? []);
      setShowRisks(true);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Error al detectar riesgos';
      toast.error(msg.includes('ANTHROPIC_API_KEY') ? 'Configura ANTHROPIC_API_KEY en el .env del servidor' : msg);
    } finally { setLoadingR(false); }
  };

  if (!isManager) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Asistente IA</h3>
        <span className="text-[10px] text-indigo-400 ml-auto">Powered by Claude</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={genSummary} disabled={loadingS}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
          {loadingS ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {summary ? 'Regenerar resumen' : 'Generar resumen ejecutivo'}
        </button>
        <button onClick={genRisks} disabled={loadingR}
          className="flex items-center gap-1.5 border border-indigo-300 text-indigo-600 dark:text-indigo-400 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
          {loadingR ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
          Detectar riesgos con IA
        </button>
      </div>

      {summary && (
        <div className="bg-white dark:bg-slate-800/60 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
          <div className="flex items-center gap-1 mb-2">
            <Sparkles size={11} className="text-indigo-400" />
            <span className="text-[10px] text-indigo-400 font-medium">Resumen ejecutivo — {lastGen?.slice(0, 16)}</span>
            <button onClick={genSummary} className="ml-auto text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
              <RefreshCw size={11} />
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{summary}</p>
        </div>
      )}

      {risks.length > 0 && (
        <div>
          <button onClick={() => setShowRisks((v) => !v)}
            className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            <AlertTriangle size={12} /> {risks.length} riesgos detectados por IA
            {showRisks ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {showRisks && (
            <div className="mt-2 space-y-2">
              {risks.map((r, i) => (
                <div key={i} className="bg-white dark:bg-slate-800/60 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{r.risk}</p>
                      <p className="text-xs text-slate-400 mt-0.5 italic">{r.mitigation}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${RISK_COLORS[r.probability] ?? RISK_COLORS.BAJA}`}>P: {r.probability}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${RISK_COLORS[r.impact] ?? RISK_COLORS.BAJA}`}>I: {r.impact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
