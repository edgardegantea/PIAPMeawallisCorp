import { useEffect, useState } from 'react';
import { projectsAPI } from '../services/projectsAPI';
import { useAuthStore } from '../stores/authStore';
import Layout from '../components/Layout';
import { toast } from 'sonner';
import { Save, Building2, Lock } from 'lucide-react';

const FIELDS = [
  { key: 'name',                label: 'Nombre Comercial',    required: true },
  { key: 'legal_name',          label: 'Razón Social' },
  { key: 'representative_name', label: 'Representante Legal' },
  { key: 'rfc',                 label: 'RFC' },
  { key: 'tax_regime',          label: 'Régimen Fiscal' },
  { key: 'address',             label: 'Dirección' },
  { key: 'zip_code',            label: 'Código Postal' },
  { key: 'email',               label: 'Correo Electrónico', type: 'email' },
  { key: 'phone',               label: 'Teléfono' },
  { key: 'website',             label: 'Sitio Web', type: 'url' },
];

export default function CompanySettingsPage() {
  const { user } = useAuthStore();
  const isAdmin      = user?.role === 'ADMIN';
  const isTeamMember = user?.role === 'TEAM_MEMBER';

  const [form, setForm]     = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (isTeamMember) { setLoading(false); return; }
    projectsAPI.getCompanySettings()
      .then((r) => setForm(r.data || {}))
      .catch(() => toast.error('Error al cargar configuración'))
      .finally(() => setLoading(false));
  }, [isTeamMember]);

  const handle = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      await projectsAPI.updateCompanySettings(form);
      toast.success('Configuración guardada');
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (isTeamMember) {
    return (
      <Layout>
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Lock size={28} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Acceso restringido</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">
            La información de la empresa no está disponible para tu rol.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Configuración de Empresa</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Datos de la organización usados en documentos y reportes</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando...</div>
        ) : (
          <form onSubmit={handle}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 space-y-4">
              {!isAdmin && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  Solo los administradores pueden editar la configuración de empresa.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {FIELDS.map(({ key, label, required, type = 'text' }) => (
                  <div key={key} className={key === 'address' ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {label}{required && ' *'}
                    </label>
                    <input
                      type={type}
                      value={form[key] || ''}
                      onChange={(e) => set(key, e.target.value)}
                      required={required}
                      disabled={!isAdmin}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                        focus:outline-none focus:ring-2 focus:ring-indigo-500
                        disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                ))}
              </div>

              {isAdmin && (
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60
                      text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
                    <Save size={16} />
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
