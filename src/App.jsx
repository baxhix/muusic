import { useCallback, useEffect, useMemo, useState } from 'react';
import SidebarNavLite from './components/SidebarNavLite';
import ChatListLite from './components/ChatListLite';
import NotificationsListLite from './components/NotificationsListLite';
import LiveNotificationToastLite from './components/LiveNotificationToastLite';
import GlobalSearchLite from './components/GlobalSearchLite';
import RealFeedLite from './components/RealFeedLite';
import EventFeedLite from './components/EventFeedLite';
import MyAccountPage from './pages/MyAccountPage';
import AuthPage from './components/AuthPage';
import { MAPBOX_TOKEN } from './config/appConfig';
import { buildSimulatedPoints, DESKTOP_PERF, MOBILE_PERF } from './lib/mapSimulation';
import { readMapVisibility, saveMapVisibility, STORAGE_SESSION_KEY } from './lib/storage';
import { useAuthFlow } from './hooks/useAuthFlow';
import { useRealtimePresence } from './hooks/useRealtimePresence';
import { useMapEngine } from './hooks/useMapEngine';
import { accountService, DEFAULT_ACCOUNT_SETTINGS } from './services/accountService';
import { API_URL } from './config/appConfig';

const ACCOUNT_PATH = '/minha-conta';

