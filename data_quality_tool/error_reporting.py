"""Rendering of error details for API responses.

The validators build detailed, actionable messages for domain experts (missing column, bad
enumeration format, ...). Those describe the caller's own payload and are shown in the UI, but the
text still travels through the exception handling of the service, so anything that looks like a
stack trace is dropped and the remaining report is length-bounded before it leaves the process.
"""

import re

GENERIC_VALIDATION_ERROR = "The data model could not be validated."
MAX_CLIENT_ERROR_LENGTH = 300

_TRACEBACK_MARKER = re.compile(
    r"Traceback \(most recent call last\)"
    r"|File \"[^\"]+\", line \d+"
    r"|site-packages"
)
# Control characters have no business in a message shown to a user; line breaks and tabs are
# already handled by the whitespace collapse below.
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def client_error_message(details: object) -> str:
    """Return a single-line, bounded rendering of validation details for an API response."""
    message = str(details)
    if _TRACEBACK_MARKER.search(message):
        # A stack trace reached us instead of a validation report; keep it in the logs only.
        return GENERIC_VALIDATION_ERROR
    message = _CONTROL_CHARS.sub("", " ".join(message.splitlines()[0].split()))
    if len(message) > MAX_CLIENT_ERROR_LENGTH:
        message = f"{message[: MAX_CLIENT_ERROR_LENGTH - 1].rstrip()}…"
    return message
