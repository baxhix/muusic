import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Download, MapPin, Music4 } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import KpiCard from '../../components/ui/KpiCard';
import Pagination from '../../components/ui/Pagination';
import SearchInput from '../../components/ui/SearchInput';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { buildCityOptions, DEFAULT_SHOWS_PAGE_SIZE, fetchShowsFromApi, fetchShowsMock, getShowStatus, mockShows } from '../../mocks/adminShows';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function exportShowsCsv(items) {
  const header = ['artist', 'venue', 'city', 'country', 'startsAt', 'ticketUrl'];
  const rows = items.map((item) => [item.artist, item.venue, item.city, item.country, item.startsAt, item.ticketUrl || '']);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'shows.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function ShowsPage({ apiFetch }) {
  const [shows, setShows] = useState(mockShows);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [source, setSource] = useState('mock');
  const [kpis, setKpis] = useState({ total: 0, upcoming: 0, cities: 0 });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const shouldFail = useMemo(() => typeof window !== 'undefined' && window.location.search.includes('adminError=1'), []);
  const cityOptions = useMemo(() => buildCityOptions(shows), [shows]);

  const loadData = useCallback(
    async (nextPage = page) => {
      setLoading(true);
      setError('');
      try {
        let payload;
        if (apiFetch) {
          try {
            payload = await fetchShowsFromApi({ apiFetch, search, city: cityFilter, page: nextPage, pageSize: DEFAULT_SHOWS_PAGE_SIZE });
            setSource('api');
            setShows(payload.shows || []);
          } catch {
            payload = await fetchShowsMock({ shows: mockShows, search, city: cityFilter, page: nextPage, pageSize: DEFAULT_SHOWS_PAGE_SIZE, shouldFail });
            setSource('mock');
            setShows(mockShows);
          }
        } else {
          payload = await fetchShowsMock({ shows: mockShows, search, city: cityFilter, page: nextPage, pageSize: DEFAULT_SHOWS_PAGE_SIZE, shouldFail });
          setSource('mock');
          setShows(mockShows);
        }

        setKpis(payload.kpis);
        setItems(payload.items);
        setTotal(payload.total);
        setTotalPages(payload.totalPages);
        setPage(payload.page);
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, cityFilter, page, search, shouldFail]
  );

  useEffect(() => {
    loadData(page);
  }, [loadData, page]);

  useEffect(() => {
    setPage(1);
  }, [search, cityFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shows"
        subtitle="Registros de eventos cadastrados no sistema"
        actions={
          <Button variant="secondary" onClick={() => loadData(page)}>
            Atualizar
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <KpiCard icon={Music4} label="Total de shows" value={kpis.total} />
        <KpiCard icon={CalendarClock} label="Proximos shows" value={kpis.upcoming} />
        <KpiCard icon={MapPin} label="Cidades ativas" value={kpis.cities} />
      </section>

      <Card>
        <CardHeader className="space-y-0 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-2xl">Shows cadastrados</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{source === 'api' ? 'API' : 'Mock'}</Badge>
              <span className="text-sm text-muted-foreground">{total} registros</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <SearchInput value={search} placeholder="Buscar artista, local ou cidade..." onChange={(event) => setSearch(event.target.value)} aria-label="Buscar shows" />
            <Select ariaLabel="Filtrar por cidade" value={cityFilter} onValueChange={setCityFilter} options={cityOptions} />
            <Button variant="secondary" className="md:ml-auto" onClick={() => exportShowsCsv(items)}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>

          {error ? <Alert>{error}</Alert> : null}

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="Nenhum show encontrado"
              description="Nao ha registros de shows para os filtros selecionados."
              actionLabel="Limpar filtros"
              onAction={() => {
                setSearch('');
                setCityFilter('all');
              }}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artista</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ingresso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((show) => {
                    const status = getShowStatus(show.startsAt);
                    return (
                      <TableRow key={show.id}>
                        <TableCell className="font-medium">{show.artist}</TableCell>
                        <TableCell>{show.venue}</TableCell>
                        <TableCell>{show.city}</TableCell>
                        <TableCell>{formatDate(show.startsAt)}</TableCell>
                        <TableCell>
                          <Badge variant={status === 'proximo' ? 'success' : 'outline'}>{status}</Badge>
                        </TableCell>
                        <TableCell>
                          {show.ticketUrl ? (
                            <a href={show.ticketUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                              abrir
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
