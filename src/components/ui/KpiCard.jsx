import { Card, CardContent } from './Card';

export default function KpiCard({ label, value, align = 'center' }) {
  const isLeft = align === 'left';

  return (
    <Card className="min-h-[152px] border-0 bg-card/85 shadow-none transition duration-200 hover:-translate-y-0.5">
      <CardContent className="flex h-full items-center justify-center p-6">
        <div className={isLeft ? 'text-left' : 'text-center'}>
          <span className="block text-4xl font-semibold tracking-tight text-white">{value}</span>
          <p className="mt-4 text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
