def create_invoice(payload: dict) -> dict:
    """Generate an invoice and UPI QR for a visit."""
    raise NotImplementedError


def reconcile_payment(payload: dict) -> dict:
    """Match incoming payment to an open invoice."""
    raise NotImplementedError
