import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import Pushy from 'pushy-sdk-web';
import { replace } from 'redux-first-history';

import { FETCH_FAILED, FETCH_IN_PROGRESS, FETCH_SUCCEEDED, IDLE, IMBRACE_ACCESS_TOKEN, IMBRACE_REFRESH_TOKEN } from '@/constants/app';
import { postAccessExchangeAccessToken } from '@/services/api/access';
import apiFetch from '@/services/axios/handler';

import type { InitialState } from './access.types';
import { fetchAccountThunk } from './account';
import { fetchBusinessUnitThunk } from './businessUnit';
import type { AsyncThunkOptions } from './index.types';

const initialState: InitialState = {
    loadingStatus: IDLE,
    isLoggedIn: !!window.localStorage.getItem(IMBRACE_ACCESS_TOKEN),
};

import { setCookie } from 'typescript-cookie';

/**
 * @param {string} organizationId the selected organization
 */

export const exchangeAccessTokenThunk = createAsyncThunk<void, { organizationId: string }, AsyncThunkOptions>(
    'Access/exchangeAccessToken',
    async (params, { dispatch, getState, rejectWithValue }) => {
        try {
            const { organizationId } = params;
            const state = getState();
            const loginMode = localStorage.getItem('login_mode');
            
            // Find the organization in the list to get its name
            const selectedOrg = state.Organization.organizationList.find(org => org.id === organizationId);
            
            // Store org_id and name in cookies for the API handler to use
            setCookie('org_id', organizationId, { expires: 7, path: '/' });
            if (selectedOrg) {
                setCookie('org_name', selectedOrg.name, { expires: 7, path: '/' });
            }

            if (loginMode === 'legacy') {
                const exchangeRes = await apiFetch<{ token: string }>(
                    postAccessExchangeAccessToken.api,
                    postAccessExchangeAccessToken.method,
                    { organization_id: organizationId }
                );
                if (exchangeRes.data?.token) {
                    window.localStorage.setItem(IMBRACE_ACCESS_TOKEN, exchangeRes.data.token);
                }
            }

            // Fetch initial data using the authentication
            await Promise.all([
                dispatch(fetchBusinessUnitThunk({ limit: 10, skip: 0 })),
                dispatch(fetchAccountThunk())
            ]);

            dispatch(replace({ pathname: '/ai-agent', search: window.location.search }));
        } catch (err) {
            const error = err as AxiosError<API.ErrorResponse>;
            let message = 'Something went wrong';

            if (!error.response) {
                if (err instanceof Error) {
                    message = err.message;
                }
            } else {
                message = error.response.data.message;
            }
            return rejectWithValue({ message });
        }
    },
);

/**
 * @param {string} organizationId the selected organization
 */

export const replaceAccessTokenThunk = createAsyncThunk<void, { token: string; refresh_token: string }, AsyncThunkOptions>(
    'Access/replaceAccessToken',
    async (params, { dispatch, rejectWithValue }) => {
        try {
            unsubscribePushy();
            const { token, refresh_token } = params;

            window.localStorage.setItem(IMBRACE_ACCESS_TOKEN, token);
            window.localStorage.setItem(IMBRACE_REFRESH_TOKEN, refresh_token);
            dispatch(logoutReset(true));
            dispatch(replace('/'));

            dispatch(replace({ pathname: '/ai-agent' }));
        } catch (err) {
            const error = err as AxiosError<API.ErrorResponse>;
            let message = 'Something went wrong';

            window.localStorage.removeItem(IMBRACE_ACCESS_TOKEN);
            window.localStorage.removeItem(IMBRACE_REFRESH_TOKEN);
            dispatch(replace('/'));

            if (!error.response) {
                if (err instanceof Error) {
                    message = err.message;
                }
            } else {
                message = error.response.data.message;
            }
            return rejectWithValue({ message });
        }
    },
);

const unsubscribePushy = async () => {
    const isRegistered = await Pushy.isRegistered();
    if (isRegistered) {
        await Pushy.unsubscribe('*');
    }
};

export const logoutThunk = createAsyncThunk<void, void, AsyncThunkOptions>('Access/logout', async (params, { dispatch }) => {
    unsubscribePushy();

    window.localStorage.removeItem(IMBRACE_ACCESS_TOKEN);
    window.localStorage.removeItem(IMBRACE_REFRESH_TOKEN);
    dispatch(logoutReset());
    dispatch(replace('/'));
});

export const accessSlice = createSlice({
    name: 'Access',
    initialState,
    reducers: {
        logoutReset: {
            reducer: () => {},
            prepare: (switchOrg?: boolean) => ({ payload: switchOrg }),
        },
    },
    extraReducers: (builder) => {
        // Access/exchangeAccessToken
        builder
            .addCase(exchangeAccessTokenThunk.pending, (state, action) => {
                state.loadingStatus = FETCH_IN_PROGRESS;
            })
            .addCase(exchangeAccessTokenThunk.fulfilled, (state, action) => {
                if (state.loadingStatus === FETCH_IN_PROGRESS) {
                    state.loadingStatus = FETCH_SUCCEEDED;
                    state.isLoggedIn = true;
                }
            })
            .addCase(exchangeAccessTokenThunk.rejected, (state, action) => {
                state.loadingStatus = FETCH_FAILED;
                state.isLoggedIn = false;
                if (action.payload) {
                    state.error = action.payload.message;
                } else {
                    state.error = action.error;
                }
            });

        // Access/replaceAccessTokenThunk
        builder
            .addCase(replaceAccessTokenThunk.pending, (state, action) => {
                state.loadingStatus = FETCH_IN_PROGRESS;
            })
            .addCase(replaceAccessTokenThunk.fulfilled, (state, action) => {
                if (state.loadingStatus === FETCH_IN_PROGRESS) {
                    state.loadingStatus = FETCH_SUCCEEDED;
                    state.isLoggedIn = true;
                }
            })
            .addCase(replaceAccessTokenThunk.rejected, (state, action) => {
                state.loadingStatus = FETCH_FAILED;
                state.isLoggedIn = false;
                if (action.payload) {
                    state.error = action.payload.message;
                } else {
                    state.error = action.error;
                }
            });

        // Access/logoutThunk
        builder.addCase(logoutThunk.fulfilled, (state, action) => {
            state.isLoggedIn = false;
        });
    },
});

export const { logoutReset } = accessSlice.actions;
export default accessSlice.reducer;
