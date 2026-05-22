import { AlertTriangle } from 'lucide-react';

/**
 * Reusable confirmation dialog — replaces browser window.confirm().
 *
 * Usage:
 *   const [confirmState, setConfirmState] = useState(null);
 *   // to open: setConfirmState({ title: '...', body: '...', onConfirm: () => doSomething() });
 *   // in JSX: {confirmState && <ConfirmModal {...confirmState} onClose={() => setConfirmState(null)} />}
 */
export default function ConfirmModal({
  title    = '¿Estás seguro?',
  body     = '',
  danger   = true,
  onConfirm,
  onClose,
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-full flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertTriangle size={20} className={danger ? 'text-red-600' : 'text-amber-600'} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            {body && <p className="text-sm text-slate-500 mt-1">{body}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
            Cancelar
          </button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors
              ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
