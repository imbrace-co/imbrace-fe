import { fetchMethod } from '../axios';

export const getCampaigns = {
    api: () => '/channel-service/v1/campaign',
    method: fetchMethod.GET,
};
export const postCampaign = {
    api: () => '/channel-service/v1/campaign',
    method: fetchMethod.POST,
};
export const deleteCampaign = {
    api: (campaignId: string) => `/channel-service/v1/campaign/${campaignId}`,
    method: fetchMethod.DELETE,
};

export const getCampaignById = {
    api: (campaignId: string) => `/channel-service/v1/campaign/${campaignId}`,
    method: fetchMethod.GET,
};

export const getTouchpointList = {
    api: ({ campaignId, is_archived }: { campaignId?: string; is_archived?: boolean }) => {
        const params = new URLSearchParams();
        if (campaignId && campaignId !== 'undefined') {
            params.append('campaign_id', campaignId);
        }
        if (is_archived) {
            params.append('is_archived', is_archived.toString());
        }
        params.append('sort', '-created_at');
        return `/channel-service/v1/touchpoints?${params}`;
    },
    method: fetchMethod.GET,
};
export const getTouchpointById = {
    api: (touchpointId: string) => `/channel-service/v1/touchpoints/${touchpointId}`,
    method: fetchMethod.GET,
};

export const putTouchpointById = {
    api: (contactId: string) => `/channel-service/v1/touchpoints/${contactId}`,
    method: fetchMethod.PUT,
};
export const postTouchpoint = {
    api: () => '/channel-service/v1/touchpoints',
    method: fetchMethod.POST,
};
export const deleteTouchpointById = {
    api: (touchpointId: string) => `/channel-service/v1/touchpoints/${touchpointId}`,
    method: fetchMethod.DELETE,
};

export const postValidateTouchpointInitial = {
    api: () => '/channel-service/v1/touchpoints/_validate',
    method: fetchMethod.POST,
};
