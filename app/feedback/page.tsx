'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { PageHeader, Loading, EmptyState } from '@/components/ui'
import { getFeedback } from '@/services/clinic'
import { createClient } from '@/lib/supabase/client'
import type { Feedback, User } from '@/types'
import { formatDate, getInitials } from '@/lib/utils'
import { Star } from 'lucide-react'

function StarDisplay({ rating, size = 4 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-${size} h-${size} ${
            i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

export default function FeedbackPage() {
  const [user, setUser] = useState<User | null>(null)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)

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

  const loadFeedback = useCallback(async () => {
    setLoading(true)
    const data = await getFeedback()
    setFeedback(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  const avgRating =
    feedback.length > 0
      ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length
      : 0

  const distribution = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: feedback.filter((f) => f.rating === r).length,
  }))

  return (
    <AppLayout user={user}>
      <PageHeader title="Patient Feedback" />

      {/* Summary Card */}
      {feedback.length > 0 && (
        <div className="card p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Average */}
            <div className="text-center">
              <p className="text-5xl font-bold text-gray-900">
                {avgRating.toFixed(1)}
              </p>
              <StarDisplay rating={Math.round(avgRating)} size={5} />
              <p className="text-sm text-gray-500 mt-1">
                {feedback.length} review{feedback.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Distribution bars */}
            <div className="flex-1 w-full space-y-1.5">
              {distribution.map(({ rating, count }) => (
                <div key={rating} className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-0.5 w-16 flex-shrink-0">
                    <span className="text-gray-600 w-3 text-right">{rating}</span>
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{
                        width:
                          feedback.length > 0
                            ? `${(count / feedback.length) * 100}%`
                            : '0%',
                      }}
                    />
                  </div>
                  <span className="text-gray-500 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : feedback.length === 0 ? (
        <EmptyState
          icon={<Star className="w-8 h-8" />}
          title="No feedback yet"
          description="Patient feedback will appear here after they submit their reviews."
        />
      ) : (
        <div className="space-y-3">
          {feedback.map((fb) => (
            <div key={fb.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {fb.patient?.name
                      ? getInitials(fb.patient.name)
                      : '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {fb.patient?.name ?? 'Anonymous'}
                    </p>
                    <StarDisplay rating={fb.rating} />
                    {fb.comment && (
                      <p className="text-sm text-gray-600 mt-1.5">
                        {fb.comment}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatDate(fb.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
