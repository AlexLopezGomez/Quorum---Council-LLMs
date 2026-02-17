/**
 * Structured error for API responses.
 * Carries HTTP status and any server-side error data.
 */
export class ApiError extends Error {
    constructor(message, status = 0, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}
