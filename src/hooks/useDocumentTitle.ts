import { useEffect } from 'react';
import { site } from '@/config/site';

/** Sets a descriptive document title per page. */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${site.name}` : `${site.name} — ${site.tagline}`;
    return () => {
      document.title = `${site.name} — ${site.tagline}`;
    };
  }, [title]);
}
