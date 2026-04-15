import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

const variants = {
  error: {
    icon: AlertTriangle,
    className: 'border-rose-500/20 bg-rose-500/10 text-rose-500'
  },
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
  },
  info: {
    icon: Info,
    className: 'border-sky-500/20 bg-sky-500/10 text-sky-500'
  }
};

export default function Alert({ className, children, variant = 'error' }) {
  const current = variants[variant] || variants.error;
  const Icon = current.icon;

  return (
    <div role="alert" className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm', current.className, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
