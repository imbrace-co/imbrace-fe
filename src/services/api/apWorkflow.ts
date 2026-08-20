import { ApWorkflowClient, fetchMethod } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

export interface CreateFlowPayload {
    displayName: string;
    folderName: string;
    metadata: {
        tags: Array<{ id: string; name: string }>;
    };
}

export interface FlowVersion {
    id: string;
    created: string;
    updated: string;
    flowId: string;
    displayName: string;
    trigger: {
        name: string;
        valid: boolean;
        displayName: string;
        type: string;
        settings: Record<string, unknown>;
    };
    valid: boolean;
    agentIds: string[];
    state: string;
    connectionIds: string[];
    updatedBy: string | null;
    schemaVersion: string;
    backupFiles: unknown | null;
}

export interface FlowResponse {
    id: string;
    created: string;
    updated: string;
    projectId: string;
    externalId: string;
    status: string;
    operationStatus: string;
    version: FlowVersion;
    folderId: string;
    publishedVersionId: string | null;
    metadata: {
        tags?: Array<{ id: string; name: string }>;
        settings?: Record<string, any>;
        [key: string]: any;
    } | null;
}

// Direct ActivePieces flow listing — replaces the old IPS /v1/ap-workflows/all proxy.
// AP's /api/v1/flows ignores tags/haveAISettings/ids server-side and paginates by
// cursor, so we page through everything and filter client-side, then convert to the
// exact response shape the IPS endpoint used to return (slim items + paginated envelope).
export interface ApWorkflowListItem {
    id: string;
    displayName: string;
    active: string;
    created: string;
    updated: string;
    metadata: FlowResponse['metadata'];
}

export interface ApWorkflowListResponse {
    data: ApWorkflowListItem[];
    count: number;
    total: string;
    has_more: boolean;
    skip: number;
    limit: number;
}

const AP_FLOWS_PAGE_LIMIT = 100;

export const fetchAllApWorkflows = async (
    options: { tags?: string[]; haveAISettings?: boolean; ids?: string[]; sort?: string; onlyEnabled?: boolean } = {},
): Promise<ApWorkflowListResponse> => {
    const { tags, haveAISettings, ids, sort, onlyEnabled } = options;

    const flows: FlowResponse[] = [];
    let cursor: string | null = null;
    do {
        const params = new URLSearchParams({ limit: String(AP_FLOWS_PAGE_LIMIT) });
        if (cursor) params.set('cursor', cursor);
        const { data } = await apiFetch<{ data: FlowResponse[]; next: string | null }>(
            `/api/v1/flows?${params.toString()}`,
            fetchMethod.GET,
            undefined,
            ApWorkflowClient,
        );
        flows.push(...(data.data || []));
        cursor = data.next;
    } while (cursor);

    // AP's cursor pages overlap, returning the same flow on consecutive pages —
    // dedupe by id or the Select component rejects the options ("same value").
    const seen = new Set<string>();
    let result = flows.filter((flow) => {
        if (seen.has(flow.id)) return false;
        seen.add(flow.id);
        return true;
    });
    if (tags?.length) {
        result = result.filter((flow) => {
            // dev data contains flows with null entries inside metadata.tags
            const tagNames = (flow.metadata?.tags || []).map((tag) => tag?.name).filter(Boolean);
            return tags.every((tag) => tagNames.includes(tag));
        });
    }
    if (haveAISettings) {
        result = result.filter((flow) => Boolean(flow.metadata?.settings?.ai));
    }
    if (ids?.length) {
        result = result.filter((flow) => ids.includes(flow.id));
    }
    if (onlyEnabled) {
        result = result.filter((flow) => flow.status === 'ENABLED');
    }
    if (sort === 'created_at' || sort === '-created_at') {
        const direction = sort.startsWith('-') ? -1 : 1;
        result = [...result].sort((a, b) => direction * a.created.localeCompare(b.created));
    }

    const items: ApWorkflowListItem[] = result.map((flow) => ({
        id: flow.id,
        displayName: flow.version?.displayName ?? '',
        active: flow.status,
        created: flow.created,
        updated: flow.updated,
        metadata: flow.metadata,
    }));

    return {
        data: items,
        count: items.length,
        total: String(items.length),
        has_more: false,
        skip: 0,
        limit: -1,
    };
};

export const postApWorkflowFlow = {
    api: '/api/v1/flows',
    method: fetchMethod.POST,
};

export const deleteApWorkflowFlow = {
    api: (flowId: string) => `/api/v1/flows/${flowId}`,
    method: fetchMethod.DELETE,
};

export interface AppConnectionOwner {
    id: string;
    email: string;
    firstName: string;
    status: string;
    platformRole: string;
    lastName: string;
    created: string;
    updated: string;
    externalId: string;
    platformId: string;
}

export interface AppConnection {
    id: string;
    created: string;
    updated: string;
    externalId: string;
    displayName: string;
    type: string;
    pieceName: string;
    projectIds: string[];
    scope: string;
    status: string;
    platformId: string;
    ownerId: string;
    owner: AppConnectionOwner | null;
    metadata: Record<string, unknown> | null;
    flowIds: string[];
}

export interface AppConnectionsResponse {
    data: AppConnection[];
    next: string | null;
    previous: string | null;
}

export interface PieceMetadata {
    name: string;
    displayName: string;
    logoUrl: string;
    description: string;
    version: string;
}

export const getAppConnections = {
    api: (imbraceUserId: string) => `/api/v1/app-connections?imbraceUserId=${imbraceUserId}`,
    method: fetchMethod.GET,
};

export const getPieceMetadata = {
    api: (pieceName: string) => `/api/v1/pieces/${pieceName}`,
    method: fetchMethod.GET,
};

export const deleteAppConnection = {
    api: (connectionId: string) => `/api/v1/app-connections/${connectionId}`,
    method: fetchMethod.DELETE,
};

// External Data Sync (IPS) - Subscriptions
export interface SyncSubscription {
    _id: string;
    organization_id: string;
    provider: string;
    connection_id: string;
    calendar_id: string;
    board_id: string | null;
    folder_id: string | null;
    workflow_id: string | null;
    connection_name: string;
    is_active: boolean;
    last_synced_at: string;
    created_at: string;
    updated_at: string;
}

export interface SyncSubscriptionsResponse {
    data: SyncSubscription[];
    count: number;
}

export const getExternalDataSyncSubscriptions = {
    api: '/ips/v1/external-data-sync',
    method: fetchMethod.GET,
};

export const deleteExternalDataSyncSubscription = {
    api: (id: string) => `/ips/v1/external-data-sync/${id}`,
    method: fetchMethod.DELETE,
};

export const enableExternalDataSync = {
    api: '/ips/v1/external-data-sync/enable',
    method: fetchMethod.POST,
};

