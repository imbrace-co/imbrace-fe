import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import { replace } from 'redux-first-history';

import { queryClient } from '@/App';
import { FETCH_FAILED, FETCH_IN_PROGRESS, FETCH_SUCCEEDED, IDLE } from '@/constants/app';
import { getTeams, getTeamUsers } from '@/services/api/team';
import apiFetch from '@/services/axios/handler';

import { fetchAccountThunk } from '../slices/account';
import type { AsyncThunkOptions } from './index.types';
import { clearMessage } from './message';
import type { FetchTeamParams, FetchTeamPayload, FetchTeamUserParams, FetchTeamUserPayload, InitialState } from './team.types';
import { clearTeamConversation, fetchViewsCountThunk } from './teamConversation';

const initialState: InitialState = {
    getTeamsStatus: IDLE,
    teamList: [],
    teamListHasMore: false,
    teamListSkip: 0,
    teamListLimit: 10,
    teamListTotal: 0,
    teamListCount: 0,

    selectedTeamId: '',

    teamUserList: [],
    getTeamUsersStatus: IDLE,
    teamUserHasMore: false,
    teamUserSkip: 0,
    teamUserCount: 0,
    teamUserLimit: 10,
    teamUserTotal: 0,
    postTeamUsersStatus: IDLE,
    deleteTeamUsersStatus: IDLE,
};

/**
 * Fetch teams
 *
 * @param {string} obj.search - Search team text
 * @param {string} obj.skip - Team list skip
 * @param {string} obj.limit - Team list limit
 */
