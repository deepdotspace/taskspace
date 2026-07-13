/**
 * AI Tool Definitions — converts DeepSpace BUILT_IN_TOOLS to Vercel AI SDK tools.
 *
 * The assistant can read AND modify the user's tasks, projects, and tags.
 * Per-collection RBAC at the DO layer is the actual security boundary.
 */

import { tool } from 'ai'
import type { ToolSet } from 'ai'
import { z } from 'zod'
import { BUILT_IN_TOOLS } from 'deepspace/worker'
import type { ToolSchema, CollectionSchema } from 'deepspace/worker'

type ToolExecutor = (toolName: string, params: Record<string, unknown>) => Promise<unknown>

const ALLOWED_TOOL_NAMES = [
  'schema.list',
  'schema.describe',
  'records.query',
  'records.get',
  'records.create',
  'records.update',
  'records.delete',
  'user.current',
]

// ============================================================================
// System prompt
// ============================================================================

type Interpretation = CollectionSchema['columns'][number]['interpretation']

function interpretationLabel(interpretation: Interpretation): string {
  if (typeof interpretation === 'string') return interpretation
  const kind = interpretation.kind
  return typeof kind === 'string' ? kind : 'object'
}

/** Render "today" in the user's timezone for the system prompt. The model
 *  has NO idea what the current date is — without this it resolves "tomorrow"
 *  or "Thursday" against its training-data guess (wrong year included). An
 *  invalid/missing timeZone falls back to UTC rather than failing the turn. */
export function formatCurrentDate(now: Date, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }
  try {
    return now.toLocaleDateString('en-US', { ...opts, timeZone: timeZone || 'UTC' })
  } catch {
    return now.toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' })
  }
}

export function buildSystemPrompt(
  appName: string,
  schemas: CollectionSchema[],
  currentDate: string,
): string {
  const schemaSummary = schemas
    .map((s) => {
      const cols = (s.columns ?? [])
        .map((c) => `${c.name}:${interpretationLabel(c.interpretation)}${c.required ? '!' : ''}`)
        .join(', ')
      return `- ${s.name}${cols ? ` (${cols})` : ''}`
    })
    .join('\n')

  return [
    `You are the task management assistant for the "${appName}" app on DeepSpace.`,
    'You help users manage their tasks, projects, and tags.',
    'You can read and modify the user\'s data via the available tools. The',
    'user\'s own role and permissions still apply at the data layer — your',
    'tool calls run as the calling user, so you can only do what they could.',
    '',
    `Today's date is ${currentDate}. Resolve every relative date the user`,
    'gives ("tomorrow", "Thursday", "next week") against this date — never',
    'against your own assumption of what today is.',
    '',
    'Scope: all data tools operate on the workspace (team) the user currently',
    'has open — including their personal workspace. Records you create are',
    'automatically stamped with the workspace\'s TeamId; never set or change',
    'TeamId yourself, and never mention it to the user.',
    '',
    'Key conventions for this app:',
    '- Tasks have Title, Notes, Completed (0/1), Deleted (0/1), Priority (low/medium/high/urgent),',
    '  DueDate (YYYY-MM-DD string), ProjectId (recordId of a project), TagIds (array of tag recordIds).',
    '- To complete a task: update Completed=1 and CompletedAt=<unix ms timestamp>.',
    '- To delete a task: update Deleted=1 and DeletedAt=<unix ms timestamp>.',
    '- Projects have Title, Notes, Color.',
    '- Tags have Name, Color.',
    '- Always filter with Deleted=0 (or Deleted != 1) unless the user asks about trash.',
    '',
    'Be careful with mutations:',
    '- Confirm intent before destructive actions (delete, bulk update).',
    '- Operate only on collections the user explicitly mentioned.',
    '- After a successful write, briefly confirm what changed.',
    '- If a write is denied (RBAC), tell the user plainly — do not retry blindly.',
    '',
    'Use tools to look up facts before answering. Do not invent data.',
    'If data is missing, say so plainly. Keep answers concise.',
    '',
    'Available collections:',
    schemaSummary || '(none)',
  ].join('\n')
}

// ============================================================================
// Tool definitions
// ============================================================================

export function buildTools(executor: ToolExecutor): ToolSet {
  const tools: ToolSet = {}

  for (const def of BUILT_IN_TOOLS) {
    if (!ALLOWED_TOOL_NAMES.includes(def.name)) continue
    const safeName = def.name.replace('.', '_')
    tools[safeName] = tool({
      description: def.description,
      inputSchema: buildZodSchema(def),
      execute: async (params: Record<string, unknown>) => executor(def.name, params),
    })
  }

  return tools
}

// ============================================================================
// Convert ToolSchema params → Zod object schema
// ============================================================================

function buildZodSchema(def: ToolSchema) {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const [name, param] of Object.entries(def.params)) {
    let s: z.ZodTypeAny
    switch (param.type) {
      case 'string':  s = z.string(); break
      case 'number':  s = z.number(); break
      case 'boolean': s = z.boolean(); break
      case 'object':  s = z.record(z.string(), z.unknown()); break
      case 'array':   s = z.array(z.unknown()); break
      default:        s = z.unknown(); break
    }
    if (param.description) s = s.describe(param.description)
    if (!param.required) s = s.optional()
    shape[name] = s
  }

  return z.object(shape)
}
