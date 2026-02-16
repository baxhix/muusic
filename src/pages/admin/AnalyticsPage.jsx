import { BarChart3, GaugeCircle, LineChart } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { analyticsKpis, originPerformance, weeklyConversion } from '../../mocks/adminData';

const icons = [BarChart3, GaugeCircle, LineChart];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Metricas de origem, conversao e qualidade de leads" />

      <section className="grid gap-4 lg:grid-cols-3">
        {analyticsKpis.map((kpi, index) => {
          const Icon = icons[index] || BarChart3;
          return <KpiCard key={kpi.key} icon={Icon} label={kpi.label} value={kpi.value} />;
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Performance por Origem</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Conversao</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {originPerformance.map((row) => (
                  <TableRow key={row.origin}>
                    <TableCell className="font-medium">{row.origin}</TableCell>
                    <TableCell>{row.leads}</TableCell>
                    <TableCell>{row.conversion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversao Semanal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {weeklyConversion.map((row) => (
              <div key={row.week} className="rounded-lg border border-border bg-background/40 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{row.week}</span>
                  <span className="text-muted-foreground">{row.invited} convites</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((row.invited / row.pending) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
