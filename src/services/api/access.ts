import { fetchMethod } from '../axios';

export const postAccessSignInWithIdentity = {
    api: '/platform/v1/access/_signin_with_identity',
    method: fetchMethod.POST,
};

export const postAccessExchangeAccessToken = {
    api: '/platform/v1/access/_exchange_access_token',
    method: fetchMethod.POST,
};

export const postExchangeAccessTokenWithAccessToken = {
    api: '/platform/v1/access/_exchange_access_token_with_access_token',
    method: fetchMethod.POST,
};
