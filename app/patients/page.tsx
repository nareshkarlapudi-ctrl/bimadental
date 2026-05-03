'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import PatientSearch from '@/components/modules/PatientSearch'
import { PageHeader, Loading, EmptyState } from '@/components/ui'
import { getAllPatients } from '@/services/patients'
import { createClient } from '@/lib/supabase/client'
import type { Patient, User } from '@/types'
import { formatDate, getInitials } from '@/lib/utils'
import { Users, Search, AlertTriangle } from 'lucide-react'

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()
          .then(({ data }) => setUser(data as User | null))
      }
    })
  }, [])

  const loadPatients = useCallback(async () => {
    setLoading(true)
    const data = await getAllPatients()
    setPatients(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  const filtered = query.trim()
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.phone.includes(query)
      )
    : patients

  return (
    <AppLayout user={user}>
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} patient${patients.length !== 1 ? 's' : ''} registered`}
      />

      <PatientSearch onNavigate />

      {/* Filter input */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name or phone…"
          className="input pl-10"
        />
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No patients found"
          description={
            query
              ? 'No patients match your search.'
              : 'Register your first patient using the search above.'
          }
          action={
            query
              ? { label: 'Clear search', onClick: () => setQuery('') }
              : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Patient
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                    Phone
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                    Age / Gender
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                    Since
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Alerts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => router.push(`/patients/${patient.id}`)}
                    className="hover:bg-teal-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {getInitials(patient.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {patient.name}
                          </p>
                          <p className="text-xs text-gray-500 sm:hidden">
                            {patient.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                      {patient.phone}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {patient.age} yrs /{' '}
                      {patient.gender.charAt(0).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {formatDate(patient.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {patient.allergies ? (
                        <span
                          className="flex items-center gap-1 text-xs font-semibold text-red-600"
                          title={`Allergies: ${patient.allergies}`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Allergies</span>
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
