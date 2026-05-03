'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import PaymentModal from '@/components/modules/PaymentModal'
import { createClient } from '@/lib/supabase/client'
import { getPatient } from '@/services/patients'
import { createVisit, uploadVisitImage } from '@/services/visits'
import { createInvoice } from '@/services/invoices'
import type { Patient, User, Treatment } from '@/types'
import { TREATMENTS } from '@/types'
import { formatCurrency, getInitials } from '@/lib/utils'
import {
  Sparkles,
  Plus,
  Minus,
  X,
  Upload,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Loading } from '@/components/ui'

interface SelectedTreatment {
  treatment: Treatment
  qty: number
}

interface AISuggestion {
  differentials: Array<{
    name: string
    likelihood: string
    notes: string
  }>
  suggestedNotes: string
  prescriptionSuggestions: string[]
  redFlags: string[]
}

// Medicine chips based on keyword
function getMedicineChips(diagnosis: string): string[] {
  const d = diagnosis.toLowerCase()
  if (d.includes('cav') || d.includes('filling')) {
    return ['Ibuprofen 400mg TDS x 3d', 'Amoxicillin 500mg TDS x 5d', 'Chlorhexidine mouthwash BD']
  }
  if (d.includes('root canal') || d.includes('pulp')) {
    return ['Amoxicillin 500mg TDS x 7d', 'Ibuprofen 600mg BD x 5d', 'Metronidazole 400mg TDS x 5d']
  }
  if (d.includes('acne')) {
    return ['Tretinoin 0.025% cream OD night', 'Clindamycin gel BD', 'Sunscreen SPF50 OD morning']
  }
  if (d.includes('whitening') || d.includes('bleach')) {
    return ['Fluoride gel OD', 'Desensitizing toothpaste BD']
  }
  if (d.includes('extract')) {
    return ['Ibuprofen 400mg TDS x 5d', 'Amoxicillin 500mg TDS x 5d', 'Chlorhexidine mouthwash BD x 7d']
  }
  if (d.includes('facial') || d.includes('peel')) {
    return ['Sunscreen SPF50 OD', 'Moisturizer BD', 'Avoid sun exposure']
  }
  return ['Ibuprofen 400mg TDS x 3d', 'Paracetamol 500mg SOS']
}

const TREATMENT_CATEGORIES = ['General', 'Dental', 'Cosmetology']

