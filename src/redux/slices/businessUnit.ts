import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import { FETCH_FAILED, FETCH_IN_PROGRESS, FETCH_SUCCEEDED, IDLE } from '@/constants/app';
import { getBusinessUnit } from '@/services/api/business_unit';
import apiFetch from '@/services/axios/handler';

import type { InitialState } from './businessUnit.types';
import type { AsyncThunkOptions } from './index.types';

const initialState: InitialState = {
    loadingStatus: IDLE,
    businessUnitList: [],
};

export const fetchBusinessUnitThunk = createAsyncThunk<{ list: API.BusinessUnit[] }, { limit: number; skip: number }, AsyncThunkOptions>(
    'BusinessUnit/fetchList',
    async (params, { rejectWithValue }) => {
        try {
            const { limit = 10, skip = 0 } = params;
            const getBusinessUnitApi = getBusinessUnit.api(limit, skip);
            const response = await apiFetch<API.PaginatedResponse<API.BusinessUnit[]>>(getBusinessUnitApi, getBusinessUnit.method);
            const payload = {
                list: response.data.data,
            };
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

export const businessUnitSlice = createSlice({
    name: 'BusinessUnit',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        // BusinessUnit/fetchList
        builder
            .addCase(fetchBusinessUnitThunk.pending, (state, action) => {
                state.loadingStatus = FETCH_IN_PROGRESS;
            })
            .addCase(fetchBusinessUnitThunk.fulfilled, (state, action) => {
                if (state.loadingStatus === FETCH_IN_PROGRESS) {
                    state.loadingStatus = FETCH_SUCCEEDED;
                    state.businessUnitList = action.payload.list;
                }
            })
            .addCase(fetchBusinessUnitThunk.rejected, (state, action) => {
                state.loadingStatus = FETCH_FAILED;
                if (action.payload) {
                    state.error = action.payload.message;
                }
            });
    },
});

export default businessUnitSlice.reducer;
