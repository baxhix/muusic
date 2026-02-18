export default function SimUserProfileModal({ profile, onClose }) {
  if (!profile) return null;

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Perfil do usuario">
      <div className="auth-card profile-card">
        <div className="profile-head">
          <img src={profile.avatar} alt={profile.name} className="profile-avatar" />
          <div className="profile-copy">
            <h2>{profile.name}</h2>
            <p>{profile.city}</p>
          </div>
        </div>

        <div className="profile-section">
          <p className="profile-label">Musicas ouvidas recentemente</p>
          <ul className="profile-track-list">
            {(profile.recentTracks || []).map((track, index) => (
              <li key={`${track}-${index}`}>{track}</li>
            ))}
          </ul>
        </div>

        <div className="auth-switch">
          <button type="button" className="active" onClick={onClose}>
            Fechar
          </button>
          <button type="button" onClick={onClose}>
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
