import { fetchMethod } from '../axios/index';

export const getTeams = {
    api: () => '/platform/v1/teams?type=business_unit_id',
    method: fetchMethod.GET,
};
export const postTeam = {
    api: '/platform/v1/teams',
    method: fetchMethod.POST,
};
export const putTeam = {
    api: (teamId: string) => `/platform/v1/teams/${teamId}`,
    method: fetchMethod.PUT,
};
export const postTeamIcon = {
    api: '/platform/v1/teams/_fileupload',
    method: fetchMethod.POST,
};
export const getTeamInviteUserList = {
    api: '/platform/v1/team_users/_invite_list?type=team_id&team_id={{teamId}}',
    method: fetchMethod.GET,
};
export const joinTeam = {
    api: '/platform/v1/teams/_join_team',
    method: fetchMethod.POST,
};
export const leaveTeam = {
    api: '/platform/v1/teams/_leave',
    method: fetchMethod.POST,
};
export const getTeamUsers = {
    api: (teamId: string, search = '', skip = 0, limit = 20) =>
        `/platform/v1/team_users?type=team_id&q=${teamId}&skip=${skip}&limit=${limit}&search=${search}`,
    method: fetchMethod.GET,
};
export const getTeamMembers = {
    api: () => '/platform/v1/team_users?type=team_id',
    method: fetchMethod.GET,
};
export const postTeamUsers = {
    api: '/platform/v1/teams/_add_users',
    method: fetchMethod.POST,
};
export const deleteTeamUsers = {
    api: '/platform/v1/teams/_remove_users',
    method: fetchMethod.POST,
};
export const getMyTeams = {
    api: '/platform/v2/teams/my',
    method: fetchMethod.GET,
};
export const deleteTeam = {
    api: (teamId: string) => `/platform/v2/teams/${teamId}`,
    method: fetchMethod.DELETE,
};
export const getTeamInviteUserListV2 = {
    api: '/platform/v2/team_users/_invite_list?type=team_id&team_id={{teamId}}',
    method: fetchMethod.GET,
};
export const putTeamV2 = {
    api: (teamId: string) => `/platform/v2/teams/${teamId}`,
    method: fetchMethod.PUT,
};
export const joinTeamV2 = {
    api: '/platform/v2/teams/_join_team',
    method: fetchMethod.POST,
};
export const requestJoinTeam = {
    api: (teamId: string) => `/platform/v2/teams/${teamId}/join_request`,
    method: fetchMethod.POST,
};
export const postTeamUsersV2 = {
    api: '/platform/v2/teams/_add_users',
    method: fetchMethod.POST,
};
export const approveJoinRequest = {
    api: (teamId: string, teamUserId: string) => `/platform/v2/teams/${teamId}/user/${teamUserId}/approve`,
    method: fetchMethod.POST,
};
export const acceptJoinInvitation = {
    api: (teamId: string, teamUserId: string) => `/platform/v2/teams/${teamId}/user/${teamUserId}/accept`,
    method: fetchMethod.POST,
};
export const getTeamsV2 = {
    api: () => '/platform/v2/teams?type=business_unit_id',
    method: fetchMethod.GET,
};
export const leaveTeamV2 = {
    api: '/platform/v2/teams/_leave',
    method: fetchMethod.POST,
};
export const deleteTeamUsersV2 = {
    api: '/platform/v2/teams/_remove_users',
    method: fetchMethod.POST,
};
export const updateUserRole = {
    api: (teamId: string, teamUserId: string) => `/platform/v2/teams/${teamId}/user/${teamUserId}/role`,
    method: fetchMethod.PUT,
};
export const getAllTeamUsers = {
    api: (teamId: string) => `/platform/v1/team/${teamId}/users`,
    method: fetchMethod.GET,
};
export const getTeamMembersV2 = {
    api: () => '/platform/v2/team_users?type=team_id',
    method: fetchMethod.GET,
};
