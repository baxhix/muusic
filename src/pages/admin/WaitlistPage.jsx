import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Download, Trash2, UserRound, UserRoundCheck, UserRoundX } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import EmptyState from '../../components/ui/EmptyState';
import KpiCard from '../../components/ui/KpiCard';
import Pagination from '../../components/ui/Pagination';
import SearchInput from '../../components/ui/SearchInput';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { DEFAULT_PAGE_SIZE, fetchWaitlistFromApi, fetchWaitlistMock, ORIGIN_OPTIONS, STATUS_OPTIONS, WAITLIST_STATUS, waitlistRecords } from '../../mocks/adminWaitlist';

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(new Date(value));
}

function downloadCsv(records) {
  const header = ['email', 'origin', 'createdAt', 'status'];
  const rows = records.map((item) => [item.email, item.origin, item.createdAt, item.status]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new globalThis.Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'waitlist.csv';
  link.click();
  globalThis.URL.revokeObjectURL(url);
}

export default function WaitlistPage({ apiFetch }) {
  const [records, setRecords] = useState(waitlistRecords);
  const [source, setSource] = useState('mock');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState({ total: 0, pending: 0, invited: 0 });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const failByQuery = useMemo(() => typeof window !== 'undefined' && window.location.search.includes('adminError=1'), []);

  const loadData = useCallback(
    async (nextPage = page) => {
      setLoading(true);
      setError('');

      try {
        const payload = await fetchWaitlistMock({
          records,
          search,
          status: statusFilter,
          page: nextPage,
          pageSize: DEFAULT_PAGE_SIZE,
          shouldFail: failByQuery
        });

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
    [records, search, statusFilter, page, failByQuery]
  );

  const syncFromApi = useCallback(async () => {
    if (!apiFetch) {
      setSource('mock');
      return;
    }

    try {
      const payload = await fetchWaitlistFromApi({
        apiFetch,
        search: '',
        status: 'all',
        page: 1,
        pageSize: 9999
      });
      setRecords(payload.records || []);
      setSource('api');
    } catch {
      setSource('mock');
    }
  }, [apiFetch]);

  useEffect(() => {
    loadData(page);
  }, [loadData, page]);

  useEffect(() => {
    syncFromApi();
  }, [syncFromApi]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  function updateStatus(id, status) {
    setRecords((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  function removeEntry(id) {
    setRecords((prev) => prev.filter((item) => item.id !== id));
  }

  const statusVariant = {
    [WAITLIST_STATUS.PENDENTE]: 'warning',
    [WAITLIST_STATUS.CONVIDADO]: 'success',
    [WAITLIST_STATUS.CANCELADO]: 'danger'
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lista de Espera"
        subtitle="Monitore o funil de convites e avance contatos rapidamente"
        actions={
          <Button
            variant="secondary"
            onClick={async () => {
              await syncFromApi();
              await loadData(page);
            }}
          >
            Atualizar
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <KpiCard icon={UserRound} label="Total na lista" value={kpis.total} iconClassName="h-5 w-5 text-rose-300" />
        <KpiCard icon={Clock3} label="Aguardando convite" value={kpis.pending} iconClassName="h-5 w-5 text-amber-300" />
        <KpiCard icon={CheckCircle2} label="Ja convidados" value={kpis.invited} iconClassName="h-5 w-5 text-emerald-300" />
      </section>

      <Card>
        <CardHeader className="space-y-0 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-2xl">Lista de Espera</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{source === 'api' ? 'API' : 'Mock'}</Badge>
              <span className="text-sm text-muted-foreground">{total} resultados</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <SearchInput
              value={search}
              placeholder="Buscar por e-mail..."
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar por e-mail"
            />

            <Select ariaLabel="Filtrar por status" value={statusFilter} onValueChange={setStatusFilter} options={STATUS_OPTIONS} />

            <Button variant="secondary" className="md:ml-auto" onClick={() => downloadCsv(items)}>
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
              <Skeleton className="h-12 w-full" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="Nenhum contato encontrado"
              description="Ajuste os filtros ou limpe a busca para visualizar os registros da lista de espera."
              actionLabel="Limpar filtros"
              onAction={() => {
                setSearch('');
                setStatusFilter('all');
              }}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Data de Cadastro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id} className={index % 2 === 1 ? 'bg-background/20' : ''}>
                      <TableCell className="font-medium">{item.email}</TableCell>
                      <TableCell>
                        <Badge variant="origin">{ORIGIN_OPTIONS.find((origin) => origin.value === item.origin)?.label || item.origin}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
                      </TableCell>
                      <TableCell className="flex items-center justify-end gap-2">
                        <DropdownMenu
                          label="Acoes da linha"
                          items={[
                            {
                              label: 'Marcar como convidado',
                              icon: <UserRoundCheck className="h-4 w-4" />,
                              onSelect: () => updateStatus(item.id, WAITLIST_STATUS.CONVIDADO)
                            },
                            {
                              label: 'Reenviar convite',
                              icon: <Clock3 className="h-4 w-4" />,
                              onSelect: () => updateStatus(item.id, WAITLIST_STATUS.PENDENTE)
                            },
                            {
                              label: 'Marcar como cancelado',
                              icon: <UserRoundX className="h-4 w-4" />,
                              onSelect: () => updateStatus(item.id, WAITLIST_STATUS.CANCELADO)
                            }
                          ]}
                        />

                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remover contato"
                          className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                          onClick={() => removeEntry(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
