import PageHeader from '../../components/admin/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';

export default function MockSectionPage({ title, subtitle, kpis = [], columns = [], rows = [] }) {
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
