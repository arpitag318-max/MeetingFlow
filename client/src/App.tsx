import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { DashboardPage } from './pages/DashboardPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { MeetingDetailPage } from './pages/MeetingDetailPage';
import { TasksPage } from './pages/TasksPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { JiraWorkPage } from './pages/JiraWorkPage';
import { SettingsPage } from './pages/SettingsPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Login & OAuth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Protected SaaS Application Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="meetings/:id" element={<MeetingDetailPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="integrations" element={<IntegrationsPage />} />
              <Route path="jira-work" element={<JiraWorkPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
