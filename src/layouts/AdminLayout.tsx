import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/admin', label: 'Panel' },
  { to: '/', label: 'Ver sitio' },
];

export const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-10 pt-8">
        <header className="mb-6 flex items-center justify-between gap-4 rounded-3xl border border-stone-800 bg-stone-900/70 px-6 py-4 shadow-xl backdrop-blur">
          <div>
            <p className="font-display text-xl font-semibold tracking-tight">Panel CiaoCiao</p>
            <p className="text-sm text-stone-400">Gestiona horarios y solicitudes</p>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-4 py-2 font-semibold transition ${
                  location.pathname === item.to
                    ? 'bg-brand-500/20 text-brand-200'
                    : 'hover:bg-stone-800/60 text-stone-300'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="rounded-full border border-stone-700 px-4 py-2 text-sm font-semibold text-stone-300 hover:border-red-400 hover:text-red-300"
            >
              Cerrar sesión
            </button>
          </nav>
        </header>

        <section className="rounded-3xl border border-stone-800 bg-stone-900/60 px-6 py-8 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Administrador</p>
              <p className="font-medium text-stone-200">{user?.email}</p>
            </div>
          </div>
          <Outlet />
        </section>
      </div>
    </div>
  );
};
