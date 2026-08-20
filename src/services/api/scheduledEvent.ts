import { fetchMethod } from '../axios';

export const getScheduledEvents = {
    api: () => '/ips/v1/schedulers',
    method: fetchMethod.GET,
};

export const deleteScheduledEvent = {
    api: (id: string) => `/ips/v1/schedulers/${id}`,
    method: fetchMethod.DELETE,
};

export const getScheduledEventFilterOptions = {
    api: (value: 'channel_source' | 'event_type' | 'sender') => `/ips/v1/schedulers/filter_options?filter=${value}`,
    method: fetchMethod.GET,
};
