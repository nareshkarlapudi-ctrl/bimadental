'use client'

import React, { useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react'

// ============================================================
// MODAL
// ============================================================

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: ModalSize
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-xl z-10',
          'animate-in zoom-in-95 fade-in duration-200',
          sizeClasses[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 transition-colors z-10"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ============================================================
// STAT CARD
// ============================================================

type StatColor = 'teal' | 'green' | 'amber' | 'red'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  subtext?: string
  color?: StatColor
}

const colorMap: Record<StatColor, { bg: string; text: string; ring: string }> =
  {
    teal: {
      bg: 'bg-teal-100',
      text: 'text-teal-600',
      ring: 'ring-teal-200',
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      ring: 'ring-green-200',
    },
    amber: {
      bg: 'bg-amber-100',
      text: 'text-amber-600',
      ring: 'ring-amber-200',
    },
    red: {
      bg: 'bg-red-100',
      text: 'text-red-600',
      ring: 'ring-red-200',
    },
  }

export function StatCard({
  label,
  value,
  icon,
  subtext,
  color = 'teal',
}: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className="card p-5 flex items-start gap-4">
      <div
        className={cn(
          'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ring-4',
          c.bg,
          c.text,
          c.ring
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-tight">
          {value}
        </p>
        {subtext && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{subtext}</p>
        )}
      </div>
    </div>
  )
}

// ============================================================
// STATUS BADGE
// ============================================================

interface StatusBadgeProps {
  status: 'paid' | 'pending' | 'failed'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn({
        'badge-paid': status === 'paid',
        'badge-pending': status === 'pending',
        'badge-failed': status === 'failed',
      })}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ============================================================
// EMPTY STATE
// ============================================================

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary mt-5 text-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ============================================================
// LOADING
// ============================================================

export function Loading() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-teal-600 animate-spin" />
    </div>
  )
}

// ============================================================
// PAGE HEADER
// ============================================================

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// ============================================================
// ALERT BANNER
// ============================================================

type AlertType = 'warning' | 'error' | 'info'

interface AlertBannerProps {
  type: AlertType
  message: string
  action?: { label: string; href: string }
}

const alertStyles: Record<AlertType, { wrapper: string; icon: React.ReactNode }> =
  {
    warning: {
      wrapper: 'bg-amber-50 border border-amber-200 text-amber-800',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />,
    },
    error: {
      wrapper: 'bg-red-50 border border-red-200 text-red-800',
      icon: <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />,
    },
    info: {
      wrapper: 'bg-blue-50 border border-blue-200 text-blue-800',
      icon: <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />,
    },
  }

export function AlertBanner({ type, message, action }: AlertBannerProps) {
  const style = alertStyles[type]
  return (
    <div className={cn('flex items-start gap-3 rounded-xl px-4 py-3 text-sm mb-4', style.wrapper)}>
      {style.icon}
      <span className="flex-1">{message}</span>
      {action && (
        <a
          href={action.href}
          className="font-semibold underline underline-offset-2 hover:no-underline flex-shrink-0"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}
