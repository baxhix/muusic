import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import SidebarNavLite from './components/SidebarNavLite';
import ChatListLite from './components/ChatListLite';
import NotificationsListLite from './components/NotificationsListLite';
import LiveNotificationToastLite from './components/LiveNotificationToastLite';
import RealFeedLite from './components/RealFeedLite';
import EventFeedLite from './components/EventFeedLite';
import AuthPage from './components/AuthPage';
import { MAPBOX_TOKEN } from './config/appConfig';
import { buildSimulatedPoints, DESKTOP_PERF, MOBILE_PERF } from './lib/mapSimulation';
import { STORAGE_SESSION_KEY } from './lib/storage';
import { useAuthFlow } from './hooks/useAuthFlow';
import { useRealtimePresence } from './hooks/useRealtimePresence';
import { useMapEngine } from './hooks/useMapEngine';

export default function App() {
  const {
    authMode,
    setAuthMode,
    authForm,
    authError,
    authBooting,
    authUser,
    setAuthUser,
    updateAuthField,
    submitAuth,
    submitForgotPassword,
    forgotMode,
    forgotMessage,
    openForgotMode,
    closeForgotMode,
    quickEnter,
    logout
  } = useAuthFlow();

  const [hasEnteredApp, setHasEnteredApp] = useState(() => Boolean(readSessionStorageSafe()));
  const activeUser = authUser || (hasEnteredApp ? { id: 'guest-runtime', name: 'Convidado', email: '', token: 'guest-local' } : null);

  const { setUsername, users, socketRef } = useRealtimePresence(activeUser);

  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  const [notificationsPrimed, setNotificationsPrimed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [selectedEventFeed, setSelectedEventFeed] = useState(null);
  const [isMobileDevice] = useState(() => window.matchMedia('(max-width: 900px)').matches);

  const perfProfile = isMobileDevice ? MOBILE_PERF : DESKTOP_PERF;
  const simulatedPoints = useMemo(() => buildSimulatedPoints(perfProfile.points), [perfProfile.points]);

  const {
    mapContainerRef,
    mapWarning,
    fps,
    benchmarkRunning,
    benchmarkResult,
    runBenchmark,
    focusFeedItem
  } = useMapEngine({
    enabled: Boolean(activeUser),
    isMobileDevice,
    perfProfile,
    simulatedPoints,
    users,
    socketRef
  });

  useEffect(() => {
    setNotificationsPanelOpen(false);
  }, []);

  useEffect(() => {
    if (activeUser?.name) {
      setUsername(activeUser.name);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(activeUser));
    }
  }, [activeUser, setUsername]);

  function handleQuickEnter() {
    const session = {
      id: `guest-${Date.now()}`,
      name: 'Convidado',
      email: '',
      token: 'guest-local'
    };
    setHasEnteredApp(true);
    setAuthUser(session);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    quickEnter();
  }

  function handleLogout() {
    setHasEnteredApp(false);
    logout();
  }

  function openFeedItem(item) {
    setSelectedEventFeed(item);
  }

  if (authBooting) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-pulse" />
      </div>
    );
  }

  if (!hasEnteredApp) {
    return (
      <AuthPage
        simpleAccess
        onQuickEnter={handleQuickEnter}
        authMode={authMode}
        setAuthMode={setAuthMode}
        authForm={authForm}
        authError={authError}
        forgotMode={forgotMode}
        forgotMessage={forgotMessage}
        updateAuthField={updateAuthField}
        submitAuth={submitAuth}
        submitForgotPassword={submitForgotPassword}
        openForgotMode={openForgotMode}
        closeForgotMode={closeForgotMode}
      />
    );
  }

  return (
    <div className="app-root">
      <div ref={mapContainerRef} className="map-canvas" />
      <div className="global-search-wrap">
        <Search className="global-search-icon" size={16} />
        <input className="global-search-input" type="text" placeholder="Procure por artistas, comunidades, shows e artistas." aria-label="Busca global" />
      </div>
      <LiveNotificationToastLite enabled={notificationsPrimed} paused={notificationsPanelOpen} />

      <SidebarNavLite
        onLogout={handleLogout}
        chatOpen={chatPanelOpen}
        onChatToggle={() => {
          setChatPanelOpen((prev) => {
            const next = !prev;
            if (next) setNotificationsPanelOpen(false);
            return next;
          });
        }}
        notificationsOpen={notificationsPanelOpen}
        onNotificationsToggle={() => {
          setNotificationsPrimed(true);
          setNotificationsPanelOpen((prev) => {
            const next = !prev;
            if (next) setChatPanelOpen(false);
            return next;
          });
        }}
      />

      <ChatListLite open={chatPanelOpen} onToggle={() => setChatPanelOpen((prev) => !prev)} />
      <NotificationsListLite open={notificationsPanelOpen} onToggle={() => setNotificationsPanelOpen(false)} />

      <RealFeedLite
        onFocusItem={focusFeedItem}
        onOpenItem={openFeedItem}
        collapsed={rightPanelCollapsed}
        onToggleCollapse={() => setRightPanelCollapsed((prev) => !prev)}
      />

      <div className="perf-box">
        <p>FPS: {fps}</p>
        <p>{isMobileDevice ? 'Modo mobile otimizado ativo' : 'Modo desktop padrão'}</p>
        <button type="button" className="bench-btn" onClick={runBenchmark} disabled={benchmarkRunning}>
          {benchmarkRunning ? 'Benchmark em execução...' : 'Rodar benchmark (60s)'}
        </button>
        {benchmarkResult && (
          <div className="bench-result">
            <p>Médio: {benchmarkResult.avgFps}</p>
            <p>Mínimo: {benchmarkResult.minFps}</p>
            <p>1% low: {benchmarkResult.p1LowFps}</p>
          </div>
        )}
      </div>

      {!MAPBOX_TOKEN && <div className="missing-token">Sem token Mapbox: modo fallback ativo.</div>}
      {mapWarning && <div className="missing-token">{mapWarning}</div>}
      <EventFeedLite event={selectedEventFeed} onClose={() => setSelectedEventFeed(null)} onGoToMap={focusFeedItem} />
    </div>
  );
}

function readSessionStorageSafe() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}
