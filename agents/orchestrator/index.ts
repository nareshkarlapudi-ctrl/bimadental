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
