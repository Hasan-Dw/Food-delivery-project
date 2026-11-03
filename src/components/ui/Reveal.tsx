import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Distance in pixels the content travels. Keep small for calm motion. */
  distance?: number;
}

/**
 * Gentle on-scroll reveal. Content becomes visible as soon as it intersects;
 * nothing is pinned, delayed or made inaccessible. Reduced-motion users see
 * everything immediately.
 */
export function Reveal({ children, delay = 0, className, distance = 16 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      setVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-out-soft',
        visible ? 'translate-y-0 opacity-100' : 'opacity-0',
        className,
      )}
      style={{
        transitionDelay: visible ? `${delay}ms` : undefined,
        transform: visible || reducedMotion ? undefined : `translateY(${distance}px)`,
      }}
    >
      {children}
    </div>
  );
}
