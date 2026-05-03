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
        if (rx.includes(d)) critical.push(`ALLERGY: patient allergic to ${allergen}, ${d} may cross-react.`)

  for (const ix of INTERACTIONS)
    if (ix.drugs.every(d=>all.includes(d)))
      ix.sev==='critical' ? critical.push(ix.msg) : warnings.push(ix.msg)

  return { safe:critical.length===0, warnings, criticalAlerts:critical }
}
