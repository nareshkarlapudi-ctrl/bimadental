'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Phone,
  User,
  Plus,
  Edit2,
  ChevronRight,
  FileText,
} from 'lucide-react'
import { Modal, StatusBadge } from '@/components/ui'
import PaymentModal from '@/components/modules/PaymentModal'
import { updatePatient } from '@/services/patients'
import type { Patient, Visit, Invoice, Gender } from '@/types'
import { formatDate, formatCurrency, getInitials } from '@/lib/utils'

interface Props {
  patient: Patient
  visits: Visit[]
  invoices: Invoice[]
  totalSpent: number
}

export default function PatientDetailClient({
  patient: initialPatient,
  visits,
  invoices,
  totalSpent,
}: Props) {
  const router = useRouter()
  const [patient, setPatient] = useState(initialPatient)
  const [editOpen, setEditOpen] = useState(false)
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null)

  // Edit form state
  const [name, setName] = useState(patient.name)
  const [age, setAge] = useState(String(patient.age))
  const [gender, setGender] = useState<Gender>(patient.gender)
  const [phone, setPhone] = useState(patient.phone)
  const [medicalHistory, setMedicalHistory] = useState(
    patient.medical_history ?? ''
  )
  const [allergies, setAllergies] = useState(patient.allergies ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await updatePatient(patient.id, {
      name: name.trim(),
      age: parseInt(age),
      gender,
      phone: phone.trim(),
      medical_history: medicalHistory || undefined,
      allergies: allergies || undefined,
    })
    setPatient({
      ...patient,
      name: name.trim(),
      age: parseInt(age),
      gender,
      phone: phone.trim(),
      medical_history: medicalHistory || undefined,
      allergies: allergies || undefined,
    })
    setSaving(false)
    setEditOpen(false)
  }

  const pendingInvoices = invoices.filter((i) => i.status === 'pending')

  return (
    <div>
      {/* Back */}
      <Link
        href="/patients"
        className="text-sm text-teal-600 hover:underline mb-4 inline-flex items-center gap-1"
      >
        ← Patients
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* Left — Patient Card */}
        <div className="space-y-4">
          <div className="card p-6">
            {/* Avatar */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-20 h-20 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-2xl mb-3">
                {getInitials(patient.name)}
              </div>
              <h1 className="text-xl font-bold text-gray-900">{patient.name}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {patient.age} yrs &bull;{' '}
                {patient.gender.charAt(0).toUpperCase() +
                  patient.gender.slice(1)}
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-gray-500 text-sm">
                <Phone className="w-3.5 h-3.5" />
                {patient.phone}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Since {formatDate(patient.created_at)}
              </p>
            </div>

            {/* Allergies */}
            {patient.allergies && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide">
                      Allergies
                    </p>
                    <p className="text-sm text-red-800 mt-0.5">
                      {patient.allergies}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Medical History */}
            {patient.medical_history && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Medical History
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {patient.medical_history}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-teal-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-teal-700">
                  {visits.length}
                </p>
                <p className="text-xs text-teal-600">Visits</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-700">
                  {formatCurrency(totalSpent)}
                </p>
                <p className="text-xs text-green-600">Total Paid</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setEditOpen(true)}
                className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <Link
                href={`/visits/new?patient=${patient.id}`}
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                New Visit
              </Link>
            </div>
          </div>
        </div>

        {/* Right — History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visit History */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Visit History ({visits.length})
            </h2>
            {visits.length === 0 ? (
              <div className="card p-8 text-center text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No visits yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visits.map((visit) => (
                  <div key={visit.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-400">
                            {formatDate(visit.created_at)}
                          </span>
                          {visit.doctor && (
                            <span className="text-xs text-gray-400">
                              · Dr. {(visit.doctor as { name?: string }).name}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900 mb-1">
                          {visit.diagnosis}
                        </p>
                        {visit.treatment_notes && (
                          <p className="text-sm text-gray-600 truncate">
                            {visit.treatment_notes}
                          </p>
                        )}
                        {visit.medicines && (
                          <span className="inline-block mt-1.5 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            Rx: {visit.medicines.split('\n')[0]}
                            {visit.medicines.split('\n').length > 1 ? ' …' : ''}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/visits/${visit.id}`}
                        className="flex-shrink-0 btn-secondary text-xs px-3 py-2 flex items-center gap-1"
                      >
                        View <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Billing History */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Billing History ({invoices.length})
            </h2>
            {invoices.length === 0 ? (
              <div className="card p-8 text-center text-gray-400">
                <p className="text-sm">No invoices yet.</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between px-4 py-3 gap-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          Invoice #{invoice.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(invoice.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={invoice.status} />
                        <span className="font-bold text-teal-700">
                          {formatCurrency(Number(invoice.amount))}
                        </span>
                        {invoice.status === 'pending' && (
                          <button
                            onClick={() => setPayInvoice(invoice)}
                            className="btn-primary text-xs px-3 py-2"
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
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Patient"
        size="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Age *</label>
              <input
                type="number"
                required
                min={1}
                max={150}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="input"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Allergies</label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="input"
              placeholder="e.g. Penicillin, Aspirin"
            />
          </div>
          <div>
            <label className="label">Medical History</label>
            <textarea
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              className="input resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      {payInvoice && (
        <PaymentModal
          isOpen={!!payInvoice}
          onClose={() => setPayInvoice(null)}
          invoiceId={payInvoice.id}
          amount={Number(payInvoice.amount)}
          patientName={patient.name}
          onPaid={() => router.refresh()}
        />
      )}
    </div>
  )
}
