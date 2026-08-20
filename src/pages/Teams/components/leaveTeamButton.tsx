import { Button } from '@imbrace/ui';
import type { AxiosError } from 'axios';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { dialog } from '@/components/Dialog';
import { dialogForm } from '@/components/Dialog/form';
import type { AssignAdminForm } from '@/pages/Teams/components/assignAdmin';
import AssignAdmin from '@/pages/Teams/components/assignAdmin';
import { notificationPayload } from '@/pages/Teams/components/teamHelper';
import type { InviteMemberForm } from '@/pages/Teams/components/TeamMembers/inviteMember';
import InviteMember from '@/pages/Teams/components/TeamMembers/inviteMember';
import { fetchAccountThunk } from '@/redux/slices/account';
import { pushNotification } from '@/redux/slices/notification';
import store, { useAppDispatch, useAppSelector } from '@/redux/store';
import { leaveTeamV2, postTeamUsersV2, updateUserRole } from '@/services/api/team';
import apiFetch from '@/services/axios/handler';

interface LeaveTeamButtonProps {
    team: API.Team;
    currentTeamRole?: API.Role;
    reload: () => void;
}

const LeaveTeamButton = ({ team, currentTeamRole, reload }: LeaveTeamButtonProps) => {
    const { t } = useTranslation();
    const userId = useAppSelector((state) => state.Account.id);
    const dispatch = useAppDispatch();
    const [leaving, setLeaving] = useState(false);

    const inviteAdminConfirmationModal = useCallback(() => {
        dialog({
            title: t('teams_admin_invitation_dialog_header'),
            content: t('teams_admin_invitation_dialog_content'),
            onConfirm: () => {},
            onClose: () => {},
            confirmText: t('okay'),
            hideCancelButton: true,
        });
    }, [t]);

    const leaveConfirmationModal = useCallback(async () => {
        dialog({
            title: t('teams_leave_confirm_dialog_header'),
            content: t('teams_leave_confirm_dialog_content'),
            onConfirm: async () => {
                try {
                    const leaveRes = await apiFetch(leaveTeamV2.api, leaveTeamV2.method, {
                        team_id: team.id,
                    });
                    if (leaveRes.status === 204) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('teams_leave_toast'), 'success'),
                            }),
                        );
                    }
                    reload();
                    dispatch(fetchAccountThunk({ silent: true }));
                } catch (error) {
                    const err = error as AxiosError;
                    console.error('Leave Team with error: ', err.response);

                    if (err.response?.data.code === 40000) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('teams_not_in_team_toast')),
                            }),
                        );
                    }
                    if (err.response?.data.code === 40003) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('insufficient_permission')),
                            }),
                        );
                    }
                }
            },
            onClose: () => {},
            confirmText: t('leave'),
            cancelText: t('cancel'),
        });
    }, [dispatch, reload, t, team]);

    const onInviteMember = useCallback(() => {
        dialogForm<InviteMemberForm>({
            title: t('team_member_invite_drawer_header'),
            content: (methods) => <InviteMember team={team as API.Team} inviteAsAdmin={true} {...methods} />,
            defaultValues: {
                selectedUsers: [],
            },
            confirmText: t('invite'),
            showUnsavedDialog: true,
            showCloseButton: true,
            hideCancelButton: true,
            actionsAlign: 'flex-start',
            onClose: () => {},
            onConfirm: async (formData) => {
                const users = formData.selectedUsers.map((user) => {
                    return {
                        user_id: user.id,
                        role: user.role,
                    };
                });
                const usersCount = formData.selectedUsers.length;
                const text = () => {
                    switch (usersCount) {
                        case 1: {
                            return t('teams_invitation_toast', {
                                name: `${formData.selectedUsers[0].display_name}`,
                            });
                        }
                        case 2: {
                            return t('teams_invitation_toast_to_two', {
                                name: `${formData.selectedUsers[0].display_name}`,
                                count: usersCount - 1,
                            });
                        }
                        default: {
                            return t('teams_invitation_toast_to_many', {
                                name: `${formData.selectedUsers[0].display_name}`,
                                count: usersCount - 1,
                            });
                        }
                    }
                };

                try {
                    const inviteRes = await apiFetch(postTeamUsersV2.api, postTeamUsersV2.method, {
                        team_id: team.id,
                        reserve_leave: true,
                        users,
                    });
                    if (inviteRes.status === 200) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(text(), 'success'),
                            }),
                        );

                        inviteAdminConfirmationModal();
                    }
                    reload();
                    return true;
                } catch (error) {
                    const err = error as AxiosError;
                    console.error('invite member error: ', err.response);

                    if (err.response?.data.code === 40000) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('invalid_team_id')),
                            }),
                        );
                    }
                    if (err.response?.data.code === 40003) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('insufficient_permission')),
                            }),
                        );
                    }
                }
            },

            confirmButtonProps: {
                sx: {
                    minWidth: '160px',
                    height: '40px',
                },
            },
        });
    }, [t, reload, team, inviteAdminConfirmationModal]);

    const assignAdminModal = useCallback(async () => {
        dialogForm<AssignAdminForm>({
            title: t('teams_assign_admin_role'),
            content: (methods) => <AssignAdmin team={team} userId={userId} {...methods} />,
            defaultValues: {
                selectedUser: undefined,
            },
            confirmText: t('assign'),
            showUnsavedDialog: true,
            showCloseButton: true,
            hideCancelButton: true,
            actionsAlign: 'flex-start',
            onClose: () => {},
            onConfirm: async (formData) => {
                const { selectedUser } = formData;
                if (!selectedUser) return;
                try {
                    const newAssignRes = await apiFetch(updateUserRole.api(team.id, selectedUser._id), updateUserRole.method, {
                        role: 'admin',
                    });
                    if (newAssignRes.status === 200) {
                        await leaveConfirmationModal();
                    }
                    return true;
                } catch (error) {
                    const err = error as AxiosError;
                    console.error('update user role error: ', err.response);
                    if (err.response?.data.code === 40003) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('insufficient_permission')),
                            }),
                        );
                    }
                    if (err.response?.data.code === 3) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('role_format_error')),
                            }),
                        );
                    }
                    if (err.response?.data.code === 40004) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('user_not_found')),
                            }),
                        );
                    }
                    if (err.response?.data.code === 11) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('teams_one_admin_toast')),
                            }),
                        );
                    }
                    return false;
                }
            },

            confirmButtonProps: {
                sx: {
                    minWidth: '160px',
                    height: '40px',
                },
            },
        });
    }, [leaveConfirmationModal, team, t, userId]);

    const lastAdminModal = useCallback(async () => {
        const membersCount = team.members_count - team.admin_count;
        dialog({
            title: t('teams_leave_dialog_last_admin_header'),
            content: membersCount < 1 ? t('teams_leave_dialog_invite_admin_content') : t('teams_leave_dialog_last_admin_content'),
            onConfirm: async () => {
                if (membersCount < 1) {
                    await onInviteMember();
                    return;
                }
                await assignAdminModal();
            },
            onClose: () => {},
            confirmText: membersCount < 1 ? t('invite') : t('assign_admin'),
            cancelText: t('cancel'),
        });
    }, [t, assignAdminModal, onInviteMember, team]);

    const leaveModal = useCallback(async () => {
        dialog({
            title: t('teams_leave_dialog_header'),
            content: t('teams_leave_dialog_content'),
            onConfirm: async () => {
                try {
                    const leaveRes = await apiFetch(leaveTeamV2.api, leaveTeamV2.method, {
                        team_id: team.id,
                    });
                    if (leaveRes.status === 204) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('teams_leave_toast'), 'success'),
                            }),
                        );
                    }
                    reload();
                    dispatch(fetchAccountThunk({ silent: true }));
                } catch (error) {
                    const err = error as AxiosError;
                    console.error('Leave Team with error: ', err.response);
                    if (err.response?.data.code === 11) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('teams_one_admin_toast')),
                            }),
                        );
                    }
                    if (err.response?.data.code === 40000) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('teams_not_in_team_toast')),
                            }),
                        );
                    }
                    if (err.response?.data.code === 40003) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('insufficient_permission')),
                            }),
                        );
                    }
                }
            },
            onClose: () => {},
            confirmText: t('leave'),
            cancelText: t('cancel'),
        });
    }, [t, team, reload, dispatch]);

    const onClick = async () => {
        if (currentTeamRole !== 'admin') {
            await leaveModal();
            setLeaving(false);
            return;
        }

        setLeaving(true);
        if (team.admin_count > 1) {
            await leaveModal();
            setLeaving(false);
            return;
        }

        if (team.admin_count <= 1) {
            await lastAdminModal();
            setLeaving(false);
            return;
        }
    };

    return (
        <Button
            variant="link"
            type="danger"
            size="xxs"
            loading={leaving}
            text={t('leave')}
            onClick={onClick}
            sx={{ padding: 0, width: '100%' }}
        />
    );
};

export default LeaveTeamButton;