export default function NewVisitPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patient')

  const [user, setUser] = useState<User | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loadingPatient, setLoadingPatient] = useState(true)

  // Form state
  const [diagnosis, setDiagnosis] = useState('')
  const [treatmentNotes, setTreatmentNotes] = useState('')
  const [medicines, setMedicines] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)

  // Billing
  const [selectedTreatments, setSelectedTreatments] = useState<SelectedTreatment[]>([])
  const [customAmount, setCustomAmount] = useState('')
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  // AI
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  // Save state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [paymentModal, setPaymentModal] = useState<{
    invoiceId: string
    amount: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (!patientId) {
      setLoadingPatient(false)
      return
    }
    getPatient(patientId).then((p) => {
      setPatient(p)
      setLoadingPatient(false)
    })
  }, [patientId])

  const treatmentTotal = selectedTreatments.reduce(
    (s, st) => s + st.treatment.price * st.qty,
    0
  )
  const total = treatmentTotal + (parseFloat(customAmount) || 0)

  function addTreatment(t: Treatment) {
    setSelectedTreatments((prev) => {
      const existing = prev.find((st) => st.treatment.name === t.name)
      if (existing) {
        return prev.map((st) =>
          st.treatment.name === t.name ? { ...st, qty: st.qty + 1 } : st
        )
      }
      return [...prev, { treatment: t, qty: 1 }]
    })
  }

  function adjustQty(name: string, delta: number) {
    setSelectedTreatments((prev) =>
      prev
        .map((st) =>
          st.treatment.name === name ? { ...st, qty: st.qty + delta } : st
        )
        .filter((st) => st.qty > 0)
    )
  }

  async function handleAISuggest() {
    if (!diagnosis.trim()) return
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: diagnosis, patientId: patient?.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI error')
      setAiSuggestion(data)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI request failed')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImage(true)
    try {
      // We need a visit ID first — for now we'll store files temporarily and upload on save
      // Use a temp visit ID placeholder
      const file = files[0]
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        setImageUrls((prev) => [...prev, dataUrl])
      }
      reader.readAsDataURL(file)
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSave(collectPayment: boolean) {
    if (!diagnosis.trim()) return
    if (!user) return
    setSaving(true)
    setSaveError(null)

    try {
      const visit = await createVisit({
        patient_id: patientId || '',
        doctor_id: user.id,
        diagnosis: diagnosis.trim(),
        treatment_notes: treatmentNotes || undefined,
        medicines: medicines || undefined,
        images: [],
      })

      if (collectPayment && total > 0) {
        const items =
          selectedTreatments.length > 0
            ? selectedTreatments.map((st) => ({
                name: st.treatment.name,
                price: st.treatment.price * st.qty,
              }))
            : undefined

        const invoice = await createInvoice({
          patient_id: patientId || '',
          visit_id: visit.id,
          amount: total,
          items,
        })

        setPaymentModal({ invoiceId: invoice.id, amount: total })
      } else {
        router.push(`/visits/${visit.id}`)
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save visit')
    } finally {
      setSaving(false)
    }
  }

  if (loadingPatient) return (
    <AppLayout user={user}><Loading /></AppLayout>
  )

  const medicineChips = diagnosis.length > 5 ? getMedicineChips(diagnosis) : []

  return (
    <AppLayout user={user}>
      <div className="mb-4">
        <button
          onClick={() => router.back()}
          className="text-sm text-teal-600 hover:underline"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">New Visit</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Patient + Billing */}
        <div className="space-y-4">
          {/* Patient Card */}
          {patient ? (
            <div className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
                  {getInitials(patient.name)}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{patient.name}</p>
                  <p className="text-sm text-gray-500">
                    {patient.age} yrs · {patient.gender}
                  </p>
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
          ) : (
            <div className="card p-4 text-center text-gray-400 text-sm">
              No patient selected.{' '}
              <a href="/patients" className="text-teal-600 hover:underline">
                Search patients
              </a>
            </div>
          )}

          {/* Billing */}
          <div className="card p-4">
            <p className="text-sm font-bold text-gray-700 mb-3">Billing</p>

            {/* Treatment Picker */}
            {TREATMENT_CATEGORIES.map((cat) => {
              const catItems = TREATMENTS.filter((t) => t.category === cat)
              const isOpen = openCategory === cat
              return (
                <div key={cat} className="mb-2">
                  <button
                    type="button"
                    onClick={() => setOpenCategory(isOpen ? null : cat)}
                    className="flex items-center justify-between w-full text-sm font-semibold text-gray-600 py-2 hover:text-teal-700"
                  >
                    <span>{cat}</span>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="space-y-1 mb-2">
                      {catItems.map((t) => (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => addTreatment(t)}
                          className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-teal-50 text-sm text-left"
                        >
                          <span className="text-gray-700">{t.name}</span>
                          <span className="text-teal-600 font-medium text-xs">
                            {formatCurrency(t.price)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Selected Treatments */}
            {selectedTreatments.length > 0 && (
              <div className="border-t border-gray-100 pt-3 mt-2 space-y-2">
                {selectedTreatments.map((st) => (
                  <div
                    key={st.treatment.name}
                    className="flex items-center gap-2 text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => adjustQty(st.treatment.name, -1)}
                      className="w-6 h-6 rounded flex items-center justify-center bg-gray-100 hover:bg-gray-200"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-medium">{st.qty}</span>
                    <button
                      type="button"
                      onClick={() => adjustQty(st.treatment.name, 1)}
                      className="w-6 h-6 rounded flex items-center justify-center bg-gray-100 hover:bg-gray-200"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="flex-1 text-gray-700 truncate">
                      {st.treatment.name}
                    </span>
                    <span className="text-gray-600 text-xs">
                      {formatCurrency(st.treatment.price * st.qty)}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustQty(st.treatment.name, -st.qty)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Custom amount */}
            <div className="mt-3">
              <label className="label text-xs">Custom Amount (₹)</label>
              <input
                type="number"
                min={0}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="input text-sm"
                placeholder="Additional charge"
              />
            </div>

            {/* Total */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="font-bold text-gray-800">Total</span>
              <span className="text-2xl font-bold text-teal-600">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Right — Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Diagnosis */}
          <div className="card p-5">
            <label className="label text-base">Diagnosis / Symptoms *</label>
            <textarea
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="input resize-none text-base"
              rows={4}
              placeholder="Enter diagnosis, chief complaint or clinical findings…"
            />

            {/* AI Suggest */}
            <button
              type="button"
              onClick={handleAISuggest}
              disabled={!diagnosis.trim() || aiLoading}
              className="mt-2 flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900 disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4" />
              {aiLoading ? 'Analyzing…' : 'AI Suggest'}
            </button>

            {aiError && (
              <p className="text-xs text-red-600 mt-1">{aiError}</p>
            )}

            {/* AI Panel */}
            {aiSuggestion && (
              <div className="mt-3 bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-teal-800 uppercase tracking-wide">
                  AI Differentials
                </p>
                {aiSuggestion.differentials.map((d) => (
                  <div key={d.name} className="flex items-start gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        d.likelihood === 'high'
                          ? 'bg-red-100 text-red-700'
                          : d.likelihood === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {d.likelihood}
                    </span>
                    <div>
                      <button
                        type="button"
                        onClick={() => setDiagnosis(d.name)}
                        className="text-sm font-semibold text-teal-800 hover:underline"
                      >
                        {d.name}
                      </button>
                      <p className="text-xs text-gray-600">{d.notes}</p>
                    </div>
                  </div>
                ))}
                {aiSuggestion.redFlags.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-2">
                    <p className="text-xs font-bold text-red-700">Red Flags:</p>
                    {aiSuggestion.redFlags.map((f) => (
                      <p key={f} className="text-xs text-red-600">
                        • {f}
                      </p>
                    ))}
                  </div>
                )}
                {aiSuggestion.suggestedNotes && (
                  <button
                    type="button"
                    onClick={() => setTreatmentNotes(aiSuggestion.suggestedNotes)}
                    className="text-xs text-teal-700 hover:underline"
                  >
                    Use suggested notes →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Treatment Notes */}
          <div className="card p-5">
            <label className="label">Treatment Notes</label>
            <textarea
              value={treatmentNotes}
              onChange={(e) => setTreatmentNotes(e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="Procedures done, observations…"
            />
          </div>

          {/* Medicines */}
          <div className="card p-5">
            <label className="label">Medicines / Prescription</label>
            {medicineChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {medicineChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() =>
                      setMedicines((prev) =>
                        prev ? `${prev}\n${chip}` : chip
                      )
                    }
                    className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100 font-medium"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            )}
            <textarea
              value={medicines}
              onChange={(e) => setMedicines(e.target.value)}
              className="input resize-none font-mono text-sm"
              rows={4}
              placeholder="Tab. Amoxicillin 500mg TDS × 5 days&#10;Tab. Ibuprofen 400mg SOS after food"
            />
          </div>

          {/* Images */}
          <div className="card p-5">
            <label className="label">Clinical Images</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative group aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Visit image ${i + 1}`}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setImageUrls((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-teal-400 hover:bg-teal-50 transition-colors text-gray-400 hover:text-teal-600"
              >
                <Upload className="w-5 h-5" />
                <span className="text-xs">Add Photo</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {saveError && (
            <p className="text-sm text-red-600 text-center">{saveError}</p>
          )}
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-56 bg-white border-t border-gray-100 px-4 py-3 flex gap-3 z-20">
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={saving || !diagnosis.trim()}
          className="btn-secondary flex-1"
        >
          Save Visit Only
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={saving || !diagnosis.trim() || total === 0}
          className="btn-primary flex-1"
        >
          {saving
            ? 'Saving…'
            : total > 0
            ? `Save & Collect ${formatCurrency(total)}`
            : 'Save & Collect'}
        </button>
      </div>

      {/* Extra bottom padding for sticky bar */}
      <div className="h-20" />

      {/* Payment Modal */}
      {paymentModal && (
        <PaymentModal
          isOpen={!!paymentModal}
          onClose={() => {
            setPaymentModal(null)
            router.push('/billing')
          }}
          invoiceId={paymentModal.invoiceId}
          amount={paymentModal.amount}
          patientName={patient?.name ?? 'Patient'}
          onPaid={() => {
            setTimeout(() => router.push('/dashboard'), 1800)
          }}
        />
      )}
    </AppLayout>
  )
}
