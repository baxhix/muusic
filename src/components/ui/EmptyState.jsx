import { Inbox } from 'lucide-react';
import Button from './Button';

export default function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <div className="space-y-2">
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-secondary">
          <Inbox className="h-4 w-4 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        {actionLabel ? (
          <Button variant="secondary" className="mt-2" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
