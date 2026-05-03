'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { PageHeader, Loading } from '@/components/ui'
import { checkIn, checkOut, getTodayAttendance } from '@/services/clinic'
import { createClient } from '@/lib/supabase/client'
import type { Attendance, User } from '@/types'
import { formatTime } from '@/lib/utils'
import { Clock, LogIn, LogOut, CheckCircle } from 'lucide-react'

function getDuration(checkIn: string, checkOut?: string): string {
  const start = new Date(checkIn).getTime()
  const end = checkOut ? new Date(checkOut).getTime() : Date.now()
  const diffMs = end - start
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export default function AttendancePage() {
  const [user, setUser] = useState<User | null>(null)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [myRecord, setMyRecord] = useState<Attendance | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadAttendance = useCallback(async () => {
    const data = await getTodayAttendance()
    setAttendance(data)
    return data
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user: au } }) => {
      if (au) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', au.id)
          .maybeSingle()
        const u = data as User | null
        setUser(u)

        const records = await loadAttendance()
        setLoading(false)
        if (u) {
          const mine = records.find(
            (r) => r.user_id === u.id && !r.check_out
          )
          setMyRecord(mine || null)
        }
      }
    })
  }, [loadAttendance])

  async function handleCheckIn() {
    if (!user) return
    setActionLoading(true)
    try {
      const record = await checkIn(user.id)
      setMyRecord(record)
      await loadAttendance()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCheckOut() {
    if (!user) return
    setActionLoading(true)
    try {
      await checkOut(user.id)
      setMyRecord(null)
      await loadAttendance()
    } finally {
      setActionLoading(false)
    }
  }

  const roleBadgeColor: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    doctor: 'bg-teal-100 text-teal-700',
    staff: 'bg-blue-100 text-blue-700',
  }

  return (
    <AppLayout user={user}>
      <PageHeader title="Attendance" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* My Attendance Card */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            My Attendance
          </h2>
          {myRecord ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-green-50 rounded-xl p-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-bold text-green-800">Checked In</p>
                  <p className="text-sm text-green-700">
                    Since {formatTime(myRecord.check_in)} ·{' '}
                    {getDuration(myRecord.check_in)} ago
                  </p>
                </div>
              </div>
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {actionLoading ? 'Checking out…' : 'Check Out'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                You have not checked in today yet.
              </p>
              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {actionLoading ? 'Checking in…' : 'Check In'}
              </button>
            </div>
          )}
        </div>

        {/* Face Recognition Placeholder */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-800 mb-4">Face Recognition</h2>
          <div className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center py-12 text-center text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <span className="text-2xl">👤</span>
            </div>
            <p className="font-semibold text-gray-500">Face Recognition</p>
            <p className="text-sm mt-1">Coming Soon</p>
          </div>
        </div>
      </div>

      {/* Today's Attendance Table */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Today&apos;s Attendance ({attendance.length})
        </h2>
        {loading ? (
          <Loading />
        ) : attendance.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            <p className="text-sm">No attendance records for today.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Staff Member
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Role
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Check In
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Check Out
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attendance.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {record.user?.name ?? 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                            roleBadgeColor[record.user?.role ?? 'staff']
                          }`}
                        >
                          {record.user?.role ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatTime(record.check_in)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {record.check_out ? (
                          formatTime(record.check_out)
                        ) : (
                          <span className="text-green-600 font-semibold">
                            Present
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {getDuration(record.check_in, record.check_out)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
