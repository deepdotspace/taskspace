/**
 * Landing page — what a signed-out visitor sees at `/`.
 * Signed-in users are redirected straight to the workspace.
 *
 * Design Direction
 *
 * Product: Taskspace — a real-time shared task list for small teams. Today,
 *   Upcoming, projects, tags, a kanban board, and an AI assistant, with every
 *   change landing on every teammate's screen live. Open it, type, done.
 * Emotion: the quiet of a Monday morning where you open one list and know
 *   exactly what today is. Calm control — not command-center adrenaline.
 * Metaphor: a shared paper day-planner lying open on the team's table.
 *   Everyone writes in it; everyone is looking at the same page.
 * References: Muji stationery (function as the whole aesthetic); a café
 *   order rail (tickets slide left to right, state readable at a glance);
 *   Dieter Rams' 606 shelving (modular, quiet, nothing extra).
 * Signature: a live task-list mockup in the hero that works itself once —
 *   a task checks off, a card slides to Done, two presence dots breathe —
 *   then sits still, like a teammate finishing an edit and looking up.
 * Hero: split screen. Left, "Team tasks. Zero clutter." at ~64px with one
 *   supporting sentence and the CTA. Right, the self-running mockup.
 *
 * Style Tile
 * - Color: white dominant, indigo primary (app token), warm gray muted.
 * - Type: the app's system sans for both; headings tracking-tight — the
 *   landing should feel like the product, not a costume in front of it.
 * - Theme: light — the product is light; the landing doesn't lie.
 * - Art direction: editorial rows, one product visual per claim.
 * - Motion: subtle; the mockup runs once on load, everything else is a
 *   fade-in on scroll. No loops, no marquees, no parallax.
 * - Voice: declarative; second person; max 12 words; no exclamation points.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { MotionConfig, motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, Sparkles, CalendarDays, Columns3, Users } from 'lucide-react'
import { useAuth } from 'deepspace'

// ── Shared bits ──────────────────────────────────────────────────────────────

function ScrollReveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.4, 0.25, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ── Nav ──────────────────────────────────────────────────────────────────────

function LandingNav() {
  const navigate = useNavigate()
  return (
    <header className="absolute top-0 inset-x-0 z-40">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight text-foreground">Taskspace</span>
        <div className="flex items-center gap-6">
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </button>
          <button
            onClick={() => navigate('/home')}
            className="inline-flex items-center px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.97] transition-transform"
          >
            Open Taskspace
          </button>
        </div>
      </div>
    </header>
  )
}

// ── Signature element: self-running product mockup ───────────────────────────

const MOCK_TASKS = [
  { title: 'Ship pricing page', project: 'Website', doneAtStep: 1 },
  { title: 'Review onboarding copy', project: 'Launch', doneAtStep: 2 },
  { title: 'Prep Monday standup', project: 'Team', doneAtStep: 0 },
]

function HeroMockup() {
  const reduce = useReducedMotion()
  // step 0 → idle, 1 → first task checks, 2 → second task checks + card slides
  const [step, setStep] = useState(reduce ? 2 : 0)
  useEffect(() => {
    if (reduce) return
    const t1 = setTimeout(() => setStep(1), 1100)
    const t2 = setTimeout(() => setStep(2), 2300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [reduce])

  return (
    <div className="relative">
      <div className="rounded-2xl bg-card border border-border shadow-[0_8px_40px_0_rgba(0,0,0,0.08)] overflow-hidden">
        {/* window chrome */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Today · Design team</span>
          {/* presence avatars */}
          <div className="flex -space-x-1.5">
            {['M', 'J'].map((initial, i) => (
              <motion.span
                key={initial}
                className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold grid place-items-center ring-2 ring-card"
                initial={reduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.25, type: 'spring', stiffness: 400, damping: 20 }}
              >
                {initial}
              </motion.span>
            ))}
          </div>
        </div>
        {/* task list */}
        <div className="p-4 space-y-1">
          {MOCK_TASKS.map((t) => {
            const done = t.doneAtStep > 0 && step >= t.doneAtStep
            return (
              <div key={t.title} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted">
                <span
                  className={
                    'w-[18px] h-[18px] shrink-0 rounded-full border grid place-items-center transition-colors duration-300 ' +
                    (done ? 'bg-primary border-primary text-primary-foreground' : 'border-border')
                  }
                >
                  {done && <Check className="w-3 h-3" strokeWidth={3} />}
                </span>
                <span className={'text-sm transition-colors duration-300 ' + (done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                  {t.title}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">{t.project}</span>
              </div>
            )
          })}
        </div>
        {/* mini board */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-4">
          {['To do', 'Doing', 'Done'].map((col) => (
            <div key={col} className="rounded-lg bg-muted p-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{col}</span>
              <div className="mt-1.5 space-y-1.5 min-h-[38px]">
                {col === 'To do' && <div className="h-7 rounded bg-card border border-border" />}
                {col === 'Doing' && step < 2 && (
                  <motion.div layoutId="moving-card" className="h-7 rounded bg-card border border-border" />
                )}
                {col === 'Done' && step >= 2 && (
                  <motion.div
                    layoutId="moving-card"
                    className="h-7 rounded bg-card border border-primary/40"
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* teammate edit toast */}
      <motion.div
        className="absolute -bottom-4 -left-3 sm:-left-6 flex items-center gap-2 rounded-full bg-card border border-border shadow-[0_2px_12px_0_rgba(0,0,0,0.08)] pl-1.5 pr-3 py-1.5"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 2.6, duration: 0.4 }}
      >
        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold grid place-items-center">M</span>
        <span className="text-xs text-muted-foreground">Mia moved a card to Done</span>
      </motion.div>
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const navigate = useNavigate()
  return (
    <section className="max-w-6xl mx-auto px-6 pt-32 pb-20 md:pt-40 md:pb-28 grid md:grid-cols-[1fr_1.05fr] gap-14 items-center">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-5xl md:text-6xl font-bold tracking-[-0.02em] leading-[1.05] text-foreground"
        >
          Team tasks. Zero clutter.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mt-6 text-lg text-muted-foreground max-w-md leading-relaxed"
        >
          A shared task list for small teams. Today, Upcoming, projects, and a
          board — synced to everyone&rsquo;s screen, live.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="mt-8 flex items-center gap-5"
        >
          <button
            onClick={() => navigate('/home')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 group"
          >
            Start free
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <span className="text-sm text-muted-foreground">No setup. Sign in and type.</span>
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.7 }}
      >
        <HeroMockup />
      </motion.div>
    </section>
  )
}

// ── Features — editorial rows, one visual per claim ──────────────────────────

function ListVisual() {
  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-2">
      {[
        { label: 'Today', count: 3, active: true },
        { label: 'Upcoming', count: 8, active: false },
        { label: 'Logbook', count: 42, active: false },
      ].map((v) => (
        <div
          key={v.label}
          className={'flex items-center justify-between rounded-lg px-3 py-2 text-sm ' + (v.active ? 'bg-primary/10 text-foreground font-medium' : 'text-muted-foreground')}
        >
          <span className="flex items-center gap-2.5"><CalendarDays className="w-4 h-4" />{v.label}</span>
          <span className="text-xs tabular-nums">{v.count}</span>
        </div>
      ))}
    </div>
  )
}

function BoardVisual() {
  return (
    <div className="rounded-xl bg-card border border-border p-4 grid grid-cols-3 gap-2.5">
      {[2, 1, 3].map((cards, col) => (
        <div key={col} className="rounded-lg bg-muted p-2 space-y-1.5">
          <div className="h-1.5 w-8 rounded bg-border" />
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-card border border-border" />
          ))}
        </div>
      ))}
    </div>
  )
}

