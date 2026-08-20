export type PingOptions = {
    timeoutMs?: number;
};

/**
 * Fire-and-forget "ping" to warm up a remote service.
 * Uses `no-cors` to avoid CORS blocking in browsers (response will be opaque).
 */
export async function pingActivePieces(url: string, options: PingOptions = {}) {
    if (!url) return;

    const timeoutMs = options.timeoutMs ?? 8000;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        await fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store',
            keepalive: true,
            signal: controller.signal,
        });
        console.log('pingActivePieces - success');
    } catch (error) {
        console.log('pingActivePieces - error', error);
    } finally {
        window.clearTimeout(timeoutId);
    }
}

/**
 * Warm up by actually loading the URL in a hidden iframe (so client-side redirects can run).
 * This is heavier than `pingActivePieces` but closer to "open in a tab" behavior.
 */
export function warmupActivePiecesIframe(url: string, options: PingOptions = {}) {
    if (!url) return;
    if (typeof document === 'undefined') return;

    const timeoutMs = options.timeoutMs ?? 12000;

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.title = 'activepieces-warmup';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    // Append first so navigation starts reliably.
    document.body.appendChild(iframe);

    const cleanup = () => {
        try {
            iframe.remove();
        } catch {
            // ignore
        }
    };

    window.setTimeout(cleanup, timeoutMs);
}


