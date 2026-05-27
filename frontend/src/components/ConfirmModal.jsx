import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

/**
 * Reusable confirmation dialog — replaces browser window.confirm().
 *
 * Props:
 *   title        — dialog heading
 *   body         — descriptive text
 *   variant      — 'danger' (red) | 'warning' (amber) | 'success' (green) | 'info' (blue)
 *   confirmLabel — button label (default 'Confirmar')
 *   onConfirm    — callback when confirmed
 *   onClose      — callback when cancelled or dismissed
 *
 * Legacy: `danger` boolean still supported (maps to variant 'danger' / 'warning').
 */
export default function ConfirmModal({
  title        = '¿Estás seguro?',
  body         = '',
  variant,
  danger,            // legacy — kept for backward compat
  confirmLabel = 'Confirmar',
  onConfirm,
  onClose,
}) {
  // Resolve variant: explicit prop wins, else legacy danger boolean
  const v = variant ?? (danger === true ? 'danger' : danger === false ? 'warning' : 'danger');

  const ICON_MAP = {
    danger:  { Icon: AlertTriangle,  iconBg: 'bg-red-100',     iconColor: 'text-red-600'    },
    warning: { Icon: AlertTriangle,  iconBg: 'bg-amber-100',   iconColor: 'text-amber-600'  },
    success: { Icon: CheckCircle2,   iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600'},
    info:    { Icon: Info,           iconBg: 'bg-blue-100',    iconColor: 'text-blue-600'   },
  };

  const BTN_MAP = {
    danger:  'bg-red-600     hover:bg-red-700',
    warning: 'bg-amber-500   hover:bg-amber-600',
    success: 'bg-emerald-600 hover:bg-emerald-700',
    info:    'bg-blue-600    hover:bg-blue-700',
  };

  const { Icon, iconBg, iconColor } = ICON_MAP[v] ?? ICON_MAP.danger;
  const btnCls = BTN_MAP[v] ?? BTN_MAP.danger;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-full flex-shrink-0 ${iconBg}`}>
            <Icon size={20} className={iconColor} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
            {body && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{body}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors">
            Cancelar
          </button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${btnCls}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
