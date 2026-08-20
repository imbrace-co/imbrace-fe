import { fetchMethod } from '@/services/axios';

const DATA_BOARD = '/data-board';

export const getKnowledgeHubFoldersSearch = {
    api: (searchValue: string) => `${DATA_BOARD}/folders/search?q=${searchValue}`,
    method: fetchMethod.GET,
};

export const getKnowledgeHubFolderById = {
    api: (folderId: string, recursive: boolean) => `${DATA_BOARD}/folders/${folderId}?recursive=${recursive}`,
    method: fetchMethod.GET,
};

export const getKnowledgeHubFoldersContentById = {
    api: (folderId: string) => `${DATA_BOARD}/folders/${folderId}/contents`,
    method: fetchMethod.GET,
};

export const postKnowledgeHubFolder = {
    api: () => `${DATA_BOARD}/folders`,
    method: fetchMethod.POST,
};

export const putKnowledgeHubFolderById = {
    api: (folderId: string) => `${DATA_BOARD}/folders/${folderId}`,
    method: fetchMethod.PUT,
};

export const deleteKnowledgeHubFolder = {
    api: () => `${DATA_BOARD}/folders/delete`,
    method: fetchMethod.POST,
};

export const getKnowledgeHubFiles = {
    api: (folderId: string) => `${DATA_BOARD}/files/search?folder_id=${folderId}`,
    method: fetchMethod.GET,
};

export const getKnowledgeHubFileById = {
    api: (fileId: string) => `${DATA_BOARD}/files/${fileId}`,
    method: fetchMethod.GET,
};

export const postKnowledgeHubFile = {
    api: () => `${DATA_BOARD}/files`,
    method: fetchMethod.POST,
};

export const putKnowledgeHubFileById = {
    api: (fileId: string) => `${DATA_BOARD}/files/${fileId}`,
    method: fetchMethod.PUT,
};

export const deleteKnowledgeHubFiles = {
    api: () => `${DATA_BOARD}/files/delete`,
    method: fetchMethod.POST,
};

export const generateAITags = {
    api: () => `${DATA_BOARD}/ai/tag-generation`,
    method: fetchMethod.POST,
};
export const uploadFile = {
    api: () => `${DATA_BOARD}/files/upload`,
    method: fetchMethod.POST,
};

export const downloadFile = {
    api: (fileId: string) => `${DATA_BOARD}/files/${fileId}/download`,
    method: fetchMethod.GET,
};

// External Cloud
export const initDrive = {
    api: (type: string) => `${DATA_BOARD}/auth/${type}/initiate`,
    method: fetchMethod.GET,
};

export const getDriveProviders = {
    api: () => `${DATA_BOARD}/providers`,
    method: fetchMethod.GET,
};

export const getFoldersFromDrive = {
    api: (sessionId: string, type: string) => `${DATA_BOARD}/${type}/folders?sessionId=${sessionId}`,
    method: fetchMethod.GET,
};

export const getFilesFromDrive = {
    api: (sessionId: string, folderId: string, type: string) => `${DATA_BOARD}/${type}/files?sessionId=${sessionId}${type === 'onedrive' ? '&folderId' : '&parentId'}=${folderId}`,
    method: fetchMethod.GET,
};

export const downloadFileFromDrive = {
    api: (sessionId: string, fileId: string, type: string) => `${DATA_BOARD}/${type}/files/download?sessionId=${sessionId}&fileId=${fileId}`,
    method: fetchMethod.GET,
};

export const checkOneDriveSessionStatus = {
    api: () => `${DATA_BOARD}/auth/onedrive/files/session/status`,
    method: fetchMethod.GET,
};
