'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import PaymentModal from '@/components/modules/PaymentModal'
import { PageHeader, StatCard, StatusBadge, Loading, EmptyState } from '@/components/ui'
import { getAllInvoices, getTodayRevenue, getMonthlyRevenue } from '@/services/invoices'
import { createClient } from '@/lib/supabase/client'
import type { Invoice, User } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Receipt, IndianRupee, Clock } from 'lucide-react'

type FilterTab = 'all' | 'pending' | 'paid' | 'failed'

function BillingContent() {
  const searchParams = useSearchParams()
  const defaultTab = (searchParams.get('status') as FilterTab) || 'all'

  const [user, setUser] = useState<User | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<FilterTab>(defaultTab)
  const [todayRev, setTodayRev] = useState(0)
  const [monthlyRev, setMonthlyRev] = useState(0)
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: au } }) => {
      if (au) {
        supabase
          .from('users')
          .select('*')
          .eq('id', au.id)
          .maybeSingle()
          .then(({ data }) => setUser(data as User | null))
      }
    })
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [inv, today, monthly] = await Promise.all([
      getAllInvoices(),
      getTodayRevenue(),
      getMonthlyRevenue(),
    ])
    setInvoices(inv)
    setTodayRev(today)
    setMonthlyRev(monthly)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = tab === 'all' ? invoices : invoices.filter((i) => i.status === tab)
  const pendingInvoices = invoices.filter((i) => i.status === 'pending')
  const pendingAmount = pendingInvoices.reduce((s, i) => s + Number(i.amount), 0)

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: invoices.length },
    { key: 'pending', label: 'Pending', count: pendingInvoices.length },
    { key: 'paid', label: 'Paid', count: invoices.filter((i) => i.status === 'paid').length },
    { key: 'failed', label: 'Failed', count: invoices.filter((i) => i.status === 'failed').length },
  ]

  return (
    <AppLayout user={user}>
      <PageHeader title="Billing" />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Pending"
          value={formatCurrency(pendingAmount)}
          icon={<Clock className="w-5 h-5" />}
          subtext={`${pendingInvoices.length} invoices`}
          color="amber"
        />
        <StatCard
          label="Paid Today"
          value={formatCurrency(todayRev)}
          icon={<IndianRupee className="w-5 h-5" />}
          subtext="Revenue today"
          color="teal"
        />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(monthlyRev)}
          icon={<IndianRupee className="w-5 h-5" />}
          subtext="This month"
          color="green"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8" />}
          title="No invoices found"
          description="Invoices will appear here when visits are created."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between px-5 py-4 gap-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">
                      {invoice.patient?.name ?? 'Unknown Patient'}
                    </p>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(invoice.created_at)} ·{' '}
                    #{invoice.id.slice(0, 8).toUpperCase()}
                  </p>
                  {invoice.items && invoice.items.length > 0 && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {invoice.items.map((item) => item.name).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-lg font-bold text-teal-600">
                    {formatCurrency(Number(invoice.amount))}
                  </span>
                  {invoice.status === 'pending' && (
                    <button
                      onClick={() => setPayInvoice(invoice)}
                      className="btn-primary text-sm px-4 py-2"
                    >
                      Collect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {payInvoice && (
        <PaymentModal
          isOpen={!!payInvoice}
          onClose={() => setPayInvoice(null)}
          invoiceId={payInvoice.id}
          amount={Number(payInvoice.amount)}
          patientName={payInvoice.patient?.name ?? 'Patient'}
          onPaid={loadData}
        />
      )}
    </AppLayout>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loading /></div>}>
      <BillingContent />
    </Suspense>
  )
}
