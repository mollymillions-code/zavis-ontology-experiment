import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'Zavis',
    template: '%s | Zavis',
  },
  description: 'Financial intelligence platform — clients, contracts, invoicing & revenue analytics.',
  metadataBase: new URL('https://zavis-ontology-experiment.vercel.app'),
  openGraph: {
    title: 'Zavis',
    description: 'Financial intelligence platform — clients, contracts, invoicing & revenue analytics.',
    siteName: 'Zavis',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zavis',
    description: 'Financial intelligence platform — clients, contracts, invoicing & revenue analytics.',
  },
  other: {
    'theme-color': '#1a1a1a',
    'apple-mobile-web-app-title': 'Zavis',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black',
  },
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
