import { ImageResponse } from 'next/og';

export const alt = 'Zavis — Financial Intelligence Platform';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a1a',
          position: 'relative',
        }}
      >
        {/* Brand mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              background: '#00c853',
            }}
          >
            <span
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: '#1a1a1a',
                fontFamily: 'monospace',
              }}
            >
              Z
            </span>
          </div>
          <span
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: '#ffffff',
              fontFamily: 'monospace',
              letterSpacing: 8,
            }}
          >
            ZAVIS
          </span>
        </div>
        {/* Tagline */}
        <span
          style={{
            fontSize: 28,
            color: '#999999',
            fontFamily: 'sans-serif',
            fontWeight: 500,
            letterSpacing: 2,
          }}
        >
          Financial Intelligence Platform
        </span>
        {/* Bottom accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: '#00c853',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
