# Design: visit-capture

## Goal
Complete a full clinical record + bill in under 90 seconds.

## Desktop Layout
Left (240px): patient card · visit history · billing picker
Main:         diagnosis + [AI Suggest] · notes · medicines · images
Bottom:       [Save Visit]  [Save & Collect ₹X]  (sticky)

## AI Touch Points
- Diagnosis Assist: panel with 2-3 differentials, click to fill
- Medicine chips:   appear after diagnosis, click to append
- Note templates:   appended when treatment selected from billing

## Keyboard Shortcuts
Ctrl+S  Save · Ctrl+P  Save+Pay · Ctrl+D  AI Diagnose

## Validation
diagnosis min 5 chars · images max 10 × 5MB · amount > 0 for pay CTA
