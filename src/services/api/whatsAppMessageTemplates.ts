import { fetchMethod } from '../axios/index';

export const getWhatsAppMessageLists = {
    api: (businessUnitId: string, skip = 0, limit = 10) =>
        `/channel-service/v1/whatsapp_templates?type=business_unit_id&q=${businessUnitId}&limit=${limit}&skip=${skip}`,
    method: fetchMethod.GET,
};

export const getWhatsAppMessageListsV2 = {
    api: (businessUnitId: string, channelId: string, skip = 0, limit = 10) =>
        `/channel-service/v2/whatsapp_templates?type=business_unit_id&q=${businessUnitId}&limit=${limit}&skip=${skip}&channel_id=${channelId}`,
    method: fetchMethod.GET,
};
