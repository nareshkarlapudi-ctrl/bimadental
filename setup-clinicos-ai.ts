/**
 * setup-clinicos-ai.ts
 * ─────────────────────────────────────────────────────────────
 * ClinicOS — AI Agent Architecture · Single-file installer
 *
 * Paste this entire file into Claude Code (Antigravity) and run:
 *   npx ts-node setup-clinicos-ai.ts
 *
 * It will scaffold the full folder structure and write every file.
 * ─────────────────────────────────────────────────────────────
 */

import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()

function write(filePath: string, content: string) {
  const abs = path.join(ROOT, filePath)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, content.trimStart(), 'utf8')
  console.log('  wrote', filePath)
}

// ─── FILE CONTENTS ────────────────────────────────────────────

const FILES: Record<string, string> = {}

// ── README ───────────────────────────────────────────────────
FILES['README.md'] = `
# ClinicOS — AI Agent Architecture

Layered AI agent system for a dental + cosmetology clinic.
A central Orchestrator delegates to specialist sub-agents,
each governed by skill modules, hooks, and rules.

## Structure

\`\`\`
agents/
  orchestrator/   intent classification + routing
  patient/        search, create, update patients
  clinical/       visit capture, diagnosis assist, rx
  billing/        invoice, UPI QR, payment
  ops/            stock, equipment, reports, attendance
hooks/            event-driven side effects
rules/            auth, rate-limit, drug safety, PII
skills/
  patient-lookup/ SKILL.md + design.md
  visit-capture/  SKILL.md + design.md
  billing-upi/    SKILL.md + index.ts
  inventory-alert/SKILL.md
  report-gen/     SKILL.md
types/            shared TypeScript interfaces
data/             static data (treatments)
\`\`\`

## Run

\`\`\`bash
npx ts-node setup-clinicos-ai.ts
\`\`\`
`

// ── TYPES ────────────────────────────────────────────────────
FILES['types/agents.ts'] = `
export type UserRole = 'admin' | 'doctor' | 'staff'

export interface AgentContext {
  userId: string
  role: UserRole
  patientId?: string
  visitId?: string
  timestamp: string
  sessionId: string
}

export interface OrchestratorInput {
  message: string
  userId: string
  role: UserRole
  sessionId: string
  patientId?: string
  visitId?: string
  attachments?: string[]
}

export interface Intent {
  domain: 'patient' | 'clinical' | 'billing' | 'ops' | 'unknown'
  action?: string
  entities: Record<string, unknown>
  confidence: number
}

export interface AgentResponse {
  ok: boolean
  agent: string
  message?: string
  error?: string
  action?: string
  data?: unknown
  warnings?: string[]
  disclaimer?: string
  suggestions?: string[]
}
`

// ── ORCHESTRATOR ─────────────────────────────────────────────
FILES['agents/orchestrator/index.ts'] = `
import { classifyIntent } from './intent-classifier'
import { PatientAgent }   from '../patient'
import { ClinicalAgent }  from '../clinical'
import { BillingAgent }   from '../billing'
import { OpsAgent }       from '../ops'
import { runBeforeHooks, runAfterHooks } from '../../hooks'
import { enforceRules }   from '../../rules'
import type { AgentContext, AgentResponse, OrchestratorInput } from '../../types/agents'

export class OrchestratorAgent {
  private agents = {
    patient:  new PatientAgent(),
    clinical: new ClinicalAgent(),
    billing:  new BillingAgent(),
    ops:      new OpsAgent(),
  }

  async run(input: OrchestratorInput): Promise<AgentResponse> {
    const ctx: AgentContext = {
      userId:    input.userId,
      role:      input.role,
      patientId: input.patientId,
      visitId:   input.visitId,
      timestamp: new Date().toISOString(),
      sessionId: input.sessionId,
    }

    const pre = await enforceRules('pre', input, ctx)
    if (!pre.allowed) return { ok: false, error: pre.reason, agent: 'orchestrator' }

    await runBeforeHooks(input, ctx)

    const intent = await classifyIntent(input.message, ctx)

    let response: AgentResponse
    switch (intent.domain) {
      case 'patient':  response = await this.agents.patient.run(input, intent, ctx);  break
      case 'clinical': response = await this.agents.clinical.run(input, intent, ctx); break
      case 'billing':  response = await this.agents.billing.run(input, intent, ctx);  break
      case 'ops':      response = await this.agents.ops.run(input, intent, ctx);      break
      default:
        response = {
          ok: true, agent: 'orchestrator',
          message: "Ask me about a patient, visit, invoice, or stock levels.",
          suggestions: ['Find patient by phone','Start a visit','Show today revenue','Check low stock'],
        }
    }

    await runAfterHooks(input, response, ctx)
    const post = await enforceRules('post', response, ctx)
    return post.response ?? response
  }
}
`

