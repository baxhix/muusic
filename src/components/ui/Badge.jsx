import { cn } from '../../lib/utils';

const variants = {
  default: 'border-transparent bg-secondary text-secondary-foreground',
  outline: 'text-foreground border-border',
  success: 'border border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
  warning: 'border border-amber-500/35 bg-amber-500/10 text-amber-300',
  danger: 'border border-rose-500/35 bg-rose-500/10 text-rose-300',
  origin: 'border border-border bg-background text-muted-foreground'
};

export default function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
