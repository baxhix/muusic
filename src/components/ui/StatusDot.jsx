import { cn } from '../../lib/utils';

const variants = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  info: 'bg-sky-400',
  neutral: 'bg-slate-500'
};

const sizes = {
  xs: 'h-[6px] w-[6px]',
  sm: 'h-2 w-2',
  default: 'h-2.5 w-2.5'
};

export default function StatusDot({ variant = 'neutral', pulse = false, size = 'default', className }) {
  const color = variants[variant] || variants.neutral;
  const dotSize = sizes[size] || sizes.default;

  return (
    <span className={cn('relative inline-flex shrink-0', dotSize, className)} aria-hidden="true">
      {pulse ? <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', color)} /> : null}
      <span className={cn('relative inline-flex rounded-full', dotSize, color)} />
    </span>
  );
}
