import { cn } from '../../lib/utils';

export function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-auto rounded-2xl border border-border bg-card/70">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn('[&_tr]:border-b [&_tr]:border-border sticky top-0 z-10 bg-card', className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn('border-b border-border transition-colors duration-150 hover:bg-secondary/30', className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return <th className={cn('h-12 px-4 text-left align-middle text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground', className)} {...props} />;
}

export function TableCell({ className, ...props }) {
  return <td className={cn('p-4 align-middle text-[14px] text-card-foreground', className)} {...props} />;
}
