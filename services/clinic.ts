'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  Expense,
  InventoryItem,
  Equipment,
  Attendance,
  Feedback,
} from '@/types'

// ============================================================
// EXPENSES
// ============================================================

export async function getExpenses(): Promise<Expense[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('getExpenses error:', error)
      return []
    }
    return (data as Expense[]) || []
  } catch (err) {
    console.error('getExpenses exception:', err)
    return []
  }
}

export async function getMonthlyExpenses(): Promise<number> {
  try {
    const supabase = createClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .gte('created_at', startOfMonth.toISOString())
      .lt('created_at', startOfNextMonth.toISOString())
    if (error) {
      console.error('getMonthlyExpenses error:', error)
      return 0
    }
    return ((data as { amount: number }[]) || []).reduce(
      (sum, row) => sum + Number(row.amount),
      0
    )
  } catch (err) {
    console.error('getMonthlyExpenses exception:', err)
    return 0
  }
}

export async function createExpense(
  data: Omit<Expense, 'id' | 'created_at'>
): Promise<Expense> {
  const supabase = createClient()
  const { data: created, error } = await supabase
    .from('expenses')
    .insert([data])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return created as Expense
}

// ============================================================
// INVENTORY
// ============================================================

export async function getInventory(): Promise<InventoryItem[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('name', { ascending: true })
    if (error) {
      console.error('getInventory error:', error)
      return []
    }
    return (data as InventoryItem[]) || []
  } catch (err) {
    console.error('getInventory exception:', err)
    return []
  }
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .filter('quantity', 'lte', 'threshold')
    if (error) {
      // Fallback: fetch all and filter in JS
      const all = await getInventory()
      return all.filter((item) => item.quantity <= item.threshold)
    }
    if (!data || data.length === 0) {
      // Supabase column filter may not work for two columns, do JS filter
      const all = await getInventory()
      return all.filter((item) => item.quantity <= item.threshold)
    }
    return (data as InventoryItem[]) || []
  } catch (err) {
    console.error('getLowStockItems exception:', err)
    return []
  }
}

export async function createInventoryItem(
  data: Omit<InventoryItem, 'id'>
): Promise<InventoryItem> {
  const supabase = createClient()
  const { data: created, error } = await supabase
    .from('inventory')
    .insert([data])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return created as InventoryItem
}

export async function updateInventoryQuantity(
  id: string,
  quantity: number
): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('inventory')
      .update({ quantity })
      .eq('id', id)
    if (error) console.error('updateInventoryQuantity error:', error)
  } catch (err) {
    console.error('updateInventoryQuantity exception:', err)
  }
}

// ============================================================
// EQUIPMENT
// ============================================================

export async function getEquipment(): Promise<Equipment[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('name', { ascending: true })
    if (error) {
      console.error('getEquipment error:', error)
      return []
    }
    return (data as Equipment[]) || []
  } catch (err) {
    console.error('getEquipment exception:', err)
    return []
  }
}

export async function getUpcomingServiceEquipment(): Promise<Equipment[]> {
  try {
    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in30Days = new Date(today)
    in30Days.setDate(in30Days.getDate() + 30)

    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .not('next_service_date', 'is', null)
      .lte('next_service_date', in30Days.toISOString().split('T')[0])
      .order('next_service_date', { ascending: true })
    if (error) {
      console.error('getUpcomingServiceEquipment error:', error)
      return []
    }
    return (data as Equipment[]) || []
  } catch (err) {
    console.error('getUpcomingServiceEquipment exception:', err)
    return []
  }
}

export async function createEquipment(
  data: Omit<Equipment, 'id' | 'created_at'>
): Promise<Equipment> {
  const supabase = createClient()
  const { data: created, error } = await supabase
    .from('equipment')
    .insert([data])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return created as Equipment
}

export async function updateEquipment(
  id: string,
  updates: Partial<Equipment>
): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('equipment')
      .update(updates)
      .eq('id', id)
    if (error) console.error('updateEquipment error:', error)
  } catch (err) {
    console.error('updateEquipment exception:', err)
  }
}

// ============================================================
// ATTENDANCE
// ============================================================

export async function checkIn(userId: string): Promise<Attendance> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('attendance')
    .insert([{ user_id: userId, check_in: new Date().toISOString() }])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Attendance
}

export async function checkOut(userId: string): Promise<void> {
  const supabase = createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find the open attendance record for today
  const { data: record, error: findError } = await supabase
    .from('attendance')
    .select('id')
    .eq('user_id', userId)
    .is('check_out', null)
    .gte('check_in', today.toISOString())
    .order('check_in', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findError) {
    console.error('checkOut find error:', findError)
    return
  }
  if (!record) return

  const { error } = await supabase
    .from('attendance')
    .update({ check_out: new Date().toISOString() })
    .eq('id', record.id)
  if (error) console.error('checkOut update error:', error)
}

export async function getTodayAttendance(): Promise<Attendance[]> {
  try {
    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data, error } = await supabase
      .from('attendance')
      .select('*, user:users(*)')
      .gte('check_in', today.toISOString())
      .lt('check_in', tomorrow.toISOString())
      .order('check_in', { ascending: true })
    if (error) {
      console.error('getTodayAttendance error:', error)
      return []
    }
    return (data as Attendance[]) || []
  } catch (err) {
    console.error('getTodayAttendance exception:', err)
    return []
  }
}

// ============================================================
// FEEDBACK
// ============================================================

export async function createFeedback(
  data: Omit<Feedback, 'id' | 'created_at'>
): Promise<Feedback> {
  const supabase = createClient()
  const { data: created, error } = await supabase
    .from('feedback')
    .insert([data])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return created as Feedback
}

export async function getFeedback(): Promise<Feedback[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('feedback')
      .select('*, patient:patients(*)')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('getFeedback error:', error)
      return []
    }
    return (data as Feedback[]) || []
  } catch (err) {
    console.error('getFeedback exception:', err)
    return []
  }
}
