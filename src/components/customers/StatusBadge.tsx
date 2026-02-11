import { ClientStatus } from '@/lib/models/platform-types';

const STATUS_CONFIG: Record<ClientStatus, { bg: string; color: string; label: string }> = {
  active: { bg: '#e8fbe8', color: '#00a844', label: 'Active' },
  inactive: { bg: '#ffebee', color: '#ff3d00', label: 'Inactive' },
};

export default function StatusBadge({ status }: { status: ClientStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      style={{
        padding: '3px 10px',
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        background: config.bg,
        color: config.color,
        letterSpacing: 0.5,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {config.label}
    </span>
  );
}
