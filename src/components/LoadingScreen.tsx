/**
 * LoadingScreen — full-page branded loading state (Momentum).
 * Shown while auth/team/task data is loading instead of a blank page.
 */
import React from 'react';
import { T } from '../utils/styles';

export default function LoadingScreen({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div
      data-testid="loading-screen"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        fontFamily: T.font,
        zIndex: 400,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: T.accentGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 26px -8px rgba(107,76,230,.5)',
          animation: 'tsLogoPulse 1.6s ease-in-out infinite',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.textFaint, fontSize: 13, fontWeight: 500 }}>
        <div
          style={{
            width: 14,
            height: 14,
            border: `2px solid ${T.borderCard}`,
            borderTopColor: T.accent,
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }}
        />
        {label}
      </div>
    </div>
  );
}
