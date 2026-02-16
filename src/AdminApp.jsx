import { useCallback, useState } from 'react';
import AuthPage from './components/AuthPage';
import AdminLayout from './components/admin/AdminLayout';
import Button from './components/ui/Button';
import { API_URL } from './config/appConfig';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import DashboardPage from './pages/admin/DashboardPage';
import WaitlistPage from './pages/admin/WaitlistPage';
import { useAuthFlow } from './hooks/useAuthFlow';
import './styles/global.css';

export default function AdminApp() {
  const {
    authMode,
    setAuthMode,
    authForm,
    authError,
    authBooting,
    authUser,
    updateAuthField,
    submitAuth,
    submitForgotPassword,
    submitResetPassword,
    forgotMode,
    resetMode,
    forgotMessage,
    openForgotMode,
    closeForgotMode,
    logout
  } = useAuthFlow();

  const isAdmin = authUser?.role === 'ADMIN';
  const [activePage, setActivePage] = useState('waitlist');

  const adminFetch = useCallback(
    async (path, options = {}) => {
      if (!authUser?.token) {
        throw new Error('Sessao administrativa ausente.');
      }

      const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${authUser.token}`,
        'x-session-id': authUser.sessionId || ''
      };

      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        cache: 'no-store',
        headers
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Falha na requisicao administrativa.');
      }
      return payload;
    },
    [authUser?.token, authUser?.sessionId]
  );

  if (authBooting) {
    return (
      <div className="dark grid min-h-screen place-items-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <AuthPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        authForm={authForm}
        authError={authError}
        forgotMode={forgotMode}
        resetMode={resetMode}
        forgotMessage={forgotMessage}
        updateAuthField={updateAuthField}
        submitAuth={submitAuth}
        submitForgotPassword={submitForgotPassword}
        submitResetPassword={submitResetPassword}
        openForgotMode={openForgotMode}
        closeForgotMode={closeForgotMode}
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className="dark grid min-h-screen place-items-center bg-background p-4 text-foreground">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Painel Muusic</h1>
          <p className="mt-2 text-sm text-muted-foreground">Seu usuario nao possui permissao administrativa.</p>
          <Button className="mt-5" onClick={() => logout().catch(() => {})}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  const pageByNav = {
    dashboard: <DashboardPage />,
    feedbacks: <DashboardPage />,
    usuarios: <DashboardPage />,
    waitlist: <WaitlistPage apiFetch={adminFetch} />,
    campanhas: <AnalyticsPage />,
    analytics: <AnalyticsPage />
  };

  return (
    <AdminLayout
      activeItem={activePage}
      onNavigate={(key) => setActivePage(key)}
      userName={authUser.name}
      onLogout={() => logout().catch(() => {})}
    >
      {pageByNav[activePage] || <WaitlistPage apiFetch={adminFetch} />}
    </AdminLayout>
  );
}
