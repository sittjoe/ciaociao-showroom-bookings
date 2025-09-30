import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { Alert } from '../components/Alert';
import { LoadingScreen } from '../components/LoadingScreen';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

export const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <LoadingScreen />;
  }

  if (session) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      setSubmitting(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError('Credenciales inválidas. Verifica correo y contraseña.');
        return;
      }
      navigate('/admin');
    } catch (submitError) {
      console.error(submitError);
      setError('No pudimos iniciar sesión. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-stone-800 bg-stone-900/70 p-8 shadow-2xl">
        <p className="mb-2 text-sm uppercase tracking-[0.3em] text-stone-500">CiaoCiao Atelier</p>
        <h1 className="mb-6 font-display text-3xl font-semibold text-brand-200">Acceso administrativo</h1>
        <p className="mb-8 text-sm text-stone-400">
          Ingresa con las credenciales asignadas para gestionar horarios y solicitudes de cita.
        </p>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-300" htmlFor="email">
              Correo
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-stone-800 bg-stone-950/40 px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-300" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-stone-800 bg-stone-950/40 px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-stone-950 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
          >
            {submitting ? 'Ingresando...' : 'Entrar' }
          </button>
        </form>
      </div>
    </div>
  );
};
