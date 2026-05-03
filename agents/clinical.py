from skills.capture import capture_visit


class ClinicalAgent:
    def handle(self, payload: dict) -> dict:
        action = payload.get("action")
        if action == "capture_visit":
            return capture_visit(payload)
        if action == "diagnose":
            raise NotImplementedError
        if action == "prescribe":
            raise NotImplementedError
        return {"error": f"Unknown action: {action}"}
