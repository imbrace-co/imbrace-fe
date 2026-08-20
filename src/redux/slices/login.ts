import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import { replace } from 'redux-first-history';

import { FETCH_FAILED, FETCH_IN_PROGRESS, FETCH_SUCCEEDED, IDLE, IMBRACE_ACCESS_TOKEN, IMBRACE_REFRESH_TOKEN } from '@/constants/app';
import { postLoginEmail, postLoginOTP } from '@/services/api/login';
import apiFetch from '@/services/axios/handler';

import type { AsyncThunkOptions } from './index.types';
import type { InitialState } from './login.types';
import { fetchOrganizationListThunk } from './organization';

const initialState: InitialState = {
    sendOTPStatus: IDLE,
    verifyOTPStatus: IDLE,
    resendOTPStatus: IDLE,
    currentEmailAddress: '',
    currentSignupStep: 0,
    customerId: null,
};

/**
 * Login email
 *
 * @param {string} obj.email email
 */

export const sendOTPThunk = createAsyncThunk<{ currentEmailAddress: string }, { email: string }, AsyncThunkOptions>(
    'Login/sendOTP',
    async (params, { dispatch, rejectWithValue }) => {
        try {
            await apiFetch(postLoginEmail.api, postLoginEmail.method, params);

            const payload = {
                currentEmailAddress: params.email,
            };
            dispatch(replace('/verification'));
            return payload;
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

export const resendOTPThunk = createAsyncThunk<void, string, AsyncThunkOptions>(
    'Login/resendOTP',
    async (email, { rejectWithValue, dispatch }) => {
        try {
            const requestBody = {
                email,
            };

            await apiFetch(postLoginEmail.api, postLoginEmail.method, requestBody);
        } catch (err) {
            const error = err as AxiosError<API.ErrorResponse>;
            let message = 'Something went wrong';

            if (!error.response) {
                if (err instanceof Error) {
                    message = err.message;
                }
            } else {
                message = error.response.data.message;
                dispatch(replace('/'));
            }
            return rejectWithValue({ message });
        }
    },
);

export const verifyOTPThunk = createAsyncThunk<void, string, AsyncThunkOptions>(
    'Login/verifyOTP',
    async (otp, { getState, dispatch, rejectWithValue }) => {
        try {
            const state = getState();

            const email = state.Login.currentEmailAddress;

            const requestBody = {
                email,
                otp,
            };

            const response = await apiFetch<API.VerifyOTP>(postLoginOTP.api, postLoginEmail.method, requestBody);

            window.localStorage.setItem(IMBRACE_ACCESS_TOKEN, response.data.token);

            await dispatch(fetchOrganizationListThunk({ limit: 10, skip: 0 }));

            dispatch(replace('/organization'));
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

export const resetThunk = createAsyncThunk<void, void, AsyncThunkOptions>('Login/reset', async (params, { dispatch }) => {
    window.localStorage.removeItem(IMBRACE_REFRESH_TOKEN);
    window.localStorage.removeItem(IMBRACE_ACCESS_TOKEN);

    dispatch(replace('/'));
});

export const loginSlice = createSlice({
    name: 'Login',
    initialState,
    reducers: {
        updateCurrentEmail: (state, { payload }) => {
            state.currentEmailAddress = payload;
        },
        updateCurrentSignupStep: (state, { payload }) => {
            state.currentSignupStep = payload;
        },
        updateCustomerId: (state, { payload }) => {
            state.customerId = payload;
        },
        resetCurrentEmailAndStep: (state, { payload }) => {
            const { email, step } = payload;
            state.currentEmailAddress = email;
            state.currentSignupStep = step;
            state.customerId = null;
        },
    },
    extraReducers: (builder) => {
        // Login/sendOTP
        builder
            .addCase(sendOTPThunk.pending, (state) => {
                state.sendOTPStatus = FETCH_IN_PROGRESS;
            })
            .addCase(sendOTPThunk.fulfilled, (state, action) => {
                if (state.sendOTPStatus === FETCH_IN_PROGRESS) {
                    state.sendOTPStatus = FETCH_SUCCEEDED;
                    state.currentEmailAddress = action.payload.currentEmailAddress;
                }
            })
            .addCase(sendOTPThunk.rejected, (state, action) => {
                state.sendOTPStatus = FETCH_FAILED;
                if (action.payload) {
                    state.errors = { ...state.errors, sendOTPError: action.payload.message };
                }
            });

        // Login/resendOTP
        builder
            .addCase(resendOTPThunk.pending, (state) => {
                state.resendOTPStatus = FETCH_IN_PROGRESS;
            })
            .addCase(resendOTPThunk.fulfilled, (state) => {
                if (state.resendOTPStatus === FETCH_IN_PROGRESS) {
                    state.resendOTPStatus = FETCH_SUCCEEDED;
                }
            })
            .addCase(resendOTPThunk.rejected, (state, action) => {
                state.resendOTPStatus = FETCH_FAILED;
                if (action.payload) {
                    state.errors = { ...state.errors, sendOTPError: action.payload.message };
                }
                state.currentEmailAddress = '';
            });

        // Login/verifyOTP
        builder
            .addCase(verifyOTPThunk.pending, (state) => {
                state.verifyOTPStatus = FETCH_IN_PROGRESS;
            })
            .addCase(verifyOTPThunk.fulfilled, (state) => {
                if (state.verifyOTPStatus === FETCH_IN_PROGRESS) {
                    state.verifyOTPStatus = FETCH_SUCCEEDED;
                }
            })
            .addCase(verifyOTPThunk.rejected, (state, action) => {
                state.verifyOTPStatus = FETCH_FAILED;
                if (action.payload) {
                    state.errors = { ...state.errors, verifyOTPError: action.payload.message };
                }
            });

        builder.addCase(resetThunk.fulfilled, (state) => {
            state = {
                currentEmailAddress: '',
                currentSignupStep: 0,
                sendOTPStatus: IDLE,
                resendOTPStatus: IDLE,
                verifyOTPStatus: IDLE,
                customerId: null,
                errors: undefined,
            };
        });
    },
});
export const { updateCurrentEmail, updateCurrentSignupStep, resetCurrentEmailAndStep, updateCustomerId } = loginSlice.actions;
export default loginSlice.reducer;
