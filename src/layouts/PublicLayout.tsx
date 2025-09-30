import { Link, Outlet } from 'react-router-dom';

export const PublicLayout = () => (
  <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-950 to-stone-900 text-stone-100">
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-10 pt-8">
      <header className="flex items-center justify-between gap-4 rounded-3xl border border-stone-800 bg-stone-900/70 px-6 py-4 shadow-xl backdrop-blur">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-stone-950 shadow-lg">
            <span className="text-xl font-black tracking-tight">CC</span>
          </div>
          <div>
            <p className="font-display text-xl font-semibold tracking-tight">CiaoCiao Atelier</p>
            <p className="text-sm text-stone-400">Showroom · Joyería personalizada</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-sm font-semibold tracking-wide text-brand-200 hover:bg-brand-500/20"
          >
            Reservar cita
          </Link>
          <Link
            to="/admin/login"
            className="rounded-full border border-stone-700 px-4 py-2 text-sm font-semibold text-stone-300 hover:border-brand-400 hover:text-brand-200"
          >
            Administrar
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-8 py-10">
        <Outlet />
      </main>

      <footer className="mt-auto rounded-3xl border border-stone-900/70 bg-stone-950/60 px-6 py-5 text-sm text-stone-500">
        © {new Date().getFullYear()} CiaoCiao Atelier · Hecho con cariño en México.
      </footer>
    </div>
  </div>
);
