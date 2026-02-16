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
    updateAuthField,
    submitAuth,
    submitForgotPassword,
    submitResetPassword,
    forgotMode,
    resetMode,
    forgotMessage,
    openForgotMode,
    closeForgotMode,
    logout,
    connectSpotify,
    applySpotifyToken,
    refreshSpotifyNowPlaying,
    spotifyError,
    spotifyConnecting
  } = useAuthFlow();

  const activeUser = authUser;

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

  useEffect(() => {
    if (!activeUser) return;
    const url = new window.URL(window.location.href);
    const spotifyToken = url.searchParams.get('spotify_token');
    if (!spotifyToken) return;

    applySpotifyToken(spotifyToken).finally(() => {
      url.searchParams.delete('spotify_token');
      url.searchParams.delete('spotify_connected');
      url.searchParams.delete('room');
      url.searchParams.delete('user');
      window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    });
  }, [activeUser, applySpotifyToken]);

  useEffect(() => {
    if (!activeUser?.spotifyToken) return undefined;
    const timer = setInterval(() => {
      refreshSpotifyNowPlaying().catch(() => {});
    }, 45_000);
    return () => clearInterval(timer);
  }, [activeUser?.spotifyToken, refreshSpotifyNowPlaying]);

  function handleLogout() {
    logout().catch(() => {});
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

  if (!activeUser) {
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
        onSpotifyConnect={() => connectSpotify('duo-room')}
        spotifyConnected={Boolean(activeUser?.spotify)}
        spotifyConnecting={spotifyConnecting}
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
        {activeUser?.spotify?.display_name && <p>Spotify: {activeUser.spotify.display_name}</p>}
        {activeUser?.nowPlaying?.trackName && <p>Tocando: {activeUser.nowPlaying.trackName}</p>}
        {spotifyError && <p>{spotifyError}</p>}
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
