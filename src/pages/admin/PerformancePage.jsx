import { useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, Cpu, Gauge, MemoryStick, Server } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';

function formatUptime(sec) {
  const total = Number(sec || 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function PerformancePage({ apiFetch }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        if (!apiFetch) throw new Error('API administrativa indisponível.');
        const payload = await apiFetch('/admin/performance');
        if (!mounted) return;
        setSnapshot(payload);
        setError('');
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError.message || 'Falha ao carregar métricas de performance.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const intervalId = window.setInterval(load, 10000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [apiFetch]);

  const topRoutes = useMemo(() => snapshot?.http?.topRoutes || [], [snapshot?.http?.topRoutes]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        subtitle="Métricas técnicas reais do servidor e da API da aplicação."
        actions={
          <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
            Atualizar agora
          </Button>
        }
      />

      {error ? <Alert>{error}</Alert> : null}

      {loading && !snapshot ? <p className="text-sm text-muted-foreground">Carregando métricas...</p> : null}

      {snapshot ? (
        <>
          <section className="grid gap-4 lg:grid-cols-4">
            <KpiCard icon={Activity} label="RPS (1 min)" value={snapshot.http?.rpsLast1m ?? 0} />
            <KpiCard icon={Gauge} label="Latência p95 (ms)" value={snapshot.http?.p95Ms ?? 0} />
            <KpiCard icon={Clock3} label="Uptime" value={formatUptime(snapshot.process?.uptimeSec)} />
            <KpiCard icon={MemoryStick} label="Heap usado (MB)" value={snapshot.process?.heapUsedMb ?? 0} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Processo / Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <p>PID: {snapshot.process?.pid}</p>
                <p>Node: {snapshot.process?.nodeVersion}</p>
                <p>RSS: {snapshot.process?.rssMb} MB</p>
                <p>Heap total: {snapshot.process?.heapTotalMb} MB</p>
                <p>Load avg (1m/5m/15m): {snapshot.system?.loadAvg1m} / {snapshot.system?.loadAvg5m} / {snapshot.system?.loadAvg15m}</p>
                <p>CPU cores: {snapshot.system?.cpuCount}</p>
                <p>Memória livre: {snapshot.system?.freeMemGb} GB / {snapshot.system?.totalMemGb} GB</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Event Loop / HTTP
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <p>Event loop médio: {snapshot.eventLoop?.meanMs} ms</p>
                <p>Event loop p95: {snapshot.eventLoop?.p95Ms} ms</p>
                <p>Event loop max: {snapshot.eventLoop?.maxMs} ms</p>
                <p>Latência média HTTP: {snapshot.http?.avgMs} ms</p>
                <p>Amostra HTTP: {snapshot.http?.sampleSize} req</p>
                <p>Status 2xx: {snapshot.http?.byStatus?.s2xx ?? 0}</p>
                <p>Status 4xx: {snapshot.http?.byStatus?.s4xx ?? 0}</p>
                <p>Status 5xx: {snapshot.http?.byStatus?.s5xx ?? 0}</p>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Top rotas (janela recente)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rota</TableHead>
                    <TableHead>Requisições</TableHead>
                    <TableHead>Média (ms)</TableHead>
                    <TableHead>P95 (ms)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topRoutes.map((route) => (
                    <TableRow key={route.route}>
                      <TableCell className="font-medium">{route.route}</TableCell>
                      <TableCell>{route.count}</TableCell>
                      <TableCell>{route.avgMs}</TableCell>
                      <TableCell>{route.p95Ms}</TableCell>
                    </TableRow>
                  ))}
                  {!topRoutes.length ? (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={4}>
                        Sem tráfego suficiente para exibir rotas.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
