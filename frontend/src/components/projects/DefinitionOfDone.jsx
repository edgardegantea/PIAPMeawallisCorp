import { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/projectsAPI';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, CheckSquare } from 'lucide-react';

export default function DefinitionOfDone({ projectId, isManager }) {
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [newItem, setNewItem]   = useState('');
  const [dirty, setDirty]       = useState(false);

  const load = () =>
    projectsAPI.getDod(projectId)
      .then((r) => {
        setCriteria(r.data?.criteria ?? []);
      })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [projectId]);

  const addItem = () => {
    const text = newItem.trim();
    if (!text) return;
    setCriteria([...criteria, { text, checked: false }]);
    setNewItem('');
    setDirty(true);
  };

  const removeItem = (idx) => {
    setCriteria(criteria.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const updateText = (idx, text) => {
    setCriteria(criteria.map((c, i) => i === idx ? { ...c, text } : c));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      // Strip `checked` field before saving — backend stores just the text or we store objects
      await projectsAPI.updateDod(projectId, criteria);
      toast.success('Definition of Done guardada');
      setDirty(false);
      load();
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>;

  // Normalize criteria — might be strings or objects
  const normalize = (c) => (typeof c === 'string' ? { text: c } : c);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <CheckSquare size={16} className="text-indigo-600" />
            Definition of Done
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Criterios que toda historia de usuario debe cumplir para considerarse terminada.
          </p>
        </div>
        {dirty && isManager && (
          <button
            onClick={save}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        )}
      </div>

      {/* Criteria list */}
      <div className="space-y-2 mb-4">
        {criteria.length === 0 && !isManager && (
          <p className="text-slate-400 text-sm text-center py-8">Sin criterios definidos aún.</p>
        )}
        {criteria.map((c, idx) => {
          const item = normalize(c);
          return (
            <div key={idx} className="flex items-center gap-2 group bg-white border border-slate-200 rounded-lg px-3 py-2">
              <GripVertical size={14} className="text-slate-300 flex-shrink-0" />
              <span className="w-5 h-5 rounded border-2 border-emerald-400 flex-shrink-0 flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
              </span>
              {isManager ? (
                <input
                  value={item.text}
                  onChange={(e) => updateText(idx, e.target.value)}
                  className="flex-1 text-sm text-slate-700 focus:outline-none bg-transparent"
                  placeholder="Criterio de completitud..."
                />
              ) : (
                <span className="flex-1 text-sm text-slate-700">{item.text}</span>
              )}
              {isManager && (
                <button
                  onClick={() => removeItem(idx)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 rounded transition-opacity"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new criterion */}
      {isManager && (
        <div className="flex gap-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
            placeholder="Añadir criterio (p. ej. Código revisado por al menos 1 par)"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
          >
            <Plus size={14} /> Añadir
          </button>
        </div>
      )}

      {/* Suggested defaults */}
      {isManager && criteria.length === 0 && (
        <div className="mt-4 bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Sugerencias comunes</p>
          <div className="flex flex-wrap gap-2">
            {[
              'Código revisado por al menos 1 par',
              'Pruebas unitarias escritas y pasando',
              'Sin errores de linting',
              'Documentación actualizada',
              'Aceptado por el Product Owner',
              'Integrado en la rama principal',
              'Sin deuda técnica nueva',
              'Criterios de aceptación cumplidos',
            ].map((s) => (
              <button
                key={s}
                onClick={() => { setCriteria([...criteria, { text: s }]); setDirty(true); }}
                className="text-xs bg-white border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-700 px-2 py-1 rounded-lg transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
