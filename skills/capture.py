def capture_patient(payload: dict, update: bool = False) -> dict:
    """Create or update a patient record."""
    raise NotImplementedError


def capture_visit(payload: dict) -> dict:
    """Record a clinical visit with diagnosis and notes."""
    raise NotImplementedError
