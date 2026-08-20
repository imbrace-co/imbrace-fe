import axios from 'axios';

import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';

import { AI_TRACING_API, APWF_API, DATA_ANALYTICS_API, IMBRACE_API, IPS_API } from '../baseURL';
import { responseErrorInterceptor, responseInterceptor } from './interceptor';

export const getAuthHeaders = () => {
    const accessToken = window.localStorage.getItem(IMBRACE_ACCESS_TOKEN);
    if (!accessToken) return {};
    return { 'x-access-token': accessToken } as Record<string, string>;
};

export const ImbraceClient = axios.create({
    baseURL: IMBRACE_API,
    // timeout: 30000,
});

export const ImbraceAITracing = axios.create({
    baseURL: AI_TRACING_API,
    timeout: 30000,
});

export const IpsClient = axios.create({
    baseURL: IPS_API,
    // timeout: 30000,
});

//DO NOT ADD Access-Control-Allow-Origin
export const ImbraceWorkflow = axios.create({
    baseURL: IMBRACE_API,
    timeout: 30000,
});

export const ImbraceDataAnalytics = axios.create({
    baseURL: DATA_ANALYTICS_API,
    timeout: 30000,
});

export const ApWorkflowClient = axios.create({
    baseURL: APWF_API,
    timeout: 30000,
});

ImbraceClient.interceptors.response.use(responseInterceptor, responseErrorInterceptor);
ImbraceAITracing.interceptors.response.use(responseInterceptor, responseErrorInterceptor);

export const ImbraceFileUpload = axios.create({
    baseURL: IMBRACE_API,
    headers: {
        'Content-Type': 'multipart/form-data',
    },
});

export interface FetchMethod {
    GET: 'GET';
    POST: 'POST';
    DELETE: 'DELETE';
    PUT: 'PUT';
    PATCH: 'PATCH';
    HEAD: 'HEAD';
    OPTIONS: 'OPTIONS';
}

export const fetchMethod: FetchMethod = {
    GET: 'GET',
    POST: 'POST',
    DELETE: 'DELETE',
    PUT: 'PUT',
    PATCH: 'PATCH',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS',
};
