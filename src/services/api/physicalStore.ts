import { fetchMethod } from '../axios/index';

export const getStores = {
    api: (businessId: string, skip = 0, limit = 10) => `/platform/v1/stores?type=business_unit_id&q=${businessId}&skip=${skip}&limit=${limit}`,
    method: fetchMethod.GET,
};

export const createStore = {
    api: '/platform/v1/stores/_create_with_fp',
    method: fetchMethod.POST,
};

export const modifyStore = {
    api: '/platform/v1/stores/_modify_with_fp',
    method: fetchMethod.POST,
};

export const deleteStore = {
    api: (storeId: string) => `/platform/v1/stores/${storeId}`,
    method: fetchMethod.DELETE,
};
