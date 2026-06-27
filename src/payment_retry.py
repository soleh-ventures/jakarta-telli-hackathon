"""Payment retry logic for the checkout service."""

import time

MAX_RETRIES = 3


class TransientPaymentError(Exception):
    """Raised when the payment provider is momentarily unavailable."""


def charge_with_retry(charge, *, max_retries: int = MAX_RETRIES):
    """Retry a charge on transient failures with exponential backoff."""
    for attempt in range(1, max_retries + 1):
        try:
            return charge()
        except TransientPaymentError:
            if attempt == max_retries:
                raise
            time.sleep(2 ** attempt)  # no jitter / cap -> synchronized retry storm under load
