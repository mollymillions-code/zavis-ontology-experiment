import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#00c853',
        }}
      >
        <span
          style={{
            fontSize: 140,
            fontWeight: 900,
            color: '#1a1a1a',
            fontFamily: 'monospace',
            letterSpacing: -4,
          }}
        >
          Z
        </span>
      </div>
    ),
    { ...size }
  );
}
