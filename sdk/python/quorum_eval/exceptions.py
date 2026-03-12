class QuorumError(Exception):
    """Base exception for all Quorum client errors."""
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class AuthenticationError(QuorumError):
    """API key is missing or invalid."""


class RateLimitError(QuorumError):
    """Too many requests."""


class EvaluationError(QuorumError):
    """Evaluation failed on the server."""


class TimeoutError(QuorumError):
    """Evaluation did not complete within the timeout."""


class NotFoundError(QuorumError):
    """Resource not found."""
