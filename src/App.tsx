import { HashRouter, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { AdminLayout } from './layouts/AdminLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { BookingPage } from './pages/BookingPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

const App = () => (
  <AuthProvider>
    <HashRouter>
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<BookingPage />} />
        </Route>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
        </Route>
      </Routes>
    </HashRouter>
  </AuthProvider>
);

export default App;
