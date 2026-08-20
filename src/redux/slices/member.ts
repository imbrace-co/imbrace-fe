import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import { FETCH_FAILED, FETCH_IN_PROGRESS, FETCH_SUCCEEDED, IDLE } from '@/constants/app';
import { getMemberList } from '@/services/api/member';
import apiFetch from '@/services/axios/handler';

import type { AsyncThunkOptions } from './index.types';
import type { FetchMemberParams, FetchMemberPayload, InitialState } from './member.types';

const initialState: InitialState = {
    loadingStatus: IDLE,
    list: [],
    total: 0,
    count: 0,
    limit: 10,
    skip: 0,
    hasMore: true,
};

export const fetchMembersThunk = createAsyncThunk<FetchMemberPayload, FetchMemberParams, AsyncThunkOptions>(
    'Member/fetchList',
    async (params, { rejectWithValue }) => {
        try {
            const { limit = 10, skip = 0, search = '', roles = '', sort = '', status = '' } = params;
            const api = getMemberList.api(skip, limit, search, roles, sort, status);
            const response = await apiFetch<API.PaginatedResponse<API.User[], { teams: { [key: string]: API.Team } }>>(
                api,
                getMemberList.method,
            );

            const { data, has_more, total, count, nested } = response.data;
            const { teams } = nested;

            const payload = {
                list: data
                    .filter((member) => !member.is_deleted)
                    .map((member) => ({
                        ...member,
                        joined_teams: member.team_ids.map((teamId) => teams?.[teamId] || []),
                    })),
                hasMore: has_more,
                total,
                count,
                skip: skip,
                limit: limit,
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

export const memberSlice = createSlice({
    name: 'Member',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        // Member/fetchList
        builder
            .addCase(fetchMembersThunk.pending, (state, action) => {
                state.loadingStatus = FETCH_IN_PROGRESS;
            })
            .addCase(fetchMembersThunk.fulfilled, (state, action) => {
                if (state.loadingStatus === FETCH_IN_PROGRESS) {
                    return {
                        ...state,
                        loadingStatus: FETCH_SUCCEEDED,
                        ...action.payload,
                    };
                }
            })
            .addCase(fetchMembersThunk.rejected, (state, action) => {
                state.loadingStatus = FETCH_FAILED;
                if (action.payload) {
                    state.error = action.payload.message;
                }
            });
    },
});

export default memberSlice.reducer;
