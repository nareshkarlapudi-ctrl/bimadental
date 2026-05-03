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
