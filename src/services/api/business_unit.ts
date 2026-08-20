import { fetchMethod } from '../axios';

export const getBusinessUnit = {
    api: (limit: number, skip: number) => `/platform/v1/business_units?limit=${limit}&skip=${skip}`,
    method: fetchMethod.GET,
};
