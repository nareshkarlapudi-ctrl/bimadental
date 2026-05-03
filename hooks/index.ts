import type { AgentContext, AgentResponse, OrchestratorInput } from '../types/agents'

type HookFn<A extends unknown[]> = (...a: A) => Promise<void>

export const HOOKS = {
  'before:agent_run':         [] as HookFn<[OrchestratorInput, AgentContext]>[],
  'after:agent_run':          [] as HookFn<[OrchestratorInput, AgentResponse, AgentContext]>[],
  'on:visit_complete':        [] as HookFn<[{visitId:string;patientId:string;doctorId:string}]>[],
  'on:payment_received':      [] as HookFn<[{invoiceId:string;amount:number;patientId:string}]>[],
  'on:patient_created':       [] as HookFn<[{patientId:string;phone:string}]>[],
  'on:low_stock_detected':    [] as HookFn<[{items:string[];critical:string[]}]>[],
  'on:equipment_service_due': [] as HookFn<[{equipmentId:string;name:string;daysUntil:number}]>[],
  'on:end_of_day':            [] as HookFn<[{date:string;summary:unknown}]>[],
} as const

async function runAll(handlers: HookFn<unknown[]>[], ...args: unknown[]) {
  await Promise.allSettled(handlers.map(h => h(...args)))
}

export const runBeforeHooks = (i: OrchestratorInput, c: AgentContext) => runAll(HOOKS['before:agent_run'] as HookFn<unknown[]>[], i, c)
export const runAfterHooks  = (i: OrchestratorInput, r: AgentResponse, c: AgentContext) => runAll(HOOKS['after:agent_run'] as HookFn<unknown[]>[], i, r, c)
export const emitHook = <K extends keyof typeof HOOKS>(e: K, ...a: unknown[]) => runAll(HOOKS[e] as HookFn<unknown[]>[], ...a)

// Built-in hooks
HOOKS['before:agent_run'].push(async (input, ctx) => {
  console.log(`[AUDIT] ${ctx.userId} (${ctx.role}) -> "${input.message.slice(0,60)}"`)
})
HOOKS['on:visit_complete'].push(async ({ visitId, patientId }) => {
  console.log(`[HOOK] visit_complete ${visitId} patient ${patientId}`)
  // await sendVisitSummary(...)
  // await queue.add('feedback-request', { patientId }, { delay: 7_200_000 })
})
HOOKS['on:payment_received'].push(async ({ amount, patientId }) => {
  console.log(`[HOOK] payment ₹${amount} from ${patientId}`)
  // await sendPaymentConfirmation(...)
})
HOOKS['on:low_stock_detected'].push(async ({ critical }) => {
  if (critical.length) console.log(`[HOOK] CRITICAL stock: ${critical.join(', ')}`)
})
HOOKS['on:end_of_day'].push(async ({ date, summary }) => {
  console.log(`[HOOK] end_of_day ${date}`, summary)
  // await sendWhatsApp({ phone: OWNER_PHONE, message: formatSummary(summary) })
})
