import MusicCard from './MusicCard';

export default function MusicList({ tracks }) {
  return (
    <section className="user-music-list" aria-label="Historico musical">
      {tracks.map((track) => (
        <MusicCard key={track.id} track={track} />
      ))}
    </section>
  );
}
