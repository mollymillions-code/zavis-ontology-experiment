import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import DbHydrator from '@/components/DbHydrator';

export const metadata: Metadata = {
  title: 'Zavis Pricing Optimizer',
  description: 'Internal pricing strategy optimization tool for Zavis',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ background: '#f5f0e8' }}>
        <DbHydrator />
        <Sidebar />
        {children}
      </body>
    </html>
  );
}
