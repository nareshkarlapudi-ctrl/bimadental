'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { PageHeader, Modal, Loading, EmptyState, AlertBanner } from '@/components/ui'
import {
  getInventory,
  createInventoryItem,
  updateInventoryQuantity,
} from '@/services/clinic'
import { createClient } from '@/lib/supabase/client'
import type { InventoryItem, User } from '@/types'
import { formatDate } from '@/lib/utils'
import { Package, Plus, Minus, AlertTriangle } from 'lucide-react'

export default function InventoryPage() {
  const [user, setUser] = useState<User | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [threshold, setThreshold] = useState('5')
  const [expiryDate, setExpiryDate] = useState('')
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

  const loadItems = useCallback(async () => {
    setLoading(true)
    const data = await getInventory()
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const outOfStock = items.filter((i) => i.quantity === 0)
  const lowStock = items.filter((i) => i.quantity > 0 && i.quantity <= i.threshold)

  async function handleQtyChange(item: InventoryItem, delta: number) {
    const newQty = Math.max(0, item.quantity + delta)
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
    )
    await updateInventoryQuantity(item.id, newQty)
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !quantity) return
    setSaving(true)
    setFormError(null)
    try {
      await createInventoryItem({
        name: name.trim(),
        quantity: parseInt(quantity),
        threshold: parseInt(threshold) || 5,
        expiry_date: expiryDate || undefined,
      })
      await loadItems()
      setShowModal(false)
      setName('')
      setQuantity('')
      setThreshold('5')
      setExpiryDate('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add item')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout user={user}>
      <PageHeader
        title="Inventory"
        action={
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        }
      />

      {outOfStock.length > 0 && (
        <AlertBanner
          type="error"
          message={`${outOfStock.length} item${outOfStock.length > 1 ? 's' : ''} out of stock: ${outOfStock.map((i) => i.name).join(', ')}`}
        />
      )}

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="No inventory items"
          description="Add items to track your clinic inventory."
          action={{ label: 'Add Item', onClick: () => setShowModal(true) }}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Item
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Quantity
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                    Threshold
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                    Expiry
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => {
                  const isLow = item.quantity <= item.threshold
                  const isOut = item.quantity === 0
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isLow && (
                            <AlertTriangle
                              className={`w-4 h-4 flex-shrink-0 ${
                                isOut ? 'text-red-500' : 'text-amber-500'
                              }`}
                            />
                          )}
                          <span className="font-medium text-gray-900">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item, -1)}
                            disabled={item.quantity === 0}
                            className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-30"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span
                            className={`w-10 text-center font-bold ${
                              isOut
                                ? 'text-red-600'
                                : isLow
                                ? 'text-amber-600'
                                : 'text-gray-900'
                            }`}
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item, 1)}
                            className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                        {item.threshold}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {item.expiry_date ? formatDate(item.expiry_date) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {isOut ? (
                          <span className="badge-failed">Out of Stock</span>
                        ) : isLow ? (
                          <span className="badge-pending">Low Stock</span>
                        ) : (
                          <span className="badge-paid">OK</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Inventory Item"
        size="sm"
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label className="label">Item Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g. Gloves (Box), Syringe, Cotton Rolls"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantity *</label>
              <input
                type="number"
                required
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="input"
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">Low Stock Threshold</label>
              <input
                type="number"
                min={0}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="input"
                placeholder="5"
              />
            </div>
          </div>
          <div>
            <label className="label">Expiry Date (optional)</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="input"
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Adding…' : 'Add Item'}
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
