import { fetchMethod } from '../axios';

export const getAccount = {
    api: '/platform/v1/account',
    method: fetchMethod.GET,
};

export const putAccount = {
    api: '/platform/v1/account',
    method: fetchMethod.PUT,
};

export const postAccountAvatar = {
    api: '/platform/v1/account/_fileupload',
    method: fetchMethod.POST,
};
