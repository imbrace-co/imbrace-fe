import { Button, Checkbox, Dropdown, EllipsisText, Icon, IconButton, Search, Space, Typography } from '@imbrace/ui';
import type { Row } from '@tanstack/react-table';
import type { AxiosError } from 'axios';
import debounce from 'lodash/debounce';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router-dom';

import { dialog } from '@/components/Dialog';
import { dialogForm } from '@/components/Dialog/form';
import FlexibleTable from '@/components/FlexibleTable';
import type { Columns, FlexibleTableRef, RequestParameters } from '@/components/FlexibleTable/types';
import LinkButton from '@/components/LinkButton';
import PageLayout from '@/components/PageLayout';
import useAccess from '@/hooks/useAccess';
import { DisabledRoleChip, PendingChip, roleAttr, RoleChip } from '@/pages/Teams/components/styledComponents';
import { notificationPayload } from '@/pages/Teams/components/teamHelper';
import type { InviteMemberForm } from '@/pages/Teams/components/TeamMembers/inviteMember';
import InviteMember from '@/pages/Teams/components/TeamMembers/inviteMember';
import { pushNotification } from '@/redux/slices/notification';
import store, { useAppSelector } from '@/redux/store';
import { deleteTeamUsersV2, getTeamMembersV2, postTeamUsersV2, updateUserRole } from '@/services/api/team';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

export interface UserWithIndex extends API.User {
    index: number;
}

export interface TeamMemberItem extends API.TeamRoleWithUser {
    index: number;
}

