'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import DbHydrator from '../DbHydrator';
import { Menu } from 'lucide-react';

const AUTH_PATHS = ['/login', '/signup'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.includes(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <DbHydrator />
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden flex items-center justify-center w-10 h-10 rounded-lg"
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#ffffff',
        }}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      {children}
    </>
  );
}
