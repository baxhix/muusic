import { Music2, Radio } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/admin/PageHeader';
import Alert from '../../components/ui/Alert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { trendingsService } from '../../services/trendingsService';

function TrendList({ title, icon: Icon, items = [], totalPlays = 0, emptyText = 'Sem dados de reprodução ainda.' }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
        <span className="text-xs text-muted-foreground">Total: {totalPlays}</span>
      </CardHeader>
      <CardContent className="grid gap-3 pt-0">
        {items.length === 0 ? (
          <div className="rounded-lg border border-border bg-background/40 px-4 py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          items.map((item, index) => (
            <div key={`${item.id || item.name}-${index}`} className="rounded-lg border border-border bg-background/40 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                <p className="text-sm font-semibold">{item.count}</p>
              </div>
              {item.artistName ? <p className="truncate text-xs text-muted-foreground">{item.artistName}</p> : null}
              <p className="mt-1 text-xs text-muted-foreground">{item.percent}%</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function TrendingsPage({ apiFetch }) {
  const [snapshot, setSnapshot] = useState({
    totalPlays: 0,
    artists: [],
    tracks: [],
    updatedAt: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const payload = await trendingsService.getSnapshot({ apiFetch, days: 7, limit: 20 });
        if (!mounted) return;
        setSnapshot(payload);
        setError('');
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError.message || 'Falha ao carregar trendings.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    refresh();
    const intervalId = window.setInterval(refresh, 10000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [apiFetch]);

  const topArtists = useMemo(() => snapshot.artists.slice(0, 20), [snapshot.artists]);
  const topTracks = useMemo(() => snapshot.tracks.slice(0, 20), [snapshot.tracks]);

  return (
    <div className="space-y-6">
      <PageHeader title="Trendings" subtitle="Captura de reproduções para análise de tendências da plataforma" />
      {error ? <Alert>{error}</Alert> : null}
      {loading ? <p className="text-sm text-muted-foreground">Carregando trendings...</p> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <TrendList title="Artistas mais reproduzidos" icon={Radio} items={topArtists} totalPlays={snapshot.totalPlays} />
        <TrendList title="Músicas mais reproduzidas" icon={Music2} items={topTracks} totalPlays={snapshot.totalPlays} />
      </section>
    </div>
  );
}
