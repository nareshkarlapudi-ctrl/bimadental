from agents.patient import PatientAgent
from agents.clinical import ClinicalAgent
from agents.billing import BillingAgent
from agents.ops import OpsAgent


INTENT_MAP = {
    "patient": PatientAgent,
    "clinical": ClinicalAgent,
    "billing": BillingAgent,
    "ops": OpsAgent,
}


class OrchestratorAgent:
    def __init__(self):
        self.agents = {name: cls() for name, cls in INTENT_MAP.items()}

    def route(self, intent: str, payload: dict) -> dict:
        agent = self.agents.get(intent)
        if not agent:
            return {"error": f"Unknown intent: {intent}"}
        return agent.handle(payload)
