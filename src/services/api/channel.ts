import { fetchMethod } from '../axios/index';

export const getChannelList = {
    api: (channelType: string) => `/channel-service/v1/channels?type=${channelType}`,
    method: fetchMethod.GET,
};

export const getChannelById = {
    api: (channelId: string) => `/channel-service/v1/channels/${channelId}`,
    method: fetchMethod.GET,
};

export const postChannelByBuId = {
    api: '/channel-service/v1/channels',
    method: fetchMethod.POST,
};

export const putChannelByBuId = {
    api: (channelId: string) => `/channel-service/v1/channels/${channelId}`,
    method: fetchMethod.PUT,
};

export const deleteChannelById = {
    api: (channelId: string) => `/channel-service/v1/channels/${channelId}`,
    method: fetchMethod.DELETE,
};

export const deleteChannelByIdV3 = {
    api: (channelId: string) => `/channel-service/v3/channels/${channelId}`,
    method: fetchMethod.DELETE,
};

export const postChannelFile = {
    api: '/v1/channel-service/v1/channels/_fileupload',
    method: fetchMethod.POST,
};

export const getChannelCount = {
    api: () => '/channel-service/v1/channels/_count',
    method: fetchMethod.GET,
};

export const getChannelProviders = {
    api: () => '/channel-service/v1/channels/providers',
    method: fetchMethod.GET,
};

export const getConversationCount = {
    api: () => '/channel-service/v1/channels/_conv_count',
    method: fetchMethod.GET,
};

export const getFacebookChannelByUserId = {
    api: (userID: string) => `/platform/v1/facebooks?fbUserId=${userID}`,
    method: fetchMethod.GET,
};

export const createFacebookChannel = {
    api: '/platform/v1/facebook/_auth_pages',
    method: fetchMethod.POST,
};

export const deleteFacebookChannels = {
    api: '/platform/v1/facebook/_cancel_pages',
    method: fetchMethod.POST,
};

export const postMailChannelByBuId = {
    api: '/platform/v1/mail_channels',
    method: fetchMethod.POST,
};

export const putMailChannelByBuId = {
    api: (channelId: string) => `/platform/v1/mail_channels/${channelId}`,
    method: fetchMethod.PUT,
};

export const initializeNewChannel = {
    api: '/platform/v1/init_channel',
    method: fetchMethod.POST,
};

export const updateChannelById = {
    api: (channelId: string) => `/channel-service/v1/channels/${channelId}`,
    method: fetchMethod.PUT,
};

export const channelCount = {
    api: () => '/channel-service/v1/channels/_count',
    method: fetchMethod.GET,
};

export const createWebWidget = {
    api: () => '/channel-service/v1/channels/_web',
    method: fetchMethod.POST,
};

export const createWebWidgetV3 = {
    api: () => '/channel-service/v3/channels/_web',
    method: fetchMethod.POST,
};


export const fetchFBPagesWithCredId = {
    api: (credentialId: string) => `/channel-service/v1/channels/_facebook/credential/${credentialId}`,
    method: fetchMethod.GET,
};

export const createFacebook = {
    api: () => '/channel-service/v3/channels/_facebook',
    method: fetchMethod.POST,
};

export const updateFacebook = {
    api: () => '/channel-service/v2/channels/_facebook',
    method: fetchMethod.PUT,
};

export const createInstagram = {
    api: () => '/channel-service/v1/channels/_instagram',
    method: fetchMethod.POST,
};

export const createInstagramDirectV2 = {
    api: () => '/channel-service/v1/channels/_instagramV2',
    method: fetchMethod.POST,
};

export const updateInstagram = {
    api: () => '/channel-service/v1/channels/_instagram',
    method: fetchMethod.PUT,
};

export const createEmail = {
    api: () => '/channel-service/v1/channels/_email',
    method: fetchMethod.POST,
};

export const createWechat = {
    api: () => '/channel-service/v1/channels/_wechat',
    method: fetchMethod.POST,
};

export const createLine = {
    api: () => '/channel-service/v1/channels/_line',
    method: fetchMethod.POST,
};

export const createWhatsapp = {
    api: () => '/channel-service/v1/channels/_whatsapp',
    method: fetchMethod.POST,
};

export const createWhatsappV2 = {
    api: () => '/channel-service/v2/channels/_whatsapp',
    method: fetchMethod.POST,
};

export const createWhatsappV3 = {
    api: () => '/channel-service/v3/channels/_whatsapp',
    method: fetchMethod.POST,
};


export const updateWhatsApp = {
    api: () => '/channel-service/v2/channels/_whatsapp',
    method: fetchMethod.PUT,
};

export const replaceChannel = {
    api: () => '/channel-service/v1/channels/_replace',
    method: fetchMethod.POST,
};
