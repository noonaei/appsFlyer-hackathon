import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/layout/RequireAuth';
import AppShell from './components/layout/AppShell';
import { EmptyState } from './components/common/FirstButton/ui';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DevicesPage from './pages/DevicesPage';
import DailySummaryPage from './pages/DailySummaryPagee';
import AlertsPage from './pages/AlertsPage';
import WeeklyTrendsPage from './pages/WeeklyTrendsPage';
import PrivacyPage from './pages/PrivacyPage';
import SettingsPage from './pages/SettingsPage';

function NotFound() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <EmptyState 
        title="העמוד לא נמצא" 
        subtitle="העמוד שביקשתם אינו קיים." 
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/devices" replace />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/daily" element={<DailySummaryPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/weekly" element={<WeeklyTrendsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
