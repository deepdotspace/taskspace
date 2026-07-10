/**
 * Landing page — what a signed-out visitor sees at `/`.
 * Signed-in users are redirected straight to the workspace.
 *
 * Design direction: "Momentum" (1b) — the calm, feature-forward violet
 * system shared with the app. White page, Geist type, a static faux-board
 * product mock, a three-up feature trio, and a quiet footer.
 *
 * Auth/entry mechanism is unchanged from the previous landing: `useAuth()`
 * gates the page (signed-in visitors are redirected to `/home`) and every
 * app-entry control calls `navigate('/home')`, which triggers the existing
 * sign-in flow.
 */

import { Navigate, useNavigate } from 'react-router-dom'
import { Columns3, ListChecks, Users } from 'lucide-react'
import { useAuth } from 'deepspace'
import { T } from '../utils/styles'
import { useIsMobile } from '../hooks'

const REPO_URL = 'https://github.com/deepdotspace/taskspace'
const X_URL = 'https://x.com/deepdotspace'

// ── Brand glyphs (inline SVG) ────────────────────────────────────────────────

function LogoGlyph({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: T.accentGradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-hidden
    >
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    </div>
  )
}

function GitHubGlyph({ size = 17, fill = '#2C2E38' }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} aria-hidden>
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  )
}

function XGlyph({ size = 16, fill = T.textFaint }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} aria-hidden>
      <path d="M18.9 1.2h3.7l-8 9.1L24 22.8h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9zM17.6 20.6h2L6.5 3.3H4.3z" />
    </svg>
  )
}

// ── Nav ──────────────────────────────────────────────────────────────────────

function LandingNav({ isSignedIn }: { isSignedIn: boolean }) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const enterApp = () => navigate('/home')
  const scrollToFeatures = () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })

  const navLink: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 500,
    color: T.textMuted,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: T.font,
    padding: 0,
    transition: 'color 0.15s ease',
  }

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 16 : 32,
        padding: isMobile ? '16px 20px' : '18px 40px',
        borderBottom: `1px solid ${T.borderTabs}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <LogoGlyph size={28} />
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: T.textPrimary }}>Taskspace</span>
      </div>

      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <button
            style={navLink}
            onClick={scrollToFeatures}
            onMouseEnter={(e) => (e.currentTarget.style.color = T.textPrimary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.textMuted)}
          >
            Features
          </button>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={navLink}
            onMouseEnter={(e) => (e.currentTarget.style.color = T.textPrimary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.textMuted)}
          >
            GitHub
          </a>
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        {!isMobile && (
          <button
            style={navLink}
            onClick={enterApp}
            onMouseEnter={(e) => (e.currentTarget.style.color = T.textPrimary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.textMuted)}
          >
            Sign in
          </button>
        )}
        <button
          onClick={enterApp}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: T.accent,
            color: '#fff',
            borderRadius: 9,
            fontFamily: T.font,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: T.shadowBtnGlow,
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.92')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          {isSignedIn ? 'Open Taskspace' : 'Get started free'}
        </button>
      </div>
    </nav>
  )
}

// ── Product mock (static faux board) ─────────────────────────────────────────

function SkeletonBar({ width, color = '#ECEDF3', height = 8 }: { width: number | string; color?: string; height?: number }) {
  return <div style={{ width, height, borderRadius: 4, background: color }} />
}

function MockCard({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${T.borderCard}`,
        borderRadius: 8,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function MockColumn({
  dotColor,
  labelWidth,
  children,
}: {
  dotColor: string
  labelWidth: number | string
  children: React.ReactNode
}) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: T.bgTertiary, borderRadius: 10, padding: '10px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 2px 10px' }}>
        <span style={{ width: 9, height: 9, borderRadius: 3, background: dotColor, flexShrink: 0 }} />
        <SkeletonBar width={labelWidth} color="#E1E3EC" height={7} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
    </div>
  )
}

