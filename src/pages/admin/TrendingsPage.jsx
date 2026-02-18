import { Music2, Radio, Users } from 'lucide-react';
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
    topFans: [],
    updatedAt: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('artists');

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
  const topFans = useMemo(() => snapshot.topFans.slice(0, 20), [snapshot.topFans]);

  const tabItems = [
    { key: 'artists', label: 'Top Artistas', icon: Radio },
    { key: 'tracks', label: 'Top Músicas', icon: Music2 },
    { key: 'fans', label: 'Top Fãs', icon: Users }
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Trendings" subtitle="Captura de reproduções para análise de tendências da plataforma" />
      {error ? <Alert>{error}</Alert> : null}
      {loading ? <p className="text-sm text-muted-foreground">Carregando trendings...</p> : null}

      <section className="space-y-4">
        <div className="admin-trendings-tabs flex flex-wrap gap-2 rounded-lg border border-border bg-card p-2" role="tablist" aria-label="Abas de trendings">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                className={
                  selected
                    ? 'admin-trendings-tab is-active inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold text-white'
                    : 'admin-trendings-tab inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-white'
                }
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'artists' ? (
          <TrendList title="Artistas mais reproduzidos" icon={Radio} items={topArtists} totalPlays={snapshot.totalPlays} />
        ) : null}
        {activeTab === 'tracks' ? (
          <TrendList title="Músicas mais reproduzidas" icon={Music2} items={topTracks} totalPlays={snapshot.totalPlays} />
        ) : null}
        {activeTab === 'fans' ? (
          <TrendList
            title="Top fãs"
            icon={Users}
            items={topFans}
            totalPlays={snapshot.totalPlays}
            emptyText="Sem ouvintes ativos suficientes para gerar ranking."
          />
        ) : null}
      </section>
    </div>
  );
}
