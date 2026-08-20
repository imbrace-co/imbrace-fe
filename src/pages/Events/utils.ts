import type { RequestParameters } from '@/components/FlexibleTable/types';
import { getScheduledEvents } from '@/services/api/scheduledEvent';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

export const eventType: Record<string, string> = {
    board_automation: 'Board Automation',
};

export const fetchScheduledEvents = async (
    type: 'non_recurring' | 'recurring' | 'past',
    params: RequestParameters,
    signal?: AbortSignal,
) => {
    try {
        const { pagination, globalFilter, sorters, filters } = params;
        const sort = !sorters || sorters?.length === 0 ? 'created_at' : `${sorters[0]?.desc ? '-' : ''}${sorters[0]?.id}`;

        const searchParams = new URLSearchParams();
        searchParams.append('event_type', 'contains:board_automation');
        if (type !== 'past') {
            searchParams.append('type', `is:${type}`);
        }
        if (type === 'past') {
            searchParams.append('is_paused', 'is:true');
        }
        if (filters) {
            filters.forEach((filter: { id: string; value: any }) => {
                if (typeof filter.value === 'object' && filter.value.operator && filter.value.value) {
                    searchParams.append(`${filter.id}`, `${filter.value.operator}:${filter.value.value}`);
                }
            });
        }

        if (pagination) {
            searchParams.append('limit', `${pagination.pageSize}`);
            searchParams.append('skip', `${pagination.pageIndex * pagination.pageSize}`);
            searchParams.append('sort', `${sort}`);
        }
        if (globalFilter) {
            searchParams.append('name', `contains:${globalFilter}`);
        }
        const { data } = await apiFetch<API.PaginatedResponse<API.ScheduledEvent[]>>(
            getScheduledEvents.api(),
            getScheduledEvents.method,
            searchParams,
            ImbraceClient,
            {
                signal,
            },
        );

        return {
            data: data.data,
            meta: {
                total: data.total,
                skip: (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? 0),
                limit: pagination?.pageSize ?? 20,
            },
        };
    } catch (error) {
        console.log('error:', error);
        return {
            data: [],
            meta: {
                total: 0,
                skip: 0,
                limit: 20,
            },
        };
    }
};

export const getChannelSource = (data: API.ScheduledEvent) => {
    const prefix = data.channel_source.split('_')[0];
    switch (prefix) {
        case 'ch':
            const channelType = data.job.data.channel?.config.type;
            return channelType ? channelType : data.channel_source;
        case 'whatsapp':
            return 'WhatsApp';
        case 'email':
            return 'Email';
        default:
            return data.channel_source;
    }
};

export const cursorMapping = (type: API.EventType): 'default' | 'pointer' => {
    switch (type) {
        case 'board_automation':
            return 'default';
        default:
            return 'pointer';
    }
};
