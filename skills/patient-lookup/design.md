# Design: patient-lookup

## States
1. Empty       — large numeric input, auto-search on 10 digits
2. Found       — teal card, name bold, allergy badge (role="alert"), "Open Profile" CTA
3. Not found   — "No patient for X" + single "Register" CTA
4. Quick create — name / age / gender, phone pre-filled, medical history collapsed
5. Multi-match  — list with partial phone (****210) to disambiguate

## Component API
```tsx
interface PatientSearchProps {
  onFound:  (patient: Patient) => void
  onCreate: (patient: NewPatient) => void
  autoFocus?: boolean   // default true
  compact?:  boolean    // dashboard widget mode
}
```

## Accessibility
- inputmode="numeric", aria-label="Patient phone number"
- Results: role="listbox", items role="option"
- Allergy: role="alert" so screen readers announce immediately
