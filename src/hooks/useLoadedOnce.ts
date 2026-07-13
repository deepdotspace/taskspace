import { useState } from 'react';

/**
 * Sticky first-load flag. Returns false until `loaded` is first true, then
 * stays true — even if `loaded` flips back to false later.
 *
 * Why: on every WebSocket reconnect (idle close, token refresh) the SDK
 * resets query statuses to 'loading' while deliberately PRESERVING the stale
 * records so the UI can keep rendering them. Gating full-screen loaders on
 * raw `status === 'loading'` blanks the whole workspace on each reconnect —
 * the periodic "Loading your workspace…" flash. Gate them on this instead,
 * so the loader shows only before the first data arrives.
 *
 * `resetKey` re-arms the flag (e.g. pass the active team id so switching
 * teams shows the loader for the new room's first load).
 */
export function useLoadedOnce(loaded: boolean, resetKey?: unknown): boolean {
  // Derived-state-from-props pattern: adjust state during render (React
  // re-runs the render with the new state before committing) — avoids the
  // one-frame flash of stale UI an effect-based reset would allow.
  const [state, setState] = useState({ key: resetKey, loaded });
  if (state.key !== resetKey) {
    setState({ key: resetKey, loaded });
    return loaded;
  }
  if (loaded && !state.loaded) {
    setState({ key: resetKey, loaded: true });
  }
  return state.loaded || loaded;
}
