def check_guardrails(action: str, payload: dict) -> bool:
    """Return True if the action is permitted, False to block."""
    raise NotImplementedError