FILES['agents/orchestrator/intent-classifier.ts'] = `
import type { AgentContext, Intent } from '../../types/agents'

const SYSTEM_PROMPT = \`
You are the intent classifier for ClinicOS, a dental and cosmetology clinic.
Given a staff member message, return ONLY valid JSON:
{"domain":"patient|clinical|billing|ops|unknown","action":"...","entities":{},"confidence":0.0}

Action values:
  patient:  patient.search patient.create patient.update patient.history
  clinical: visit.start visit.update visit.summarize diagnosis.suggest medicine.suggest
  billing:  invoice.create invoice.list invoice.mark_paid payment.qr
  ops:      stock.check stock.update equipment.check report.daily report.monthly attendance.checkin

Examples:
"9876543210"           -> {"domain":"patient","action":"patient.search","entities":{"phone":"9876543210"},"confidence":0.99}
"Start visit for Ravi" -> {"domain":"clinical","action":"visit.start","entities":{"name":"Ravi"},"confidence":0.92}
"Show QR for 5000"     -> {"domain":"billing","action":"payment.qr","entities":{"amount":5000},"confidence":0.97}
"Low stock?"           -> {"domain":"ops","action":"stock.check","entities":{},"confidence":0.88}
\`

export async function classifyIntent(message: string, ctx: AgentContext): Promise<Intent> {
  const quick = quickClassify(message)
  if (quick && quick.confidence > 0.9) return quick
  return callLLM(message)
}

function quickClassify(message: string): Intent | null {
  const s = message.toLowerCase().trim()
  if (/^\\d{10}$/.test(s.replace(/\\s/g, '')))
    return { domain:'patient', action:'patient.search', entities:{ phone: s.replace(/\\s/g,'') }, confidence:0.99 }
  if (s.includes('stock') || s.includes('inventory'))
    return { domain:'ops', action:'stock.check', entities:{}, confidence:0.95 }
  if (s.includes('daily report') || s.includes("today's revenue"))
    return { domain:'ops', action:'report.daily', entities:{}, confidence:0.95 }
  if (s.includes('check in') || s.includes('checkin'))
    return { domain:'ops', action:'attendance.checkin', entities:{}, confidence:0.93 }
  return null
}

async function callLLM(message: string): Promise<Intent> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }],
    }),
  })
  const data = await res.json()
  try { return JSON.parse(data.content[0].text) }
  catch { return { domain:'unknown', entities:{}, confidence:0 } }
}
`

// ── PATIENT AGENT ─────────────────────────────────────────────
FILES['agents/patient/index.ts'] = `
import { patientLookupSkill } from '../../skills/patient-lookup'
import type { AgentContext, AgentResponse, Intent, OrchestratorInput } from '../../types/agents'

export class PatientAgent {
  async run(input: OrchestratorInput, intent: Intent, ctx: AgentContext): Promise<AgentResponse> {
    switch (intent.action) {
      case 'patient.search':  return this.search(intent.entities, ctx)
      case 'patient.create':  return this.create(intent.entities, input.message, ctx)
      case 'patient.history': return this.history(intent.entities, ctx)
      default:                return this.search(intent.entities, ctx)
    }
  }

  private async search(entities: Record<string,unknown>, ctx: AgentContext): Promise<AgentResponse> {
    const phone = entities.phone as string | undefined
    const name  = entities.name  as string | undefined
    if (!phone && !name) return { ok:false, agent:'patient', error:'Provide a phone number or name.' }

    const result = await patientLookupSkill.run({ phone, name })
    if (!result.found) return { ok:true, agent:'patient', message:\`No patient for \${phone||name}.\`, action:'prompt_create', data:{ searchTerm:phone||name }, suggestions:[\`Register new patient with phone \${phone}\`] }

    const warnings = result.patient?.allergies ? [\`ALLERGIES: \${result.patient.allergies}\`] : []
    return { ok:true, agent:'patient', message:\`Found: \${result.patient?.name} (\${result.patient?.age}y)\`, data:result.patient, warnings, action:'open_profile' }
  }

  private async create(entities: Record<string,unknown>, msg: string, ctx: AgentContext): Promise<AgentResponse> {
    const phone = entities.phone || msg.match(/\\d{10}/)?.[0]
    if (!phone) return { ok:false, agent:'patient', error:'Phone number required.', action:'request_field', data:{field:'phone'} }
    const age    = msg.match(/(\\d{1,3})\\s*(?:y|yr)/i)?.[1]
    const gender = msg.match(/\\b(male|female|M|F)\\b/i)?.[1]
    return { ok:true, agent:'patient', action:'show_create_form', data:{ phone, age:age?parseInt(age):undefined, gender } }
  }

  private async history(entities: Record<string,unknown>, ctx: AgentContext): Promise<AgentResponse> {
    const id = (entities.patientId as string) || ctx.patientId
    if (!id) return { ok:false, agent:'patient', error:'No patient context active.' }
    return { ok:true, agent:'patient', action:'show_history', data:{ patientId:id } }
  }
}
`