export const fetchTeamThunk = createAsyncThunk<FetchTeamPayload, FetchTeamParams, AsyncThunkOptions>(
    'Team/fetchTeam',
    async (params, { getState, rejectWithValue }) => {
        try {
            const { limit = 50, skip = 0, search = '' } = params;

            const state = getState();

            const searchParams = new URLSearchParams();

            searchParams.append('limit', `${limit}`);
            searchParams.append('skip', `${skip}`);

            if (search) {
                searchParams.append('search', `${search}`);
            }
            searchParams.append('q', state.BusinessUnit.businessUnitList[0].id);

            const response = await apiFetch<API.PaginatedResponse<API.TeamListItem[]>>(getTeams.api(), getTeams.method, searchParams);
            const teamList = response.data.data;

            const payload = {
                teamList,
                teamListHasMore: response.data.has_more,
                teamListTotal: response.data.total,
                teamListCount: response.data.count,
                teamListSkip: skip,
                teamListLimit: limit,
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

/**
 * Fetch team users
 *
 * @param {string} obj.search - Search team user text
 * @param {string} obj.skip - Team user list skip
 * @param {string} obj.limit - Team user list limit
 * @param {string} obj.teamId - Team id
 * @param {boolean} obj.pagination - has pagination or not
 */
export const fetchTeamUsersThunk = createAsyncThunk<FetchTeamUserPayload, FetchTeamUserParams, AsyncThunkOptions>(
    'Team/fetchTeamUsers',
    async (params, { getState, rejectWithValue }) => {
        try {
            const { teamId, limit = 50, skip = 0, search = '', pagination } = params;

            const state = getState();

            const response = await apiFetch<API.PaginatedResponse<API.TeamRoleWithUser[]>>(
                getTeamUsers.api(teamId, skip, limit, search),
                getTeamUsers.method,
            );

            let teamUser = [];

            if (pagination) {
                teamUser = response.data.data;
            } else if (skip > 0) {
                teamUser = [...state.Team.teamUserList, ...response.data.data];
            } else {
                teamUser = response.data.data;
            }

            const payload = {
                teamUserList: teamUser,
                teamUserHasMore: response.data.has_more,
                teamUserTotal: response.data.total,
                teamUserCount: response.data.count,
                teamUserSkip: skip,
                teamUserLimit: limit,
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

/**
 * Team joined Event
 *
 * update account information if the user id is as same as self
 * @param {string} eventPayload - Payload Object from socket
 */
export const teamJoinedEventThunk = createAsyncThunk<undefined, ImbraceSocket.TeamJoined, AsyncThunkOptions>(
    'Team/teamJoinedEvent',
    async (params, { rejectWithValue, dispatch }) => {
        try {
            dispatch(fetchAccountThunk({ silent: true }));
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
    {
        condition: (eventPayload, { getState }) => {
            const { Account } = getState();
            const { user_id } = eventPayload;
            if (Account.id !== user_id) {
                return false;
            }
        },
    },
);

/**
 * Team update Event
 *
 * @param {string} eventPayload - Payload Object from socket
 */
export const teamUpdateEventThunk = createAsyncThunk<undefined, ImbraceSocket.TeamUpdate, AsyncThunkOptions>(
    'Team/teamUpdateEvent',
    async (params, { getState, rejectWithValue, dispatch }) => {
        try {
            const { router, BusinessUnit } = getState();
            const { is_disabled, id } = params;

            const statusCount = queryClient.getQueryData<API.TeamConversationViewCount>([
                'viewsCount',
                BusinessUnit.businessUnitList[0].id,
            ]);

            const statusIncludeTeam = (teamId: string) => statusCount && teamId in statusCount;
            const sameAsCurrentConvTeam = (teamId: string) => statusCount && teamId in statusCount;

            if (is_disabled) {
                if (statusIncludeTeam(id)) {
                    dispatch(fetchAccountThunk({ silent: true }));
                    dispatch(fetchViewsCountThunk());
                }
                if (sameAsCurrentConvTeam(id)) {
                    dispatch(clearTeamConversation());
                    dispatch(clearMessage());
                    if (router.location?.pathname === '/chatroom') {
                        dispatch(replace('/chatroom'));
                    }
                }
            } else if (!statusIncludeTeam(id)) {
                dispatch(fetchAccountThunk({ silent: true }));
                dispatch(fetchViewsCountThunk());
            }
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
export const teamSlice = createSlice({
    name: 'Team',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        // Team/fetchTeam
        builder
            .addCase(fetchTeamThunk.pending, (state, action) => {
                state.getTeamsStatus = FETCH_IN_PROGRESS;
                state.teamListSkip = action.meta.arg.skip;
            })
            .addCase(fetchTeamThunk.fulfilled, (state, action) => {
                if (state.getTeamsStatus === FETCH_IN_PROGRESS) {
                    return {
                        ...state,
                        getTeamsStatus: FETCH_SUCCEEDED,
                        ...action.payload,
                    };
                }
            })
            .addCase(fetchTeamThunk.rejected, (state, action) => {
                state.getTeamsStatus = FETCH_FAILED;
                if (action.payload) {
                    state.errors = { ...state.errors, fetchTeamError: action.payload.message };
                } else {
                    state.errors = { ...state.errors, fetchTeamError: action.error };
                }
            });

        // Team/fetchTeamUser
        builder
            .addCase(fetchTeamUsersThunk.pending, (state, action) => {
                state.getTeamUsersStatus = FETCH_IN_PROGRESS;
                state.teamUserSkip = action.meta.arg.skip;
            })
            .addCase(fetchTeamUsersThunk.fulfilled, (state, action) => {
                if (state.getTeamUsersStatus === FETCH_IN_PROGRESS) {
                    return {
                        ...state,
                        getTeamUsersStatus: FETCH_SUCCEEDED,
                        ...action.payload,
                    };
                }
            })
            .addCase(fetchTeamUsersThunk.rejected, (state, action) => {
                state.getTeamUsersStatus = FETCH_FAILED;
                if (action.payload) {
                    state.errors = { ...state.errors, fetchTeamUsersError: action.payload.message };
                } else {
                    state.errors = { ...state.errors, fetchTeamUsersError: action.error };
                }
            });
    },
});

export default teamSlice.reducer;
