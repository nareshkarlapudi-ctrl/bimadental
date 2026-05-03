'use client'

import type { Patient, Visit, Invoice } from '@/types'

const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || 'ClinicOS'
const clinicAddress = process.env.NEXT_PUBLIC_CLINIC_ADDRESS || ''
const clinicPhone = process.env.NEXT_PUBLIC_CLINIC_PHONE || ''

function formatDateStr(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export async function generatePrescriptionPDF(
  patient: Patient,
  visit: Visit
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autoTable = (await import('jspdf-autotable')).default as any

  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()
  let y = 18

  // Header
  doc.setFontSize(22)
  doc.setTextColor(13, 148, 136) // teal-600
  doc.setFont('helvetica', 'bold')
  doc.text(clinicName, pageW / 2, y, { align: 'center' })
  y += 8

  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'normal')
  if (clinicAddress) {
    doc.text(clinicAddress, pageW / 2, y, { align: 'center' })
    y += 5
  }
  if (clinicPhone) {
    doc.text(`Phone: ${clinicPhone}`, pageW / 2, y, { align: 'center' })
    y += 5
  }

  // Horizontal rule
  doc.setDrawColor(13, 148, 136)
  doc.setLineWidth(0.8)
  doc.line(14, y + 2, pageW - 14, y + 2)
  y += 8

  // Title
  doc.setFontSize(14)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.text('PRESCRIPTION', 14, y)
  y += 8

  // Patient info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)
  doc.text(`Patient: ${patient.name}`, 14, y)
  doc.text(
    `Age / Gender: ${patient.age} yrs / ${patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}`,
    pageW / 2,
    y
  )
  y += 6
  doc.text(`Date: ${formatDateStr(visit.created_at)}`, 14, y)
  doc.text(`Visit ID: ${visit.id.slice(0, 8).toUpperCase()}`, pageW / 2, y)
  y += 8

  // Allergy warning
  if (patient.allergies) {
    doc.setFillColor(254, 226, 226)
    doc.roundedRect(14, y - 2, pageW - 28, 10, 2, 2, 'F')
    doc.setTextColor(185, 28, 28)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`ALLERGIES: ${patient.allergies}`, 18, y + 5)
    doc.setTextColor(50, 50, 50)
    doc.setFont('helvetica', 'normal')
    y += 14
  }

  // Diagnosis
  doc.setLineWidth(0.3)
  doc.setDrawColor(200, 200, 200)
  doc.line(14, y, pageW - 14, y)
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(13, 148, 136)
  doc.text('DIAGNOSIS', 14, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  const diagLines = doc.splitTextToSize(visit.diagnosis, pageW - 28)
  doc.text(diagLines, 14, y)
  y += diagLines.length * 6 + 4

  // Treatment Notes
  if (visit.treatment_notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(13, 148, 136)
    doc.text('TREATMENT NOTES', 14, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    const noteLines = doc.splitTextToSize(visit.treatment_notes, pageW - 28)
    doc.text(noteLines, 14, y)
    y += noteLines.length * 6 + 4
  }

  // Medicines
  if (visit.medicines) {
    doc.line(14, y, pageW - 14, y)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(13, 148, 136)
    doc.text('Rx — MEDICINES', 14, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    const meds = visit.medicines.split('\n').filter(Boolean)
    meds.forEach((med, i) => {
      doc.text(`${i + 1}. ${med}`, 16, y)
      y += 6
    })
    y += 2
  }

  autoTable

  // Footer
  const pageH = doc.internal.pageSize.getHeight()
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(14, pageH - 30, pageW - 14, pageH - 30)

  const doctorName =
    (visit.doctor as { name?: string } | undefined)?.name || 'Doctor'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.text(`Dr. ${doctorName}`, pageW - 14, pageH - 22, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Signature: ___________________________', pageW - 14, pageH - 16, {
    align: 'right',
  })
  doc.text(
    'AI assisted — Doctor verified',
    14,
    pageH - 16
  )

  doc.output('dataurlnewwindow')
}

export async function generateInvoicePDF(
  patient: Patient,
  invoice: Invoice
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autoTable = (await import('jspdf-autotable')).default as any

  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()
  let y = 18

  // Clinic name (left)
  doc.setFontSize(20)
  doc.setTextColor(13, 148, 136)
  doc.setFont('helvetica', 'bold')
  doc.text(clinicName, 14, y)

  // INVOICE label (right)
  doc.setFontSize(20)
  doc.setTextColor(50, 50, 50)
  doc.text('INVOICE', pageW - 14, y, { align: 'right' })
  y += 8

  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'normal')
  if (clinicAddress) {
    doc.text(clinicAddress, 14, y)
    y += 5
  }
  if (clinicPhone) {
    doc.text(`Phone: ${clinicPhone}`, 14, y)
    y += 5
  }

  doc.setDrawColor(13, 148, 136)
  doc.setLineWidth(0.8)
  doc.line(14, y + 2, pageW - 14, y + 2)
  y += 10

  // Patient info + Invoice details
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('Bill To:', 14, y)
  doc.text('Invoice Details:', pageW / 2, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.text(patient.name, 14, y)
  doc.text(
    `Invoice ID: ${invoice.id.slice(0, 8).toUpperCase()}`,
    pageW / 2,
    y
  )
  y += 6
  doc.text(`Phone: ${patient.phone}`, 14, y)
  doc.text(`Date: ${formatDateStr(invoice.created_at)}`, pageW / 2, y)
  y += 6
  doc.text(
    `Age: ${patient.age} yrs / ${patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}`,
    14,
    y
  )
  if (invoice.paid_at) {
    doc.text(`Paid on: ${formatDateStr(invoice.paid_at)}`, pageW / 2, y)
  }
  y += 10

  // Items table
  const tableItems = invoice.items && invoice.items.length > 0
    ? invoice.items.map((item) => [
        item.name,
        new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(item.price),
      ])
    : [['Services', new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(invoice.amount)]]

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Amount']],
    body: tableItems,
    foot: [
      [
        {
          content: 'TOTAL',
          styles: { fontStyle: 'bold', fontSize: 11 },
        },
        {
          content: new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
          }).format(invoice.amount),
          styles: { fontStyle: 'bold', fontSize: 11 },
        },
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: [13, 148, 136], textColor: 255 },
    footStyles: { fillColor: [240, 253, 250], textColor: [13, 148, 136] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // Payment info
  if (invoice.payment_mode) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)
    doc.text(
      `Payment Mode: ${invoice.payment_mode.toUpperCase()}`,
      14,
      y
    )
    y += 6
  }
  if (invoice.payment_note) {
    doc.text(`UTR / Reference: ${invoice.payment_note}`, 14, y)
    y += 6
  }

  // Status badge area
  doc.setFont('helvetica', 'bold')
  if (invoice.status === 'paid') {
    doc.setTextColor(21, 128, 61)
    doc.text('STATUS: PAID', 14, y)
  } else if (invoice.status === 'pending') {
    doc.setTextColor(180, 83, 9)
    doc.text('STATUS: PENDING', 14, y)
  } else {
    doc.setTextColor(185, 28, 28)
    doc.text('STATUS: FAILED', 14, y)
  }
  y += 12

  // Footer
  const pageH = doc.internal.pageSize.getHeight()
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(14, pageH - 20, pageW - 14, pageH - 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(
    'Thank you for choosing us! Please retain this invoice for your records.',
    pageW / 2,
    pageH - 12,
    { align: 'center' }
  )

  doc.output('dataurlnewwindow')
}