// ── CLINICAL AGENT ────────────────────────────────────────────
FILES['agents/clinical/index.ts'] = `
import type { AgentContext, AgentResponse, Intent, OrchestratorInput } from '../../types/agents'

const DIAGNOSIS_SYSTEM = \`
You are a clinical assistant for a dental/cosmetology clinic.
Suggest (never diagnose definitively). Respond ONLY with JSON:
{
  "differentials": [{"name":"...","likelihood":"high|medium|low","notes":"..."}],
  "suggestedNotes": "...",
  "treatmentOptions": ["..."],
  "redFlags": ["..."],
  "prescriptionSuggestions": ["..."]
}
\`

export class ClinicalAgent {
  async run(input: OrchestratorInput, intent: Intent, ctx: AgentContext): Promise<AgentResponse> {
    switch (intent.action) {
      case 'visit.start':       return this.startVisit(intent.entities, ctx)
      case 'visit.update':      return this.updateVisit(input.message, ctx)
      case 'visit.summarize':   return this.summarize(ctx)
      case 'diagnosis.suggest': return this.diagnose(intent.entities, input.message)
      case 'medicine.suggest':  return this.medicines(intent.entities)
      default: return { ok:false, agent:'clinical', error:'Unknown clinical action.' }
    }
  }

  private async startVisit(entities: Record<string,unknown>, ctx: AgentContext): Promise<AgentResponse> {
    const patientId = (entities.patientId as string) || ctx.patientId
    if (!patientId) return { ok:false, agent:'clinical', error:'No patient selected.', action:'redirect_patient_search' }
    return { ok:true, agent:'clinical', action:'open_visit_screen', data:{ patientId, doctorId:ctx.userId } }
  }

  private async diagnose(entities: Record<string,unknown>, raw: string): Promise<AgentResponse> {
    const symptoms = (entities.symptom as string) || raw
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{ 'x-api-key':process.env.ANTHROPIC_API_KEY!, 'anthropic-version':'2023-06-01', 'content-type':'application/json' },
      body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:600, system:DIAGNOSIS_SYSTEM, messages:[{ role:'user', content:\`Symptoms: \${symptoms}\` }] }),
    })
    const data = await res.json()
    const suggestions = JSON.parse(data.content[0].text)
    return { ok:true, agent:'clinical', message:\`\${suggestions.differentials.length} possible diagnoses.\`, action:'show_diagnosis_suggestions', data:suggestions, disclaimer:'AI suggestion only. Doctor must review.' }
  }

  private async medicines(entities: Record<string,unknown>): Promise<AgentResponse> {
    const dx = ((entities.diagnosis as string) || '').toLowerCase()
    const rxMap: Record<string,string[]> = {
      'root canal':  ['Tab. Ibuprofen 400mg TDS x3d','Tab. Amoxicillin 500mg TDS x5d','Tab. Metronidazole 400mg TDS x5d'],
      'extraction':  ['Tab. Ibuprofen 600mg TDS x3d','Tab. Amoxicillin 500mg TDS x5d','Chlorhexidine 0.2% BD x7d'],
      'filling':     ['Tab. Ibuprofen 400mg SOS','Clove oil for sensitivity'],
      'cleaning':    ['Chlorhexidine 0.2% BD x5d'],
      'default':     ['Tab. Ibuprofen 400mg TDS x3d','Tab. Paracetamol 500mg SOS'],
    }
    const key = Object.keys(rxMap).find(k => k !== 'default' && dx.includes(k)) || 'default'
    return { ok:true, agent:'clinical', action:'fill_prescription', data:{ prescriptions:rxMap[key] }, disclaimer:'Doctor must review before prescribing.' }
  }

  private async updateVisit(msg: string, ctx: AgentContext): Promise<AgentResponse> {
    if (!ctx.visitId) return { ok:false, agent:'clinical', error:'No active visit.' }
    const fm: Record<string,string> = { note:'treatment_notes', diagnos:'diagnosis', medicine:'medicines', prescri:'medicines' }
    const field = Object.entries(fm).find(([k]) => msg.toLowerCase().includes(k))?.[1] || 'treatment_notes'
    return { ok:true, agent:'clinical', action:'update_visit_field', data:{ visitId:ctx.visitId, field, appendContent:msg } }
  }

  private async summarize(ctx: AgentContext): Promise<AgentResponse> {
    if (!ctx.visitId) return { ok:false, agent:'clinical', error:'No active visit.' }
    return { ok:true, agent:'clinical', action:'generate_summary', data:{ visitId:ctx.visitId } }
  }
}
`

