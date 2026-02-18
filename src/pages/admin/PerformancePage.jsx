import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/admin/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import Tooltip from '../../components/ui/Tooltip';

function formatUptime(sec) {
  const total = Number(sec || 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${m}m ${s}s`;
}

function statusColorClass(level) {
  if (level === 'critical') return 'bg-red-500';
  if (level === 'attention') return 'bg-amber-400';
  return 'bg-emerald-500';
}

function metricLevel(value, { attention, critical }) {
  const numeric = Number(value || 0);
  if (numeric >= critical) return 'critical';
  if (numeric >= attention) return 'attention';
  return 'healthy';
}

function MetricRow({ label, description, value, level = 'healthy' }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2">
        <span className={`h-[3px] w-[3px] rounded-full ${statusColorClass(level)}`} aria-hidden="true" />
        <Tooltip content={description}>
          <span className="cursor-help text-muted-foreground">{label}</span>
        </Tooltip>
      </span>
      <span className="text-right font-medium text-white">{value}</span>
    </p>
  );
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
            <KpiCard align="left" label="RPS (1 min)" value={snapshot.http?.rpsLast1m ?? 0} />
            <KpiCard align="left" label="Latência p95 (ms)" value={snapshot.http?.p95Ms ?? 0} />
            <KpiCard align="left" label="Uptime" value={formatUptime(snapshot.process?.uptimeSec)} />
            <KpiCard align="left" label="Heap usado (MB)" value={snapshot.process?.heapUsedMb ?? 0} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Processo / Sistema</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <MetricRow label="PID" description="Identificador único do processo em execução." value={snapshot.process?.pid} />
                <MetricRow label="Node" description="Versão do Node.js usada pela aplicação." value={snapshot.process?.nodeVersion} />
                <MetricRow
                  label="RSS"
                  description="Memória total residente ocupada pelo processo."
                  value={`${snapshot.process?.rssMb} MB`}
                  level={metricLevel(snapshot.process?.rssMb, { attention: 700, critical: 1200 })}
                />
                <MetricRow
                  label="Heap total"
                  description="Tamanho total do heap alocado pelo V8."
                  value={`${snapshot.process?.heapTotalMb} MB`}
                  level={metricLevel(snapshot.process?.heapTotalMb, { attention: 350, critical: 700 })}
                />
                <MetricRow
                  label="Load avg (1m/5m/15m)"
                  description="Carga média do sistema nas janelas de 1, 5 e 15 minutos."
                  value={`${snapshot.system?.loadAvg1m} / ${snapshot.system?.loadAvg5m} / ${snapshot.system?.loadAvg15m}`}
                  level={metricLevel(Number(snapshot.system?.loadAvg1m) / Math.max(Number(snapshot.system?.cpuCount || 1), 1), {
                    attention: 0.8,
                    critical: 1
                  })}
                />
                <MetricRow label="CPU cores" description="Quantidade de núcleos de CPU disponíveis no host." value={snapshot.system?.cpuCount} />
                <MetricRow
                  label="Memória livre"
                  description="Memória disponível versus memória total do servidor."
                  value={`${snapshot.system?.freeMemGb} GB / ${snapshot.system?.totalMemGb} GB`}
                  level={metricLevel(
                    1 - Number(snapshot.system?.freeMemGb || 0) / Math.max(Number(snapshot.system?.totalMemGb || 1), 1),
                    { attention: 0.8, critical: 0.9 }
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Loop / HTTP</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <MetricRow
                  label="Event loop médio"
                  description="Tempo médio de atraso no event loop."
                  value={`${snapshot.eventLoop?.meanMs} ms`}
                  level={metricLevel(snapshot.eventLoop?.meanMs, { attention: 40, critical: 80 })}
                />
                <MetricRow
                  label="Event loop p95"
                  description="Atraso no percentil 95 do event loop."
                  value={`${snapshot.eventLoop?.p95Ms} ms`}
                  level={metricLevel(snapshot.eventLoop?.p95Ms, { attention: 80, critical: 150 })}
                />
                <MetricRow
                  label="Event loop max"
                  description="Maior atraso observado no event loop."
                  value={`${snapshot.eventLoop?.maxMs} ms`}
                  level={metricLevel(snapshot.eventLoop?.maxMs, { attention: 200, critical: 400 })}
                />
                <MetricRow
                  label="Latência média HTTP"
                  description="Tempo médio de resposta das requisições HTTP."
                  value={`${snapshot.http?.avgMs} ms`}
                  level={metricLevel(snapshot.http?.avgMs, { attention: 350, critical: 700 })}
                />
                <MetricRow label="Amostra HTTP" description="Quantidade de requisições consideradas na janela recente." value={`${snapshot.http?.sampleSize} req`} />
                <MetricRow label="Status 2xx" description="Respostas HTTP bem-sucedidas." value={snapshot.http?.byStatus?.s2xx ?? 0} />
                <MetricRow
                  label="Status 4xx"
                  description="Respostas de erro por requisição inválida ou não autorizada."
                  value={snapshot.http?.byStatus?.s4xx ?? 0}
                  level={metricLevel(snapshot.http?.byStatus?.s4xx, { attention: 1, critical: 10 })}
                />
                <MetricRow
                  label="Status 5xx"
                  description="Respostas de erro interno do servidor."
                  value={snapshot.http?.byStatus?.s5xx ?? 0}
                  level={metricLevel(snapshot.http?.byStatus?.s5xx, { attention: 1, critical: 3 })}
                />
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
