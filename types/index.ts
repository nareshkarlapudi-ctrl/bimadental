export type Role = 'admin' | 'doctor' | 'staff'
export type Gender = 'male' | 'female' | 'other'
export type InvoiceStatus = 'pending' | 'paid' | 'failed'
export type PaymentMode = 'upi' | 'cash' | 'card' | 'other'
export type ExpenseCategory = 'salary' | 'rent' | 'supplies' | 'equipment' | 'other'

export interface User {
  id: string
  name: string
  role: Role
  phone?: string
  email: string
  created_at: string
}

export interface Patient {
  id: string
  name: string
  phone: string
  age: number
  gender: Gender
  medical_history?: string
  allergies?: string
  created_at: string
}

export interface Visit {
  id: string
  patient_id: string
  doctor_id: string
  diagnosis: string
  treatment_notes?: string
  medicines?: string
  images?: string[]
  created_at: string
  patient?: Patient
  doctor?: User
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  name: string
  price: number
}

export interface Invoice {
  id: string
  patient_id: string
  visit_id?: string
  amount: number
  status: InvoiceStatus
  payment_mode?: PaymentMode
  payment_note?: string
  created_at: string
  paid_at?: string
  patient?: Patient
  items?: InvoiceItem[]
}

export interface Expense {
  id: string
  title: string
  amount: number
  category: ExpenseCategory
  created_at: string
}

export interface InventoryItem {
  id: string
  name: string
  quantity: number
  expiry_date?: string
  threshold: number
}

export interface Equipment {
  id: string
  name: string
  last_service_date?: string
  next_service_date?: string
  notes?: string
  created_at: string
}

export interface Attendance {
  id: string
  user_id: string
  check_in: string
  check_out?: string
  user?: User
}

export interface Feedback {
  id: string
  patient_id: string
  rating: number
  comment?: string
  created_at: string
  patient?: Patient
}

export interface Treatment {
  name: string
  price: number
  category: string
}

export const TREATMENTS: Treatment[] = [
  { name: 'Consultation', price: 500, category: 'General' },
  { name: 'Dental Cleaning', price: 1500, category: 'Dental' },
  { name: 'Root Canal', price: 8000, category: 'Dental' },
  { name: 'Tooth Extraction', price: 2000, category: 'Dental' },
  { name: 'Dental Filling', price: 1500, category: 'Dental' },
  { name: 'Crown Placement', price: 12000, category: 'Dental' },
  { name: 'Teeth Whitening', price: 6000, category: 'Dental' },
  { name: 'Facial Treatment', price: 3000, category: 'Cosmetology' },
  { name: 'Acne Treatment', price: 2500, category: 'Cosmetology' },
  { name: 'Laser Hair Removal', price: 5000, category: 'Cosmetology' },
  { name: 'Chemical Peel', price: 4000, category: 'Cosmetology' },
  { name: 'Botox', price: 15000, category: 'Cosmetology' },
  { name: 'PRP Therapy', price: 8000, category: 'Cosmetology' },
]
