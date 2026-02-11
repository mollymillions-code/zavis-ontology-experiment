interface PageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function PageShell({ title, subtitle, children, actions }: PageShellProps) {
  return (
    <div className="ml-56 min-h-screen" style={{ background: '#f5f0e8' }}>
      <header
        className="sticky top-0 z-30 px-8 py-5"
        style={{
          background: '#1a1a1a',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: '#ffffff',
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className="mt-1"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: '#999999',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </header>
      <main className="px-8 py-6">{children}</main>
    </div>
  );
}
