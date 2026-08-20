import { fetchMethod } from '../axios';

export const getContactById = {
    api: '/channel-service/v1/contacts/{{contact_id}}',
    method: fetchMethod.GET,
};

export const putContactById = {
    api: (contactId: string) => `/channel-service/v1/contacts/${contactId}`,
    method: fetchMethod.PUT,
};
export const getContactByIdV2 = {
    api: (contactId: string) => `/platform/v2/contacts/${contactId}`,
    method: fetchMethod.GET,
};
export const getContactCommentById = {
    api: (contactId: string, channelType: string, skip = 0, limit = 50) =>
        `/channel-service/v1/contacts/${contactId}/message_comments?channel_types=${channelType}&skip=${skip}&limit=${limit}`,
    method: fetchMethod.GET,
};
export const getContactCommentByCommentId = {
    api: (contactId: string, commentId: string) => `/channel-service/v1/contacts/${contactId}/comment/${commentId}`,
    method: fetchMethod.GET,
};
export const getContactConversationsById = {
    api: (contactId: string, channelType: string, skip = 0, limit = 50) =>
        `/channel-service/v1/contacts/${contactId}/conversations?channel_types=${channelType}`,
    method: fetchMethod.GET,
};
export const putContactByIdV2 = {
    api: (contactId: string) => `/platform/v2/contacts/${contactId}`,
    method: fetchMethod.PUT,
};
export const getContactFile = {
    api: (contactId: string) => `/channel-service/v1/contact/${contactId}/files`,
    method: fetchMethod.GET,
};
export const getContactList = {
    api: ({ limit, skip, sort }: { limit: number; skip: number; sort?: string }) => `/channel-service/v1/contacts?limit=${limit}&skip=${skip}&sort=${sort}`,
    method: fetchMethod.GET,
};

export const getContactSearch = {
    api: ({ limit, skip, sort, search }: { limit: number; skip: number; sort?: string; search?: string }) =>
        `/channel-service/v1/contacts/_search?limit=${limit}&skip=${skip}&type=text&q=${search}&sort=${sort}`,
    method: fetchMethod.GET,
};

export const exportContactCsv = {
    api: '/channel-service/v1/contacts/_export_csv',
    method: fetchMethod.GET,
};

export const postContactAvatar = {
    api: '/channel-service/v1/contacts/_fileupload',
    method: fetchMethod.POST,
};

export const getContactsExportCSV = {
    api: '/channel-service/v1/contacts/_export_csv?sort={{sort}}',
    method: fetchMethod.GET,
};

export const getBoardContactFields = {
    api: (contactId: string) => `/data-board/boards/by-contact/${contactId}`,
    method: fetchMethod.GET,
};


export const getContactActivitiesByConversationId = {
    api: (conversationId: string, start_date?: string, end_date?: string) => `/channel-service/v1/conversations_activities/${conversationId}${start_date ? `?start_date=${start_date}` : ''}${end_date ? `&end_date=${end_date}` : ''}`,
    method: fetchMethod.GET,
};
