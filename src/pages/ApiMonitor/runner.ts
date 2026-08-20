import type { ApiTestConfig, TestResult } from './types';
import { extractPreview, validateShape } from './validator';

const HTTP_ERRORS: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
};

async function resolveId(idSourceUrl: string): Promise<string> {
    const token = localStorage.getItem('imbrace-access-token') || '';
    const orgId = document.cookie.match(/org_id=([^;]+)/)?.[1] || '';
    try {
        const res = await fetch(idSourceUrl, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...(orgId && { 'x-organization-id': orgId }),
            },
        });
        if (!res.ok) return 'unknown-id';
        const json = await res.json();
        const items = json?.data ?? json;
        const first = Array.isArray(items) ? items[0] : items;
        return first?.id || first?._id || first?.public_id || 'unknown-id';
    } catch {
        return 'unknown-id';
    }
}

export async function runTest(config: ApiTestConfig): Promise<TestResult> {
    if (config.skip) {
        return { id: config.id, status: 'skip', url: config.getUrl() };
    }

    const token = localStorage.getItem('imbrace-access-token') || '';
    const orgId = document.cookie.match(/org_id=([^;]+)/)?.[1] || '';

    let url = config.getUrl();
    if (url.includes(':id') && config.idSourceUrl) {
        const realId = await resolveId(config.idSourceUrl);
        url = url.replace(':id', realId);
    }

    const start = performance.now();

    try {
        const response = await fetch(url, {
            method: config.method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...(orgId && { 'x-organization-id': orgId }),
            },
            ...(config.samplePayload && config.method !== 'GET'
                ? { body: JSON.stringify(config.samplePayload) }
                : {}),
        });

        const responseTime = Math.round(performance.now() - start);
        const statusCode = response.status;

        let data: unknown;
        try {
            data = await response.json();
        } catch {
            data = null;
        }

        if (!response.ok) {
            const httpError = HTTP_ERRORS[statusCode];
            return {
                id: config.id,
                status: 'fail',
                statusCode,
                responseTime,
                error: httpError
                    ? `${statusCode} ${httpError}`
                    : `HTTP ${statusCode}`,
                responsePreview: extractPreview(data),
                url,
            };
        }

        const structureErrors =
            config.expectedShape && data
                ? validateShape(data, config.expectedShape)
                : [];

        return {
            id: config.id,
            status: structureErrors.length > 0 ? 'fail' : 'pass',
            statusCode,
            responseTime,
            structureErrors: structureErrors.length > 0 ? structureErrors : undefined,
            responsePreview: extractPreview(data),
            url,
        };
    } catch (err) {
        const responseTime = Math.round(performance.now() - start);
        return {
            id: config.id,
            status: 'fail',
            responseTime,
            error: err instanceof Error ? err.message : 'Network error',
            url,
        };
    }
}

export async function loadExamplePayload(sourceGetUrl: string): Promise<Record<string, unknown> | null> {
    const token = localStorage.getItem('imbrace-access-token') || '';
    const orgId = document.cookie.match(/org_id=([^;]+)/)?.[1] || '';
    try {
        const res = await fetch(sourceGetUrl, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...(orgId && { 'x-organization-id': orgId }),
            },
        });
        if (!res.ok) return null;
        const json = await res.json();
        // unwrap paginated response → first item
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) return json.data[0];
        // plain array → first item
        if (Array.isArray(json) && json.length > 0) return json[0];
        // single object
        if (json && typeof json === 'object') return json;
        return null;
    } catch {
        return null;
    }
}

export async function runAll(
    configs: ApiTestConfig[],
    onUpdate: (result: TestResult) => void,
    concurrency = 4,
    safeOnly = true,
): Promise<void> {
    configs = safeOnly ? configs.filter((c) => c.safe) : configs;
    const queue = [...configs];
    const workers: Promise<void>[] = [];

    const work = async () => {
        while (queue.length > 0) {
            const config = queue.shift();
            if (!config) break;
            const result = await runTest(config);
            onUpdate(result);
        }
    };

    for (let i = 0; i < Math.min(concurrency, configs.length); i++) {
        workers.push(work());
    }

    await Promise.all(workers);
}