// ── BILLING AGENT ─────────────────────────────────────────────
FILES['agents/billing/index.ts'] = `
import { billingUpiSkill } from '../../skills/billing-upi'
import { TREATMENTS }      from '../../data/treatments'
import type { AgentContext, AgentResponse, Intent, OrchestratorInput } from '../../types/agents'

export class BillingAgent {
  async run(input: OrchestratorInput, intent: Intent, ctx: AgentContext): Promise<AgentResponse> {
    switch (intent.action) {
      case 'invoice.create':    return this.create(intent.entities, input.message, ctx)
      case 'invoice.list':      return this.list(intent.entities, ctx)
      case 'invoice.mark_paid': return this.markPaid(intent.entities)
      case 'payment.qr':        return this.qr(intent.entities, ctx)
      default: return { ok:false, agent:'billing', error:'Unknown billing action.' }
    }
  }

  private async create(entities: Record<string,unknown>, msg: string, ctx: AgentContext): Promise<AgentResponse> {
    const patientId = (entities.patientId as string) || ctx.patientId
    if (!patientId) return { ok:false, agent:'billing', error:'No patient selected.' }
    const amount  = entities.amount as number | undefined
    const matched = TREATMENTS.find(t => t.name.toLowerCase().split(' ').some(w => msg.toLowerCase().includes(w) && w.length > 4))
    const total   = amount || matched?.price
    if (!total) return { ok:false, agent:'billing', error:'Could not determine amount. Try: "bill 5000 for root canal"' }
    return { ok:true, agent:'billing', action:'create_and_show_qr', data:{ patientId, amount:total, visitId:ctx.visitId, treatmentName:matched?.name||'Treatment' } }
  }

  private async qr(entities: Record<string,unknown>, ctx: AgentContext): Promise<AgentResponse> {
    const amount = entities.amount as number | undefined
    if (!amount) return { ok:false, agent:'billing', error:'Specify amount. Example: "Show QR for 3000"' }
    const qrData = billingUpiSkill.generateQRData({ amount, patientId:ctx.patientId||'', upiId:process.env.CLINIC_UPI_ID||'clinic@upi', upiName:process.env.CLINIC_UPI_NAME||'Clinic' })
    return { ok:true, agent:'billing', action:'show_payment_modal', data:{ qrData, amount } }
  }

  private async list(entities: Record<string,unknown>, ctx: AgentContext): Promise<AgentResponse> {
    return { ok:true, agent:'billing', action:'show_invoice_list', data:{ status:entities.status||'pending', patientId:ctx.patientId } }
  }

  private async markPaid(entities: Record<string,unknown>): Promise<AgentResponse> {
    if (!entities.invoiceId) return { ok:false, agent:'billing', error:'No invoice specified.' }
    return { ok:true, agent:'billing', action:'confirm_payment', data:{ invoiceId:entities.invoiceId } }
  }
}
`

