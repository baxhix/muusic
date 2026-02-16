import { Card, CardContent } from './Card';

export default function KpiCard({ icon: Icon, label, value, iconClassName }) {
  return (
    <Card className="transition duration-200 hover:-translate-y-0.5 hover:border-border/90">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-secondary">
            <Icon className={iconClassName || 'h-5 w-5 text-primary'} />
          </div>
          <span className="text-4xl font-semibold tracking-tight">{value}</span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
