import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { projectsAPI } from '../services/projectsAPI';
import {
  LayoutDashboard, FolderKanban, Tag, User, LogOut,
  Menu, X, ChevronRight, BarChart2, Building2, Shield, Lock,
  Bell, AlertTriangle, Clock, Flag, Search, CheckSquare,
  Sun, Moon, ListTodo,
} from 'lucide-react';

const SEVERITY_ICON = {
  error:   { icon: AlertTriangle, cls: 'text-red-500' },
  warning: { icon: Clock,         cls: 'text-amber-500' },
  info:    { icon: Flag,          cls: 'text-blue-500' },
};

function navSection(label, items) {
  return { label, items };
}

export default function Layout({ children }) {
  const { user, logout }        = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const location                = useLocation();
  const navigate                = useNavigate();

  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount]       = useState(0);
  const notifRef = useRef(null);

  const [searchQ, setSearchQ]           = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searching, setSearching]       = useState(false);
  const searchRef      = useRef(null);
  const searchInputRef = useRef(null);

  const isMac  = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const isAdmin      = user?.role === 'ADMIN';
  const isTeamMember = user?.role === 'TEAM_MEMBER';

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Load notifications
  useEffect(() => {
    projectsAPI.getNotifications()
      .then((r) => {
        setNotifications(r.data.alerts || []);
        setNotifCount(r.data.count || 0);
      })
      .catch(() => {});
  }, [location.pathname]);

  // Outside click + Ctrl/Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === 'Escape') { setSearchOpen(false); searchInputRef.current?.blur(); }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQ.length < 2) { setSearchResults(null); setSearchOpen(false); return; }
    const t = setTimeout(() => {
      setSearching(true);
      projectsAPI.search(searchQ)
        .then((r) => { setSearchResults(r.data); setSearchOpen(true); })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const handleSearchSelect = (path) => {
    setSearchQ(''); setSearchOpen(false); setSearchResults(null);
    navigate(path);
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const sections = [
    navSection('Principal', [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
      { to: '/projects',  icon: FolderKanban,    label: 'Proyectos'  },
      { to: '/my-tasks',  icon: ListTodo,         label: 'Mis Tareas' },
      { to: '/reports',   icon: BarChart2,        label: 'Reportes'  },
    ]),
    navSection('Catálogos', [
      { to: '/categories', icon: Tag, label: 'Categorías' },
    ]),
    ...(isAdmin ? [navSection('Administración', [
      { to: '/users',            icon: Shield,    label: 'Usuarios' },
      { to: '/permissions',      icon: Lock,      label: 'Permisos' },
      { to: '/company-settings', icon: Building2, label: 'Empresa' },
    ])] : isTeamMember ? [] : [navSection('Configuración', [
      { to: '/company-settings', icon: Building2, label: 'Empresa' },
    ])]),
    navSection('Cuenta', [
      { to: '/profile', icon: User, label: 'Mi Perfil' },
    ]),
  ];

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={[
        'bg-slate-900 text-white flex flex-col flex-shrink-0',
        'fixed inset-y-0 left-0 z-50 w-64',
        'transform transition-all duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:static lg:inset-auto lg:z-auto lg:translate-x-0',
        sidebarOpen ? 'lg:w-64' : 'lg:w-16',
      ].join(' ')}>

        {/* Logo + toggle */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 h-12">
          {sidebarOpen && (
            <img
              src="/assets/img/logos/maewalliscorpv3.jpg"
              alt="MaeWallisCorp"
              className="h-8 object-contain rounded"
            />
          )}
          {/* Desktop toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white p-1 rounded hidden lg:flex items-center"
            title="Ocultar sidebar"
          >
            {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded lg:hidden ml-auto"
          >
            <X size={17} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {sections.map(({ label, items }) => (
            <div key={label} className="mb-1">
              {sidebarOpen && (
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 pt-3 pb-1">
                  {label}
                </p>
              )}
              {items.map(({ to, icon: Icon, label: itemLabel }) => {
                const active = location.pathname === to ||
                  (to !== '/dashboard' && location.pathname.startsWith(to));
                return (
                  <Link key={to} to={to}
                    title={!sidebarOpen ? itemLabel : undefined}
                    className={[
                      'flex items-center gap-3 py-2.5 transition-colors mx-1 rounded-lg',
                      sidebarOpen ? 'px-4' : 'px-0 justify-center',
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                    ].join(' ')}>
                    <Icon size={18} className="flex-shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="text-sm font-medium flex-1">{itemLabel}</span>
                        {active && <ChevronRight size={14} />}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-700 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.first_name || user?.username}</p>
                <p className="text-xs text-slate-400 truncate">{user?.role?.replace('_', ' ')}</p>
              </div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 p-1" title="Cerrar sesión">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 w-full flex justify-center py-1" title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-12 flex items-center gap-3 px-3 sm:px-4 flex-shrink-0">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1 rounded lg:hidden flex-shrink-0"
          >
            <Menu size={20} />
          </button>

          {/* Global search */}
          <div className="relative flex-1 max-w-md" ref={searchRef}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onFocus={() => searchResults && setSearchOpen(true)}
              placeholder={`Buscar… ${isMac ? '⌘K' : 'Ctrl+K'}`}
              className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">…</span>
            )}
            {searchOpen && searchResults && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                {['projects', 'tasks', 'milestones'].map((cat) => {
                  const items = searchResults[cat] || [];
                  if (!items.length) return null;
                  const catLabel = cat === 'projects' ? 'Proyectos' : cat === 'tasks' ? 'Tareas' : 'Hitos';
                  return (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 pt-3 pb-1">{catLabel}</p>
                      {items.map((item) => {
                        const path = cat === 'projects'
                          ? `/projects/${item.id}`
                          : `/projects/${item.project_id}`;
                        return (
                          <button key={item.id} onClick={() => handleSearchSelect(path)}
                            className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors">
                            {cat === 'projects'   && <FolderKanban size={14} className="text-indigo-500 flex-shrink-0" />}
                            {cat === 'tasks'      && <CheckSquare  size={14} className="text-emerald-500 flex-shrink-0" />}
                            {cat === 'milestones' && <Flag         size={14} className="text-purple-500 flex-shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-sm text-slate-700 dark:text-slate-200 truncate font-medium">{item.name || item.title}</p>
                              {item.project_name && <p className="text-xs text-slate-400 truncate">{item.project_name}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
                {['projects', 'tasks', 'milestones'].every((c) => !(searchResults[c] || []).length) && (
                  <p className="text-sm text-slate-400 text-center py-6">Sin resultados para "{searchQ}"</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 ml-auto flex-shrink-0">

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title={isDark ? 'Tema claro' : 'Tema oscuro'}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <Bell size={17} />
                {notifCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notificaciones</span>
                    {notifCount > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded-full">
                        {notifCount} alerta{notifCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-sm">✓ Sin alertas pendientes</div>
                    ) : (
                      notifications.map((n, i) => {
                        const { icon: NIcon, cls } = SEVERITY_ICON[n.severity] || SEVERITY_ICON.info;
                        return (
                          <Link key={i} to={n.link || '#'}
                            onClick={() => setNotifOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0">
                            <NIcon size={15} className={`${cls} mt-0.5 flex-shrink-0`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{n.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User chip */}
            <Link to="/profile"
              className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg px-2 py-1 transition-colors">
              <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:block">
                {user?.first_name || user?.username}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
