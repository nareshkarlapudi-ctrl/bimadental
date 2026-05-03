import type { AgentContext, AgentResponse, Intent, OrchestratorInput } from '../../types/agents'

const DIAGNOSIS_SYSTEM = `
You are a clinical assistant for a dental/cosmetology clinic.
Suggest (never diagnose definitively). Respond ONLY with JSON:
{
  "differentials": [{"name":"...","likelihood":"high|medium|low","notes":"..."}],
  "suggestedNotes": "...",
  "treatmentOptions": ["..."],
  "redFlags": ["..."],
  "prescriptionSuggestions": ["..."]
}
`

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
      body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:600, system:DIAGNOSIS_SYSTEM, messages:[{ role:'user', content:`Symptoms: ${symptoms}` }] }),
    })
    const data = await res.json()
    const suggestions = JSON.parse(data.content[0].text)
    return { ok:true, agent:'clinical', message:`${suggestions.differentials.length} possible diagnoses.`, action:'show_diagnosis_suggestions', data:suggestions, disclaimer:'AI suggestion only. Doctor must review.' }
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