export async function generatePatientSummaryPDF(
  patient: Patient,
  visits: Visit[]
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autoTable = (await import('jspdf-autotable')).default as any

  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()
  let y = 18

  // Header
  doc.setFontSize(20)
  doc.setTextColor(13, 148, 136)
  doc.setFont('helvetica', 'bold')
  doc.text(clinicName, pageW / 2, y, { align: 'center' })
  y += 8
  doc.setFontSize(13)
  doc.setTextColor(50, 50, 50)
  doc.text('Patient Summary Report', pageW / 2, y, { align: 'center' })
  y += 4

  doc.setDrawColor(13, 148, 136)
  doc.setLineWidth(0.8)
  doc.line(14, y + 2, pageW - 14, y + 2)
  y += 10

  // Patient details
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(13, 148, 136)
  doc.text('PATIENT DETAILS', 14, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)

  const details: [string, string][] = [
    ['Name', patient.name],
    ['Phone', patient.phone],
    ['Age', `${patient.age} years`],
    ['Gender', patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)],
    ['Patient Since', formatDateStr(patient.created_at)],
  ]
  if (patient.allergies) details.push(['Allergies', patient.allergies])
  if (patient.medical_history)
    details.push(['Medical History', patient.medical_history])

  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(`${label}:`, 14, y)
    doc.setFont('helvetica', 'normal')
    const valueLines = doc.splitTextToSize(value, pageW - 70)
    doc.text(valueLines, 55, y)
    y += valueLines.length * 6
  })

  y += 6

  // Visits table
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(13, 148, 136)
  doc.text(`VISIT HISTORY (${visits.length} visits)`, 14, y)
  y += 4

  if (visits.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(120, 120, 120)
    doc.text('No visits recorded.', 14, y + 6)
  } else {
    const rows = visits.map((v) => [
      formatDateStr(v.created_at),
      v.diagnosis.length > 50 ? v.diagnosis.slice(0, 50) + '…' : v.diagnosis,
      v.treatment_notes
        ? v.treatment_notes.length > 40
          ? v.treatment_notes.slice(0, 40) + '…'
          : v.treatment_notes
        : '—',
      v.medicines
        ? v.medicines.length > 40
          ? v.medicines.slice(0, 40) + '…'
          : v.medicines
        : '—',
    ])

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Diagnosis', 'Treatment', 'Medicines']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 55 },
        2: { cellWidth: 50 },
        3: { cellWidth: 50 },
      },
      margin: { left: 14, right: 14 },
    })
  }

  doc.output('dataurlnewwindow')
}
