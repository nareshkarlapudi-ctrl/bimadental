'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { PageHeader, Modal, Loading, EmptyState } from '@/components/ui'
import { getExpenses, createExpense } from '@/services/clinic'
import { createClient } from '@/lib/supabase/client'
import type { Expense, User, ExpenseCategory } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Wallet, Plus } from 'lucide-react'

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  salary: 'bg-purple-100 text-purple-700',
  rent: 'bg-blue-100 text-blue-700',
  supplies: 'bg-teal-100 text-teal-700',
  equipment: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-700',
}

const CATEGORIES: ExpenseCategory[] = ['salary', 'rent', 'supplies', 'equipment', 'other']

export default function ExpensesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Form
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('other')
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

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    const data = await getExpenses()
    setExpenses(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  // Category totals
  const categoryTotals = CATEGORIES.map((cat) => ({
    cat,
    total: expenses
      .filter((e) => e.category === cat)
      .reduce((s, e) => s + Number(e.amount), 0),
  })).filter((c) => c.total > 0)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !amount) return
    setSaving(true)
    setFormError(null)
    try {
      await createExpense({
        title: title.trim(),
        amount: parseFloat(amount),
        category,
      })
      await loadExpenses()
      setShowModal(false)
      setTitle('')
      setAmount('')
      setCategory('other')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add expense')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout user={user}>
      <PageHeader
        title="Expenses"
        action={
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        }
      />

      {/* Category breakdown */}
      {categoryTotals.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categoryTotals.map(({ cat, total }) => (
            <div
              key={cat}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${CATEGORY_COLORS[cat]}`}
            >
              <span className="capitalize">{cat}</span>
              <span>{formatCurrency(total)}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={<Wallet className="w-8 h-8" />}
          title="No expenses recorded"
          description="Add your first expense using the button above."
          action={{ label: 'Add Expense', onClick: () => setShowModal(true) }}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-50">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                      CATEGORY_COLORS[expense.category]
                    }`}
                  >
                    {expense.category}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {expense.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(expense.created_at)}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-gray-800">
                  {formatCurrency(Number(expense.amount))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Expense"
        size="sm"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="e.g. Staff salary, Rent payment"
            />
          </div>
          <div>
            <label className="label">Amount (₹) *</label>
            <input
              type="number"
              required
              min={0}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="input"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Adding…' : 'Add Expense'}
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
