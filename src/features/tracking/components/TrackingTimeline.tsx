import { Check, Clock3, XCircle } from 'lucide-react';
import type { TrackingEvent } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { TrackingPhase } from '@/lib/order-lifecycle';

/**
 * Status timeline. Completed steps come from the order and delivery services;
 * the active step is the resolved tracking phase. Future timestamps are
 * labelled as estimates rather than presented as facts.
 */
export function TrackingTimeline({
  events,
  currentStatus,
  lastUpdated,
}: {
  events: TrackingEvent[];
  currentStatus: TrackingPhase;
  lastUpdated: string;
}) {
  const isDelivered = currentStatus === 'DELIVERED' || currentStatus === 'COMPLETED';
  const activeIndex = events.findIndex((event) => event.status === currentStatus);
  const fallbackIndex = events.reduce((last, event, index) => (event.completed ? index : last), -1);
  const highlightIndex = activeIndex >= 0 ? activeIndex : fallbackIndex;

  return (
    <section
      aria-labelledby="timeline-heading"
      className="overflow-hidden rounded-panel border border-olive-900/10 bg-cream shadow-[0_1px_0_rgba(73,56,46,0.03)]"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-olive-900/8 px-5 py-5 sm:px-6">
        <div>
          <p className="eyebrow text-terracotta-600">Every step</p>
          <h2 id="timeline-heading" className="mt-2.5 text-[1.5rem] leading-tight">
            The journey so far
          </h2>
        </div>
        <div className="text-right">
          <Badge tone="outline">Demo events</Badge>
          <p className="mt-2 text-[0.625rem] text-olive-500">Updated {formatTime(lastUpdated)}</p>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-6">
        {currentStatus === 'CANCELLED' ? (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-[0.8125rem] text-danger">
            <XCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>This order was cancelled. The timeline shows the stages it reached before cancellation.</p>
          </div>
        ) : null}

        {currentStatus === 'INCONSISTENT' ? (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-[0.8125rem] text-danger">
            <XCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              The order and delivery records disagree. The timeline is shown as recorded, without treating either
              state as a successful completion.
            </p>
          </div>
        ) : null}

        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute left-[0.9375rem] top-3 h-[calc(100%-2.5rem)] w-px bg-gradient-to-b from-olive-700/30 via-olive-900/12 to-olive-900/8"
          />

          <ol>
            {events.map((event, index) => {
            const isCurrent = index === highlightIndex && !isDelivered;
            const isComplete = event.completed;
            const isFuture = !isComplete && index > highlightIndex;

            return (
              <li key={`${event.status}-${index}`} className="relative flex gap-4 pb-7 last:pb-0">
                <span
                  className={cn(
                    'relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                    isComplete
                      ? 'border-olive-700 bg-olive-700 text-cream'
                      : isCurrent
                        ? 'border-gold-400 bg-gold-100 text-gold-700'
                        : 'border-olive-900/15 bg-ivory text-olive-300',
                  )}
                >
                  {isComplete ? (
                    <Check aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          'text-[0.875rem] font-medium',
                          isFuture ? 'text-olive-500' : 'text-olive-900',
                        )}
                      >
                        {event.label}
                      </p>
                      {isCurrent ? <Badge tone="gold">Now</Badge> : null}
                      {isDelivered && event.status === 'DELIVERED' ? (
                        <Badge tone="success">Complete</Badge>
                      ) : null}
                    </div>
                    {event.timestamp ? (
                      <time
                        dateTime={event.timestamp}
                        className={cn(
                          'shrink-0 text-[0.6875rem]',
                          isFuture ? 'text-olive-500' : 'text-olive-500',
                        )}
                      >
                        {isFuture ? 'Est. ' : ''}
                        {formatTime(event.timestamp)}
                      </time>
                    ) : null}
                  </div>
                  <p className={cn('mt-1 text-[0.8125rem] leading-relaxed', isFuture ? 'text-olive-500' : 'text-olive-500')}>
                    {event.description}
                  </p>
                </div>
              </li>
            );
          })}
          </ol>
        </div>

        <p className="mt-6 border-t border-olive-900/8 pt-4 text-[0.6875rem] leading-relaxed text-olive-500">
          Timestamps come from the demo order service. Future times are estimates, not promises.
        </p>
      </div>
    </section>
  );
}
