import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { toast } from 'sonner';
import { KeyRound, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const token           = searchParams.get('token') || '';

  const [form, setForm]       = useState({ password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  useEffect(() => {
    if (!token) toast.error('Enlace inválido o expirado');
  }, [token]);

  const handle = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(token, form.password);
      setDone(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-800 to-slate-900 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-5">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Enlace inválido</h2>
          <p className="text-slate-500 text-sm mb-6">El enlace de recuperación es inválido o ya expiró.</p>
          <Link to="/forgot-password" className="text-indigo-600 hover:underline text-sm font-medium">
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">

        {done ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-5">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">¡Contraseña actualizada!</h2>
            <p className="text-slate-500 text-sm mb-6">
              Tu contraseña se cambió correctamente. Ya puedes iniciar sesión.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              Ir al inicio de sesión
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-7">
              <img
                src="/assets/img/logos/maewalliscorpv3.jpg"
                alt="MaeWallisCorp"
                className="h-16 mx-auto mb-4 object-contain rounded-xl"
              />
              <h1 className="text-2xl font-bold text-slate-800">Nueva contraseña</h1>
              <p className="text-slate-500 text-sm mt-1">Elige una contraseña segura de al menos 8 caracteres.</p>
            </div>

            <form onSubmit={handle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nueva contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoFocus
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confirmar contraseña <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.confirm}
                  onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repite la contraseña"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    form.confirm && form.password !== form.confirm
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-300'
                  }`}
                />
                {form.confirm && form.password !== form.confirm && (
                  <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || (form.confirm && form.password !== form.confirm)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                {loading ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              <Link to="/" className="text-indigo-600 hover:underline font-medium flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> Volver al inicio de sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
