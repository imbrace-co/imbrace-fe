import { Checkbox, Dropdown, EllipsisText, Icon, IconButton, Space, Typography } from '@imbrace/ui';
import type { Row } from '@tanstack/react-table';
import type { AxiosError } from 'axios';
import type { OptionsObject } from 'notistack';
import type { CSSProperties } from 'react';
import React, { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate, useOutletContext } from 'react-router';

import { dialog } from '@/components/Dialog';
import { dialogForm } from '@/components/Dialog/form';
import FlexibleTable from '@/components/FlexibleTable';
import type { Columns, RequestParameters } from '@/components/FlexibleTable/types';
import LinkButton from '@/components/LinkButton';
import useAccess from '@/hooks/useAccess';
import { DisabledRoleChip, PendingChip, roleAttr, RoleChip } from '@/pages/Teams/components/styledComponents';
import type { TeamMemberItem } from '@/pages/Teams/components/TeamMembers';
import type { InviteMemberForm } from '@/pages/Teams/components/TeamMembers/inviteMember';
import InviteMember from '@/pages/Teams/components/TeamMembers/inviteMember';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { deleteTeamUsersV2, getTeamMembersV2, postTeamUsersV2, updateUserRole } from '@/services/api/team';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import type { PageLayoutChildrenProps } from '../../TeamsLayout';

const notificationPayload = (msg: string, variant: 'error' | 'success' | 'info' = 'error') => {
    let type = 'noti_failed';
    if (variant === 'success') {
        type = 'noti_success';
    }
    if (variant === 'info') {
        type = 'noti_warning';
    }
    const newNotification: {
        message: string;
        anchorOrigin?: OptionsObject['anchorOrigin'];
        options?: { onClose?: OptionsObject['onClose'] };
        messageType: string;
        variant?: string;
        style?: CSSProperties;
    } = {
        message: msg,
        messageType: type,
        variant,
        anchorOrigin: {
            horizontal: 'right',
            vertical: 'top',
        },
    };
    return newNotification;
};

