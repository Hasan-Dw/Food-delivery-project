import type { ReactNode } from 'react';

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-olive-900/10 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <p className="eyebrow text-terracotta-600">{eyebrow}</p> : null}
        <h1 className="mt-3 text-[clamp(1.8rem,2.6vw,2.5rem)] leading-[1.05]">{title}</h1>
        {description ? (
          <p className="mt-2.5 text-[0.875rem] leading-relaxed text-olive-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}
