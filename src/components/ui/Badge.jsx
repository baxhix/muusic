import { cn } from '../../lib/utils';

const variants = {
  default: 'border-transparent bg-secondary text-secondary-foreground',
  outline: 'border border-border/80 bg-transparent text-foreground',
  neutral: 'border border-border bg-secondary/60 text-secondary-foreground',
  success: 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
  warning: 'border border-amber-500/20 bg-amber-500/10 text-amber-500',
  danger: 'border border-rose-500/20 bg-rose-500/10 text-rose-500',
  info: 'border border-sky-500/20 bg-sky-500/10 text-sky-500',
  accent: 'border border-sky-500/20 bg-sky-500/10 text-sky-500',
  origin: 'border border-border bg-background text-muted-foreground'
};

export default function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
