import { fetchMethod } from '../axios';

export const getAITracingTraces = {
    api: ({
        service,
        limit,
        timeRange,
        details,
        orgId,
    }: {
        service?: string;
        limit?: number | string;
        timeRange?: number | string;
        details?: boolean;
        orgId?: string;
    }) => {
        const searchParams = new URLSearchParams();
        if (orgId) {
            searchParams.append('orgId', orgId);
        }
        if (service) {
            searchParams.append('service', service);
        }
        if (typeof limit !== 'undefined') {
            searchParams.append('limit', `${limit}`);
        }
        if (typeof timeRange !== 'undefined') {
            searchParams.append('timeRange', `${timeRange}`);
        }
        if (typeof details !== 'undefined') {
            searchParams.append('details', details ? 'true' : 'false');
        }
        const qs = searchParams.toString();
        return `/traces${qs ? `?${qs}` : ''}`;
    },
    method: fetchMethod.GET,
};

export const getAITracingTraceById = {
    api: (traceId: string, orgId?: string) => {
        const searchParams = new URLSearchParams();
        if (orgId) {
            searchParams.append('orgId', orgId);
        }
        const qs = searchParams.toString();
        return `/traces/${encodeURIComponent(traceId)}${qs ? `?${qs}` : ''}`;
    },
    method: fetchMethod.GET,
};

export const getAITracingServices = {
    api: ({ orgId }: { orgId?: string } = {}) => {
        const searchParams = new URLSearchParams();
        if (orgId) {
            searchParams.append('orgId', orgId);
        }
        const qs = searchParams.toString();
        return `/services${qs ? `?${qs}` : ''}`;
    },
    method: fetchMethod.GET,
};

export const getAITracingTags = {
    api: ({ orgId }: { orgId?: string } = {}) => {
        const searchParams = new URLSearchParams();
        if (orgId) {
            searchParams.append('orgId', orgId);
        }
        const qs = searchParams.toString();
        return `/tags${qs ? `?${qs}` : ''}`;
    },
    method: fetchMethod.GET,
};

export const getAITracingTagValues = {
    api: (tagName: string, { timeRange, orgId }: { timeRange?: number | string; orgId?: string } = {}) => {
        const searchParams = new URLSearchParams();
        if (orgId) {
            searchParams.append('orgId', orgId);
        }
        if (typeof timeRange !== 'undefined') {
            searchParams.append('timeRange', `${timeRange}`);
        }
        const qs = searchParams.toString();
        return `/tags/${encodeURIComponent(tagName)}/values${qs ? `?${qs}` : ''}`;
    },
    method: fetchMethod.GET,
};

export const getAITracingTraceQLSearch = {
    api: ({
        q,
        queries,
        limit,
        timeRange,
        orgId,
    }: {
        q?: string;
        queries?: string[];
        limit?: number | string;
        timeRange?: number | string;
        orgId?: string;
    }) => {
        const searchParams = new URLSearchParams();

        if (orgId) {
            searchParams.append('orgId', orgId);
        }
        if (typeof limit !== 'undefined') {
            searchParams.append('limit', `${limit}`);
        }
        if (typeof timeRange !== 'undefined') {
            searchParams.append('timeRange', `${timeRange}`);
        }

        // `trace-poller.ts` supports either `?q=query` or `?queries=["q1","q2"]`
        if (Array.isArray(queries)) {
            searchParams.append('queries', JSON.stringify(queries));
        } else if (typeof q !== 'undefined') {
            searchParams.append('q', q);
        }

        const qs = searchParams.toString();
        return `/search/traceql${qs ? `?${qs}` : ''}`;
    },
    method: fetchMethod.GET,
};


