import { fetchMethod } from '../axios';

export const generateThirdPartyToken = {
    api: () => `/platform/v1/third_party_token`,
    method: fetchMethod.POST,
};
