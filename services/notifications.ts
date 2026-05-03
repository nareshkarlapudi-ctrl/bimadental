'use server'

// WhatsApp/SMS stubs — intentional, to be wired to provider later

export async function sendPaymentConfirmation(
  patientPhone: string,
  amount: number,
  invoiceId: string
): Promise<void> {
  console.log(
    `[WhatsApp stub] Payment confirmation to ${patientPhone}: ₹${amount} received. Invoice #${invoiceId}`
  )
}

export async function sendVisitSummary(
  patientPhone: string,
  patientName: string,
  diagnosis: string
): Promise<void> {
  console.log(
    `[WhatsApp stub] Visit summary to ${patientPhone} for ${patientName}: ${diagnosis}`
  )
}

export async function sendFeedbackRequest(
  patientPhone: string,
  patientId: string
): Promise<void> {
  const feedbackUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }/feedback/${patientId}`
  console.log(
    `[WhatsApp stub] Feedback request to ${patientPhone}: ${feedbackUrl}`
  )
}

export async function sendLowStockAlert(items: string[]): Promise<void> {
  console.log(`[SMS stub] Low stock alert: ${items.join(', ')}`)
}
