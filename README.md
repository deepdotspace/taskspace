# Taskspace

Team tasks, zero clutter — a real-time task manager for small teams, with a
kanban board and an AI assistant that works your board for you. Built on the
[DeepSpace SDK](https://deep.space).

**Live app:** https://taskspace.app.space

## What it does

- Teams with invited members and role-based access — each team gets its own
  shared workspace with projects, tags, and priorities
- A drag-and-drop kanban board plus a keyboard-friendly list view, with quick
  add, bulk actions, and a task detail panel
- Every change syncs live to everyone in the team — no refresh, no save button
- A built-in AI chat that can search, create, and update tasks on your behalf

## How it's built

Tasks, projects, tags, and teams are DeepSpace record collections with
per-role permissions, read and written through the SDK's live `useQuery` /
`useMutations` hooks — that's what makes every board update appear on every
teammate's screen instantly. The kanban board itself is hand-built HTML5
drag-and-drop layered over those live queries. The AI assistant is the SDK's
ai-chat surface: it exposes DeepSpace's built-in record tools
(`records.query` / `records.create` / `records.update`) to the model, so the
assistant acts as the signed-in user and the same permission rules apply to
it as to any human teammate.

## Run your own

Deploy your own copy in three commands:

```sh
npm install
npx deepspace login     # one-time, opens a browser tab
npx deepspace deploy    # -> <name>.app.space
```

Auth, the database, real-time sync, and hosting all come from DeepSpace, so
there is nothing else to configure. Your subdomain is the `name` field in
`wrangler.toml`; change it for your own deployment.

Or build something new: apps like this are made by handing a prompt to a
coding agent — start at [deep.space/get-started](https://deep.space/get-started),
or scaffold from scratch: `npm create deepspace@latest my-app`.

---
*Taskspace was built end-to-end by an AI agent on the DeepSpace SDK.
DeepSpace is laying the foundation for rebuilding the Internet in an AI-native
way — [deep.space](https://deep.space) · [docs](https://docs.deep.space).*
