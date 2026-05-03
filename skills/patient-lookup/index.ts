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
    const d = p.replace(/\D/g,'').replace(/^91/,'')
    return d.length===10 ? d : null
  }

  private async byPhone(phone:string): Promise<PatientLookupResult> {
    // const { data } = await supabase.from('patients').select('*').eq('phone',phone).single()
    return { found:false, confidence:1.0 }
  }

  private async byName(name:string): Promise<PatientLookupResult> {
    // const { data } = await supabase.from('patients').select('*').ilike('name',`%${name}%`)
    return { found:false, confidence:0.5 }
  }
}

export const patientLookupSkill = new PatientLookupSkill()
