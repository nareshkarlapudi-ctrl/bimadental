# ClinicOS — AI Agent Architecture

Layered AI agent system for a dental + cosmetology clinic.
A central Orchestrator delegates to specialist sub-agents,
each governed by skill modules, hooks, and rules.

## Structure

```
agents/
  orchestrator/   intent classification + routing
  patient/        search, create, update patients
  clinical/       visit capture, diagnosis assist, rx
  billing/        invoice, UPI QR, payment
  ops/            stock, equipment, reports, attendance
hooks/            event-driven side effects
rules/            auth, rate-limit, drug safety, PII
skills/
  patient-lookup/ SKILL.md + design.md
  visit-capture/  SKILL.md + design.md
  billing-upi/    SKILL.md + index.ts
  inventory-alert/SKILL.md
  report-gen/     SKILL.md
types/            shared TypeScript interfaces
data/             static data (treatments)
```

## Run

```bash
npx ts-node setup-clinicos-ai.ts
```
