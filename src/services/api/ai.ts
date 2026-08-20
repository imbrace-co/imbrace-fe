import { fetchMethod } from '../axios';

export const getFile = {
    api: (fileId: string) => `/api/files/${fileId}`,
    method: fetchMethod.GET,
};

export const postFile = {
    api: '/api/files',
    method: fetchMethod.POST,
};

export const deleteFile = {
    api: (fileId: string) => `/api/files/${fileId}`,
    method: fetchMethod.DELETE,
};

export const getTemplates = {
    api: '/v3/marketplaces/use-cases',
    method: fetchMethod.GET,
};

export const deleteUseCaseById = {
    api: (useCaseId: string) => `/v3/marketplaces/use-cases/${useCaseId}`,
    method: fetchMethod.DELETE,
};

export const deleteUseCaseByIdV2 = {
    api: (useCaseId: string) => `/v3/marketplaces/use-cases/v2/${useCaseId}`,
    method: fetchMethod.DELETE,
};

export const createCustomUseCase = {
    api: '/v3/marketplaces/use-cases/v2/custom',
    method: fetchMethod.POST,
};

export const updateCustomUseCaseById = {
    api: (useCaseId: string) => `/v3/marketplaces/use-cases/${useCaseId}/custom`,
    method: fetchMethod.PATCH,
};

export const updateUseCaseById = {
    api: (useCaseId: string) => `/v3/marketplaces/use-cases/${useCaseId}`,
    method: fetchMethod.PATCH,
};

