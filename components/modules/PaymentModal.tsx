'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle, IndianRupee } from 'lucide-react'
import { Modal } from '@/components/ui'
import { markInvoicePaid } from '@/services/invoices'
import { formatCurrency } from '@/lib/utils'

const upiId = process.env.NEXT_PUBLIC_CLINIC_UPI_ID || ''
const upiName = process.env.NEXT_PUBLIC_CLINIC_UPI_NAME || 'Clinic'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  amount: number
  patientName: string
  onPaid?: () => void
}

export default function PaymentModal({
  isOpen,
  onClose,
  invoiceId,
  amount,
  patientName,
  onPaid,
}: PaymentModalProps) {
  const [utr, setUtr] = useState('')
  const [loading, setLoading] = useState(false)
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=Clinic+payment`

  async function handleMarkPaid() {
    setLoading(true)
    setError(null)
    try {
      await markInvoicePaid(invoiceId, utr || undefined)
      setPaid(true)
      if (onPaid) onPaid()
      setTimeout(() => {
        setPaid(false)
        setUtr('')
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as paid')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (!loading) {
      setUtr('')
      setError(null)
      setPaid(false)
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Collect Payment" size="sm">
      {paid ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <p className="text-lg font-bold text-green-700">Payment Received!</p>
          <p className="text-sm text-gray-500 mt-1">Invoice marked as paid.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Patient + Amount */}
          <div className="text-center">
            <p className="text-sm text-gray-500">{patientName}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <IndianRupee className="w-7 h-7 text-teal-600" />
              <span className="text-4xl font-bold text-teal-600">
                {amount.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {formatCurrency(amount)} due
            </p>
          </div>

          {/* QR Code */}
          {upiId && (
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-white rounded-xl border-2 border-teal-100 shadow-sm">
                <QRCodeSVG
                  value={upiString}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  level="M"
                />
              </div>
              <p className="font-mono text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                {upiId}
              </p>
              <p className="text-xs text-gray-400">
                Scan with any UPI app to pay
              </p>
            </div>
          )}

          {/* UTR Input */}
          <div>
            <label className="label">UTR / Transaction ID (optional)</label>
            <input
              type="text"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              className="input"
              placeholder="Enter UTR or transaction reference"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleMarkPaid}
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Saving…' : 'Mark as Paid'}
            </button>
            <button
              onClick={handleClose}
              disabled={loading}
              className="btn-secondary flex-1"
            >
              Keep Pending
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
