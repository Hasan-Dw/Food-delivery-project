import type { ReactNode } from 'react';
import { AlertCircle, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/cn';

interface StatePanelProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'error';
  className?: string;
}

export function StatePanel({ title, description, action, icon, tone = 'default', className }: StatePanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-panel border border-dashed border-olive-900/15 bg-cream/60 px-6 py-14 text-center',
        className,
      )}
    >
      <span
        className={cn(
          'mb-5 flex h-14 w-14 items-center justify-center rounded-full',
          tone === 'error' ? 'bg-danger/10 text-danger' : 'bg-olive-700/10 text-olive-700',
        )}
      >
        {icon ?? (tone === 'error' ? <AlertCircle className="h-6 w-6" /> : <UtensilsCrossed className="h-6 w-6" />)}
      </span>
      <h2 className="text-2xl text-olive-900">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-olive-500">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function EmptyState(props: Omit<StatePanelProps, 'tone'>) {
  return <StatePanel {...props} />;
}

export function ErrorState(props: Omit<StatePanelProps, 'tone'>) {
  return <StatePanel {...props} tone="error" />;
}
