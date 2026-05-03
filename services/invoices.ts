'use server'

import { createClient } from '@/lib/supabase/server'
import type { Invoice } from '@/types'

export async function createInvoice(data: {
  patient_id: string
  visit_id?: string
  amount: number
  items?: { name: string; price: number }[]
}): Promise<Invoice> {
  const supabase = createClient()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert([
      {
        patient_id: data.patient_id,
        visit_id: data.visit_id,
        amount: data.amount,
        status: 'pending',
      },
    ])
    .select()
    .single()
  if (error) throw new Error(error.message)

  if (data.items && data.items.length > 0) {
    const itemRows = data.items.map((item) => ({
      invoice_id: invoice.id,
      name: item.name,
      price: item.price,
    }))
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemRows)
    if (itemsError) console.error('createInvoice items error:', itemsError)
  }

  return invoice as Invoice
}

export async function markInvoicePaid(
  id: string,
  paymentNote?: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_note: paymentNote || null,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function markInvoiceFailed(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'failed' })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getAllInvoices(): Promise<Invoice[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('invoices')
      .select('*, patient:patients(*), items:invoice_items(*)')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('getAllInvoices error:', error)
      return []
    }
    return (data as Invoice[]) || []
  } catch (err) {
    console.error('getAllInvoices exception:', err)
    return []
  }
}

export async function getPendingInvoices(): Promise<Invoice[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('invoices')
      .select('*, patient:patients(*), items:invoice_items(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('getPendingInvoices error:', error)
      return []
    }
    return (data as Invoice[]) || []
  } catch (err) {
    console.error('getPendingInvoices exception:', err)
    return []
  }
}

export async function getTodayRevenue(): Promise<number> {
  try {
    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data, error } = await supabase
      .from('invoices')
      .select('amount')
      .eq('status', 'paid')
      .gte('paid_at', today.toISOString())
      .lt('paid_at', tomorrow.toISOString())
    if (error) {
      console.error('getTodayRevenue error:', error)
      return 0
    }
    return ((data as { amount: number }[]) || []).reduce(
      (sum, row) => sum + Number(row.amount),
      0
    )
  } catch (err) {
    console.error('getTodayRevenue exception:', err)
    return 0
  }
}

export async function getMonthlyRevenue(): Promise<number> {
  try {
    const supabase = createClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const { data, error } = await supabase
      .from('invoices')
      .select('amount')
      .eq('status', 'paid')
      .gte('paid_at', startOfMonth.toISOString())
      .lt('paid_at', startOfNextMonth.toISOString())
    if (error) {
      console.error('getMonthlyRevenue error:', error)
      return 0
    }
    return ((data as { amount: number }[]) || []).reduce(
      (sum, row) => sum + Number(row.amount),
      0
    )
  } catch (err) {
    console.error('getMonthlyRevenue exception:', err)
    return 0
  }
}

export async function getPatientInvoices(patientId: string): Promise<Invoice[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('invoices')
      .select('*, patient:patients(*), items:invoice_items(*)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('getPatientInvoices error:', error)
      return []
    }
    return (data as Invoice[]) || []
  } catch (err) {
    console.error('getPatientInvoices exception:', err)
    return []
  }
}