// ── OPS AGENT ─────────────────────────────────────────────────
FILES['agents/ops/index.ts'] = `
import { inventoryAlertSkill } from '../../skills/inventory-alert'
import { reportGenSkill }      from '../../skills/report-gen'
import type { AgentContext, AgentResponse, Intent, OrchestratorInput } from '../../types/agents'

export class OpsAgent {
  async run(input: OrchestratorInput, intent: Intent, ctx: AgentContext): Promise<AgentResponse> {
    switch (intent.action) {
      case 'stock.check':        return this.stock(ctx)
      case 'stock.update':       return this.stockUpdate(intent.entities, input.message)
      case 'equipment.check':    return { ok:true, agent:'ops', action:'show_equipment_alerts', data:{ upcoming:[] } }
      case 'report.daily':       return this.daily(intent.entities)
      case 'report.monthly':     return this.monthly(intent.entities)
      case 'attendance.checkin': return { ok:true, agent:'ops', action:'record_checkin', data:{ userId:ctx.userId, timestamp:ctx.timestamp } }
      default: return { ok:false, agent:'ops', error:'Unknown ops action.' }
    }
  }

  private async stock(_ctx: AgentContext): Promise<AgentResponse> {
    const alerts = await inventoryAlertSkill.getLowStockAlerts()
    if (!alerts.length) return { ok:true, agent:'ops', message:'All stock levels healthy.', action:'show_inventory' }
    const critical = alerts.filter(a => a.quantity === 0)
    const low      = alerts.filter(a => a.quantity > 0)
    let msg = ''
    if (critical.length) msg += \`OUT OF STOCK: \${critical.map(a=>a.name).join(', ')}\\n\`
    if (low.length)      msg += \`LOW STOCK: \${low.map(a=>\`\${a.name} (\${a.quantity})\`).join(', ')}\`
    return { ok:true, agent:'ops', message:msg.trim(), action:'show_stock_alerts', data:{ alerts } }
  }

  private async stockUpdate(entities: Record<string,unknown>, msg: string): Promise<AgentResponse> {
    const qty = msg.match(/(\\d+)/)?.[1]
    if (!qty) return { ok:false, agent:'ops', error:'Specify quantity. Example: "Update gloves to 100"' }
    return { ok:true, agent:'ops', action:'show_stock_update_form', data:{ itemName:entities.item, quantity:parseInt(qty) } }
  }

  private async daily(entities: Record<string,unknown>): Promise<AgentResponse> {
    const date   = (entities.date as string) || new Date().toISOString().split('T')[0]
    const report = await reportGenSkill.generateDailyReport(date)
    const profit = report.revenue - report.expenses
    return { ok:true, agent:'ops', action:'show_report',
      message:[\`Daily Report — \${date}\`,\`Revenue:  ₹\${report.revenue.toLocaleString('en-IN')}\`,\`Expenses: ₹\${report.expenses.toLocaleString('en-IN')}\`,\`Profit:   ₹\${profit.toLocaleString('en-IN')}\`,\`Invoices: \${report.paidCount} paid, \${report.pendingCount} pending\`].join('\\n'),
      data:report }
  }

  private async monthly(entities: Record<string,unknown>): Promise<AgentResponse> {
    const now = new Date()
    const report = await reportGenSkill.generateMonthlyReport((entities.month as number)||now.getMonth()+1,(entities.year as number)||now.getFullYear())
    return { ok:true, agent:'ops', action:'show_monthly_report', data:report }
  }
}
`

// ── HOOKS ─────────────────────────────────────────────────────
FILES['hooks/index.ts'] = `
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
  console.log(\`[AUDIT] \${ctx.userId} (\${ctx.role}) -> "\${input.message.slice(0,60)}"\`)
})
HOOKS['on:visit_complete'].push(async ({ visitId, patientId }) => {
  console.log(\`[HOOK] visit_complete \${visitId} patient \${patientId}\`)
  // await sendVisitSummary(...)
  // await queue.add('feedback-request', { patientId }, { delay: 7_200_000 })
})
HOOKS['on:payment_received'].push(async ({ amount, patientId }) => {
  console.log(\`[HOOK] payment ₹\${amount} from \${patientId}\`)
  // await sendPaymentConfirmation(...)
})
HOOKS['on:low_stock_detected'].push(async ({ critical }) => {
  if (critical.length) console.log(\`[HOOK] CRITICAL stock: \${critical.join(', ')}\`)
})
HOOKS['on:end_of_day'].push(async ({ date, summary }) => {
  console.log(\`[HOOK] end_of_day \${date}\`, summary)
  // await sendWhatsApp({ phone: OWNER_PHONE, message: formatSummary(summary) })
})
`

