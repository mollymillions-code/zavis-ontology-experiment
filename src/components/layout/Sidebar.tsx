'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calculator,
  TrendingUp,
  LineChart,
  FlaskConical,
  DollarSign,
  Wallet,
  Target,
  Handshake,
  Network,
  FileText,
  CreditCard,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Clients', icon: Users },
  { href: '/costs', label: 'Costs', icon: Wallet },
  { href: '/receivables', label: 'Receivables', icon: Calculator },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/goals', label: 'Sales Goals', icon: Target },
  { href: '/partners', label: 'Partners', icon: Handshake },
  { href: '/trends', label: 'Trends', icon: TrendingUp },
  { href: '/economics', label: 'Unit Economics', icon: DollarSign },
  { href: '/projections', label: 'Projections', icon: LineChart },
  { href: '/lab', label: 'Pricing Lab', icon: FlaskConical },
  { href: '/ontology', label: 'Ontology', icon: Network },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-56 flex flex-col z-40"
      style={{ background: '#1a1a1a', color: '#999' }}
    >
      {/* Brand */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <span
            className="px-3 py-1.5 text-sm tracking-widest"
            style={{
              background: '#00c853',
              color: '#1a1a1a',
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            ZAVIS
          </span>
        </div>
        <p
          className="mt-2 text-xs"
          style={{ color: '#666', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
        >
          Financial Platform
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                color: isActive ? '#ffffff' : '#999999',
                background: isActive ? 'rgba(0, 200, 83, 0.12)' : 'transparent',
                borderLeft: isActive ? '3px solid #00c853' : '3px solid transparent',
              }}
            >
              <item.icon className="w-4 h-4 shrink-0" style={{ color: isActive ? '#00c853' : '#666' }} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p
          className="text-xs"
          style={{ color: '#666', fontFamily: "'Space Mono', monospace", fontSize: 11 }}
        >
          v3.0 &middot; Internal
        </p>
      </div>
    </aside>
  );
}
