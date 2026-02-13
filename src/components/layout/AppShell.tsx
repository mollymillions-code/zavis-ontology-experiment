'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import DbHydrator from '../DbHydrator';

const AUTH_PATHS = ['/login', '/signup'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <DbHydrator />
      <Sidebar />
      {children}
    </>
  );
}
