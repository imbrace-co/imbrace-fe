import type { SerializedError } from '@reduxjs/toolkit';

import type { PaginationParams } from './index.types';

export interface InitialState {
    getTeamsStatus: LoadingStatus;
    teamList: API.TeamListItem[];
    teamListHasMore: boolean;
    teamListSkip: number;
    teamListLimit: number;
    teamListTotal: number;
    teamListCount: number;

    selectedTeamId: string;

    teamUserList: API.TeamRoleWithUser[];
    getTeamUsersStatus: LoadingStatus;
    teamUserHasMore: boolean;
    teamUserSkip: number;
    teamUserCount: number;
    teamUserLimit: number;
    teamUserTotal: number;
    postTeamUsersStatus: LoadingStatus;
    deleteTeamUsersStatus: LoadingStatus;

    errors?: {
        fetchTeamError?: string | SerializedError;
        fetchTeamUsersError?: string | SerializedError;
    };
}

export interface FetchTeamPayload {
    teamList?: API.TeamListItem[];
    teamListHasMore?: boolean;
    teamListSkip?: number;
    teamListLimit?: number;
    teamListTotal?: number;
    teamListCount?: number;
}

export interface FetchTeamParams extends PaginationParams {
    search?: string;
}

export interface FetchTeamUserPayload {
    teamUserList: API.TeamRoleWithUser[];
    teamUserHasMore: boolean;
    teamUserSkip: number;
    teamUserCount: number;
    teamUserLimit: number;
    teamUserTotal: number;
}

export interface FetchTeamUserParams extends PaginationParams {
    teamId: string;
    pagination?: boolean;
    search?: string;
}
