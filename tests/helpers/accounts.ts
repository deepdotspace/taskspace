/**
 * Shared test-account fixtures — single source of truth for the two accounts
 * the E2E specs sign in as. Reuses existing accounts from the developer's
 * DeepSpace test-account pool (`deepspace test-accounts list`) rather than
 * hardcoding per-spec, so a recycled pool only needs updating here.
 *
 * These must be real, existing accounts (public signup is disabled — the auth
 * helper signs in, it cannot create them). To point the suite at a different
 * pair, run `deepspace test-accounts list`, pick two with known passwords, and
 * update the three fields below.
 */
// `name` must match the account's stored directory display name (shown in the
// members table + assignee chips), not the email slug — verify with the
// lookupUserByEmail action if unsure.
export const ACCOUNT_A = {
  email: 'collab-a@deepspace.test',
  password: 'Rb-collab-2026!',
  name: 'Collab A',
}

export const ACCOUNT_B = {
  email: 'collab-b@deepspace.test',
  password: 'Rb-collab-2026!',
  name: 'Collab B',
}
