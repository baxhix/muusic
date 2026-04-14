import { cn } from '../../lib/utils';

export function Card({ className, ...props }) {
  return <div className={cn('rounded-2xl border border-border bg-card text-card-foreground shadow-sm', className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <div className={cn('text-[18px] font-semibold leading-[26px] tracking-tight', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}
