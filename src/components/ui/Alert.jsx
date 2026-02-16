import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Alert({ className, children }) {
  return (
    <div role="alert" className={cn('flex items-center gap-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200', className)}>
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
