/** Scroll to an in-page anchor without hijacking the user's scroll. */
export function scrollToSection(id: string, behavior: ScrollBehavior = 'smooth'): void {
  const target = document.getElementById(id);
  if (!target) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: prefersReduced ? 'auto' : behavior, block: 'start' });
}