// ── RULES ─────────────────────────────────────────────────────
FILES['rules/index.ts'] = `
import type { AgentContext, AgentResponse, OrchestratorInput } from '../types/agents'

export interface RuleResult { allowed:boolean; reason?:string; response?:AgentResponse }
interface Rule { name:string; check(i:unknown, c:AgentContext): Promise<RuleResult> }

const requestCounts = new Map<string,{count:number;resetAt:number}>()
const DOCTOR_ONLY   = ['diagnosis.suggest','medicine.suggest','visit.summarize']
const INJECTIONS    = [/ignore previous instructions/i,/you are now/i,/forget your/i,/system prompt/i,/jailbreak/i]

const PRE: Rule[] = [
  { name:'auth', async check(_,ctx) {
    if (!ctx.userId) return { allowed:false, reason:'Not authenticated', response:{ok:false,agent:'orchestrator',error:'You must be logged in.'} }
    return {allowed:true}
  }},
  { name:'rate-limit', async check(_,ctx) {
    const now = Date.now()
    const e   = requestCounts.get(ctx.userId) || {count:0,resetAt:now+3_600_000}
    if (now > e.resetAt) { requestCounts.set(ctx.userId,{count:1,resetAt:now+3_600_000}); return {allowed:true} }
    if (e.count >= 100)  return {allowed:false,reason:'Rate limit exceeded',response:{ok:false,agent:'orchestrator',error:'Too many requests.'}}
    requestCounts.set(ctx.userId,{...e,count:e.count+1})
    return {allowed:true}
  }},
  { name:'doctor-only', async check(input,ctx) {
    const action = (input as {intent?:{action?:string}}).intent?.action
    if (action && DOCTOR_ONLY.includes(action) && ctx.role==='staff')
      return {allowed:false,reason:\`\${action} requires doctor\`,response:{ok:false,agent:'orchestrator',error:'Only available to doctors.'}}
    return {allowed:true}
  }},
  { name:'no-injection', async check(input,_) {
    const msg = (input as OrchestratorInput).message || ''
    if (INJECTIONS.some(p=>p.test(msg)))
      return {allowed:false,reason:'Injection detected',response:{ok:false,agent:'orchestrator',error:'I can only help with clinic tasks.'}}
    return {allowed:true}
  }},
]

const POST: Rule[] = [
  { name:'pii-scrub', async check(response,_) {
    const r = response as AgentResponse
    if (r.message) r.message = r.message.replace(/\\b\\d{10}\\b/g, m => m.slice(0,4)+'****'+m.slice(-2))
    return {allowed:true,response:r}
  }},
  { name:'clinical-disclaimer', async check(response,_) {
    const r = response as AgentResponse
    if (r.data && 'differentials' in (r.data as object) && !r.disclaimer)
      r.disclaimer = 'AI suggestions only. Doctor must review before acting.'
    return {allowed:true,response:r}
  }},
  { name:'red-flags', async check(response,_) {
    const r = response as AgentResponse
    if (r.data && 'redFlags' in (r.data as object)) {
      const flags = (r.data as {redFlags:string[]}).redFlags
      if (flags.length && !r.warnings) r.warnings = flags
    }
    return {allowed:true,response:r}
  }},
]

export async function enforceRules(phase:'pre'|'post', input:unknown, ctx:AgentContext): Promise<RuleResult> {
  for (const rule of (phase==='pre'?PRE:POST)) {
    const result = await rule.check(input, ctx)
    if (!result.allowed) { console.warn(\`[RULE] \${rule.name}: \${result.reason}\`); return result }
  }
  return {allowed:true}
}
`

FILES['rules/drug-safety.ts'] = `
export interface DrugSafetyResult { safe:boolean; warnings:string[]; criticalAlerts:string[] }

const ALLERGEN_MAP: Record<string,string[]> = {
  penicillin: ['amoxicillin','ampicillin','augmentin','piperacillin'],
  sulfa:      ['sulfamethoxazole','trimethoprim','bactrim'],
  nsaid:      ['ibuprofen','diclofenac','naproxen','aspirin'],
  aspirin:    ['ibuprofen','naproxen','diclofenac'],
}

const INTERACTIONS = [
  {drugs:['metronidazole','alcohol'],  sev:'critical', msg:'Metronidazole + Alcohol: severe reaction. Warn patient.'},
  {drugs:['amoxicillin','warfarin'],   sev:'warning',  msg:'Amoxicillin may increase warfarin effect. Monitor INR.'},
  {drugs:['ibuprofen','warfarin'],     sev:'critical', msg:'NSAIDs with anticoagulants: increased bleeding risk.'},
  {drugs:['ibuprofen','aspirin'],      sev:'warning',  msg:'Avoid concurrent NSAID use.'},
]

export function checkDrugSafety(prescribed:string, allergies:string, currentMeds=''):DrugSafetyResult {
  const warnings:string[] = [], critical:string[] = []
  const rx  = prescribed.toLowerCase()
  const alg = allergies.toLowerCase()
  const all = rx+' '+currentMeds.toLowerCase()

  for (const [allergen,drugs] of Object.entries(ALLERGEN_MAP))
    if (alg.includes(allergen))
      for (const d of drugs)
        if (rx.includes(d)) critical.push(\`ALLERGY: patient allergic to \${allergen}, \${d} may cross-react.\`)

  for (const ix of INTERACTIONS)
    if (ix.drugs.every(d=>all.includes(d)))
      ix.sev==='critical' ? critical.push(ix.msg) : warnings.push(ix.msg)

  return { safe:critical.length===0, warnings, criticalAlerts:critical }
}
`

// ── SKILLS ────────────────────────────────────────────────────
FILES['skills/patient-lookup/SKILL.md'] = `
# Skill: patient-lookup

## Purpose
Fuzzy search for patients by phone (exact) or name (ilike).

## Inputs
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| phone | string | no* | 10-digit mobile |
| name  | string | no* | Min 3 chars |

*At least one required. Phone takes priority.

## Outputs
\`\`\`ts
{ found: boolean; patient?: Patient; matches?: Patient[]; confidence: number }
\`\`\`

## Rules
- Never create a patient inside this skill
- Never expose raw DB errors
- Phone exact match → confidence 1.0, return immediately
`

