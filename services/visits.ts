'use server'

import { createClient } from '@/lib/supabase/server'
import type { Visit } from '@/types'

export async function createVisit(
  data: Omit<Visit, 'id' | 'created_at'>
): Promise<Visit> {
  const supabase = createClient()
  const insertData = {
    patient_id: data.patient_id,
    doctor_id: data.doctor_id,
    diagnosis: data.diagnosis,
    treatment_notes: data.treatment_notes,
    medicines: data.medicines,
    images: data.images || [],
  }
  const { data: created, error } = await supabase
    .from('visits')
    .insert([insertData])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return created as Visit
}

export async function getVisit(id: string): Promise<Visit | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('visits')
      .select('*, patient:patients(*), doctor:users(*)')
      .eq('id', id)
      .maybeSingle()
    if (error) {
      console.error('getVisit error:', error)
      return null
    }
    return data as Visit | null
  } catch (err) {
    console.error('getVisit exception:', err)
    return null
  }
}

export async function getPatientVisits(patientId: string): Promise<Visit[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('visits')
      .select('*, patient:patients(*), doctor:users(*)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('getPatientVisits error:', error)
      return []
    }
    return (data as Visit[]) || []
  } catch (err) {
    console.error('getPatientVisits exception:', err)
    return []
  }
}

export async function updateVisit(
  id: string,
  updates: Partial<Visit>
): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('visits').update(updates).eq('id', id)
    if (error) console.error('updateVisit error:', error)
  } catch (err) {
    console.error('updateVisit exception:', err)
  }
}

export async function getTodayVisits(): Promise<Visit[]> {
  try {
    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data, error } = await supabase
      .from('visits')
      .select('*, patient:patients(*)')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false })
    if (error) {
      console.error('getTodayVisits error:', error)
      return []
    }
    return (data as Visit[]) || []
  } catch (err) {
    console.error('getTodayVisits exception:', err)
    return []
  }
}

export async function uploadVisitImage(
  file: File,
  visitId: string
): Promise<string> {
  const supabase = createClient()
  const fileName = `${visitId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
  const { error: uploadError } = await supabase.storage
    .from('visit-images')
    .upload(fileName, file, { upsert: false })
  if (uploadError) throw new Error(uploadError.message)

  const { data } = supabase.storage
    .from('visit-images')
    .getPublicUrl(fileName)
  return data.publicUrl
}
