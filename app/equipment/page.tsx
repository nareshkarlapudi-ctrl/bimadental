'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { PageHeader, Modal, Loading, EmptyState } from '@/components/ui'
import { getEquipment, createEquipment, updateEquipment } from '@/services/clinic'
import { createClient } from '@/lib/supabase/client'
import type { Equipment, User } from '@/types'
import { formatDate, getDaysUntilService } from '@/lib/utils'
import { Wrench, Plus, Edit2, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

function getServiceStatus(eq: Equipment): {
  label: string
  color: string
  icon: React.ReactNode
} {
  if (!eq.next_service_date) {
    return {
      label: 'No Date Set',
      color: 'bg-gray-100 text-gray-600',
      icon: <Clock className="w-3.5 h-3.5" />,
    }
  }
  const days = getDaysUntilService(eq.next_service_date)
  if (days < 0) {
    return {
      label: `Overdue (${Math.abs(days)}d)`,
      color: 'bg-red-100 text-red-700',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    }
  }
  if (days <= 30) {
    return {
      label: `Due in ${days}d`,
      color: 'bg-amber-100 text-amber-700',
      icon: <Clock className="w-3.5 h-3.5" />,
    }
  }
  return {
    label: 'Up to Date',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  }
}

export default function EquipmentPage() {
  const [user, setUser] = useState<User | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Equipment | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [lastService, setLastService] = useState('')
  const [nextService, setNextService] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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

  const loadEquipment = useCallback(async () => {
    setLoading(true)
    const data = await getEquipment()
    setEquipment(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadEquipment()
  }, [loadEquipment])

  function openAdd() {
    setEditItem(null)
    setName('')
    setLastService('')
    setNextService('')
    setNotes('')
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(eq: Equipment) {
    setEditItem(eq)
    setName(eq.name)
    setLastService(eq.last_service_date ?? '')
    setNextService(eq.next_service_date ?? '')
    setNotes(eq.notes ?? '')
    setFormError(null)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        name: name.trim(),
        last_service_date: lastService || undefined,
        next_service_date: nextService || undefined,
        notes: notes || undefined,
      }
      if (editItem) {
        await updateEquipment(editItem.id, payload)
      } else {
        await createEquipment(payload)
      }
      await loadEquipment()
      setShowModal(false)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save equipment'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout user={user}>
      <PageHeader
        title="Equipment"
        action={
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Equipment
          </button>
        }
      />

      {loading ? (
        <Loading />
      ) : equipment.length === 0 ? (
        <EmptyState
          icon={<Wrench className="w-8 h-8" />}
          title="No equipment tracked"
          description="Add clinic equipment to monitor service schedules."
          action={{ label: 'Add Equipment', onClick: openAdd }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((eq) => {
            const status = getServiceStatus(eq)
            return (
              <div key={eq.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 flex-shrink-0">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <p className="font-bold text-gray-900">{eq.name}</p>
                  </div>
                  <button
                    onClick={() => openEdit(eq)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${status.color}`}
                >
                  {status.icon}
                  {status.label}
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Service</span>
                    <span className="text-gray-700">
                      {eq.last_service_date
                        ? formatDate(eq.last_service_date)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Next Service</span>
                    <span className="text-gray-700">
                      {eq.next_service_date
                        ? formatDate(eq.next_service_date)
                        : '—'}
                    </span>
                  </div>
                </div>

                {eq.notes && (
                  <p className="text-xs text-gray-500 mt-3 line-clamp-2">
                    {eq.notes}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Edit Equipment' : 'Add Equipment'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Equipment Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g. Dental Chair, Autoclave, X-ray Machine"
            />
          </div>
          <div>
            <label className="label">Last Service Date</label>
            <input
              type="date"
              value={lastService}
              onChange={(e) => setLastService(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Next Service Date</label>
            <input
              type="date"
              value={nextService}
              onChange={(e) => setNextService(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="Service provider, warranty info, etc."
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editItem ? 'Update' : 'Add Equipment'}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
