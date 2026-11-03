import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePrefersReducedMotion } from './useMediaQuery';

gsap.registerPlugin(ScrollTrigger);

/**
 * Entrance + parallax for the hero, built with GSAP and ScrollTrigger.
 * Returns a ref for the section root. When reduced motion is requested the
 * content is left completely static — nothing is hidden waiting for animation.
 */
export function useHeroAnimation<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root || reducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.from('[data-hero-reveal]', {
        y: 26,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.08,
        delay: 0.1,
      });

      gsap.from('[data-hero-image]', {
        clipPath: 'inset(12% 0% 0% 0% round 14rem 14rem 1.25rem 1.25rem)',
        scale: 1.04,
        opacity: 0,
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.15,
      });

      gsap.from('[data-hero-chip]', {
        y: 18,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.1,
        delay: 0.75,
      });

      if (window.matchMedia('(min-width: 1024px)').matches) {
        gsap.to('[data-hero-image]', {
          yPercent: 6,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
          },
        });
      }
    }, root);

    return () => ctx.revert();
  }, [reducedMotion]);

  return ref;
}

/** Subtle parallax for editorial imagery. */
export function useParallax<T extends HTMLElement>(strength = 10) {
  const ref = useRef<T | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion || !window.matchMedia('(min-width: 768px)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        element,
        { yPercent: -strength / 2 },
        {
          yPercent: strength / 2,
          ease: 'none',
          scrollTrigger: {
            trigger: element,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        },
      );
    }, element);

    return () => ctx.revert();
  }, [reducedMotion, strength]);

  return ref;
}
