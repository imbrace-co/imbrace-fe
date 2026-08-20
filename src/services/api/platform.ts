import { fetchMethod } from '../axios';

export const getPlatformCategories = {
    api: (type?: string) => `/platform/v1/categories${type ? `?type=${type}` : ''}`,
    method: fetchMethod.GET,
};

export const postPlatformCategory = {
    api: () => `/platform/v1/categories`,
    method: fetchMethod.POST,
};

export const putPlatformCategory = {
    api: (id: string) => `/platform/v1/categories/${id}`,
    method: fetchMethod.PUT,
};

export const deletePlatformCategory = {
    api: (id: string) => `/platform/v1/categories/${id}`,
    method: fetchMethod.DELETE,
};
