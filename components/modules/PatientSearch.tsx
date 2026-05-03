'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, User, AlertTriangle, Plus, ChevronRight } from 'lucide-react'
import { searchPatientByPhone, createPatient } from '@/services/patients'
import type { Patient, Gender } from '@/types'
import { Loading } from '@/components/ui'

interface PatientSearchProps {
  onPatientFound?: (patient: Patient) => void
  onNavigate?: boolean
}

type SearchState = 'idle' | 'loading' | 'found' | 'not_found' | 'creating'

export default function PatientSearch({
  onPatientFound,
  onNavigate = true,
}: PatientSearchProps) {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [state, setState] = useState<SearchState>('idle')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Create form state
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [allergies, setAllergies] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return
    setState('loading')
    const found = await searchPatientByPhone(phone.trim())
    if (found) {
      setPatient(found)
      setState('found')
      if (onPatientFound) onPatientFound(found)
    } else {
      setState('not_found')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !age) return
    setState('creating')
    setCreateError(null)
    try {
      const newPatient = await createPatient({
        name: name.trim(),
        phone: phone.trim(),
        age: parseInt(age),
        gender,
        medical_history: medicalHistory || undefined,
        allergies: allergies || undefined,
      })
      setPatient(newPatient)
      setState('found')
      if (onPatientFound) onPatientFound(newPatient)
      if (onNavigate) {
        router.push(`/patients/${newPatient.id}`)
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create patient')
      setState('not_found')
    }
  }

  function reset() {
    setPhone('')
    setState('idle')
    setPatient(null)
    setShowCreateForm(false)
    setName('')
    setAge('')
    setGender('male')
    setMedicalHistory('')
    setAllergies('')
    setCreateError(null)
  }

  return (
    <div className="card p-4 mb-6">
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
        Quick Patient Lookup
      </h2>

      {/* Phone Search Form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            if (state !== 'idle') {
              setState('idle')
              setPatient(null)
              setShowCreateForm(false)
            }
          }}
          placeholder="Enter patient phone number…"
          className="input flex-1"
          autoFocus
        />
        <button
          type="submit"
          disabled={!phone.trim() || state === 'loading'}
          className="btn-primary flex items-center gap-2 px-5"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </form>

      {/* Loading */}
      {state === 'loading' && (
        <div className="mt-4">
          <Loading />
        </div>
      )}

      {/* Found */}
      {state === 'found' && patient && (
        <div className="mt-4 bg-teal-50 border border-teal-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-base">{patient.name}</p>
                <p className="text-sm text-gray-600">
                  {patient.age} yrs &bull;{' '}
                  {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}
                </p>
                {patient.allergies && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-red-600">
                      ALLERGIES: {patient.allergies}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {onNavigate && (
              <button
                onClick={() => router.push(`/patients/${patient.id}`)}
                className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1.5"
              >
                Open Profile
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => router.push(`/visits/new?patient=${patient.id}`)}
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Visit
            </button>
          </div>
          <button onClick={reset} className="mt-2 text-xs text-teal-600 hover:underline">
            Search again
          </button>
        </div>
      )}

      {/* Not Found */}
      {state === 'not_found' && !showCreateForm && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600 mb-3">
            No patient found with phone <strong>{phone}</strong>.
          </p>
          {createError && (
            <p className="text-xs text-red-600 mb-2">{createError}</p>
          )}
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary text-sm"
          >
            <Plus className="w-4 h-4 inline mr-1.5" />
            Register Patient
          </button>
          <button onClick={reset} className="ml-3 text-sm text-gray-500 hover:underline">
            Cancel
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Patient full name"
              />
            </div>
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
                placeholder="Age in years"
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
            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                readOnly
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
            <div className="sm:col-span-2">
              <label className="label">Medical History</label>
              <textarea
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                className="input resize-none"
                rows={3}
                placeholder="Any existing conditions, previous treatments…"
              />
            </div>
          </div>
          {createError && (
            <p className="text-sm text-red-600">{createError}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={state === 'creating'}
              className="btn-primary flex-1"
            >
              {state === 'creating' ? 'Registering…' : 'Register Patient'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false)
                setState('not_found')
              }}
              className="btn-secondary"
            >
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
