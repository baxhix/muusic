import { Card, CardContent } from './Card';
import { cn } from '../../lib/utils';

export default function KpiCard({ label, value, hint = '', icon: Icon, align = 'center', size = 'default' }) {
  const isLeft = align === 'left';
  const compact = size === 'compact';
  const centeredCompact = compact && !isLeft;

  return (
    <Card
      className={cn(
        'border-0 bg-card/85 shadow-none transition duration-200 hover:-translate-y-0.5',
        compact ? 'min-h-[124px]' : 'min-h-[152px]'
      )}
    >
      <CardContent className={cn('p-6', compact ? 'h-full' : 'flex h-full items-center justify-center')}>
        <div className={cn('flex h-full flex-col', centeredCompact ? 'justify-between' : 'justify-center', isLeft ? 'text-left' : 'text-center')}>
          {(Icon || hint) && (
            <div className={cn('flex min-h-6 items-start gap-2', centeredCompact ? 'justify-end' : isLeft ? 'justify-start' : 'justify-center')}>
              {hint ? (
                <span className="inline-flex items-center rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {hint}
                </span>
              ) : null}
              {Icon ? (
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-secondary/55 text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </div>
          )}

          <div className={cn(centeredCompact ? 'flex flex-1 flex-col items-center justify-center' : 'mt-0')}>
            <span className={cn('block font-semibold tracking-tight text-foreground', compact ? 'text-[32px] leading-[36px]' : 'text-4xl')}>
              {value}
            </span>
            <p className={cn('text-muted-foreground', compact ? 'mt-3 text-sm' : 'mt-4 text-sm')}>{label}</p>
            {!centeredCompact && hint ? <p className={cn('text-muted-foreground/80', compact ? 'mt-2 text-sm' : 'mt-2 text-xs')}>{hint}</p> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
