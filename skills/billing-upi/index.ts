export interface UPIQRData { qrString:string; amount:number; upiId:string; upiName:string }
export interface GenerateQRInput { amount:number; patientId:string; upiId:string; upiName:string; invoiceId?:string; note?:string }

class BillingUpiSkill {
  generateQRData(input:GenerateQRInput): UPIQRData {
    if (input.amount<=0) throw new Error('Amount must be > 0')
    const note = input.note || 'Clinic payment'
    const qrString = `upi://pay?pa=${encodeURIComponent(input.upiId)}&pn=${encodeURIComponent(input.upiName)}&am=${input.amount}&cu=INR&tn=${encodeURIComponent(note)}`
    return { qrString, amount:input.amount, upiId:input.upiId, upiName:input.upiName }
  }
}

export const billingUpiSkill = new BillingUpiSkill()
