/**
 * Cron Handler (no-op default)
 *
 * Apps that need scheduled tasks should replace this file with a real handler.
 * See apps/book-me/src/cron.ts for an example.
 *
 * To enable cron:
 *   1. Replace this file with your handler (export { handler })
 *   2. Create cron.json with your task schedule
 *   3. Deploy — the dispatch worker will call your handler on schedule
 */

export async function handler(_taskName: string, _ctx: any): Promise<void> {}
