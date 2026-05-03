import { inventoryAlertSkill } from '../../skills/inventory-alert'
import { reportGenSkill }      from '../../skills/report-gen'
import type { AgentContext, AgentResponse, Intent, OrchestratorInput } from '../../types/agents'

export class OpsAgent {
  async run(input: OrchestratorInput, intent: Intent, ctx: AgentContext): Promise<AgentResponse> {
    switch (intent.action) {
      case 'stock.check':        return this.stock(ctx)
      case 'stock.update':       return this.stockUpdate(intent.entities, input.message)
      case 'equipment.check':    return { ok:true, agent:'ops', action:'show_equipment_alerts', data:{ upcoming:[] } }
      case 'report.daily':       return this.daily(intent.entities)
      case 'report.monthly':     return this.monthly(intent.entities)
      case 'attendance.checkin': return { ok:true, agent:'ops', action:'record_checkin', data:{ userId:ctx.userId, timestamp:ctx.timestamp } }
      default: return { ok:false, agent:'ops', error:'Unknown ops action.' }
    }
  }

  private async stock(_ctx: AgentContext): Promise<AgentResponse> {
    const alerts = await inventoryAlertSkill.getLowStockAlerts()
    if (!alerts.length) return { ok:true, agent:'ops', message:'All stock levels healthy.', action:'show_inventory' }
    const critical = alerts.filter(a => a.quantity === 0)
    const low      = alerts.filter(a => a.quantity > 0)
    let msg = ''
    if (critical.length) msg += `OUT OF STOCK: ${critical.map(a=>a.name).join(', ')}\n`
    if (low.length)      msg += `LOW STOCK: ${low.map(a=>`${a.name} (${a.quantity})`).join(', ')}`
    return { ok:true, agent:'ops', message:msg.trim(), action:'show_stock_alerts', data:{ alerts } }
  }

  private async stockUpdate(entities: Record<string,unknown>, msg: string): Promise<AgentResponse> {
    const qty = msg.match(/(\d+)/)?.[1]
    if (!qty) return { ok:false, agent:'ops', error:'Specify quantity. Example: "Update gloves to 100"' }
    return { ok:true, agent:'ops', action:'show_stock_update_form', data:{ itemName:entities.item, quantity:parseInt(qty) } }
  }

  private async daily(entities: Record<string,unknown>): Promise<AgentResponse> {
    const date   = (entities.date as string) || new Date().toISOString().split('T')[0]
    const report = await reportGenSkill.generateDailyReport(date)
    const profit = report.revenue - report.expenses
    return { ok:true, agent:'ops', action:'show_report',
      message:[`Daily Report — ${date}`,`Revenue:  ₹${report.revenue.toLocaleString('en-IN')}`,`Expenses: ₹${report.expenses.toLocaleString('en-IN')}`,`Profit:   ₹${profit.toLocaleString('en-IN')}`,`Invoices: ${report.paidCount} paid, ${report.pendingCount} pending`].join('\n'),
      data:report }
  }

  private async monthly(entities: Record<string,unknown>): Promise<AgentResponse> {
    const now = new Date()
    const report = await reportGenSkill.generateMonthlyReport((entities.month as number)||now.getMonth()+1,(entities.year as number)||now.getFullYear())
    return { ok:true, agent:'ops', action:'show_monthly_report', data:report }
  }
}
