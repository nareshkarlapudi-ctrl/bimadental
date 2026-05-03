import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import PatientSearch from '@/components/modules/PatientSearch'
import { StatCard, AlertBanner, PageHeader } from '@/components/ui'
import {
  getTodayRevenue,
  getMonthlyRevenue,
  getPatientInvoices,
} from '@/services/invoices'
import { getPendingInvoices } from '@/services/invoices'
import { getMonthlyExpenses } from '@/services/clinic'
import { getLowStockItems, getUpcomingServiceEquipment, getFeedback, getTodayAttendance } from '@/services/clinic'
import { getTodayVisits } from '@/services/visits'
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Clock,
  Package,
  Wrench,
  Star,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency, formatTime } from '@/lib/utils'
import type { User } from '@/types'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
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

  const [
    todayRevenue,
    monthlyRevenue,
    monthlyExpenses,
    pendingInvoices,
    lowStockItems,
    upcomingService,
    todayVisits,
    allFeedback,
  ] = await Promise.all([
    getTodayRevenue(),
    getMonthlyRevenue(),
    getMonthlyExpenses(),
    getPendingInvoices(),
    getLowStockItems(),
    getUpcomingServiceEquipment(),
    getTodayVisits(),
    getFeedback(),
  ])

  const netProfit = monthlyRevenue - monthlyExpenses
  const pendingAmount = pendingInvoices.reduce((s, i) => s + Number(i.amount), 0)
  const avgRating =
    allFeedback.length > 0
      ? (allFeedback.reduce((s, f) => s + f.rating, 0) / allFeedback.length).toFixed(1)
      : '—'

  const todayStr = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <AppLayout user={user}>
      <PageHeader
        title={`${getGreeting()}, ${user?.name?.split(' ')[0] || 'Doctor'}`}
        subtitle={todayStr}
      />

      {pendingInvoices.length > 0 && (
        <AlertBanner
          type="warning"
          message={`${pendingInvoices.length} pending invoice${pendingInvoices.length > 1 ? 's' : ''} — ${formatCurrency(pendingAmount)} outstanding`}
          action={{ label: 'View Billing', href: '/billing?status=pending' }}
        />
      )}

      {/* Patient Search */}
      <PatientSearch onNavigate />

      {/* Stats Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Today Revenue"
          value={formatCurrency(todayRevenue)}
          icon={<IndianRupee className="w-5 h-5" />}
          subtext="Paid today"
          color="teal"
        />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(monthlyRevenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          subtext="This month"
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
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Pending Amount"
          value={formatCurrency(pendingAmount)}
          icon={<Clock className="w-5 h-5" />}
          subtext={`${pendingInvoices.length} invoices`}
          color="amber"
        />
        <StatCard
          label="Low Stock Items"
          value={lowStockItems.length}
          icon={<Package className="w-5 h-5" />}
          subtext={lowStockItems.length > 0 ? 'Needs restock' : 'All stocked'}
          color={lowStockItems.length > 0 ? 'red' : 'green'}
        />
        <StatCard
          label="Service Alerts"
          value={upcomingService.length}
          icon={<Wrench className="w-5 h-5" />}
          subtext={upcomingService.length > 0 ? 'Due / Overdue' : 'All up to date'}
          color={upcomingService.length > 0 ? 'red' : 'green'}
        />
        <StatCard
          label="Avg Rating"
          value={avgRating === '—' ? '—' : `${avgRating} ★`}
          icon={<Star className="w-5 h-5" />}
          subtext={`${allFeedback.length} reviews`}
          color="teal"
        />
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Visits */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            Today&apos;s Visits ({todayVisits.length})
          </h2>
          {todayVisits.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No visits today yet.</p>
          ) : (
            <div className="space-y-3">
              {todayVisits.slice(0, 8).map((visit) => (
                <a
                  key={visit.id}
                  href={`/visits/${visit.id}`}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                    {visit.patient?.name?.charAt(0).toUpperCase() ?? 'P'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 group-hover:text-teal-700">
                      {visit.patient?.name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{visit.diagnosis}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatTime(visit.created_at)}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Alerts Panel */}
        <div className="space-y-4">
          {/* Low Stock */}
          {lowStockItems.length > 0 && (
            <div className="card p-5">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-red-500" />
                Low Stock ({lowStockItems.length})
              </h2>
              <div className="space-y-2">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.name}</span>
                    <span
                      className={
                        item.quantity === 0
                          ? 'badge-failed'
                          : 'badge-pending'
                      }
                    >
                      {item.quantity} left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equipment Due */}
          {upcomingService.length > 0 && (
            <div className="card p-5">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                Service Due ({upcomingService.length})
              </h2>
              <div className="space-y-2">
                {upcomingService.slice(0, 5).map((eq) => (
                  <div key={eq.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{eq.name}</span>
                    <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      {eq.next_service_date ?? 'No date'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Feedback */}
          {allFeedback.length > 0 && (
            <div className="card p-5">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-teal-600" />
                Recent Feedback
              </h2>
              <div className="space-y-3">
                {allFeedback.slice(0, 3).map((fb) => (
                  <div key={fb.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">
                        {fb.patient?.name ?? 'Anonymous'}
                      </span>
                      <span className="text-yellow-500">
                        {'★'.repeat(fb.rating)}
                        {'☆'.repeat(5 - fb.rating)}
                      </span>
                    </div>
                    {fb.comment && (
                      <p className="text-gray-500 text-xs mt-0.5 truncate">
                        {fb.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {lowStockItems.length === 0 && upcomingService.length === 0 && allFeedback.length === 0 && (
            <div className="card p-5 flex items-center gap-3 text-gray-400">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">No alerts right now. All good!</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
