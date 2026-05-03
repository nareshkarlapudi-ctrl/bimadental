'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { PageHeader, StatCard, Loading } from '@/components/ui'
import { getAllInvoices, getMonthlyRevenue } from '@/services/invoices'
import { getExpenses, getMonthlyExpenses } from '@/services/clinic'
import { getTodayVisits } from '@/services/visits'
import { createClient } from '@/lib/supabase/client'
import type { Invoice, Expense, User } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  IndianRupee,
  TrendingDown,
  TrendingUp,
  Activity,
  Download,
} from 'lucide-react'

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [allInvoices, setAllInvoices] = useState<Invoice[]>([])
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [monthlyExpenses, setMonthlyExpenses] = useState(0)
  const [visitCount, setVisitCount] = useState(0)

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
    const [invoices, expenses, monthly, monthExp, visits] = await Promise.all([
      getAllInvoices(),
      getExpenses(),
      getMonthlyRevenue(),
      getMonthlyExpenses(),
      getTodayVisits(),
    ])
    setAllInvoices(invoices)
    setAllExpenses(expenses)
    setMonthlyRevenue(monthly)
    setMonthlyExpenses(monthExp)
    setVisitCount(visits.length)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter invoices for selected date
  const dailyPaid = allInvoices.filter((i) => {
    if (i.status !== 'paid' || !i.paid_at) return false
    return i.paid_at.startsWith(selectedDate)
  })
  const dailyPending = allInvoices.filter((i) => {
    if (i.status !== 'pending') return false
    return i.created_at.startsWith(selectedDate)
  })
  const dailyExpenses = allExpenses.filter((e) =>
    e.created_at.startsWith(selectedDate)
  )
  const dailyRevenue = dailyPaid.reduce((s, i) => s + Number(i.amount), 0)
  const dailyExpenseTotal = dailyExpenses.reduce(
    (s, e) => s + Number(e.amount),
    0
  )

  const netProfit = monthlyRevenue - monthlyExpenses

  function handleExport() {
    const lines: string[] = [
      `============================`,
      `    ${process.env.NEXT_PUBLIC_CLINIC_NAME || 'ClinicOS'} — Report`,
      `    Date: ${selectedDate}`,
      `    Generated: ${new Date().toLocaleString('en-IN')}`,
      `============================`,
      ``,
      `MONTHLY SUMMARY`,
      `--------------`,
      `Revenue:        ${formatCurrency(monthlyRevenue)}`,
      `Expenses:       ${formatCurrency(monthlyExpenses)}`,
      `Net Profit:     ${formatCurrency(netProfit)}`,
      ``,
      `DAILY SUMMARY (${selectedDate})`,
      `-----------------------------`,
      `Revenue (paid): ${formatCurrency(dailyRevenue)}`,
      `Expenses:       ${formatCurrency(dailyExpenseTotal)}`,
      `Pending:        ${dailyPending.length} invoices`,
      ``,
      `PAID INVOICES`,
      `-------------`,
      ...dailyPaid.map(
        (i) =>
          `${formatDate(i.paid_at!)}  ${i.patient?.name ?? 'Unknown'} — ${formatCurrency(Number(i.amount))}`
      ),
      ``,
      `PENDING INVOICES`,
      `----------------`,
      ...dailyPending.map(
        (i) =>
          `${formatDate(i.created_at)}  ${i.patient?.name ?? 'Unknown'} — ${formatCurrency(Number(i.amount))}`
      ),
      ``,
      `EXPENSES`,
      `--------`,
      ...dailyExpenses.map(
        (e) =>
          `${formatDate(e.created_at)}  [${e.category}] ${e.title} — ${formatCurrency(Number(e.amount))}`
      ),
      ``,
      `============================`,
      `End of Report`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clinic-report-${selectedDate}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout user={user}>
      <PageHeader
        title="Reports"
        action={
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        }
      />

      {/* Monthly Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(monthlyRevenue)}
          icon={<IndianRupee className="w-5 h-5" />}
          subtext="Paid invoices"
          color="teal"
        />
        <StatCard
          label="Monthly Expenses"
          value={formatCurrency(monthlyExpenses)}
          icon={<TrendingDown className="w-5 h-5" />}
          subtext="This month"
          color="red"
        />
        <StatCard
          label="Net Profit"
          value={formatCurrency(netProfit)}
          icon={<TrendingUp className="w-5 h-5" />}
          subtext="Revenue - Expenses"
          color={netProfit >= 0 ? 'green' : 'red'}
        />
        <StatCard
          label="Today&apos;s Visits"
          value={visitCount}
          icon={<Activity className="w-5 h-5" />}
          subtext="Consultations today"
          color="teal"
        />
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-4 mb-6">
        <label className="label mb-0 flex-shrink-0">Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="input w-auto"
        />
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          {/* Daily Revenue Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Paid Revenue
              </p>
              <p className="text-2xl font-bold text-teal-600">
                {formatCurrency(dailyRevenue)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {dailyPaid.length} invoices
              </p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Pending
              </p>
              <p className="text-2xl font-bold text-amber-600">
                {dailyPending.length}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">invoices</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Expenses
              </p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(dailyExpenseTotal)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {dailyExpenses.length} entries
              </p>
            </div>
          </div>

          {/* Paid Invoices Table */}
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-3">
              Paid Invoices — {selectedDate}
            </h2>
            {dailyPaid.length === 0 ? (
              <div className="card p-5 text-center text-gray-400 text-sm">
                No paid invoices on this date.
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Patient
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Paid At
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dailyPaid.map((inv) => (
                      <tr key={inv.id}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {inv.patient?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {inv.paid_at ? formatDate(inv.paid_at) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-teal-600">
                          {formatCurrency(Number(inv.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pending Invoices Table */}
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-3">
              Pending Invoices — {selectedDate}
            </h2>
            {dailyPending.length === 0 ? (
              <div className="card p-5 text-center text-gray-400 text-sm">
                No pending invoices on this date.
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Patient
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Created
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dailyPending.map((inv) => (
                      <tr key={inv.id}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {inv.patient?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDate(inv.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-600">
                          {formatCurrency(Number(inv.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expenses Table */}
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-3">
              Expenses — {selectedDate}
            </h2>
            {dailyExpenses.length === 0 ? (
              <div className="card p-5 text-center text-gray-400 text-sm">
                No expenses recorded on this date.
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Title
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Category
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dailyExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {exp.title}
                        </td>
                        <td className="px-4 py-3 text-gray-500 capitalize">
                          {exp.category}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">
                          {formatCurrency(Number(exp.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
