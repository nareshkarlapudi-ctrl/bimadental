from skills.lookup import lookup_patient
from skills.capture import capture_patient


class PatientAgent:
    def handle(self, payload: dict) -> dict:
        action = payload.get("action")
        if action == "search":
            return lookup_patient(payload)
        if action == "create":
            return capture_patient(payload)
        if action == "update":
            return capture_patient(payload, update=True)
        return {"error": f"Unknown action: {action}"}
