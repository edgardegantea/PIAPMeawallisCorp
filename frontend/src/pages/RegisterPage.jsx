import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({
    username: '', email: '', password: '', password_confirm: '',
    first_name: '', last_name: '', phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handle = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const { password_confirm, ...payload } = form;
      await register(payload);
      navigate('/dashboard');
    } catch (err) {
      console.error('[Register error]', err);
      if (!err.response) {
        // Error de red: CORS, servidor caído, URL incorrecta
        toast.error('No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.');
        return;
      }
      const { status, data } = err.response;
      if (data?.errors) {
        Object.values(data.errors).forEach((msg) => toast.error(msg));
      } else if (data?.message) {
        toast.error(data.message);
      } else {
        toast.error(`Error ${status}: no se pudo crear la cuenta`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-7">
          <img
            src="/assets/img/logos/maewalliscorpv3.jpg"
            alt="MaeWallisCorp"
            className="h-16 mx-auto mb-4 object-contain rounded-xl"
          />
          <h1 className="text-2xl font-bold text-slate-800">Crear Cuenta</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de Proyectos PIAP v2</p>
        </div>

        <form onSubmit={handle} className="space-y-4">
          {/* Nombre y apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)}
                placeholder="Juan"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
              <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)}
                placeholder="Pérez"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Usuario */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Usuario <span className="text-red-500">*</span>
            </label>
            <input required value={form.username} onChange={(e) => set('username', e.target.value)}
              placeholder="juan.perez"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)}
              placeholder="juan@empresa.com"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
            <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
              placeholder="+52 55 XXXX XXXX"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} required
                value={form.password} onChange={(e) => set('password', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirmar contraseña <span className="text-red-500">*</span>
            </label>
            <input type={showPass ? 'text' : 'password'} required
              value={form.password_confirm} onChange={(e) => set('password_confirm', e.target.value)}
              placeholder="Repite tu contraseña"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                ${form.password_confirm && form.password !== form.password_confirm
                  ? 'border-red-400 bg-red-50'
                  : 'border-slate-300'}`} />
            {form.password_confirm && form.password !== form.password_confirm && (
              <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60
              text-white font-semibold py-2.5 rounded-lg transition-colors mt-2">
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/" className="text-indigo-600 hover:underline font-medium">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
