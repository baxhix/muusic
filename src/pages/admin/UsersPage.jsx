import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Shield, UserCircle2, Users } from 'lucide-react';
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
import { DEFAULT_USERS_PAGE_SIZE, fetchUsersFromApi, fetchUsersMock, mockUsers, USER_ROLE_OPTIONS } from '../../mocks/adminUsers';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function exportUsersCsv(items) {
  const header = ['name', 'email', 'role', 'createdAt'];
  const rows = items.map((item) => [item.name || '', item.email, item.role, item.createdAt || '']);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'usuarios.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function UsersPage({ apiFetch }) {
  const [users, setUsers] = useState(mockUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [source, setSource] = useState('mock');
  const [kpis, setKpis] = useState({ total: 0, admins: 0, standard: 0 });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const shouldFail = useMemo(() => typeof window !== 'undefined' && window.location.search.includes('adminError=1'), []);

  const loadData = useCallback(
    async (nextPage = page) => {
      setLoading(true);
      setError('');
      try {
        let payload;
        if (apiFetch) {
          try {
            payload = await fetchUsersFromApi({ apiFetch, search, role: roleFilter, page: nextPage, pageSize: DEFAULT_USERS_PAGE_SIZE });
            setSource('api');
            setUsers(payload.users || []);
          } catch {
            payload = await fetchUsersMock({ users: mockUsers, search, role: roleFilter, page: nextPage, pageSize: DEFAULT_USERS_PAGE_SIZE, shouldFail });
            setSource('mock');
            setUsers(mockUsers);
          }
        } else {
          payload = await fetchUsersMock({ users: mockUsers, search, role: roleFilter, page: nextPage, pageSize: DEFAULT_USERS_PAGE_SIZE, shouldFail });
          setSource('mock');
          setUsers(mockUsers);
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
    [apiFetch, page, roleFilter, search, shouldFail]
  );

  useEffect(() => {
    loadData(page);
  }, [loadData, page]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        subtitle="Gestao de acesso administrativo e cadastro de contas"
        actions={
          <Button variant="secondary" onClick={() => loadData(page)}>
            Atualizar
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <KpiCard icon={Users} label="Total de usuarios" value={kpis.total} />
        <KpiCard icon={Shield} label="Administradores" value={kpis.admins} />
        <KpiCard icon={UserCircle2} label="Usuarios padrao" value={kpis.standard} />
      </section>

      <Card>
        <CardHeader className="space-y-0 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-2xl">Usuarios</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{source === 'api' ? 'API' : 'Mock'}</Badge>
              <span className="text-sm text-muted-foreground">{total} registros</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <SearchInput value={search} placeholder="Buscar por nome ou e-mail..." onChange={(event) => setSearch(event.target.value)} aria-label="Buscar usuarios" />
            <Select ariaLabel="Filtrar por perfil" value={roleFilter} onValueChange={setRoleFilter} options={USER_ROLE_OPTIONS} />
            <Button variant="secondary" className="md:ml-auto" onClick={() => exportUsersCsv(items)}>
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
              title="Nenhum usuario encontrado"
              description="Ajuste os filtros para encontrar usuarios cadastrados."
              actionLabel="Limpar filtros"
              onAction={() => {
                setSearch('');
                setRoleFilter('all');
              }}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || 'Usuario'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'ADMIN' ? 'success' : 'outline'}>{user.role === 'ADMIN' ? 'admin' : 'usuario'}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
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
