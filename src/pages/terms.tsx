/**
 * Terms of Service — public static page, linked from the landing footer.
 */

import { Link } from 'react-router-dom'
import { SiteFooter } from './index'

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
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold tracking-tight text-foreground">Taskspace</Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Back to home</Link>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-14">
          <h1 className="text-4xl font-bold tracking-[-0.02em] text-foreground">Terms of Service</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: July 2026</p>
          <div className="mt-10 space-y-8">
            {SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
                <p className="mt-2 text-muted-foreground leading-relaxed">{s.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