function PresenceVisual() {
  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <div className="flex items-center gap-2">
        {['M', 'J', 'R'].map((initial) => (
          <span key={initial} className="w-8 h-8 rounded-full bg-primary/15 text-primary text-xs font-semibold grid place-items-center">
            {initial}
          </span>
        ))}
        <span className="text-sm text-muted-foreground ml-1">3 teammates here now</span>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5">
        <span className="w-2 h-2 rounded-full bg-success" />
        <span className="text-sm text-foreground">&ldquo;Ship pricing page&rdquo; assigned to Mia</span>
      </div>
    </div>
  )
}

function AssistantVisual() {
  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-2.5">
      <div className="ml-auto max-w-[80%] rounded-xl rounded-br-sm bg-primary text-primary-foreground text-sm px-3.5 py-2 w-fit">
        Split the launch into tasks for this week
      </div>
      <div className="max-w-[85%] rounded-xl rounded-bl-sm bg-muted text-foreground text-sm px-3.5 py-2 w-fit">
        Done — 5 tasks created in Launch, 2 due today.
      </div>
    </div>
  )
}

const FEATURES: Array<{ icon: typeof CalendarDays; kicker: string; title: string; body: string; visual: () => ReactNode }> = [
  {
    icon: CalendarDays,
    kicker: 'Views',
    title: 'One question per view.',
    body: 'Today answers "what now." Upcoming answers "what next." Logbook remembers what shipped. No dashboard to configure.',
    visual: () => <ListVisual />,
  },
  {
    icon: Columns3,
    kicker: 'Board',
    title: 'A board when you want one.',
    body: 'The same tasks, as columns. Drag a card and the list updates too — one source of truth, two ways to see it.',
    visual: () => <BoardVisual />,
  },
  {
    icon: Users,
    kicker: 'Live',
    title: 'Everyone on the same page.',
    body: 'Edits land on every teammate’s screen in real time. Assign, comment, reorder — nobody refreshes, nobody merges.',
    visual: () => <PresenceVisual />,
  },
  {
    icon: Sparkles,
    kicker: 'Assistant',
    title: 'An assistant inside the list.',
    body: 'Ask it to plan a week, split a project, or clean up overdue tasks. It works on your actual tasks, not a chat log.',
    visual: () => <AssistantVisual />,
  },
]

