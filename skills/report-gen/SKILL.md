# Skill: report-gen

## Methods
generateDailyReport(date: string)
generateMonthlyReport(month: number, year: number)

## Output fields
date · revenue (paid only) · expenses · netProfit
invoiceCount · paidCount · pendingCount · pendingAmount · visitCount

## Rules
- revenue = paid invoices only
- pending shown separately, never counted as revenue
- read-only, never modifies source data
