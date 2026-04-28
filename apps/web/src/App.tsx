import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import PublicLayout from './layouts/PublicLayout';
import AuthGuard from './components/guards/AuthGuard';
import RoleGuard from './components/guards/RoleGuard';
import PublicOnlyGuard from './components/guards/PublicOnlyGuard';

// Lazy-loaded pages
const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const SignIn = lazy(() => import('./pages/auth/SignIn'));
const Register = lazy(() => import('./pages/auth/Register'));
const RoleSelect = lazy(() => import('./pages/auth/RoleSelect'));

// Lazy-loaded dashboard layouts
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const EmployeeDashboard = lazy(() => import('./pages/employee/Dashboard'));
const EmployerDashboard = lazy(() => import('./pages/employer/Dashboard'));

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#131313',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, border: '3px solid rgba(255,255,255,0.1)',
          borderTop: '3px solid #50fa7b', borderRadius: '50%',
          animation: 'spin 1s linear infinite', margin: '0 auto 16px',
        }} />
        <p style={{ color: '#bbcbb8', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>Loading...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/signin" element={
                <PublicOnlyGuard><SignIn /></PublicOnlyGuard>
              } />
              <Route path="/register" element={
                <PublicOnlyGuard><Register /></PublicOnlyGuard>
              } />
            </Route>

            {/* Role Selection (Google first-time users) */}
            <Route path="/role-select" element={<RoleSelect />} />

            {/* Protected Dashboard Routes */}
            <Route path="/admin/*" element={
              <AuthGuard>
                <RoleGuard allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </RoleGuard>
              </AuthGuard>
            } />
            <Route path="/employee/*" element={
              <AuthGuard>
                <RoleGuard allowedRoles={['EMPLOYEE']}>
                  <EmployeeDashboard />
                </RoleGuard>
              </AuthGuard>
            } />
            <Route path="/employer/*" element={
              <AuthGuard>
                <RoleGuard allowedRoles={['EMPLOYER']}>
                  <EmployerDashboard />
                </RoleGuard>
              </AuthGuard>
            } />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

