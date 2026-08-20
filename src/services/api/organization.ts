import { fetchMethod } from '../axios/index';

export const getOrganization = {
    api: (limit: number, skip: number, is_active: boolean) => `/platform/v2/organizations?limit=${limit}&skip=${skip}&is_active=${is_active}`,
    method: fetchMethod.GET,
};

export const postOrganization = {
    api: '/platform/v1/organizations',
    method: fetchMethod.POST,
};

export const postOrganizationFullAccess = {
    api: '/platform/v1/organizations/aws',
    method: fetchMethod.POST,
};

export const getMenuSetting = {
    api: '/platform/v1/app/_menu_settings',
    method: fetchMethod.GET,
};

export const getAllOrganization = {
    api: ({is_active}: {is_active: boolean}) => `/platform/v2/organizations/_all?is_active=${is_active}`,
    method: fetchMethod.GET,
};
