import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
