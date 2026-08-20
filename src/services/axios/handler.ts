import type { AxiosRequestConfig } from 'axios';
import { getCookie } from 'typescript-cookie';

import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';

import type { FetchMethod } from '.';
import { fetchMethod, ImbraceClient, getAuthHeaders } from '.';

/**
 * @param {string} apiEndpoint api endpoint/route jasper
 * @param {string} apiMethod api request method
 * @param {object} apiParameters request body
 * @param {axios} [axiosInstance] optional - axiosInstance axios instance, most requests use the default one, but for uploading image, use ImbraceFileupload
 */

async function apiFetch<T>(
    apiEndpoint: string,
    apiMethod: keyof FetchMethod,
    apiParameters = {},
    axiosInstance = ImbraceClient,
    options: AxiosRequestConfig = {},
) {
    const orgId = getCookie('org_id');
    const authHeaders = getAuthHeaders();

    const finalEndpoint = apiEndpoint;

    const axiosHeader = { 
        ...authHeaders,
        'x-organization-id': orgId || '',
    };

    switch (apiMethod) {
        case fetchMethod.GET: {
            const axiosResponse = await axiosInstance.get<T>(finalEndpoint, {
                ...options,
                headers: {
                    ...axiosHeader,
                    ...options.headers,
                },
                params: apiParameters,
            });
            return axiosResponse;
        }

        case fetchMethod.POST: {
            const axiosResponse = await axiosInstance.post<T>(finalEndpoint, apiParameters, {
                ...options,
                headers: {
                    ...axiosHeader,
                    ...options.headers,
                },
            });
            return axiosResponse;
        }

        case fetchMethod.DELETE: {
            const axiosResponse = await axiosInstance.delete<T>(finalEndpoint, {
                params: apiParameters,
                ...options,
                headers: {
                    ...axiosHeader,
                    ...options.headers,
                },
            });
            return axiosResponse;
        }

        case fetchMethod.PUT: {
            const axiosResponse = await axiosInstance.put<T>(finalEndpoint, apiParameters, {
                ...options,
                headers: {
                    ...axiosHeader,
                    ...options.headers,
                },
            });
            return axiosResponse;
        }

        case fetchMethod.PATCH: {
            const axiosResponse = await axiosInstance.patch<T>(finalEndpoint, apiParameters, {
                ...options,
                headers: {
                    ...axiosHeader,
                    ...options.headers,
                },
            });
            return axiosResponse;
        }

        case fetchMethod.HEAD: {
            const axiosResponse = await axiosInstance.head<T>(finalEndpoint, { headers: axiosHeader });
            return axiosResponse;
        }

        case fetchMethod.OPTIONS: {
            const axiosResponse = await axiosInstance.options<T>(finalEndpoint, { headers: axiosHeader });
            return axiosResponse;
        }

        default: {
            const axiosResponse = await axiosInstance.get<T>(finalEndpoint, {
                ...options,
                headers: {
                    ...axiosHeader,
                    ...options.headers,
                },
            });
            return axiosResponse;
        }
    }
}

export default apiFetch;
