import PageHeader from '../../components/admin/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';

function MockBarChart({ labels = [], values = [] }) {
  const max = Math.max(...values, 1);

  return (
    <div className="space-y-3">
      <div className="flex h-40 items-end gap-2">
        {values.map((value, index) => (
          <div key={`bar-${index}`} className="flex flex-1 flex-col items-center justify-end gap-2">
            <div
              className="w-full rounded-sm bg-white/70"
              style={{
                height: `${Math.max(8, (Number(value || 0) / max) * 100)}%`
              }}
            />
            <span className="text-[11px] text-muted-foreground">{labels[index] || '-'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MockSectionPage({ title, subtitle, kpis = [], charts = [], columns = [], rows = [] }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={`${subtitle} (dados mockados)`} />

      {kpis.length ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} />
          ))}
        </section>
      ) : null}

      {charts.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {charts.map((chart) => (
            <Card key={chart.title}>
              <CardHeader>
                <CardTitle>{chart.title}</CardTitle>
                {chart.subtitle ? <p className="text-sm text-muted-foreground">{chart.subtitle}</p> : null}
              </CardHeader>
              <CardContent>
                <MockBarChart labels={chart.labels} values={chart.values} />
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={`${title}-${index}`}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={`${title}-${index}-${cellIndex}`}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
