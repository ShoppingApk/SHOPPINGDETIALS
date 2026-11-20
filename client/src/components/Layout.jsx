import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import Footer from './Footer';
import Spinner from './Spinner';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search]);
  return null;
}

// Renders nested routes via <Outlet />, or `children` when used directly.
export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4" tabIndex={-1}>
        {/* Pages are lazy-loaded; the header and nav stay visible while a page loads. */}
        <Suspense fallback={<Spinner className="py-24" />}>
          {children ?? <Outlet />}
        </Suspense>
      </main>
      <div className="pb-safe-nav">
        <Footer />
      </div>
      <BottomNav />
    </div>
  );
}