FILES['skills/patient-lookup/design.md'] = `
# Design: patient-lookup

## States
1. Empty       — large numeric input, auto-search on 10 digits
2. Found       — teal card, name bold, allergy badge (role="alert"), "Open Profile" CTA
3. Not found   — "No patient for X" + single "Register" CTA
4. Quick create — name / age / gender, phone pre-filled, medical history collapsed
5. Multi-match  — list with partial phone (****210) to disambiguate

## Component API
\`\`\`tsx
interface PatientSearchProps {
  onFound:  (patient: Patient) => void
  onCreate: (patient: NewPatient) => void
  autoFocus?: boolean   // default true
  compact?:  boolean    // dashboard widget mode
}
\`\`\`

## Accessibility
- inputmode="numeric", aria-label="Patient phone number"
- Results: role="listbox", items role="option"
- Allergy: role="alert" so screen readers announce immediately
`

FILES['skills/patient-lookup/index.ts'] = `
export interface PatientLookupInput { phone?:string; name?:string }
export interface PatientLookupResult {
  found:boolean
  patient?: { id:string;name:string;phone:string;age:number;gender:string;medical_history:string;allergies:string;created_at:string }
  matches?: PatientLookupResult['patient'][]
  confidence:number
}

class PatientLookupSkill {
  async run(input: PatientLookupInput): Promise<PatientLookupResult> {
    const phone = this.normalizePhone(input.phone)
    const name  = input.name?.trim()
    if (!phone && (!name || name.length < 3)) return { found:false, confidence:0 }
    if (phone) return this.byPhone(phone)
    return this.byName(name!)
  }

  private normalizePhone(p?:string) {
    if (!p) return null
    const d = p.replace(/\\D/g,'').replace(/^91/,'')
    return d.length===10 ? d : null
  }

  private async byPhone(phone:string): Promise<PatientLookupResult> {
    // const { data } = await supabase.from('patients').select('*').eq('phone',phone).single()
    return { found:false, confidence:1.0 }
  }

  private async byName(name:string): Promise<PatientLookupResult> {
    // const { data } = await supabase.from('patients').select('*').ilike('name',\`%\${name}%\`)
    return { found:false, confidence:0.5 }
  }
}

export const patientLookupSkill = new PatientLookupSkill()
`

FILES['skills/visit-capture/SKILL.md'] = `
# Skill: visit-capture

## Purpose
Save a clinical visit record and optionally create an invoice.

## Inputs
patientId* · doctorId* · diagnosis* · treatmentNotes · medicines · images[] · invoiceItems[]

## Steps
1. Validate: diagnosis not empty, patientId present
2. Run drug-safety check against patient allergies
3. Save visit to DB
4. If invoiceItems → create invoice
5. Emit on:visit_complete hook
6. Return { visitId, invoiceId?, saved, warnings }

## Rules
- Diagnosis required (min 5 chars) before save
- Max 10 images per visit
- Image uploads must complete before save is allowed
`

FILES['skills/visit-capture/design.md'] = `
# Design: visit-capture

## Goal
Complete a full clinical record + bill in under 90 seconds.

## Desktop Layout
Left (240px): patient card · visit history · billing picker
Main:         diagnosis + [AI Suggest] · notes · medicines · images
Bottom:       [Save Visit]  [Save & Collect ₹X]  (sticky)

## AI Touch Points
- Diagnosis Assist: panel with 2-3 differentials, click to fill
- Medicine chips:   appear after diagnosis, click to append
- Note templates:   appended when treatment selected from billing

## Keyboard Shortcuts
Ctrl+S  Save · Ctrl+P  Save+Pay · Ctrl+D  AI Diagnose

## Validation
diagnosis min 5 chars · images max 10 × 5MB · amount > 0 for pay CTA
`

FILES['skills/billing-upi/SKILL.md'] = `
# Skill: billing-upi

## Purpose
Generate UPI QR codes and manage payment state transitions.

## UPI string format
upi://pay?pa={id}&pn={name}&am={amount}&cu=INR&tn={note}

## Rules
- Never auto-mark paid — always needs staff confirmation
- paid_at set server-side only
- Store UTR for audit trail
- Amount must match invoice exactly
`

FILES['skills/billing-upi/index.ts'] = `
export interface UPIQRData { qrString:string; amount:number; upiId:string; upiName:string }
export interface GenerateQRInput { amount:number; patientId:string; upiId:string; upiName:string; invoiceId?:string; note?:string }

class BillingUpiSkill {
  generateQRData(input:GenerateQRInput): UPIQRData {
    if (input.amount<=0) throw new Error('Amount must be > 0')
    const note = input.note || 'Clinic payment'
    const qrString = \`upi://pay?pa=\${encodeURIComponent(input.upiId)}&pn=\${encodeURIComponent(input.upiName)}&am=\${input.amount}&cu=INR&tn=\${encodeURIComponent(note)}\`
    return { qrString, amount:input.amount, upiId:input.upiId, upiName:input.upiName }
  }
}

export const billingUpiSkill = new BillingUpiSkill()
`

