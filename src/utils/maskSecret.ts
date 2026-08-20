/**
 * Mask a secret by keeping only the first 3 and last 3 characters.
 * Example: "sk-1234567890" -> "sk-•••••••890"
 *
 * Notes:
 * - If the input is already masked (matches our masked format), return as-is.
 * - If length <= 6, mask the whole string.
 */
export const maskSecret = (value?: string | null): string => {
    if (value === undefined || value === null) return '';
    const raw = String(value);
    if (raw.length === 0) return '';
    if (isMaskedSecret(raw)) return raw;

    if (raw.length <= 6) {
        return '•'.repeat(raw.length);
    }

    const head = raw.slice(0, 3);
    const tail = raw.slice(-3);
    const middle = '•'.repeat(raw.length - 6);
    return `${head}${middle}${tail}`;
};

export const isMaskedSecret = (value?: string | null): boolean => {
    if (value === undefined || value === null) return false;
    const raw = String(value);
    if (raw.length === 0) return false;

    // Case 1: fully masked (used for very short secrets)
    if (/^•+$/.test(raw)) return true;

    // Case 2: our standard mask format: first 3 chars + bullets + last 3 chars
    // and the middle segment must be ALL bullets.
    if (raw.length > 6) {
        const middle = raw.slice(3, -3);
        return middle.length > 0 && /^•+$/.test(middle);
    }

    return false;
};

/**
 * Resolve a potentially masked secret value.
 *
 * Rules:
 * - Plain input -> return trimmed input
 * - Empty / masked input -> return existing only if it's unmasked; otherwise `undefined` (caller should omit field)
 */
export const resolveSecret = (input?: string | null, existing?: string | null): string | undefined => {
    if (input !== undefined && input !== null) {
        const rawInput = String(input);
        if (rawInput.length > 0 && !isMaskedSecret(rawInput)) return rawInput;
    }

    if (existing !== undefined && existing !== null) {
        const rawExisting = String(existing);
        if (rawExisting.length > 0 && !isMaskedSecret(rawExisting)) return rawExisting;
    }

    return undefined;
};


