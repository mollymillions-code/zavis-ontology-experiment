interface PageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function PageShell({ title, subtitle, children, actions }: PageShellProps) {
  return (
    <div className="ml-0 md:ml-56 min-h-screen" style={{ background: '#f5f0e8' }}>
      <header
        className="sticky top-0 z-30 px-4 py-4 md:px-8 md:py-5"
        style={{
          background: '#1a1a1a',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="pl-12 md:pl-0">
            <h1
              className="text-base md:text-xl"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className="mt-1 text-xs md:text-sm"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#999999',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 md:gap-3">{actions}</div>}
        </div>
      </header>
      <main className="px-4 py-4 md:px-8 md:py-6">{children}</main>
    </div>
  );
}