FILES['skills/inventory-alert/SKILL.md'] = `
# Skill: inventory-alert

## Purpose
Return all stock items at or below threshold, sorted by severity.

## Severity
critical: quantity === 0
low:      0 < quantity <= threshold
expired:  expiry_date < today (flagged regardless of quantity)

## Output
Alert[] sorted critical → low → expired
`

FILES['skills/inventory-alert/index.ts'] = `
export type AlertSeverity = 'critical' | 'low' | 'ok'
export interface InventoryAlert { id:string;name:string;quantity:number;threshold:number;severity:AlertSeverity;expiryDate?:string;isExpired?:boolean }

class InventoryAlertSkill {
  async getLowStockAlerts(): Promise<InventoryAlert[]> {
    // const { data } = await supabase.from('inventory').select('*')
    const items: InventoryAlert[] = []
    return items
      .map(i=>({ ...i, severity:this.sev(i.quantity,i.threshold), isExpired:i.expiryDate?new Date(i.expiryDate)<new Date():false }))
      .filter(i=>i.severity!=='ok'||i.isExpired)
      .sort((a,b)=>({critical:0,low:1,ok:2}[a.severity]-{critical:0,low:1,ok:2}[b.severity]))
  }
  private sev(q:number,t:number):AlertSeverity { return q===0?'critical':q<=t?'low':'ok' }
}

export const inventoryAlertSkill = new InventoryAlertSkill()
`

FILES['skills/report-gen/SKILL.md'] = `
# Skill: report-gen

## Methods
generateDailyReport(date: string)
generateMonthlyReport(month: number, year: number)

## Output fields
date · revenue (paid only) · expenses · netProfit
invoiceCount · paidCount · pendingCount · pendingAmount · visitCount

## Rules
- revenue = paid invoices only
- pending shown separately, never counted as revenue
- read-only, never modifies source data
`

FILES['skills/report-gen/index.ts'] = `
export interface DailyReport { date:string;revenue:number;expenses:number;netProfit:number;invoiceCount:number;paidCount:number;pendingCount:number;pendingAmount:number;visitCount:number }

class ReportGenSkill {
  async generateDailyReport(date:string): Promise<DailyReport> {
    // query supabase for date range
    return { date, revenue:0, expenses:0, netProfit:0, invoiceCount:0, paidCount:0, pendingCount:0, pendingAmount:0, visitCount:0 }
  }
  async generateMonthlyReport(month:number, year:number): Promise<DailyReport&{month:number;year:number}> {
    const r = await this.generateDailyReport(\`\${year}-\${String(month).padStart(2,'0')}\`)
    return { ...r, month, year }
  }
}

export const reportGenSkill = new ReportGenSkill()
`

// ── DATA ──────────────────────────────────────────────────────
FILES['data/treatments.ts'] = `
export const TREATMENTS = [
  { name:'Consultation',       price:500,   category:'General'     },
  { name:'Dental Cleaning',    price:1500,  category:'Dental'      },
  { name:'Root Canal',         price:8000,  category:'Dental'      },
  { name:'Tooth Extraction',   price:2000,  category:'Dental'      },
  { name:'Dental Filling',     price:1500,  category:'Dental'      },
  { name:'Crown Placement',    price:12000, category:'Dental'      },
  { name:'Teeth Whitening',    price:6000,  category:'Dental'      },
  { name:'Facial Treatment',   price:3000,  category:'Cosmetology' },
  { name:'Acne Treatment',     price:2500,  category:'Cosmetology' },
  { name:'Laser Hair Removal', price:5000,  category:'Cosmetology' },
  { name:'Chemical Peel',      price:4000,  category:'Cosmetology' },
  { name:'Botox',              price:15000, category:'Cosmetology' },
  { name:'PRP Therapy',        price:8000,  category:'Cosmetology' },
]
`

// ─── SCAFFOLD ─────────────────────────────────────────────────

console.log('\nScaffolding ClinicOS AI architecture...\n')
for (const [filePath, content] of Object.entries(FILES)) {
  write(filePath, content)
}
console.log(`\nDone! ${Object.keys(FILES).length} files written.\n`)
console.log('Next steps:')
console.log('  1. Set ANTHROPIC_API_KEY in your environment')
console.log('  2. Set CLINIC_UPI_ID and CLINIC_UPI_NAME')
console.log('  3. Wire supabase calls in skills/ (marked with // query supabase)')
console.log('  4. Import OrchestratorAgent and call .run(input) from your API route\n')
