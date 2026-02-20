import { EyeOff, Heart } from 'lucide-react';

export default function MusicCard({ track }) {
  return (
    <article className="user-music-card">
      <img src={track.cover} alt={`Capa de ${track.title}`} className="user-music-cover" loading="lazy" />
      <div className="user-music-copy">
        <p className="user-music-title">{track.title}</p>
        <p className="user-music-artist">{track.artist}</p>
        <p className="user-music-date">{track.date}</p>
      </div>
      <div className="user-music-actions" aria-label="Acoes da musica">
        <button type="button" className="user-music-action" aria-label="Curtir musica">
          <Heart size={13} />
        </button>
        <button type="button" className="user-music-action icon-only" aria-label="Ocultar musica">
          <EyeOff size={13} />
        </button>
      </div>
    </article>
  );
}
