import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { StatusBadge } from '@/components/ui'
import { getPatient, updatePatient } from '@/services/patients'
import { getPatientVisits } from '@/services/visits'
import { getPatientInvoices } from '@/services/invoices'
import { formatDate, formatCurrency, getInitials } from '@/lib/utils'
import type { User, Invoice } from '@/types'
import PatientDetailClient from './PatientDetailClient'

interface PageProps {
  params: { id: string }
}

export default async function PatientDetailPage({ params }: PageProps) {
  const supabase = createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser?.id ?? '')
    .maybeSingle()
  const user = profile as User | null

  const [patient, visits, invoices] = await Promise.all([
    getPatient(params.id),
    getPatientVisits(params.id),
    getPatientInvoices(params.id),
  ])

  if (!patient) notFound()

  const totalSpent = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + Number(i.amount), 0)

  return (
    <AppLayout user={user}>
      <PatientDetailClient
        patient={patient}
        visits={visits}
        invoices={invoices}
        totalSpent={totalSpent}
      />
    </AppLayout>
  )
}
