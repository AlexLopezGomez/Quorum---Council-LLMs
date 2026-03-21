import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import App from './App.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import BenchmarksPage from './pages/BenchmarksPage.jsx';
import PaperPage from './pages/PaperPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import CookieBanner from './components/CookieBanner.jsx';
import './index.css';

function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
    return null;
}

function RouteTitle() {
    const { pathname } = useLocation();

    useEffect(() => {
        const titles = {
            '/': 'Quorum',
            '/login': 'Sign In — Quorum',
            '/register': 'Register — Quorum',
            '/benchmarks': 'Benchmarks — Quorum',
            '/paper': 'Research Paper — Quorum',
            '/privacy': 'Privacy — Quorum',
            '/terms': 'Terms — Quorum',
            '/forgot-password': 'Forgot Password — Quorum',
            '/reset-password': 'Reset Password — Quorum',
            '/verify-email': 'Verify Email — Quorum',
        };

        document.title = titles[pathname] ?? 'Quorum';
    }, [pathname]);

    return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <RouteTitle />
      <AuthProvider>
        <CookieBanner />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/app/*" element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          } />
          <Route path="/benchmarks" element={<BenchmarksPage />} />
          <Route path="/paper" element={<PaperPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
