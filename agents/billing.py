from skills.bill import create_invoice, reconcile_payment


class BillingAgent:
    def handle(self, payload: dict) -> dict:
        action = payload.get("action")
        if action == "invoice":
            return create_invoice(payload)
        if action == "reconcile":
            return reconcile_payment(payload)
        return {"error": f"Unknown action: {action}"}
