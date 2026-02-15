export default function EventFeedLite({ event, onClose, onGoToMap }) {
  if (!event) return null;

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h2>{event.artist}</h2>
        <p>
          Agora em <strong>{event.city}</strong>, {event.country}
        </p>
        <p>Ouvindo agora: {event.listeners}</p>
        <p>Likes: {event.likes} • Comentários: {event.comments}</p>
        <div className="auth-switch">
          <button type="button" onClick={() => onGoToMap(event)} className="active">
            Ir ao mapa
          </button>
          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
