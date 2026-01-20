import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicOnlyRoute } from './components/PublicOnlyRoute'
import { LandingPage } from './pages/LandingPage'
import { AuthPage } from './pages/AuthPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { ApiKeySetupPage } from './pages/ApiKeySetupPage'
import { EmailAuthPage } from './pages/EmailAuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'

function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Public only (redirect if logged in) */}
        <Route path="/auth" element={
          <PublicOnlyRoute>
            <AuthPage />
          </PublicOnlyRoute>
        } />
        <Route path="/auth/email" element={
          <PublicOnlyRoute>
            <EmailAuthPage />
          </PublicOnlyRoute>
        } />

        {/* Protected routes */}
        <Route path="/setup" element={
          <ProtectedRoute>
            <ApiKeySetupPage />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
