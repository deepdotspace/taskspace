/**
 * App — global providers + shell.
 *
 * Generouted renders this around all routes.
 * Providers → auth gate → page outlet.
 *
 * No top navigation — the task manager has its own sidebar.
 */

import { Suspense, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { DeepSpaceAuthProvider, useAuth, AuthOverlay } from 'deepspace'
import { RecordProvider, RecordScope } from 'deepspace'
import { ToastProvider } from '../components/ui'
import { APP_NAME, SCOPE_ID } from '../constants'
import { appSchemas } from '../schemas'

/**
 * Routes that require a signed-in user (the workspace). Everything else —
 * landing, legal pages, the 404 catch-all — renders for signed-out visitors.
 */
const PROTECTED_PATHS = ['/home']

export default function App() {
  return (
    <ToastProvider>
      <DeepSpaceAuthProvider>
        <AuthGate>
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </AuthGate>
      </DeepSpaceAuthProvider>
    </ToastProvider>
  )
}

function AuthGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const { pathname } = useLocation()
  const isPublic = !PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )

  // Public pages (landing, terms) render immediately — no auth wait, no
  // records connection needed.
  if (isPublic && (!isLoaded || !isSignedIn)) return <>{children}</>

  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', color: '#8E8E93',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      }}>
        Loading...
      </div>
    )
  }

  return (
    <RecordProvider allowAnonymous>
      <RecordScope roomId={SCOPE_ID} schemas={appSchemas} appId={APP_NAME}>
        {isSignedIn ? children : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', background: '#F5F5F7',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
          }}>
            <AuthOverlay />
          </div>
        )}
      </RecordScope>
    </RecordProvider>
  )
}
