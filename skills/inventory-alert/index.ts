export type AlertSeverity = 'critical' | 'low' | 'ok'
export interface InventoryAlert { id:string;name:string;quantity:number;threshold:number;severity:AlertSeverity;expiryDate?:string;isExpired?:boolean }

class InventoryAlertSkill {
  async getLowStockAlerts(): Promise<InventoryAlert[]> {
    // const { data } = await supabase.from('inventory').select('*')
    const items: InventoryAlert[] = []
    return items
      .map(i=>({ ...i, severity:this.sev(i.quantity,i.threshold), isExpired:i.expiryDate?new Date(i.expiryDate)<new Date():false }))
      .filter(i=>i.severity!=='ok'||i.isExpired)
      .sort((a,b)=>({critical:0,low:1,ok:2}[a.severity]-{critical:0,low:1,ok:2}[b.severity]))
  }
  private sev(q:number,t:number):AlertSeverity { return q===0?'critical':q<=t?'low':'ok' }
}

export const inventoryAlertSkill = new InventoryAlertSkill()
