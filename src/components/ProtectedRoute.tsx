import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from './LoadingScreen';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};
