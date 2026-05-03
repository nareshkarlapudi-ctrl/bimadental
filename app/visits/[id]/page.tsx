import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AppLayout from '@/components/layout/AppLayout'
import { getVisit } from '@/services/visits'
import type { User } from '@/types'
import { formatDate, formatDateTime, getInitials } from '@/lib/utils'
import VisitPDFButtons from './VisitPDFButtons'
import { AlertTriangle, User as UserIcon, Stethoscope } from 'lucide-react'

interface PageProps {
  params: { id: string }
}

export default async function VisitDetailPage({ params }: PageProps) {
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

  const visit = await getVisit(params.id)
  if (!visit) notFound()

  const patient = visit.patient
  const doctor = visit.doctor as { name?: string } | undefined

  return (
    <AppLayout user={user}>
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={patient ? `/patients/${patient.id}` : '/patients'}
          className="text-sm text-teal-600 hover:underline"
        >
          ← {patient ? patient.name : 'Patients'}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="space-y-4">
          {/* Patient card */}
          {patient && (
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold">
                  {getInitials(patient.name)}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{patient.name}</p>
                  <p className="text-sm text-gray-500">
                    {patient.age} yrs ·{' '}
                    {patient.gender.charAt(0).toUpperCase() +
                      patient.gender.slice(1)}
                  </p>
                  <p className="text-sm text-gray-500">{patient.phone}</p>
                </div>
              </div>
              {patient.allergies && (
                <div className="flex items-start gap-2 bg-red-50 rounded-lg p-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700 font-semibold">
                    ALLERGIES: {patient.allergies}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Visit metadata */}
          <div className="card p-5 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Visit Date
              </p>
              <p className="text-sm text-gray-800">
                {formatDateTime(visit.created_at)}
              </p>
            </div>
            {doctor?.name && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Doctor
                </p>
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  <p className="text-sm text-gray-800">Dr. {doctor.name}</p>
                </div>
              </div>
            )}
            {/* PDF Buttons */}
            {patient && <VisitPDFButtons patient={patient} visit={visit} />}
          </div>
        </div>

        {/* Right */}
        <div className="lg:col-span-2 space-y-5">
          {/* Diagnosis */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Diagnosis
            </p>
            <p className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap">
              {visit.diagnosis}
            </p>
          </div>

          {/* Treatment Notes */}
          {visit.treatment_notes && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Treatment Notes
              </p>
              <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                {visit.treatment_notes}
              </p>
            </div>
          )}

          {/* Medicines */}
          {visit.medicines && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Medicines / Prescription
              </p>
              <div className="font-mono text-sm text-gray-800 space-y-1">
                {visit.medicines.split('\n').filter(Boolean).map((med, i) => (
                  <p key={i}>
                    {i + 1}. {med}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Images */}
          {visit.images && visit.images.length > 0 && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Clinical Images ({visit.images.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visit.images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                      <Image
                        src={url}
                        alt={`Visit image ${i + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
