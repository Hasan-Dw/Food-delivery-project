import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore, type Toast, type ToastTone } from '@/stores/toast-store';
import { cn } from '@/lib/cn';

const toneStyles: Record<ToastTone, string> = {
  success: 'bg-olive-800 text-cream',
  error: 'bg-[#5A2A24] text-cream',
  info: 'bg-brown-700 text-cream',
};

const icons: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const Icon = icons[toast.tone];

  useEffect(() => {
    const timeout = window.setTimeout(() => dismiss(toast.id), 4600);
    return () => window.clearTimeout(timeout);
  }, [dismiss, toast.id]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full animate-fade-up items-start gap-3 rounded-2xl px-4 py-3.5 shadow-lift',
        toneStyles[toast.tone],
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gold-200" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-semibold leading-snug">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-cream/70">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="-mr-1 -mt-0.5 rounded-full p-1 text-cream/60 transition hover:bg-cream/10 hover:text-cream focus-visible:outline-cream"
        aria-label="Dismiss notification"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col gap-2.5 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[22rem]"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  );
}
