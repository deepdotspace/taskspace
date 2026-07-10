/**
 * Terms of Service — public static page, linked from the landing footer.
 * Restyled to the "Momentum" design system (Geist type, violet accent).
 */

import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { SiteFooter } from './index'
import { T } from '../utils/styles'
import { useIsMobile } from '../hooks'

const SECTIONS: Array<{ title: string; body: string }> = [
  {
    title: '1. The service',
    body: 'Taskspace is a real-time collaborative task manager operated by DeepSpace. By creating an account or using the service you agree to these terms.',
  },
  {
    title: '2. Your account',
    body: 'You are responsible for activity under your account and for keeping your sign-in method secure. You must provide accurate information and be legally able to enter this agreement.',
  },
  {
    title: '3. Your content',
    body: 'Tasks, projects, and messages you create remain yours. You grant DeepSpace the limited rights needed to store, sync, and display that content to you and the teammates you share it with. Do not upload content that is unlawful or infringes the rights of others.',
  },
  {
    title: '4. Teams',
    body: 'Content created inside a team is visible to that team’s members. Team admins can manage membership and remove content. Leaving or being removed from a team ends your access to its content.',
  },
  {
    title: '5. Acceptable use',
    body: 'Do not misuse the service: no attempts to disrupt or gain unauthorized access to it, no abuse of other users, and no use that violates applicable law.',
  },
  {
    title: '6. Availability and changes',
    body: 'The service is provided on an as-is basis without warranties. We may change, suspend, or discontinue features, and we may update these terms; continued use after an update constitutes acceptance.',
  },
  {
    title: '7. Liability',
    body: 'To the maximum extent permitted by law, DeepSpace is not liable for indirect, incidental, or consequential damages arising from your use of the service.',
  },
  {
    title: '8. Contact',
    body: 'Questions about these terms: contact@deep.space.',
  },
]

export default function Terms() {
  const isMobile = useIsMobile()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fff',
        color: T.textPrimary,
        fontFamily: T.font,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          padding: isMobile ? '16px 20px' : '18px 40px',
          borderBottom: `1px solid ${T.borderTabs}`,
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: T.accentGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-hidden
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: T.textPrimary }}>Taskspace</span>
        </Link>
        <Link
          to="/"
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontWeight: 500,
            color: T.textMuted,
            textDecoration: 'none',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = T.textPrimary)}
          onMouseLeave={(e) => (e.currentTarget.style.color = T.textMuted)}
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Back to home
        </Link>
      </header>

      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: isMobile ? '40px 20px' : '56px 40px' }}>
          <h1 style={{ fontSize: isMobile ? 32 : 40, fontWeight: 750, letterSpacing: '-0.03em', color: T.textPrimary, margin: 0 }}>
            Terms of Service
          </h1>
          <p style={{ marginTop: 10, fontSize: 13, color: T.textFaint }}>Last updated: July 2026</p>

          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 30 }}>
            {SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 style={{ fontSize: 16, fontWeight: 650, color: T.textPrimary, margin: 0 }}>{s.title}</h2>
                <p style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.65, color: T.textMuted }}>
                  {s.body.includes('contact@deep.space') ? (
                    <>
                      Questions about these terms:{' '}
                      <a href="mailto:contact@deep.space" style={{ color: T.accent, textDecoration: 'none', fontWeight: 500 }}>
                        contact@deep.space
                      </a>
                      .
                    </>
                  ) : (
                    s.body
                  )}
                </p>
              </section>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
