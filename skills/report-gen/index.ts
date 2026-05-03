export interface DailyReport { date:string;revenue:number;expenses:number;netProfit:number;invoiceCount:number;paidCount:number;pendingCount:number;pendingAmount:number;visitCount:number }

class ReportGenSkill {
  async generateDailyReport(date:string): Promise<DailyReport> {
    // query supabase for date range
    return { date, revenue:0, expenses:0, netProfit:0, invoiceCount:0, paidCount:0, pendingCount:0, pendingAmount:0, visitCount:0 }
  }
  async generateMonthlyReport(month:number, year:number): Promise<DailyReport&{month:number;year:number}> {
    const r = await this.generateDailyReport(`${year}-${String(month).padStart(2,'0')}`)
    return { ...r, month, year }
  }
}

export const reportGenSkill = new ReportGenSkill()
