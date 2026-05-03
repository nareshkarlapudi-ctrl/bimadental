# Skill: inventory-alert

## Purpose
Return all stock items at or below threshold, sorted by severity.

## Severity
critical: quantity === 0
low:      0 < quantity <= threshold
expired:  expiry_date < today (flagged regardless of quantity)

## Output
Alert[] sorted critical → low → expired
