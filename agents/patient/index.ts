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
    if (!result.found) return { ok:true, agent:'patient', message:`No patient for ${phone||name}.`, action:'prompt_create', data:{ searchTerm:phone||name }, suggestions:[`Register new patient with phone ${phone}`] }

    const warnings = result.patient?.allergies ? [`ALLERGIES: ${result.patient.allergies}`] : []
    return { ok:true, agent:'patient', message:`Found: ${result.patient?.name} (${result.patient?.age}y)`, data:result.patient, warnings, action:'open_profile' }
  }

  private async create(entities: Record<string,unknown>, msg: string, ctx: AgentContext): Promise<AgentResponse> {
    const phone = entities.phone || msg.match(/\d{10}/)?.[0]
    if (!phone) return { ok:false, agent:'patient', error:'Phone number required.', action:'request_field', data:{field:'phone'} }
    const age    = msg.match(/(\d{1,3})\s*(?:y|yr)/i)?.[1]
    const gender = msg.match(/\b(male|female|M|F)\b/i)?.[1]
    return { ok:true, agent:'patient', action:'show_create_form', data:{ phone, age:age?parseInt(age):undefined, gender } }
  }

  private async history(entities: Record<string,unknown>, ctx: AgentContext): Promise<AgentResponse> {
    const id = (entities.patientId as string) || ctx.patientId
    if (!id) return { ok:false, agent:'patient', error:'No patient context active.' }
    return { ok:true, agent:'patient', action:'show_history', data:{ patientId:id } }
  }
}