const TeamMembers = () => {
    const { team_id } = useParams<{ team_id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { getTeamPermission } = useAccess();
    const teamRoles = useAppSelector((state) => state.Account.team_roles) || [];
    const currentUserId = useAppSelector((state) => state.Account.id);
    const orgRole = useAppSelector((state) => state.Account.role as API.Role);
    const tableRef = useRef<FlexibleTableRef<TeamMemberItem>>(null);
    const [globalSearch, setGlobalSearch] = useState<string>();
    const [searchInput, setSearchInput] = useState<string>();
    const currentTeam = teamRoles.find((teamRole) => teamRole.team_id === team_id);
    const isJoined = currentTeam?.state === 'join';
    const currentTeamRole = currentTeam?.role;
    const [team, setTeam] = useState<API.Team>();

    const onRemoveUser = useCallback(
        async (userIDs: string[], disableAlertDialog?: boolean) => {
            const deleteMember = async () => {
                try {
                    await apiFetch(deleteTeamUsersV2.api, deleteTeamUsersV2.method, {
                        team_id,
                        user_ids: userIDs,
                    });
                    tableRef.current?.reset();
                    tableRef.current?.refresh();
                } catch (error) {
                    const err = error as AxiosError;
                    console.error('delete user error: ', err.response);

                    if (err.response?.data.code === 40003) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('insufficient_permission')),
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
                    if (err.response?.data.code === 12) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(t('remove_self_error')),
                            }),
                        );
                    }
                }
            };
            if (disableAlertDialog) {
                await deleteMember();
                return;
            }
            if (localStorage.getItem('dont_asked_remove_team_member_again') === 'true') {
                await deleteMember();
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
                    await deleteMember();
                },
                onClose: () => {},
            });
        },
        [t, team_id],
    );

    const fetchTeamMembers = useCallback(
        async (params: RequestParameters, signal?: AbortSignal) => {
            if (!team_id)
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
                searchParams.append('q', team_id);

                const { data } = await apiFetch<API.PaginatedResponse<TeamMemberItem[], { team: API.Team }>>(
                    getTeamMembersV2.api(),
                    getTeamMembersV2.method,
                    searchParams,
                    ImbraceClient,
                    { signal },
                );
                setTeam(data.nested.team);
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
                const err = error as AxiosError;
                console.error('post board automation error: ', err.response);

                if (err.response?.status === 404) {
                    navigate('/teams');
                    store.dispatch(
                        pushNotification({
                            notification: notificationPayload(t('teams_not_found')),
                        }),
                    );
                }

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
        [t, navigate, team_id],
    );

    const onUpdateUserRole = useCallback(
        async (teamId: string, teamUserId: string, role: 'admin' | 'member') => {
            try {
                await apiFetch(updateUserRole.api(teamId, teamUserId), updateUserRole.method, { role });
                tableRef.current?.refresh();
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
            }
        },
        [t],
    );

    const onDataDelete = useCallback(
        async (rowId: string | string[]) => {
            const userIds = tableRef.current?.getSelectedRows?.map((row: Row<TeamMemberItem>) => row.original?.user_id);
            if (userIds && userIds.length > 0) {
                await onRemoveUser(userIds);
            }

            return false;
        },
        [onRemoveUser],
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

    const columns: Columns<TeamMemberItem> = useMemo(() => {
        return [
            {
                accessorKey: 'index',
                id: 'index',
                enableEditing: false,
                size: 95,
                maxSize: 105,
                header: ({ table }) => {
                    return (
                        getTeamPermission(orgRole, isJoined, currentTeamRole).removeUser && (
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
                cell: ({ row, isHover, isRowSelected }) => {
                    if (isRowSelected || (getTeamPermission(orgRole, isJoined, currentTeamRole).removeUser && isHover)) {
                        return (
                            <Space justify="center">
                                <Checkbox
                                    disabled={!row.getCanSelect()}
                                    checked={isRowSelected}
                                    onChange={row.getToggleSelectedHandler()}
                                />
                            </Space>
                        );
                    }

                    return (
                        <>
                            {row.original.user.id === currentUserId ? (
                                <Typography variant="Body" style={{ color: 'var(--color-primary-1)' }}>
                                    {t('you')}
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
                size: 160,
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
                            {getTeamPermission(orgRole, isJoined, currentTeamRole).editTeamRole ? (
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
                            {getTeamPermission(orgRole, isJoined, currentTeamRole).teamOperation && (
                                <>
                                    {row.original.state === 'invite' || row.original.state === 'request' ? (
                                        <Dropdown
                                            variant="text"
                                            hideArrow
                                            icon={<Icon name="more" fontSize={32} />}
                                            options={[
                                                ...(row.original.state === 'invite'
                                                    ? [{ index: 'resend-invitation', text: t('teams_resend_invitation') }]
                                                    : []),
                                                { index: 'remove-user', text: t('remove') },
                                            ]}
                                            hideOnSelect
                                            onSelect={async (event, selectedIndex) => {
                                                if (selectedIndex === 'resend-invitation') {
                                                    try {
                                                        const inviteRes = await apiFetch(postTeamUsersV2.api, postTeamUsersV2.method, {
                                                            team_id,
                                                            users: [
                                                                {
                                                                    user_id: row.original.user.id,
                                                                    role: 'member',
                                                                },
                                                            ],
                                                        });
                                                        if (inviteRes.status === 200) {
                                                            store.dispatch(
                                                                pushNotification({
                                                                    notification: notificationPayload(
                                                                        t('teams_invitation_toast', {
                                                                            name: `${row.original.user.first_name} ${row.original.user.last_name}`,
                                                                        }),
                                                                        'success',
                                                                    ),
                                                                }),
                                                            );
                                                        }
                                                    } catch (error) {
                                                        const err = error as AxiosError;
                                                        console.error('resend invitation error: ', err.response);

                                                        if (err.response?.data.code === 40003) {
                                                            store.dispatch(
                                                                pushNotification({
                                                                    notification: notificationPayload(t('insufficient_permission')),
                                                                }),
                                                            );
                                                        }

                                                        if (err.response?.data.code === 40000) {
                                                            store.dispatch(
                                                                pushNotification({
                                                                    notification: notificationPayload(t('invalid_team_id')),
                                                                }),
                                                            );
                                                        }
                                                    }
                                                }
                                                if (selectedIndex === 'remove-user') {
                                                    await onRemoveUser([row.original.user.id], true);
                                                }
                                            }}
                                            buttonSx={{
                                                '& p': {
                                                    textAlign: 'center',
                                                },
                                            }}
                                        />
                                    ) : (
                                        <>
                                            {row.original.user.id !== currentUserId && (
                                                <IconButton
                                                    type="secondary"
                                                    variant="text"
                                                    size={'s'}
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        await onRemoveUser([row.original.user.id]);
                                                    }}
                                                >
                                                    <Icon
                                                        name="personRemoveAltOutlined"
                                                        fontSize={24}
                                                        style={{ color: 'var(--color-light-4)' }}
                                                    />
                                                </IconButton>
                                            )}
                                        </>
                                    )}
                                </>
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
    }, [
        currentTeam,
        currentTeamRole,
        isJoined,
        orgRole,
        t,
        currentUserId,
        team_id,
        onRemoveUser,
        onUpdateUserRole,
        getTeamPermission,
        renderRowIndex,
    ]);

    const onInviteUser = async () => {
        dialogForm<InviteMemberForm>({
            title: t('teams_invite_team_member'),
            content: (methods) => <InviteMember team={team as API.Team} {...methods} />,
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
                        team_id,
                        users,
                    });
                    if (inviteRes.status === 200) {
                        store.dispatch(
                            pushNotification({
                                notification: notificationPayload(text(), 'success'),
                            }),
                        );
                    }
                    tableRef.current?.refresh();
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
    };
    const onSearchDebounce = debounce((searchText) => {
        setGlobalSearch(searchText);
    }, 300);

    const onResetSearchInput = useCallback(() => {
        onSearchDebounce('');
        setSearchInput('');
    }, [onSearchDebounce]);

    const roleProps = {
        ...(!getTeamPermission(orgRole, isJoined, currentTeamRole).inviteUser
            ? {
                  rightSideComponent: (
                      <Space size={12} justify="center" align="center">
                          <Search
                              placeholder={t('teams_member_list_search_placeholder')}
                              value={searchInput}
                              onSearch={(inputValue) => {
                                  setSearchInput(inputValue);
                                  onSearchDebounce(inputValue);
                              }}
                              sx={{
                                  width: '248px',
                              }}
                              onReset={() => {
                                  onResetSearchInput();
                              }}
                          />
                      </Space>
                  ),
              }
            : {}),
        ...(getTeamPermission(orgRole, isJoined, currentTeamRole).inviteUser
            ? {
                  extra: (
                      <Space size={12}>
                          <Search
                              placeholder={t('teams_member_list_search_placeholder')}
                              value={searchInput}
                              onSearch={(searchValue) => {
                                  setSearchInput(searchValue);
                                  onSearchDebounce(searchValue);
                              }}
                              sx={{
                                  width: '248px',
                              }}
                              onReset={() => {
                                  onResetSearchInput();
                              }}
                          />
                          {/*{getTeamPermission(orgRole, isJoined, currentTeamRole).inviteUser && (*/}
                          <Button
                              text={t('team_member_invite_button')}
                              onClick={onInviteUser}
                              sx={{ width: '173px', padding: '8px 32px' }}
                          />
                          {/*)}*/}
                      </Space>
                  ),
              }
            : {}),
    };

    return (
        <PageLayout
            title={`${t('team_members')} - ${team?.name}`}
            backBtnText={t('all_teams')}
            onBack={() => {
                navigate('/teams');
            }}
            {...roleProps}
        >
            <FlexibleTable<TeamMemberItem>
                ref={tableRef}
                queryKey={['teamMember', team_id]}
                columns={columns}
                request={fetchTeamMembers}
                globalFilter={globalSearch}
                columnFilterable={false}
                enableMultiRowSelection
                emptyImage={globalSearch ? 'joinTeam' : undefined}
                emptyMessage={
                    globalSearch ? (
                        <Typography variant="SubHeading2">
                            {orgRole === 'user' ? (
                                <Trans i18nKey="teams_list_search_empty_for_user" />
                            ) : (
                                <Trans i18nKey="teams_list_search_empty">
                                    No matching result has been found.\nCheck the spelling or{' '}
                                    <LinkButton onClick={onInviteUser}>invite the member</LinkButton> now.
                                </Trans>
                            )}
                        </Typography>
                    ) : (
                        <Typography variant="SubHeading2">
                            <Trans i18nKey="teams_empty_message">
                                <LinkButton onClick={onInviteUser}>Invite members now</LinkButton> \n and start to collaborate now!
                            </Trans>
                        </Typography>
                    )
                }
                isDataDeletable={(row) => {
                    return !!tableRef.current?.isSomeSelected();
                }}
                {...(getTeamPermission(orgRole, isJoined, currentTeamRole).removeUser
                    ? {
                          onDataDelete: onDataDelete,
                      }
                    : {})}
                onDataDelete={onDataDelete}
                deleteTooltip={(row) => {
                    if (!tableRef.current?.isSomeSelected()) {
                        return t('teams_remove_selected_members');
                    }
                }}
                deleteButtonText={t('teams_remove_selected_members')}
                fullWidth
                disableHoverEffect
            />
        </PageLayout>
    );
};
export default TeamMembers;
