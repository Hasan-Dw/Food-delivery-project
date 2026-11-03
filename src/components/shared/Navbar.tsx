import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { primaryNav } from '@/config/navigation';
import { ROUTES } from '@/config/routes';
import { Logo } from '@/components/ui/Logo';
import { CartButton } from './CartButton';
import { AccountMenu } from './AccountMenu';
import { LocationMenu } from './LocationMenu';
import { MobileMenu } from './MobileMenu';
import { cn } from '@/lib/cn';

/**
 * Savora navigation. Sticky, quiet and always secondary to food discovery.
 * Anchor links resolve on the homepage; ScrollToTop handles cross-page hashes.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300',
          scrolled
            ? 'border-olive-900/10 bg-ivory/92 shadow-[0_10px_30px_-24px_rgba(73,56,46,0.45)] backdrop-blur-md'
            : 'border-transparent bg-ivory/80 backdrop-blur-sm',
        )}
      >
        <div className="shell flex h-[4.75rem] items-center justify-between gap-4">
          <div className="flex items-center gap-8 xl:gap-12">
            <Link to={ROUTES.home} aria-label="Savora home" className="shrink-0">
              <Logo />
            </Link>

            <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
              {primaryNav.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="group relative text-[0.8125rem] font-medium text-olive-600 transition-colors hover:text-olive-900"
                >
                  {item.label}
                  <span className="absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-terracotta transition-transform duration-300 ease-out-soft group-hover:scale-x-100" />
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <div className="hidden xl:block">
              <LocationMenu compact />
            </div>

            <Link
              to="/#search"
              aria-label="Search restaurants and dishes"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-olive-600 transition hover:bg-olive-900/5 hover:text-olive-900 sm:inline-flex"
            >
              <Search aria-hidden="true" className="h-[1.15rem] w-[1.15rem]" />
            </Link>

            <div className="hidden sm:block">
              <AccountMenu />
            </div>

            <CartButton />

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="ml-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-olive-900/12 bg-cream/70 text-olive-800 transition hover:border-olive-900/25 hover:bg-cream lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <Menu aria-hidden="true" className="h-[1.15rem] w-[1.15rem]" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
