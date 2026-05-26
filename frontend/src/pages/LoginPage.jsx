import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm]   = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState({ message: '', field: '' });

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    // Limpiar error cuando el usuario empieza a corregir el campo afectado
    if (error.field === field || error.field === '') setError({ message: '', field: '' });
  };

  const handle = async (e) => {
    e.preventDefault();
    setError({ message: '', field: '' });
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/dashboard');
    } catch (err) {
      const msg   = err?.response?.data?.message || 'Credenciales inválidas';
      const field = err?.response?.data?.field   || '';
      setError({ message: msg, field });
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (field) =>
    error.field === field ? (
      <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
        <AlertCircle size={12} /> {error.message}
      </p>
    ) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <img
            src="/assets/img/logos/maewalliscorpv3.jpg"
            alt="MaeWallisCorp"
            className="h-20 mx-auto mb-4 object-contain rounded-xl"
          />
          <h1 className="text-2xl font-bold text-slate-800">PIAP</h1>
          <p className="text-slate-500 text-sm mt-1">Plataforma Interna de Administración de Proyectos</p>
        </div>

        <form onSubmit={handle} className="space-y-5">
          {/* Error general (cuando no hay campo específico) */}
          {error.message && !error.field && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              <AlertCircle size={16} className="shrink-0" />
              {error.message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setField('username', e.target.value)}
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                error.field === 'username' ? 'border-red-400 bg-red-50' : 'border-slate-300'
              }`}
              placeholder="usuario"
            />
            {fieldError('username')}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10 ${
                  error.field === 'password' ? 'border-red-400 bg-red-50' : 'border-slate-300'
                }`}
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldError('password')}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>

          <div className="text-center">
            <Link to="/forgot-password" className="text-sm text-slate-500 hover:text-indigo-600 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-indigo-600 hover:underline font-medium">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
