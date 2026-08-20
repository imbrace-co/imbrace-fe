import { fetchMethod } from '../axios/index';

export const postLoginEmailLegacy = {
    api: '/platform/v1/login/_signin_email_request',
    method: fetchMethod.POST,
};

export const postLoginOTPLegacy = {
    api: '/platform/v1/login/_signin_with_email',
    method: fetchMethod.POST,
};

export const signInLegacy = {
    api: '/platform/v1/login',
    method: fetchMethod.POST,
};

export const getOrganizationLegacy = {
    api: (limit: number, skip: number, is_active: boolean) =>
        `/platform/v2/organizations?limit=${limit}&skip=${skip}&is_active=${is_active}`,
    method: fetchMethod.GET,
};

export const postAccessExchangeAccessTokenLegacy = {
    api: '/platform/v1/access/_exchange_access_token',
    method: fetchMethod.POST,
};