function ProductMock({ isMobile }: { isMobile: boolean }) {
  return (
    <div
      style={{
        maxWidth: 1040,
        margin: `${isMobile ? 40 : 56}px auto 0`,
        borderRadius: '16px 16px 0 0',
        border: `1px solid ${T.borderCard}`,
        borderBottom: 'none',
        overflow: 'hidden',
        boxShadow: '0 30px 80px -20px rgba(107,76,230,.25)',
        background: '#fff',
      }}
    >
      {/* browser chrome */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '11px 16px',
          borderBottom: `1px solid ${T.borderRowLight}`,
          background: T.bgSecondary,
        }}
      >
        {['#ECEDF3', '#ECEDF3', '#ECEDF3'].map((c, i) => (
          <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
        ))}
        <span
          style={{
            margin: '0 auto',
            fontFamily: T.mono,
            fontSize: 11,
            color: T.textFaint,
            background: T.bgTertiary,
            padding: '3px 40px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
          }}
        >
          taskspace.app.space
        </span>
      </div>

      {/* board */}
      <div style={{ display: 'flex', height: isMobile ? 240 : 310 }}>
        {/* sidebar rail */}
        {!isMobile && (
          <div
            style={{
              width: 168,
              flexShrink: 0,
              background: T.bgSecondary,
              borderRight: `1px solid ${T.border}`,
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 18, height: 18, borderRadius: 6, background: T.accentGradient, flexShrink: 0 }} />
              <SkeletonBar width={72} color="#E1E3EC" />
            </div>
            <SkeletonBar width="90%" color="#F0ECFE" height={22} />
            <SkeletonBar width="70%" />
            <SkeletonBar width="80%" />
            <SkeletonBar width="60%" />
            <SkeletonBar width="75%" />
          </div>
        )}

        {/* columns */}
        <div style={{ flex: 1, minWidth: 0, padding: isMobile ? '14px 12px' : '16px 20px', display: 'flex', gap: isMobile ? 8 : 12 }}>
          <MockColumn dotColor={T.gray} labelWidth={44}>
            <MockCard>
              <SkeletonBar width="80%" />
              <SkeletonBar width="55%" />
            </MockCard>
            <MockCard>
              <SkeletonBar width="65%" />
            </MockCard>
          </MockColumn>

          <MockColumn dotColor={T.blue} labelWidth={50}>
            {/* raised "Ready" top card */}
            <MockCard
              style={{
                border: '1px solid #E0DCF5',
                boxShadow: T.shadowCardRaised,
              }}
            >
              <SkeletonBar width="85%" />
              <SkeletonBar width="60%" />
              <div style={{ height: 4, borderRadius: 3, background: '#EEEEF3', overflow: 'hidden', marginTop: 2 }}>
                <div style={{ width: '62%', height: '100%', background: T.progressGradient }} />
              </div>
            </MockCard>
            <MockCard>
              <SkeletonBar width="70%" />
            </MockCard>
          </MockColumn>

          <MockColumn dotColor={T.accent} labelWidth={40}>
            <MockCard>
              <SkeletonBar width="75%" />
            </MockCard>
            <MockCard>
              <SkeletonBar width="85%" />
              <SkeletonBar width="50%" />
            </MockCard>
          </MockColumn>

          <MockColumn dotColor={T.green} labelWidth={36}>
            <MockCard style={{ opacity: 0.6 }}>
              <SkeletonBar width="70%" />
            </MockCard>
            <MockCard style={{ opacity: 0.6 }}>
              <SkeletonBar width="55%" />
            </MockCard>
          </MockColumn>
        </div>
      </div>
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ isSignedIn }: { isSignedIn: boolean }) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const enterApp = () => navigate('/home')

  return (
    <section style={{ padding: isMobile ? '48px 20px 40px' : '76px 40px 56px', textAlign: 'center' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          border: `1px solid ${T.borderCard}`,
          borderRadius: 20,
          fontSize: 11.5,
          fontWeight: 600,
          color: T.textMuted,
          marginBottom: 26,
          background: '#fff',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.green }} />
        Open source · Built on DeepSpace
      </div>

      <h1
        style={{
          fontSize: isMobile ? 34 : 52,
          fontWeight: 750,
          letterSpacing: '-0.035em',
          lineHeight: 1.05,
          margin: '0 auto 20px',
          color: T.textPrimary,
          maxWidth: 680,
        }}
      >
        The calm task manager
        <br />
        your team will actually use
      </h1>

      <p
        style={{
          fontSize: isMobile ? 16 : 18,
          lineHeight: 1.6,
          color: '#5A5D75',
          margin: '0 auto 32px',
          maxWidth: 540,
        }}
      >
        Real-time tasks for your whole team — lists, boards, and projects in one calm, shared space.
        No clutter, no busywork, just the work that matters today.
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <button
          onClick={enterApp}
          style={{
            padding: '12px 22px',
            border: 'none',
            background: T.accent,
            color: '#fff',
            borderRadius: 11,
            fontFamily: T.font,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: T.shadowHeroGlow,
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          {isSignedIn ? 'Open Taskspace' : 'Get started free'}
        </button>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 22px',
            border: `1px solid ${T.borderCard}`,
            background: '#fff',
            color: '#2C2E38',
            borderRadius: 11,
            fontFamily: T.font,
            fontSize: 15,
            fontWeight: 550,
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'border-color 0.15s ease, background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = T.checkboxBorder
            e.currentTarget.style.background = T.bgSecondary
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.borderCard
            e.currentTarget.style.background = '#fff'
          }}
        >
          <GitHubGlyph size={17} />
          Star on GitHub
        </a>
      </div>

      <ProductMock isMobile={isMobile} />
    </section>
  )
}

