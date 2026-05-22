import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { toast } from 'sonner';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error al enviar. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">

        {sent ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-5">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Revisa tu correo</h2>
            <p className="text-slate-500 text-sm mb-6">
              Si <strong>{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
            </p>
            <p className="text-xs text-slate-400 mb-6">Revisa también tu carpeta de spam.</p>
            <Link to="/" className="text-indigo-600 hover:underline text-sm font-medium flex items-center justify-center gap-2">
              <ArrowLeft size={15} /> Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-7">
              <img
                src="/assets/img/logos/maewalliscorpv3.jpg"
                alt="MaeWallisCorp"
                className="h-16 mx-auto mb-4 object-contain rounded-xl"
              />
              <h1 className="text-2xl font-bold text-slate-800">¿Olvidaste tu contraseña?</h1>
              <p className="text-slate-500 text-sm mt-1">
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </p>
            </div>

            <form onSubmit={handle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
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