const MyTeamsList = () => {
    const { globalSearch, selectedTeam, tableRef } = useOutletContext<PageLayoutChildrenProps>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { getTeamPermission } = useAccess();
    const dispatch = useAppDispatch();

    const currentUserId = useAppSelector((state) => state.Account.id);
    const orgRole = useAppSelector((state) => state.Account.role as API.Role);
    const teamRoles = useAppSelector((state) => state.Account.team_roles) || [];
    const selectedTeamId = (selectedTeam as API.Team | undefined)?.id ?? selectedTeam?._id;
    const currentTeam = teamRoles.find((teamRole) => teamRole.team_id === selectedTeamId);
    const currentTeamRole = currentTeam?.role;

    const onUpdateUserRole = useCallback(
        async (teamId: string, teamUserId: string, role: 'admin' | 'member') => {
            try {
                await apiFetch(updateUserRole.api(teamId, teamUserId), updateUserRole.method, { role });
                tableRef.current?.refresh();
            } catch (error) {
                const err = error as AxiosError;
                console.error('update user role error: ', err.response);
                if (err.response?.data.code === 40003) {
                    dispatch(
                        pushNotification({
                            notification: notificationPayload(t('insufficient_permission')),
                        }),
                    );
                }
                if (err.response?.data.code === 3) {
                    dispatch(
                        pushNotification({
                            notification: notificationPayload(t('role_format_error')),
                        }),
                    );
                }
                if (err.response?.data.code === 40004) {
                    dispatch(
                        pushNotification({
                            notification: notificationPayload(t('user_not_found')),
                        }),
                    );
                }
                if (err.response?.data.code === 11) {
                    dispatch(
                        pushNotification({
                            notification: notificationPayload(t('teams_one_admin_toast')),
                        }),
                    );
                }
            }
        },
        [t, tableRef, dispatch],
    );

    const fetchTeamMembers = useCallback(
        async (params: RequestParameters, signal?: AbortSignal) => {
            if (!selectedTeamId)
                return {
                    data: [],
                    meta: {
                        total: 0,
                        skip: 0,
                        limit: 20,
                    },
                };

            try {
                const { pagination, globalFilter, sorters } = params;
                const sort = !sorters || sorters?.length === 0 ? '-created_at' : `${sorters[0]?.desc ? '-' : ''}${sorters[0]?.id}`;

                const searchParams = new URLSearchParams();
                if (pagination) {
                    searchParams.append('limit', `${pagination.pageSize}`);
                    searchParams.append('skip', `${pagination.pageIndex * pagination.pageSize}`);
                    searchParams.append('sort', `${sort}`);
                }
                if (globalFilter) {
                    searchParams.append('search', `${globalFilter}`);
                }
                searchParams.append('q', selectedTeamId);

                const { data } = await apiFetch<API.PaginatedResponse<TeamMemberItem[]>>(
                    getTeamMembersV2.api(),
                    getTeamMembersV2.method,
                    searchParams,
                    ImbraceClient,
                    { signal },
                );

                const dataWithIndex = data.data.map((user, index) => ({ ...user, index: index + 1 }));

                return {
                    data: dataWithIndex,
                    meta: {
                        total: data.count,
                        skip: (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? 0),
                        limit: pagination?.pageSize ?? 20,
                    },
                };
            } catch (error) {
                console.error('fetch team members error: ', error);
                return {
                    data: [],
                    meta: {
                        total: 0,
                        skip: 0,
                        limit: 20,
                    },
                };
            }
        },
        [selectedTeamId],
    );

    const onRemoveUser = useCallback(
        async (userIDs: string[]) => {
            if (!selectedTeam) return;

            if (localStorage.getItem('dont_asked_remove_team_member_again') === 'true') {
                try {
                    await apiFetch(deleteTeamUsersV2.api, deleteTeamUsersV2.method, {
                        team_id: selectedTeamId,
                        user_ids: userIDs,
                    });
                    tableRef.current?.reset();
                    tableRef.current?.refresh();
                } catch (error) {
                    const err = error as AxiosError;
                    console.error('delete user error: ', err.response);

                    if (err.response?.data.code === 40003) {
                        dispatch(
                            pushNotification({
                                notification: notificationPayload(t('insufficient_permission')),
                            }),
                        );
                    }
                    if (err.response?.data.code === 11) {
                        dispatch(
                            pushNotification({
                                notification: notificationPayload(t('teams_one_admin_toast')),
                            }),
                        );
                    }
                    if (err.response?.data.code === 12) {
                        dispatch(
                            pushNotification({
                                notification: notificationPayload(t('remove_self_error')),
                            }),
                        );
                    }
                }
                return;
            }
            dialog({
                title: t('team_member_remove_member_title'),
                content: t('team_member_remove_member_content'),
                confirmText: t('team_member_remove_dialog_confirm'),
                showDontAskedAgain: true,
                confirmButtonProps: {
                    type: 'danger',
                },
                actionsAlign: 'flex-end',
                onConfirm: async (dontAskedAgain) => {
                    if (dontAskedAgain) {
                        localStorage.setItem('dont_asked_remove_team_member_again', 'true');
                    }
                    try {
                        await apiFetch(deleteTeamUsersV2.api, deleteTeamUsersV2.method, {
                            team_id: selectedTeamId,
                            user_ids: userIDs,
                        });
                        tableRef.current?.refresh();
                    } catch (error) {
                        const err = error as AxiosError;
                        console.error('delete user error: ', err.response);

                        if (err.response?.data.code === 40003) {
                            dispatch(
                                pushNotification({
                                    notification: notificationPayload(t('insufficient_permission')),
                                }),
                            );
                        }
                        if (err.response?.data.code === 11) {
                            dispatch(
                                pushNotification({
                                    notification: notificationPayload(t('teams_one_admin_toast')),
                                }),
                            );
                        }
                        if (err.response?.data.code === 12) {
                            dispatch(
                                pushNotification({
                                    notification: notificationPayload(t('remove_self_error')),
                                }),
                            );
                        }
                    }
                },
                onClose: () => {},
            });
        },
        [t, tableRef, selectedTeam, selectedTeamId, dispatch],
    );

    const onDataDelete = useCallback(
        async (rowId: string | string[]) => {
            const userIds = tableRef.current?.getSelectedRows?.map((row: Row<TeamMemberItem>) => row.original?.user_id);
            if (userIds && userIds.length > 0) {
                await onRemoveUser(userIds);
            }

            return false;
        },
        [onRemoveUser, tableRef],
    );

    const renderRowIndex = useCallback(
        (row: Row<TeamMemberItem>) => {
            const { state, user } = row.original;
            const isPendingState = state === 'invite' || state === 'request';
            const isNonUserNonMember = orgRole !== 'user' && currentTeamRole !== 'member';

            const getPendingChip = (labelKey: string) => (
                <PendingChip label={<Typography variant="Caption">{t(labelKey)}</Typography>} variant="outlined" />
            );

            if (user.status === 'deactivated') {
                return getPendingChip('status_deactivated');
            }

            if (isNonUserNonMember && isPendingState) {
                return getPendingChip('pending');
            }

            if (isPendingState) {
                return getPendingChip('pending');
            }

            return <Typography>{row.original.index}</Typography>;
        },
        [t, orgRole, currentTeamRole],
    );

    const columns: Columns<TeamMemberItem> = [
        {
            type: 'ShortText',
            accessorKey: 'index',
            id: 'index',
            enableEditing: false,
            size: 95,
            maxSize: 105,
            header: ({ table }) => {
                return (
                    getTeamPermission(orgRole, true, currentTeamRole).removeUser && (
                        <Space justify="center" style={{ width: '57px' }}>
                            <Checkbox
                                checked={table.getIsAllPageRowsSelected()}
                                indeterminate={table.getIsSomeRowsSelected()}
                                onChange={() => table.toggleAllRowsSelected()}
                            />
                        </Space>
                    )
                );
            },
            cell: ({ row, isHover }) => {
                if (row.getIsSelected() || (getTeamPermission(orgRole, true, currentTeamRole).removeUser && isHover)) {
                    return (
                        <Space justify="center" style={{ width: '100%' }}>
                            <Checkbox
                                disabled={!row.getCanSelect()}
                                checked={row.getIsSelected()}
                                onChange={row.getToggleSelectedHandler()}
                            />
                        </Space>
                    );
                }

                return (
                    <>
                        {row.original.user.id === currentUserId ? (
                            <Typography variant="Body" style={{ color: 'var(--color-primary-1)' }}>
                                {t('team_member_you_indicator')}
                            </Typography>
                        ) : (
                            <>{renderRowIndex(row)}</>
                        )}
                    </>
                );
            },
            meta: {
                cellStyle: {
                    padding: 0,
                    textAlign: 'center',
                },
            },
        },
        {
            header: t('first_name'),
            type: 'ShortText',
            accessorKey: 'first_name',
            id: 'first_name',
            enableEditing: false,
            enableSorting: true,
            size: 160,
            minSize: 160,
            cell: ({ row }) => {
                if (!row.original.user.first_name) {
                    return <Typography style={{ color: 'var(--color-light-4)' }}>—</Typography>;
                }
                return <EllipsisText element={<Typography />} text={row.original.user.first_name} />;
            },
        },
        {
            header: t('last_name'),
            type: 'ShortText',
            accessorKey: 'last_name',
            id: 'last_name',
            enableEditing: false,
            enableSorting: true,
            minSize: 160,
            cell: ({ row }) => {
                if (!row.original.user.last_name) {
                    return <Typography style={{ color: 'var(--color-light-4)' }}>—</Typography>;
                }
                return <EllipsisText element={<Typography />} text={row.original.user.last_name} />;
            },
        },
        {
            header: t('team_role'),
            type: 'ShortText',
            accessorKey: 'role',
            id: 'role',
            enableEditing: false,
            enableSorting: true,
            size: 256,
            minSize: 256,
            cell: ({ row }) => {
                const isCurrentUser = row.original.user.id === currentUserId;

                return (
                    <>
                        {getTeamPermission(orgRole, true, currentTeamRole).editTeamRole ? (
                            <>
                                {row.original.state === 'invite' ||
                                row.original.state === 'request' ||
                                row.original.user.status === 'deactivated' ? (
                                    <DisabledRoleChip label={t(roleAttr(row.original.role).role)} />
                                ) : (
                                    <Dropdown
                                        variant="text"
                                        text={
                                            isCurrentUser && currentTeam
                                                ? t(roleAttr(currentTeam.role).role)
                                                : t(roleAttr(row.original.role).role)
                                        }
                                        selectedIndex={isCurrentUser && currentTeam ? currentTeam.role : row.original.role}
                                        options={[
                                            { index: 'member', text: t('team_role_member') },
                                            { index: 'admin', text: t('team_role_admin') },
                                        ]}
                                        buttonSx={{
                                            padding: 0,
                                            color: 'var(--color-light-7)',
                                            textTransform: 'initial',
                                            gap: '4px',
                                            '& .textContainer': {
                                                backgroundColor:
                                                    isCurrentUser && currentTeam
                                                        ? roleAttr(currentTeam.role).bgColor
                                                        : roleAttr(row.original.role).bgColor,
                                                color:
                                                    isCurrentUser && currentTeam
                                                        ? roleAttr(currentTeam.role).color
                                                        : roleAttr(row.original.role).color,
                                                padding: '4px 12px',
                                                width: 'auto',
                                                height: '24px',
                                                borderRadius: '30px',
                                            },
                                            '& .textContainer > p': {
                                                fontSize: 12,
                                                fontWeight: 400,
                                                lineHeight: '140%',
                                            },

                                            '&.MuiLoadingButton-root:hover': {
                                                backgroundColor: 'transparent',
                                            },
                                        }}
                                        hideOnSelect
                                        arrowColor={'var(--color-light-4)'}
                                        onSelect={async (event, selectedIndex) => {
                                            await onUpdateUserRole(row.original.team_id, row.original.id, selectedIndex);
                                        }}
                                    />
                                )}
                            </>
                        ) : (
                            <>
                                {row.original.state === 'invite' ||
                                row.original.state === 'request' ||
                                row.original.user.status === 'deactivated' ? (
                                    <DisabledRoleChip label={t(roleAttr(row.original.role).role)} />
                                ) : (
                                    <RoleChip label={t(roleAttr(row.original.role).role)} role={row.original.role} />
                                )}
                            </>
                        )}
                    </>
                );
            },
            meta: {
                cellStyle: {
                    padding: '5.5px 11px',
                },
            },
        },
        {
            header: t('email'),
            type: 'ShortText',
            accessorKey: 'email',
            id: 'email',
            enableEditing: false,
            enableSorting: true,
            size: 256,
            minSize: 256,
            cell: ({ row }) => {
                return <EllipsisText element={<Typography />} text={row.original.user.email} />;
            },
        },
        {
            header: '',
            accessorKey: 'operation',
            id: 'operation',
            enableEditing: false,
            type: 'ShortText',
            cell: ({ row }) => {
                return (
                    <Space size={0} justify="end">
                        {getTeamPermission(orgRole, true, currentTeamRole).removeUser && (
                            <IconButton
                                type="secondary"
                                variant="text"
                                size={'s'}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    await onRemoveUser([row.original.user.id]);
                                }}
                            >
                                <Icon name="personRemoveAltOutlined" fontSize={24} style={{ color: 'var(--color-light-4)' }} />
                            </IconButton>
                        )}
                    </Space>
                );
            },
            meta: {
                cellStyle: {
                    padding: 0,
                },
            },
        },
    ];

    const onInviteMember = useCallback(() => {
        const selectedTeamWithId = { ...selectedTeam, id: selectedTeamId };
        dialogForm<InviteMemberForm>({
            title: t('teams_invite_team_member'),
            content: (methods) => <InviteMember team={selectedTeamWithId as API.Team} {...methods} />,
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

                try {
                    await apiFetch(postTeamUsersV2.api, postTeamUsersV2.method, {
                        team_id: selectedTeamId,
                        users,
                    });
                    tableRef.current?.refresh();
                    return true;
                } catch (error) {
                    const err = error as AxiosError;
                    console.error('invite member error: ', err.response);
                }
            },

            confirmButtonProps: {
                sx: {
                    minWidth: '160px',
                    height: '40px',
                },
            },
        });
    }, [t, selectedTeam, selectedTeamId, tableRef]);

    return (
        <FlexibleTable<TeamMemberItem>
            ref={tableRef}
            queryKey={['myTeams', { id: selectedTeamId }]}
            columns={columns}
            request={fetchTeamMembers}
            globalFilter={globalSearch}
            columnFilterable={false}
            emptyImage={'joinTeam'}
            emptyMessage={
                globalSearch ? (
                    <Typography variant="SubHeading2">
                        {getTeamPermission(orgRole, true, currentTeamRole).inviteUser ? (
                            <Trans i18nKey="teams_list_search_empty">
                                No matching result has been found.\nCheck the spelling or{' '}
                                <LinkButton onClick={onInviteMember}>invite the member</LinkButton> now.
                            </Trans>
                        ) : (
                            <Trans i18nKey="teams_list_search_empty_for_user" />
                        )}
                    </Typography>
                ) : (
                    <Typography variant="SubHeading2">
                        <Trans i18nKey="my_teams_empty_message">
                            <LinkButton
                                onClick={() => {
                                    navigate('/teams');
                                }}
                            >
                                Join a team
                            </LinkButton>{' '}
                            \n and start to collaborate now!
                        </Trans>
                    </Typography>
                )
            }
            isDataDeletable={(row) => {
                return !!tableRef.current?.isSomeSelected();
            }}
            {...(getTeamPermission(orgRole, true, currentTeamRole).removeUser
                ? {
                      onDataDelete: onDataDelete,
                  }
                : {})}
            // onDataDelete={onDataDelete}
            deleteTooltip={() => {
                if (!tableRef.current?.isSomeSelected()) {
                    return t('teams_remove_selected_members');
                }
            }}
            deleteButtonText={t('teams_remove_selected_members')}
            fullWidth
            disableHoverEffect
        />
    );
};

export default MyTeamsList;
