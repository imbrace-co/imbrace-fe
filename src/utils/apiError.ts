import axios from 'axios';

/**
 * Extract the human-readable error message from an API error response.
 * Data-board / channel-service style bodies: `{ error: string }` or
 * `{ error: string, message: string }` where `message` carries the detail.
 * Returns undefined when the error has no usable server message so callers
 * can fall back to a generic translation.
 */
export const getApiErrorMessage = (err: unknown): string | undefined => {
    if (!axios.isAxiosError(err)) return undefined;
    const data = err.response?.data as { error?: string; message?: string } | undefined;
    const message = data?.message ?? data?.error;
    return typeof message === 'string' && message.trim() ? message : undefined;
};
