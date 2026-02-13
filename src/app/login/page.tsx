'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f0e8',
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 28,
            fontWeight: 700,
            color: '#1a1a1a',
            letterSpacing: -0.5,
          }}>
            zavis<span style={{ color: '#00c853' }}>.</span>
          </h1>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: '#999',
            marginTop: 4,
          }}>
            Financial Platform
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{
          background: '#ffffff',
          border: '1px solid #e0dbd2',
          borderRadius: 12,
          padding: '32px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <h2 style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: '#1a1a1a',
            marginBottom: 24,
          }}>
            Sign in
          </h2>

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 6,
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@savage.ai"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #e0dbd2',
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                color: '#1a1a1a',
                background: '#faf8f4',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 6,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #e0dbd2',
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                color: '#1a1a1a',
                background: '#faf8f4',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: 8,
              border: 'none',
              background: loading ? '#999' : '#1a1a1a',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <p style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 12,
            color: '#999',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: '#00a844', fontWeight: 600, textDecoration: 'none' }}>
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