function getAdaptivePollingDelay(nowPlaying) {
  if (!nowPlaying) return 30000;
  if (!nowPlaying.isPlaying) return 25000;

  const progress = Number(nowPlaying.progressMs || 0);
  const duration = Number(nowPlaying.durationMs || 0);
  const remaining = duration > progress ? duration - progress : 0;

  if (remaining > 0 && remaining <= 15000) {
    return Math.max(3000, remaining + 1000);
  }
  return 7000;
}

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

  const { setUsername, users, socketRef, joined } = useRealtimePresence(activeUser);

  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [selectedEventFeed, setSelectedEventFeed] = useState(null);
  const [selectedShowDetail, setSelectedShowDetail] = useState(null);
  const [selectedSimProfile, setSelectedSimProfile] = useState(null);
  const [accountSettings, setAccountSettings] = useState(DEFAULT_ACCOUNT_SETTINGS);
  const [dbMapUsers, setDbMapUsers] = useState([]);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname || '/');
  const [shows, setShows] = useState([]);
  const [mapVisibility, setMapVisibility] = useState(() => readMapVisibility());
  const [isMobileDevice] = useState(() => window.matchMedia('(max-width: 900px)').matches);

  const mapUsers = useMemo(() => {
    const byId = new Map();
    (Array.isArray(dbMapUsers) ? dbMapUsers : []).forEach((user) => {
      byId.set(user.id, {
        id: user.id,
        name: user.name,
        bio: user.bio || '',
        city: user.city || '',
        showMusicHistory: user.showMusicHistory !== false,
        avatarUrl: user.avatarUrl || null,
        location: user.location || null
      });
    });

    (Array.isArray(users) ? users : []).forEach((user) => {
      const existing = byId.get(user.id) || {};
      const isCurrentUser = Boolean(activeUser?.id && user.id === activeUser.id);
      const shouldHideLocation = isCurrentUser && accountSettings.locationEnabled === false;
      byId.set(user.id, {
        ...existing,
        id: user.id,
        name: user.name || existing.name,
        spotify: user.spotify || existing.spotify,
        location: shouldHideLocation ? null : existing.location || user.location || null
      });
    });

    return Array.from(byId.values());
  }, [dbMapUsers, users, activeUser?.id, accountSettings.locationEnabled]);

  const perfProfile = isMobileDevice ? MOBILE_PERF : DESKTOP_PERF;
  const simulatedPoints = useMemo(() => buildSimulatedPoints(perfProfile.points), [perfProfile.points]);
  const handleMapShowSelect = useCallback((show) => {
    setSelectedShowDetail(show);
    setRightPanelCollapsed(false);
  }, []);

  const resolveUserProfile = useCallback(
    (user) => {
      if (!user) return null;
      const isCurrentUser = Boolean(activeUser?.id && user?.id === activeUser.id);
      const city = isCurrentUser ? accountSettings.city : user?.city || user?.location?.city || 'Cidade indisponivel';
      const avatar = isCurrentUser ? accountSettings.avatarDataUrl || user?.avatarUrl || user?.spotify?.image : user?.avatarUrl || user?.spotify?.image;
      const bio = isCurrentUser ? accountSettings.bio : user?.bio || '';
      const recentTracks = isCurrentUser
        ? accountSettings.showMusicHistory
          ? [user?.spotify?.track || user?.spotify?.trackName || user?.nowPlaying?.trackName || 'Sem historico de musica recente']
          : []
        : user?.showMusicHistory === false
          ? []
          : [user?.spotify?.track || user?.spotify?.trackName || user?.nowPlaying?.trackName || 'Sem historico de musica recente'];
      return {
        id: user?.id || `user-${Date.now()}`,
        name: user?.spotify?.display_name || user?.name || 'Usuario',
        avatar: avatar || `https://i.pravatar.cc/120?u=${encodeURIComponent(user?.id || 'user')}`,
        city,
        bio,
        showMusicHistory: isCurrentUser ? accountSettings.showMusicHistory : user?.showMusicHistory !== false,
        recentTracks,
        coords:
          Number.isFinite(Number(user?.location?.lng)) && Number.isFinite(Number(user?.location?.lat))
            ? [Number(user.location.lng), Number(user.location.lat)]
            : null
      };
    },
    [activeUser?.id, accountSettings]
  );

  const handleMapUserSelect = useCallback(
    (user) => {
      const profile = resolveUserProfile(user);
      if (!profile) return;
      setSelectedSimProfile(profile);
      setRightPanelCollapsed(false);
    },
    [resolveUserProfile]
  );

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
    shows,
    onShowSelect: handleMapShowSelect,
    onUserSelect: handleMapUserSelect,
    users: mapUsers,
    socketRef,
    mapVisibility
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
    saveMapVisibility(mapVisibility);
  }, [mapVisibility]);

  useEffect(() => {
    if (!selectedSimProfile?.id) return;
    if (!activeUser?.id || selectedSimProfile.id !== activeUser.id) return;
    setSelectedSimProfile((prev) =>
      prev
        ? {
            ...prev,
            city: accountSettings.city,
            bio: accountSettings.bio,
            avatar: accountSettings.avatarDataUrl || prev.avatar,
            showMusicHistory: accountSettings.showMusicHistory,
            recentTracks: accountSettings.showMusicHistory ? prev.recentTracks || [] : []
          }
        : prev
    );
  }, [accountSettings, activeUser?.id, selectedSimProfile?.id]);

  useEffect(() => {
    let active = true;
    accountService
      .get(activeUser)
      .then((settings) => {
        if (active) setAccountSettings(settings);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activeUser?.token, activeUser?.sessionId]);

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!activeUser) return undefined;
    let cancelled = false;

    const fetchMapUsers = async () => {
      try {
        const response = await fetch(`${API_URL}/api/map-users`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) return;
        const list = Array.isArray(payload?.users) ? payload.users : [];
        setDbMapUsers(list);
      } catch {
        if (!cancelled) setDbMapUsers([]);
      }
    };

    fetchMapUsers();
    const intervalId = window.setInterval(fetchMapUsers, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeUser]);

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
    let cancelled = false;
    let timerId = null;

    const schedule = (delay) => {
      timerId = window.setTimeout(async () => {
        const nowPlaying = await refreshSpotifyNowPlaying();
        if (cancelled) return;
        schedule(getAdaptivePollingDelay(nowPlaying));
      }, delay);
    };

    refreshSpotifyNowPlaying()
      .then((nowPlaying) => {
        if (!cancelled) {
          schedule(getAdaptivePollingDelay(nowPlaying));
        }
      })
      .catch(() => {
        if (!cancelled) {
          schedule(30000);
        }
      });

    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [activeUser?.spotifyToken, refreshSpotifyNowPlaying]);

  function handleLogout() {
    logout().catch(() => {});
  }

  function openFeedItem(item) {
    setSelectedEventFeed(item);
  }

  function navigateTo(path) {
    if (window.location.pathname === path) return;
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  }

  const handleSearchShowSelect = useCallback((show) => {
    if (!show) return;
    setSelectedShowDetail(show);
    setRightPanelCollapsed(false);
  }, []);

  const handleSearchUserSelect = useCallback(
    (user) => {
      handleMapUserSelect(user);
    },
    [handleMapUserSelect]
  );

  const spotifyIsPlaying = Boolean(activeUser?.nowPlaying?.isPlaying);
  const spotifyTrackName = activeUser?.nowPlaying?.trackName || '';
  const spotifyArtistName = activeUser?.nowPlaying?.artistName || activeUser?.nowPlaying?.artists || 'Artista indisponivel';
  const hasActiveTrack = Boolean(spotifyTrackName);
  const useMarqueeTitle = spotifyTrackName.length > 34;

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

  if (currentPath === ACCOUNT_PATH) {
    return (
      <MyAccountPage
        authUser={activeUser}
        onBack={() => navigateTo('/')}
        onLogout={handleLogout}
        onSettingsChange={setAccountSettings}
      />
    );
  }

  return (
    <div className="app-root">
      <div ref={mapContainerRef} className="map-canvas" />
      <GlobalSearchLite
        shows={shows}
        users={mapUsers}
        onFocusItem={focusFeedItem}
        onSelectShow={handleSearchShowSelect}
        onSelectUser={handleSearchUserSelect}
      />
      <LiveNotificationToastLite
        enabled={Boolean(activeUser)}
        paused={notificationsPanelOpen}
        onCountryClick={(payload) => {
          if (!payload?.coords) return;
          focusFeedItem({
            coords: payload.coords,
            country: payload.country
          });
        }}
        onUserClick={(profile) => {
          setSelectedSimProfile({
            ...(profile || {}),
            bio: profile?.bio || '',
            city: profile?.city || 'Cidade indisponivel',
            showMusicHistory: profile?.showMusicHistory !== false,
            recentTracks: profile?.recentTracks || []
          });
          setRightPanelCollapsed(false);
        }}
      />

      <SidebarNavLite
        onProfileOpen={() => navigateTo(ACCOUNT_PATH)}
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
          setNotificationsPanelOpen((prev) => {
            const next = !prev;
            if (next) setChatPanelOpen(false);
            return next;
          });
        }}
        mapVisibility={mapVisibility}
        onMapVisibilityChange={setMapVisibility}
      />

      <ChatListLite open={chatPanelOpen} onToggle={() => setChatPanelOpen((prev) => !prev)} />
      <NotificationsListLite open={notificationsPanelOpen} onToggle={() => setNotificationsPanelOpen(false)} />

      <RealFeedLite
        onFocusItem={focusFeedItem}
        onOpenItem={openFeedItem}
        onShowsChange={setShows}
        socketRef={socketRef}
        realtimeReady={joined}
        selectedShowDetail={selectedShowDetail}
        onCloseShowDetail={() => setSelectedShowDetail(null)}
        selectedUserDetail={selectedSimProfile}
        onCloseUserDetail={() => setSelectedSimProfile(null)}
        collapsed={rightPanelCollapsed}
        onToggleCollapse={() => setRightPanelCollapsed((prev) => !prev)}
      />

      <div className="now-playing-card">
        {activeUser?.spotify && hasActiveTrack ? (
          <div className="now-playing-content">
            {activeUser?.nowPlaying?.artistImage || activeUser?.nowPlaying?.albumImage || activeUser?.spotify?.image ? (
              <img
                src={activeUser.nowPlaying.artistImage || activeUser.nowPlaying.albumImage || activeUser.spotify.image}
                alt={spotifyArtistName || spotifyTrackName}
                className="now-playing-cover"
              />
            ) : (
              <div className="now-playing-cover now-playing-cover-fallback" aria-hidden="true">
                ♪
              </div>
            )}
            <div className="now-playing-copy">
              <div className={spotifyIsPlaying ? 'spotify-eq is-playing' : 'spotify-eq'} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p className={useMarqueeTitle ? 'now-playing-title marquee' : 'now-playing-title'}>
                <span>{spotifyTrackName}</span>
              </p>
              <p className="now-playing-artist">{spotifyArtistName}</p>
            </div>
          </div>
        ) : (
          <div className="now-playing-content">
            {activeUser?.spotify?.image ? (
              <img src={activeUser.spotify.image} alt={activeUser.spotify.display_name || 'Spotify'} className="now-playing-cover" />
            ) : (
              <div className="now-playing-cover now-playing-cover-fallback" aria-hidden="true">
                ♪
              </div>
            )}
            <div className="now-playing-copy">
              <p className="now-playing-title">Conectar ao Spotify</p>
              <p className="now-playing-empty">Clique no icone do Spotify na barra lateral.</p>
            </div>
          </div>
        )}
      </div>

      <div className="perf-box">
        <p>FPS: {fps}</p>
        <p>{isMobileDevice ? 'Modo mobile otimizado ativo' : 'Modo desktop padrão'}</p>
        {activeUser?.spotify?.display_name && <p>Spotify: {activeUser.spotify.display_name}</p>}
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
