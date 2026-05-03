'use client'

import { FileText } from 'lucide-react'
import type { Patient, Visit } from '@/types'

interface Props {
  patient: Patient
  visit: Visit
}

export default function VisitPDFButtons({ patient, visit }: Props) {
  async function handleDownloadPrescription() {
    const { generatePrescriptionPDF } = await import('@/services/pdf')
    generatePrescriptionPDF(patient, visit)
  }

  return (
    <button
      onClick={handleDownloadPrescription}
      className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
    >
      <FileText className="w-4 h-4" />
      Download Prescription
    </button>
  )
}
