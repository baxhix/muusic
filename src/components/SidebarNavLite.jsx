import { Bell, Disc3, Home, MapPin, MessageCircle, Settings, Shield, User } from 'lucide-react';
import muusicLogo from '../assets/logo-muusic.png';

export default function SidebarNavLite({
  onLogout,
  onSpotifyConnect,
  spotifyConnected,
  spotifyConnecting,
  chatOpen,
  onChatToggle,
  notificationsOpen,
  onNotificationsToggle
}) {
  return (
    <aside className="rail-sidebar">
      <div className="rail-logo">
        <img
          src={muusicLogo}
          alt="Muusic"
          className="rail-logo-img"
        />
      </div>

      <nav className="rail-nav rail-top">
        <button type="button" className="rail-btn active" aria-label="Home" data-tooltip="Home">
          <Home />
        </button>
        <button type="button" className="rail-btn" aria-label="Localização" data-tooltip="Localização">
          <MapPin />
        </button>
        <button type="button" className={chatOpen ? 'rail-btn active' : 'rail-btn'} aria-label="Chat" onClick={onChatToggle} data-tooltip="Chat">
          <MessageCircle />
        </button>
        <button
          type="button"
          className={notificationsOpen ? 'rail-btn active' : 'rail-btn'}
          aria-label="Notificações"
          data-tooltip="Notificações"
          onClick={onNotificationsToggle}
        >
          <Bell />
        </button>
      </nav>

      <nav className="rail-nav rail-bottom">
        <button
          type="button"
          className={spotifyConnected ? 'rail-btn spotify-connected' : 'rail-btn'}
          aria-label="Conectar Spotify"
          onClick={onSpotifyConnect}
          data-tooltip={spotifyConnected ? 'Spotify conectado' : spotifyConnecting ? 'Conectando Spotify...' : 'Conectar Spotify'}
        >
          <Disc3 />
        </button>
        <button type="button" className="rail-btn" aria-label="Configurações" data-tooltip="Configurações">
          <Settings />
        </button>
        <button type="button" className="rail-btn" aria-label="Admin" data-tooltip="Proteção">
          <Shield />
        </button>
        <button type="button" className="rail-btn" aria-label="Perfil" onClick={onLogout} data-tooltip="Perfil">
          <User />
        </button>
      </nav>
    </aside>
  );
}
