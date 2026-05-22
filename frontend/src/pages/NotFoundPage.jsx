import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-9xl font-black text-slate-200 select-none leading-none">404</p>
        <h1 className="text-2xl font-bold text-slate-800 mt-4">Página no encontrada</h1>
        <p className="text-slate-500 mt-2 text-sm">
          La página que buscas no existe o fue movida.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => window.history.back()}
            className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <ArrowLeft size={16} /> Volver
          </button>
          <Link to="/dashboard"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Home size={16} /> Ir al Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
