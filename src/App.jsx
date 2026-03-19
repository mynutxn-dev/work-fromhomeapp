import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CheckInProvider } from './contexts/CheckInContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CheckInPage from './pages/CheckInPage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import FaceRegisterPage from './pages/FaceRegisterPage';
import Navbar from './components/Navbar';

function ProtectedRoute({ children, adminOnly = false }) {
  const { currentUser, loading } = useAuth();

  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (adminOnly && currentUser.role !== 'admin') return <Navigate to="/" replace />;

  return children;
}

function AppLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/checkin" element={<CheckInPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/face-register"
            element={
              <ProtectedRoute adminOnly>
                <FaceRegisterPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

import { FaceModelProvider } from './contexts/FaceModelContext';

function App() {
  return (
    <FaceModelProvider>
      <AuthProvider>
        <CheckInProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </CheckInProvider>
      </AuthProvider>
    </FaceModelProvider>
  );
}

export default App;
