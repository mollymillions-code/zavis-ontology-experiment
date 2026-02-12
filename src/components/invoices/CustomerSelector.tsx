'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import type { Client } from '@/lib/models/platform-types';

interface CustomerSelectorProps {
  clients: Client[];
  selectedClientId: string | null;
  onSelect: (client: Client) => void;
  onClear: () => void;
}

export default function CustomerSelector({
  clients,
  selectedClientId,
  onSelect,
  onClear,
}: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const filtered = clients
    .filter((c) => c.status === 'active')
    .filter((c) =>
      search === '' || c.name.toLowerCase().includes(search.toLowerCase())
    );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 600,
        color: '#666',
        fontFamily: "'DM Sans', sans-serif",
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}>
        Customer
      </label>

      {selectedClient ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #00c853',
            background: '#f0faf0',
            cursor: 'pointer',
          }}
          onClick={() => setOpen(!open)}
        >
          <div>
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#1a1a1a',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {selectedClient.name}
            </span>
            {selectedClient.email && (
              <span style={{
                fontSize: 11,
                color: '#666',
                fontFamily: "'DM Sans', sans-serif",
                marginLeft: 8,
              }}>
                {selectedClient.email}
              </span>
            )}
            {selectedClient.billingCycle && (
              <span style={{
                fontSize: 10,
                color: '#999',
                fontFamily: "'Space Mono', monospace",
                marginLeft: 8,
              }}>
                {selectedClient.billingCycle}
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#999',
              padding: 2,
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #e0dbd2',
            background: '#ffffff',
            cursor: 'pointer',
            fontSize: 13,
            color: '#999',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Select a customer...
          <ChevronDown size={14} />
        </button>
      )}

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          background: '#ffffff',
          border: '1px solid #e0dbd2',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100,
          maxHeight: 300,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid #e0dbd2',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Search size={14} style={{ color: '#999' }} />
            <input
              autoFocus
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: 12,
                fontFamily: "'DM Sans', sans-serif",
                flex: 1,
                background: 'transparent',
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 240 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
                  No clients found
                </span>
              </div>
            ) : (
              filtered.map((client) => (
                <button
                  key={client.id}
                  onClick={() => {
                    onSelect(client);
                    setOpen(false);
                    setSearch('');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '10px 12px',
                    border: 'none',
                    background: client.id === selectedClientId ? '#f0faf0' : 'transparent',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0ebe3',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#faf8f4')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = client.id === selectedClientId ? '#f0faf0' : 'transparent')}
                >
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {client.name}
                  </span>
                  <span style={{
                    fontSize: 10,
                    color: '#999',
                    fontFamily: "'DM Sans', sans-serif",
                    marginTop: 2,
                  }}>
                    {[
                      client.email,
                      client.billingCycle,
                      client.plan,
                    ].filter(Boolean).join(' · ') || 'No details'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
