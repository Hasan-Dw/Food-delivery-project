import { Outlet } from 'react-router-dom';
import { AnnouncementBar } from '@/components/shared/AnnouncementBar';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { SearchDialog } from '@/features/search/components/SearchDialog';

/** Public marketplace shell: announcement, sticky navigation, footer. */
export function CustomerLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only rounded-full bg-olive-700 px-4 py-3 text-sm font-medium text-cream focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[90]"
      >
        Skip to content
      </a>

      <AnnouncementBar />
      <Navbar />
      <SearchDialog />

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
