'use server'

import { createClient } from '@/lib/supabase/server'
import type { Patient } from '@/types'

export async function searchPatientByPhone(phone: string): Promise<Patient | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('phone', phone.trim())
      .maybeSingle()
    if (error) {
      console.error('searchPatientByPhone error:', error)
      return null
    }
    return data as Patient | null
  } catch (err) {
    console.error('searchPatientByPhone exception:', err)
    return null
  }
}

export async function getPatient(id: string): Promise<Patient | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) {
      console.error('getPatient error:', error)
      return null
    }
    return data as Patient | null
  } catch (err) {
    console.error('getPatient exception:', err)
    return null
  }
}

export async function getAllPatients(): Promise<Patient[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('getAllPatients error:', error)
      return []
    }
    return (data as Patient[]) || []
  } catch (err) {
    console.error('getAllPatients exception:', err)
    return []
  }
}

export async function createPatient(
  data: Omit<Patient, 'id' | 'created_at'>
): Promise<Patient> {
  const supabase = createClient()
  const { data: created, error } = await supabase
    .from('patients')
    .insert([data])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return created as Patient
}

export async function updatePatient(
  id: string,
  updates: Partial<Patient>
): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
    if (error) console.error('updatePatient error:', error)
  } catch (err) {
    console.error('updatePatient exception:', err)
  }
}

export async function searchPatients(query: string): Promise<Patient[]> {
  try {
    const supabase = createClient()
    const q = `%${query.trim()}%`
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`name.ilike.${q},phone.ilike.${q}`)
      .order('name', { ascending: true })
      .limit(50)
    if (error) {
      console.error('searchPatients error:', error)
      return []
    }
    return (data as Patient[]) || []
  } catch (err) {
    console.error('searchPatients exception:', err)
    return []
  }
}
