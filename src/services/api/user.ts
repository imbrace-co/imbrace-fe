import { fetchMethod } from '../axios/index';

export const putUser = {
    api: '/platform/v1/users/{{user_id}}',
    method: fetchMethod.PUT,
};

export const getUserById = {
    api: '/platform/v1/users/{{user_id}}',
    method: fetchMethod.GET,
};

export const changeUserRole = {
    api: '/platform/v1/users/_change_role',
    method: fetchMethod.POST,
};

export const deactivateUser = {
    api: '/platform/v1/users/_deactivate',
    method: fetchMethod.POST,
};

export const reactivateUser = {
    api: '/platform/v1/users/_reactivate',
    method: fetchMethod.POST,
};

export const getMembers = {
    api: '/platform/v1/users/_all',
    method: fetchMethod.GET,
};

// Set a new password for a user. Used by:
//  - Change Password (self): userId = current account id
//  - Reset password (owner): userId = the member's id, uses the admin endpoint
export const resetUserPassword = {
    api: (userId: string, isAdmin?: boolean) =>
        `/platform/v2/user/${userId}/${isAdmin ? 'reset_password_admin' : 'reset_password'}`,
    method: fetchMethod.POST,
};
