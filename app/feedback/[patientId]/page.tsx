'use client'

import { useState } from 'react'
import { createFeedback } from '@/services/clinic'
import { Star, CheckCircle } from 'lucide-react'

const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || 'ClinicOS'

interface PageProps {
  params: { patientId: string }
}

export default function FeedbackFormPage({ params }: PageProps) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a rating.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createFeedback({
        patient_id: params.patientId,
        rating,
        comment: comment.trim() || undefined,
      })
      setSubmitted(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to submit feedback'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Clinic Name */}
        <div className="text-center mb-8">
          <p className="text-teal-700 font-bold text-lg">{clinicName}</p>
        </div>

        <div className="card p-6">
          {submitted ? (
            /* Success State */
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Thank you for your feedback!
              </h2>
              <p className="text-gray-500 text-sm">
                Your response helps us improve our service.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">
                  How was your experience?
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Your feedback means a lot to us.
                </p>
              </div>

              {/* Star Selector */}
              <div className="flex justify-center gap-3 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    className="transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-10 h-10 transition-colors ${
                        star <= (hover || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-200'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {rating > 0 && (
                <p className="text-center text-sm font-semibold text-teal-700">
                  {rating === 1
                    ? 'Very Poor'
                    : rating === 2
                    ? 'Poor'
                    : rating === 3
                    ? 'Average'
                    : rating === 4
                    ? 'Good'
                    : 'Excellent!'}
                </p>
              )}

              {/* Comment */}
              <div>
                <label className="label">
                  Share your thoughts (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="input resize-none"
                  rows={4}
                  placeholder="Tell us about your visit experience…"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="btn-primary w-full"
              >
                {submitting ? 'Submitting…' : 'Submit Feedback'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