function Features() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-24 md:py-32">
      <ScrollReveal className="mb-16">
        <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em] text-foreground leading-[1.1] max-w-2xl">
          Everything a team needs. Nothing it has to manage.
        </h2>
      </ScrollReveal>
      <div className="space-y-16 md:space-y-20">
        {FEATURES.map((f, i) => (
          <ScrollReveal key={f.title}>
            <div className={'grid md:grid-cols-2 gap-8 md:gap-16 items-center'}>
              <div className={i % 2 === 1 ? 'md:order-2' : undefined}>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  <f.icon className="w-4 h-4" />
                  {f.kicker}
                </span>
                <h3 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{f.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed max-w-md">{f.body}</p>
              </div>
              <div className={i % 2 === 1 ? 'md:order-1' : undefined}>{f.visual()}</div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}

// ── Positioning band ─────────────────────────────────────────────────────────

function Positioning() {
  return (
    <section className="bg-muted">
      <div className="max-w-4xl mx-auto px-6 py-20 md:py-24 text-center">
        <ScrollReveal>
          <p className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground leading-snug">
            Everything-apps make work about the app.
          </p>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Taskspace stays a list. Your team stays on the work.
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}

// ── CTA ──────────────────────────────────────────────────────────────────────

function CTA() {
  const navigate = useNavigate()
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto px-6 py-20 md:py-24 text-center">
        <ScrollReveal>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em] leading-tight">
            Your team&rsquo;s week, in one list.
          </h2>
          <button
            onClick={() => navigate('/home')}
            className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-md bg-background text-foreground text-sm font-medium hover:opacity-90 group"
          >
            Open Taskspace
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </ScrollReveal>
      </div>
    </section>
  )
}

// ── Footer ───────────────────────────────────────────────────────────────────

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
        <div>
          <span className="font-semibold tracking-tight text-foreground">Taskspace</span>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            A real-time shared task list for small teams.
          </p>
        </div>
        <nav className="flex gap-12 text-sm" aria-label="Footer">
          <div className="space-y-2.5 flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Product</span>
            <a href="/#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="/home" className="text-muted-foreground hover:text-foreground transition-colors">Open the app</a>
          </div>
          <div className="space-y-2.5 flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Company</span>
            <a href="mailto:contact@deep.space" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
            <a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms</a>
            <a
              href="https://x.com/deepdotspace"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Follow on X
            </a>
          </div>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 text-xs text-muted-foreground flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} DeepSpace</span>
          <a href="https://deep.space" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
            Built with DeepSpace
          </a>
        </div>
      </div>
    </footer>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth()

  // Signed-in users skip the marketing page entirely.
  if (isLoaded && isSignedIn) return <Navigate to="/home" replace />

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background text-foreground">
        <LandingNav />
        <Hero />
        <Features />
        <Positioning />
        <CTA />
        <SiteFooter />
      </div>
    </MotionConfig>
  )
}
