import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { setTag, setUser } from '@sentry/react';
import type { AxiosError } from 'axios';
import { clarity } from 'clarity-js';
import { replace } from 'redux-first-history';
import { setCookie } from 'typescript-cookie';

import { FETCH_FAILED, FETCH_IN_PROGRESS, FETCH_SUCCEEDED, IDLE, IMBRACE_ACCESS_TOKEN, IMBRACE_REFRESH_TOKEN } from '@/constants/app';
import { env } from '@/env';
import { getAccount } from '@/services/api/account';
import apiFetch from '@/services/axios/handler';

import { logoutThunk } from './access';
import type { InitialState } from './account.types';
import type { AsyncThunkOptions } from './index.types';
import { setIsShow } from './license';

const initialState: InitialState = {
    loadingStatus: IDLE,
    addressLine1: '',
    addressLine2: '',
    areaCode: '',
    avatar: '',
    displayName: '',
    email: '',
    gender: '',
    firstName: '',
    lastName: '',
    id: '',
    isActive: false,
    isArchived: false,
    // isEmailVerified: false,
    language: '',
    organizationId: '',
    organizationName: '',
    phoneNumber: '',
    createdAt: '',
    updatedAt: '',
    team_roles: [],
    support: {},
    onBoarded: false,
    isPaid: false,
    partition: 0,
};

export const fetchAccountThunk = createAsyncThunk<
    Omit<InitialState, 'loadingStatus' | 'error'>,
    { silent: boolean } | void,
    AsyncThunkOptions
>('Account/fetchAccount', async (params, { getState, rejectWithValue, dispatch }) => {
    try {
        const response = await apiFetch<API.Account>(getAccount.api, getAccount.method);
        const isRequiredLicense = response.headers['x-license-required'] === 'true';
        dispatch(setIsShow(isRequiredLicense));
        const payload: Omit<InitialState, 'loadingStatus'> = {
            addressLine1: response.data.address_line1,
            addressLine2: response.data.address_line2,
            areaCode: response.data.area_code,
            avatar: response.data.avatar_url,
            displayName: response.data.display_name,
            email: response.data.email,
            gender: response.data.gender,
            firstName: response.data.first_name,
            lastName: response.data.last_name,
            id: response.data.id,
            isActive: response.data.is_active,
            isArchived: response.data.is_archived,
            // isEmailVerified: response.data.is_email_verified,
            language: response.data.language,
            organizationId: response.data.organization_id,
            organizationName: response.data.organization_name,
            phoneNumber: response.data.phone_number,
            role: response.data.role,
            createdAt: response.data.created_at,
            updatedAt: response.data.updated_at,
            team_roles: response.data.team_roles,
            organizationModules: response.data.organization_modules,
            organizationLockFeatures: response.data.organization_lock_features,
            support: response.data.support,
            onBoarded: response.data.on_boarded,
            isPaid: response.data.is_paid,
            partition: response.data.partition,
        };
        setUser({
            displayName: response.data.display_name,
            email: response.data.email,
            role: response.data.role,
            organizationId: response.data.organization_id,
            organizationName: response.data.organization_name,
            team_roles: response.data.team_roles,
            onBoarded: response.data.on_boarded,
        });
        setTag('Organization ID', response.data.organization_id);
        setTag('Organization Name', response.data.organization_name);
        env.VITE_APP_CLARITY_ID && clarity.identify(response.data.id);
        setCookie('user_name', response.data.display_name);
        setCookie('user_role', response.data.role);
        setCookie('org_id', response.data.organization_id);
        setCookie('user_email', response.data.email);
        setCookie('user_id', response.data.id);
        setCookie('org_name', response.data.organization_name);
        if (env.VITE_APP_CLARITY_ID) {
            clarity.set('user_name', response.data.display_name);
            clarity.set('user_role', response.data.role);
            clarity.set('org_id', response.data.organization_id);
            clarity.set('org_name', response.data.organization_name);
        }

        if (!response.data.on_boarded && !params?.silent) {
            dispatch(replace('/start'));
        }
        return payload;
    } catch (err) {
        const error = err as AxiosError<API.ErrorResponse>;
        let message = 'Something went wrong';

        window.localStorage.removeItem(IMBRACE_ACCESS_TOKEN);
        window.localStorage.removeItem(IMBRACE_REFRESH_TOKEN);

        if (!params?.silent) {
            dispatch(logoutThunk());
        }

        if (!error.response) {
            if (err instanceof Error) {
                message = err.message;
            }
        } else {
            message = error.response.data.message;
        }
        return rejectWithValue({ message });
    }
});

export const accountSlice = createSlice({
    name: 'Account',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        // Account/fetchAccount
        builder
            .addCase(fetchAccountThunk.pending, (state, action) => {
                if (typeof action.meta.arg === 'undefined' || (typeof action.meta.arg === 'object' && !action.meta.arg.silent)) {
                    state.loadingStatus = FETCH_IN_PROGRESS;
                }
            })
            .addCase(fetchAccountThunk.fulfilled, (state, action) => {
                return {
                    ...state,
                    loadingStatus: FETCH_SUCCEEDED,
                    ...action.payload,
                };
            })
            .addCase(fetchAccountThunk.rejected, (state, action) => {
                state.loadingStatus = FETCH_FAILED;
                if (action.payload) {
                    state.error = action.payload.message;
                } else {
                    state.error = action.error;
                }
            });
    },
});

export default accountSlice.reducer;
