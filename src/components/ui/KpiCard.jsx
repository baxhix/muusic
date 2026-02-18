import { Card, CardContent } from './Card';

export default function KpiCard({ label, value }) {
  return (
    <Card className="border-0 bg-card/85 shadow-none transition duration-200 hover:-translate-y-0.5">
      <CardContent className="p-6">
        <div className="text-center">
          <span className="block text-4xl font-semibold tracking-tight text-white">{value}</span>
          <p className="mt-4 text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