// ── Feature trio ─────────────────────────────────────────────────────────────

const FEATURES: Array<{
  icon: typeof Columns3
  tint: string
  iconColor: string
  title: string
  body: string
}> = [
  {
    icon: Columns3,
    tint: T.accentTint,
    iconColor: T.accent,
    title: 'List, Board & Calendar',
    body: 'See every project as a list, a board, or a calendar. Switch views in a click — same tasks, seen the way that fits the moment.',
  },
  {
    icon: ListChecks,
    tint: T.blueSoft,
    iconColor: T.blue,
    title: 'Priorities & subtasks',
    body: 'Break big work into subtasks, flag what matters, and watch progress fill in as your team checks things off.',
  },
  {
    icon: Users,
    tint: T.greenSoft,
    iconColor: T.green,
    title: 'Real-time teamwork',
    body: 'Assign, comment, and reorder together. Every change lands on your teammates’ screens the instant you make it.',
  },
]

function Features() {
  const isMobile = useIsMobile()
  return (
    <section
      id="features"
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 18,
        padding: isMobile ? '8px 20px 48px' : '8px 40px 56px',
        maxWidth: 1120,
        margin: '0 auto',
      }}
    >
      {FEATURES.map((f) => {
        const Icon = f.icon
        return (
          <div
            key={f.title}
            style={{
              flex: 1,
              background: T.bgSecondary,
              border: `1px solid ${T.borderTabs}`,
              borderRadius: 14,
              padding: 22,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: f.tint,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Icon size={20} color={f.iconColor} strokeWidth={2} />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 650, margin: '0 0 6px', color: T.textPrimary }}>{f.title}</h4>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: T.textMuted, margin: 0 }}>{f.body}</p>
          </div>
        )
      })}
    </section>
  )
}

// ── Footer ───────────────────────────────────────────────────────────────────

export function SiteFooter() {
  const isMobile = useIsMobile()

  const footLink: React.CSSProperties = {
    fontSize: 12.5,
    color: T.textFaint,
    textDecoration: 'none',
    fontFamily: T.font,
    transition: 'color 0.15s ease',
  }
  const hoverIn = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = T.textMuted)
  const hoverOut = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = T.textFaint)

  return (
    <footer
      style={{
        borderTop: `1px solid ${T.borderTabs}`,
        padding: isMobile ? '22px 20px' : '28px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        flexWrap: 'wrap',
        background: T.bgSecondary,
      }}
    >
      <span style={{ fontSize: 12.5, color: T.textFaint }}>© DeepSpace 2026</span>
      <a href="mailto:contact@deep.space" style={footLink} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
        Contact
      </a>
      <a href="/terms" style={footLink} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
        Terms
      </a>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <a
          href={X_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow on X"
          style={{ display: 'inline-flex', color: T.textFaint }}
          onMouseEnter={(e) => {
            const svg = e.currentTarget.querySelector('svg')
            if (svg) svg.setAttribute('fill', T.textMuted)
          }}
          onMouseLeave={(e) => {
            const svg = e.currentTarget.querySelector('svg')
            if (svg) svg.setAttribute('fill', T.textFaint)
          }}
        >
          <XGlyph size={16} />
        </a>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          style={{ display: 'inline-flex', color: T.textFaint }}
          onMouseEnter={(e) => {
            const svg = e.currentTarget.querySelector('svg')
            if (svg) svg.setAttribute('fill', T.textMuted)
          }}
          onMouseLeave={(e) => {
            const svg = e.currentTarget.querySelector('svg')
            if (svg) svg.setAttribute('fill', T.textFaint)
          }}
        >
          <GitHubGlyph size={16} fill={T.textFaint} />
        </a>
      </div>
    </footer>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth()

  // Signed-in users skip the marketing page entirely (unchanged behavior).
  if (isLoaded && isSignedIn) return <Navigate to="/home" replace />

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fff',
        color: T.textPrimary,
        fontFamily: T.font,
        overflowX: 'hidden',
      }}
    >
      <LandingNav isSignedIn={isSignedIn} />
      <Hero isSignedIn={isSignedIn} />
      <Features />
      <SiteFooter />
    </div>
  )
}
