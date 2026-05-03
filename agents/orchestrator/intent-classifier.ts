import type { AgentContext, Intent } from '../../types/agents'

const SYSTEM_PROMPT = `
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
`

export async function classifyIntent(message: string, ctx: AgentContext): Promise<Intent> {
  const quick = quickClassify(message)
  if (quick && quick.confidence > 0.9) return quick
  return callLLM(message)
}

function quickClassify(message: string): Intent | null {
  const s = message.toLowerCase().trim()
  if (/^\d{10}$/.test(s.replace(/\s/g, '')))
    return { domain:'patient', action:'patient.search', entities:{ phone: s.replace(/\s/g,'') }, confidence:0.99 }
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
