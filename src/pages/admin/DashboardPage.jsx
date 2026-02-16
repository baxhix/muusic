import { Activity, Sparkles, Users2 } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import { dashboardKpis } from '../../mocks/adminData';

const icons = {
  usuarios: Users2,
  convites: Sparkles,
  conversao: Activity
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Visao geral operacional do funil admin" />

      <section className="grid gap-4 lg:grid-cols-3">
        {dashboardKpis.map((kpi) => {
          const Icon = icons[kpi.key] || Activity;
          return <KpiCard key={kpi.key} icon={Icon} label={kpi.label} value={kpi.value} />;
        })}
      </section>

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Dia</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            {dashboardKpis.map((kpi) => (
              <div key={kpi.key} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-4 py-3">
                <span className="text-sm text-muted-foreground">{kpi.label}</span>
                <span className="text-sm font-semibold">{kpi.delta}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
