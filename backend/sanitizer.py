"""
Input sanitization module for the JPJ Traffic & Walkability AI Advisor.

Applies server-side sanitization to all user-supplied fields before they are
passed to the Strands Agent / Amazon Bedrock model.

Sanitization pipeline (applied in order):
  1. Strip HTML tags          — regex <[^>]+>
  2. Strip control characters — regex [\x00-\x1f\x7f]
  3. Strip prompt-injection patterns
  4. Truncate to 2,000 characters (returns truncated=True flag when triggered)
"""

import re
from typing import Optional

# ---------------------------------------------------------------------------
# Compiled regex patterns
# ---------------------------------------------------------------------------

_RE_HTML_TAGS = re.compile(r"<[^>]+>")
_RE_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")

# Prompt-injection patterns to remove.
# Order matters: more specific patterns first.
_INJECTION_PATTERNS: list[re.Pattern] = [
    # Literal phrase (case-insensitive)
    re.compile(r"ignore\s+previous\s+instructions", re.IGNORECASE),
    # "system:" token (case-insensitive)
    re.compile(r"system\s*:", re.IGNORECASE),
    # ChatML / special tokens
    re.compile(r"<\|im_start\|>"),
    re.compile(r"<\|im_end\|>"),
    # Markdown heading / horizontal-rule sequences at the start of a line
    re.compile(r"^#{1,6}\s*", re.MULTILINE),
    re.compile(r"^---+\s*$", re.MULTILINE),
]

MAX_LENGTH = 2_000


# ---------------------------------------------------------------------------
# Core sanitization function
# ---------------------------------------------------------------------------

def sanitize_field(value: str) -> tuple[str, bool]:
    """Sanitize a single string field.

    Applies the full sanitization pipeline and truncates to MAX_LENGTH.

    Pipeline order:
      1. Strip HTML tags
      2. Strip prompt-injection patterns (must run before control-char removal
         so that multiline anchors ``^`` work correctly on ``###`` / ``---``
         patterns)
      3. Strip control characters (including newlines)
      4. Truncate to MAX_LENGTH

    Args:
        value: The raw input string.

    Returns:
        A tuple ``(sanitized_value, truncated)`` where ``truncated`` is
        ``True`` when the string was longer than MAX_LENGTH after sanitization.
    """
    if not isinstance(value, str):
        value = str(value)

    # 1. Strip HTML tags
    value = _RE_HTML_TAGS.sub("", value)

    # 2. Strip prompt-injection patterns.
    #    This must happen before control-character removal so that the
    #    MULTILINE ``^`` anchors in the ``###`` and ``---`` patterns can
    #    still match at the start of each line (newlines are still present
    #    at this stage).
    for pattern in _INJECTION_PATTERNS:
        value = pattern.sub("", value)

    # 3. Strip control characters ([\x00-\x1f\x7f]), including newlines.
    value = _RE_CONTROL_CHARS.sub("", value)

    # 4. Truncate
    truncated = len(value) > MAX_LENGTH
    if truncated:
        value = value[:MAX_LENGTH]

    return value, truncated


# ---------------------------------------------------------------------------
# Request-level sanitization helper
# ---------------------------------------------------------------------------

def sanitize_request(
    location: str,
    conditions: dict,
    constraints: str,
) -> tuple[dict, list[str]]:
    """Sanitize all fields of an analysis request.

    Sanitizes ``location``, every string value inside ``conditions``, and
    ``constraints``.  Collects a human-readable warning for every field that
    was truncated.

    Args:
        location:    The raw location string.
        conditions:  A dict with string values (weather, time_of_day,
                     event_type, …).  Non-string values are coerced.
        constraints: The raw constraints free-text string.

    Returns:
        A tuple ``(sanitized_dict, warnings)`` where ``sanitized_dict``
        contains keys ``location``, ``conditions``, and ``constraints`` with
        their sanitized values, and ``warnings`` is a list of warning strings
        (one per truncated field, empty list when nothing was truncated).
    """
    warnings: list[str] = []

    # Sanitize location
    clean_location, loc_truncated = sanitize_field(location)
    if loc_truncated:
        warnings.append("location field truncated to 2000 characters")

    # Sanitize each condition sub-field
    clean_conditions: dict = {}
    for key, val in conditions.items():
        clean_val, cond_truncated = sanitize_field(val if isinstance(val, str) else str(val))
        clean_conditions[key] = clean_val
        if cond_truncated:
            warnings.append(f"conditions.{key} field truncated to 2000 characters")

    # Sanitize constraints
    clean_constraints, con_truncated = sanitize_field(constraints)
    if con_truncated:
        warnings.append("constraints field truncated to 2000 characters")

    sanitized = {
        "location": clean_location,
        "conditions": clean_conditions,
        "constraints": clean_constraints,
    }

    return sanitized, warnings
