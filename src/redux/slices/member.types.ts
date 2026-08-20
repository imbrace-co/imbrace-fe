export interface ReduxUser extends API.User {
    joined_teams: API.Team[];
}

export interface InitialState {
    loadingStatus: LoadingStatus;
    list: ReduxUser[];
    total: number;
    count: number;
    limit: number;
    skip: number;
    hasMore: boolean;
    error?: string;
}

export interface FetchMemberPayload {
    list: ReduxUser[];
    total: number;
    count: number;
    limit: number;
    skip: number;
}

export interface FetchMemberParams {
    skip: number;
    limit: number;
    search?: string;
    roles?: string;
    sort?: string;
    status?: string;
}
