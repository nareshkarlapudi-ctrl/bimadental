class OpsAgent:
    def handle(self, payload: dict) -> dict:
        action = payload.get("action")
        if action == "inventory_alert":
            raise NotImplementedError
        if action == "attendance":
            raise NotImplementedError
        if action == "report":
            raise NotImplementedError
        return {"error": f"Unknown action: {action}"}
