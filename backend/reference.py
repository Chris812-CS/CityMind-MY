"""
reference.py — In-memory reference number generation for JPJ Traffic & Walkability AI Advisor.

Generates unique reference numbers matching the pattern JPJ-{YYYYMMDD}-{4-char hex},
e.g. JPJ-20240715-A3F9. Uses Python's uuid4() hex prefix combined with the current
UTC date. No persistence — generated values exist only for the duration of the session.

Satisfies: Requirements 9.5, 10.4
"""

import uuid
from datetime import datetime, timezone


def generate_reference_number() -> str:
    """Generate a unique in-memory reference number for a JPJ analysis session.

    Returns a string matching the pattern ``JPJ-YYYYMMDD-XXXX`` where:
    - ``YYYYMMDD`` is the current UTC date.
    - ``XXXX`` is the first 4 characters of a UUID4 hex string, uppercased.

    Example return value: ``JPJ-20240715-A3F9``

    The value is generated entirely in-memory and is not persisted anywhere.
    """
    utc_date = datetime.now(tz=timezone.utc).strftime("%Y%m%d")
    hex_prefix = uuid.uuid4().hex[:4].upper()
    return f"JPJ-{utc_date}-{hex_prefix}"
