import { fetchMethod } from '../axios/index';

export const getMemberList = {
    api: (skip = 0, limit = 10, search = '', roles = '', sort = '', status = '') =>
        `/platform/v1/users?skip=${skip}&limit=${limit}&search=${search}&roles=${roles}&sort=${sort}&status=${status}`,
    method: fetchMethod.GET,
};

export const getMemberListOptions = {
    api: () => '/platform/v1/users?status=active&limit=0&sort=-created_at',
    method: fetchMethod.GET,
};

export const getMemberRolesCount = {
    api: '/platform/v1/users/_roles_count',
    method: fetchMethod.GET,
};

export const getMemberById = {
    api: '/platform/v1/users/{{user_id}}',
    method: fetchMethod.GET,
};

export const putMemberById = {
    api: '/platform/v1/users/{{user_id}}',
    method: fetchMethod.PUT,
};

export const postMemberRoleById = {
    api: '/platform/v1/users/_change_role',
    method: fetchMethod.POST,
};

export const postMemberArchiveById = {
    api: '/platform/v1/users/_archive',
    method: fetchMethod.POST,
};

export const postMemberReactivateById = {
    api: '/platform/v1/users/_reactivate',
    method: fetchMethod.POST,
};

export const postMemberSuspendById = {
    api: '/platform/v1/users/_suspend',
    method: fetchMethod.POST,
};

export const postMemberAvatar = {
    api: '/platform/v1/users/_fileupload',
    method: fetchMethod.POST,
};

export const inviteMembers = {
    api: '/platform/v1/users/_bulk_invite',
    method: fetchMethod.POST,
};
