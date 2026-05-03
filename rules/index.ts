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
      return {allowed:false,reason:`${action} requires doctor`,response:{ok:false,agent:'orchestrator',error:'Only available to doctors.'}}
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
    if (r.message) r.message = r.message.replace(/\b\d{10}\b/g, m => m.slice(0,4)+'****'+m.slice(-2))
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
    if (!result.allowed) { console.warn(`[RULE] ${rule.name}: ${result.reason}`); return result }
  }
  return {allowed:true}
}
