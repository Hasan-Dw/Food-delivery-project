import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Promotion } from '@/types';
import { Image } from '@/components/ui/Image';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/stores/toast-store';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/cn';

const accentStyles = {
  terracotta: {
    body: 'bg-terracotta-600 text-cream',
    subtitle: 'text-cream/85',
    badge: 'terracotta' as const,
    code: 'border-cream/35 bg-cream/10 text-cream',
    button: 'bg-cream text-terracotta-700 hover:bg-ivory-100',
  },
  olive: {
    body: 'bg-olive-700 text-cream',
    subtitle: 'text-cream/65',
    badge: 'olive' as const,
    code: 'border-cream/30 bg-cream/10 text-cream',
    button: 'bg-gold-300 text-olive-900 hover:bg-gold-200',
  },
  gold: {
    body: 'bg-gold-100 text-olive-900',
    subtitle: 'text-olive-600',
    badge: 'gold' as const,
    code: 'border-olive-900/25 bg-cream/50 text-olive-900',
    button: 'bg-olive-700 text-cream hover:bg-olive-800',
  },
};

export function PromoCard({ promotion }: { promotion: Promotion }) {
  const [copied, setCopied] = useState(false);
  const notify = useToast();
  const accent = accentStyles[promotion.accent];

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(promotion.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      notify({
        tone: 'success',
        title: 'Code copied',
        description: `${promotion.code} — add it at checkout.`,
      });
    } catch {
      notify({
        tone: 'info',
        title: promotion.code,
        description: 'Copy the code manually and add it at checkout.',
      });
    }
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-panel border border-olive-900/8 bg-cream shadow-[0_1px_0_rgba(73,56,46,0.03)]">
      <div className="relative aspect-[16/9] overflow-hidden bg-ivory-200">
        <Image
          imageKey={promotion.imageKey}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
          imageClassName="transition-transform duration-700 ease-out-soft group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-olive-900/35 via-transparent to-transparent" />
        <div className="absolute left-4 top-4">
          <Badge tone={accent.badge}>{promotion.accent === 'gold' ? 'Sweet deal' : 'Limited offer'}</Badge>
        </div>
      </div>

      <div className={cn('flex flex-1 flex-col p-6', accent.body)}>
        <h3 className="font-display text-[1.45rem] leading-tight">{promotion.title}</h3>
        <p className={cn('mt-2 text-[0.8125rem] leading-relaxed', accent.subtitle)}>{promotion.subtitle}</p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
          <div>
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 font-mono text-[0.75rem] font-semibold tracking-[0.14em]',
                accent.code,
              )}
            >
              {promotion.code}
            </span>
            {promotion.minOrder ? (
              <p className={cn('mt-1.5 text-[0.625rem]', accent.subtitle)}>
                Min. order {formatCurrency(promotion.minOrder)}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={copyCode}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.75rem] font-medium transition-colors duration-300',
              accent.button,
            )}
            aria-label={`Copy offer code ${promotion.code}`}
          >
            {copied ? (
              <>
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                Copy code
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
