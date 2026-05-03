# Skill: billing-upi

## Purpose
Generate UPI QR codes and manage payment state transitions.

## UPI string format
upi://pay?pa={id}&pn={name}&am={amount}&cu=INR&tn={note}

## Rules
- Never auto-mark paid — always needs staff confirmation
- paid_at set server-side only
- Store UTR for audit trail
- Amount must match invoice exactly
