# Skill: visit-capture

## Purpose
Save a clinical visit record and optionally create an invoice.

## Inputs
patientId* · doctorId* · diagnosis* · treatmentNotes · medicines · images[] · invoiceItems[]

## Steps
1. Validate: diagnosis not empty, patientId present
2. Run drug-safety check against patient allergies
3. Save visit to DB
4. If invoiceItems → create invoice
5. Emit on:visit_complete hook
6. Return { visitId, invoiceId?, saved, warnings }

## Rules
- Diagnosis required (min 5 chars) before save
- Max 10 images per visit
- Image uploads must complete before save is allowed
