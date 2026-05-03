# Skill: patient-lookup

## Purpose
Fuzzy search for patients by phone (exact) or name (ilike).

## Inputs
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| phone | string | no* | 10-digit mobile |
| name  | string | no* | Min 3 chars |

*At least one required. Phone takes priority.

## Outputs
```ts
{ found: boolean; patient?: Patient; matches?: Patient[]; confidence: number }
```

## Rules
- Never create a patient inside this skill
- Never expose raw DB errors
- Phone exact match → confidence 1.0, return immediately
