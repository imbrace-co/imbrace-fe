import { Dropdown, EllipsisText, Icon, Space, Typography } from '@imbrace/ui';
import type { AxiosError, AxiosResponse } from 'axios';
import { format } from 'date-fns';
import React, { useCallback, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate, useOutletContext } from 'react-router';

import Avatar from '@/components/Avatar';
import { dialog } from '@/components/Dialog';
import { dialogForm } from '@/components/Dialog/form';
import FlexibleTable from '@/components/FlexibleTable';
import type { Columns, RequestParameters } from '@/components/FlexibleTable/types';
import LinkButton from '@/components/LinkButton';
import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import useAccess from '@/hooks/useAccess';
import JoinTeamButton from '@/pages/Teams//components/joinTeamButton';
import LeaveTeamButton from '@/pages/Teams//components/leaveTeamButton';
import ActivateSwitch from '@/pages/Teams/components/ActivateSwitch';
import type { CreateTeamFormType } from '@/pages/Teams/components/OperationTeamModal';
import OperationTeamModal, { CreateTeamFormSchema } from '@/pages/Teams/components/OperationTeamModal';
import RequestJoinTeamButton from '@/pages/Teams/components/requestJoinTeamButton';
import { PendingChip } from '@/pages/Teams/components/styledComponents';
import { notificationPayload } from '@/pages/Teams/components/teamHelper';
import type { InviteMemberForm } from '@/pages/Teams/components/TeamMembers/inviteMember';
import InviteMember from '@/pages/Teams/components/TeamMembers/inviteMember';
import { fetchAccountThunk } from '@/redux/slices/account';
import { pushNotification } from '@/redux/slices/notification';
import store, { useAppDispatch, useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';
import { deleteTeam, getTeamsV2, postTeam, postTeamUsersV2, putTeamV2 } from '@/services/api/team';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import type { PageLayoutChildrenProps } from './TeamsLayout';

const Teams = () => {
    const { globalSearch, tableRef, setSelectedTeam, fetchMyTeams } = useOutletContext<PageLayoutChildrenProps>();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { getTeamPermission, features } = useAccess();
    const navigate = useNavigate();
    const { openHelpCenter } = useNavbar();
    const businessUnit = useAppSelector((state) => state.BusinessUnit.businessUnitList);
    const orgRole = useAppSelector((state) => state.Account.role as API.Role);
    const teamRoles = useAppSelector((state) => state.Account.team_roles) || []; 

    const fetchTeams = useCallback(
        async (params: RequestParameters, signal?: AbortSignal) => {
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
                searchParams.append('q', businessUnit[0].id);
                const { data } = await apiFetch<API.PaginatedResponse<API.TeamListItem[]>>(
                    getTeamsV2.api(),
                    getTeamsV2.method,
                    searchParams,
                    ImbraceClient,
                    {
                        signal,
                    },
                );
                return {
                    data: data.data,
                    meta: {
                        total: data.count,
                        skip: (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? 0),
                        limit: pagination?.pageSize ?? 20,
                    },
                };
            } catch (error) {
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
        [businessUnit],
    );

    const onDeleteTeam = useCallback(
        async (teamId: string) => {
            try {
                await apiFetch(deleteTeam.api(teamId), deleteTeam.method, undefined, ImbraceClient);
                await fetchMyTeams();
                setSelectedTeam((prev) => {
                    if (prev?._id === teamId) {
                        return undefined;
                    }
                    return prev;
                });
            } catch (error) {
                const err = error as AxiosError;
                const {
                    data: { code },
                } = err.response as AxiosResponse<API.ErrorResponse>;
                console.error('Delete Team Error: ', err.response);
                if (code === 40004) {
                    store.dispatch(
                        pushNotification({
                            notification: notificationPayload(t('teams_not_found_toast')),
                        }),
                    );
                }
            }
        },
        [t, fetchMyTeams, setSelectedTeam],
    );

    const getUserState = useCallback(
        (userState: 'join' | 'invite' | 'request') => {
            switch (userState) {
                case 'invite':
                    return <PendingChip label={<Typography variant="Caption">{t('pending')}</Typography>} variant="outlined" />;
                case 'request':
                    return <PendingChip label={<Typography variant="Caption">{t('requested')}</Typography>} variant="outlined" />;
                default:
                    return '';
            }
        },
        [t],
    );

    const onInviteMember = useCallback(
        (teamCreated: API.Team) => {
            dialogForm<InviteMemberForm>({
                title: 'Invite Team Member',
                content: (methods) => <InviteMember team={teamCreated as API.Team} {...methods} />,
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
                            team_id: teamCreated.id,
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
        },
        [t, tableRef],
    );

    const askToInviteMembersDialog = useCallback(
        (teamCreated: API.Team) => {
            dialog({
                title: t('teams_created_dialog_title'),
                content: t('teams_created_dialog_content'),
                cancelText: t('teams_created_dialog_cancel'),
                confirmText: t('teams_created_dialog_confirm'),
                actionsAlign: 'flex-end',
                onConfirm: () => {
                    onInviteMember(teamCreated);
                },
                onClose: () => {
                    navigate('/teams');
                },
            });
        },
        [t, onInviteMember, navigate],
    );

    const openDialog = useCallback(
        async (team?: API.TeamListItem) => {
            if (team) {
                // edit team form
                dialogForm<CreateTeamFormType>({
                    title: t('teamlist_edit_team'),
                    content: (methods) => (
                        <OperationTeamModal
                            businessUnitList={businessUnit}
                            title={t('teamlist_edit_team')}
                            current={team}
                            onClose={() => {}}
                            lockAssignMode={(mode: API.TeamMode) => features?.teams({ assignMode: mode })}
                            {...methods}
                        />
                    ),

                    defaultValues: {
                        name: team.name,
                        mode: team.mode,
                        file: team.icon_url
                            ? [
                                  {
                                      id: '1',
                                      url: team.icon_url,
                                      status: 'ok',
                                  },
                              ]
                            : undefined,
                    },
                    confirmText: t('update'),
                    showUnsavedDialog: true,
                    showCloseButton: true,
                    hideCancelButton: true,
                    actionsAlign: 'flex-start',
                    onClose: () => {},
                    onConfirm: async (formData, methods) => {
                        try {
                            const { name, mode, file } = formData;

                            const teamIconUrl = file?.filter((attachment) => attachment.status === 'ok')?.[0]?.url || '';

                            const { data } = await apiFetch<API.Team>(putTeamV2.api(team.id), putTeamV2.method, {
                                name,
                                mode,
                                icon_url: teamIconUrl,
                            });
                            setSelectedTeam((prev) => {
                                if (prev) {
                                    return {
                                        ...prev,
                                        name: data?.name,
                                    };
                                }
                                return prev;
                            });
                            dispatch(fetchAccountThunk({ silent: true }));
                            tableRef.current?.refresh();
                            return true;
                        } catch (error) {
                            const err = error as AxiosError;
                            const {
                                data: { code, message },
                            } = err.response as AxiosResponse<API.ErrorResponse>;
                            console.error('err: ', err.response);
                            if (code === 40000 && message === 'Team already exist') {
                                methods?.setError('name', {
                                    message: t('validation_team_name_duplicated'),
                                });
                            }
                            if (code === 8) {
                                dispatch(
                                    pushNotification({
                                        notification: notificationPayload(t('teams_default_team_delete_tooltip')),
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
                    schema: CreateTeamFormSchema(t),
                });
            } else {
                const fetchTeamCount = async () => {
                    try {
                        const searchParams = new URLSearchParams();

                        searchParams.append('limit', '4');
                        searchParams.append('skip', '0');
                        searchParams.append('q', businessUnit[0].id);
                        const { data } = await apiFetch<API.PaginatedResponse<API.TeamListItem[]>>(
                            getTeamsV2.api(),
                            getTeamsV2.method,
                            searchParams,
                        );
                        return {
                            count: data.count,
                        };
                    } catch (error) {
                        return {
                            count: 0,
                        };
                    }
                };
                const { count } = await fetchTeamCount();

                dialogForm<CreateTeamFormType>({
                    title: t('teamlist_create_team'),
                    content: (methods) => (
                        <OperationTeamModal
                            businessUnitList={businessUnit}
                            title={t('teamlist_create_team')}
                            onClose={() => {}}
                            lockAssignMode={(mode: API.TeamMode) => features?.teams({ assignMode: mode })}
                            {...methods}
                        />
                    ),

                    defaultValues: {
                        name: '',
                        mode: undefined,
                        file: undefined,
                    },
                    confirmText: t('create'),
                    showUnsavedDialog: true,
                    showCloseButton: true,
                    hideCancelButton: true,
                    actionsAlign: 'flex-start',
                    onClose: () => {},
                    onConfirm: async (formData, methods) => {
                        try {
                            const needUpgrade = () => {
                                if (formData?.mode === 'grab') {
                                    if (
                                        features.teams({
                                            assignMode: formData.mode as API.TeamMode,
                                        })
                                    ) {
                                        return true;
                                    }
                                }
                                return features.teams({
                                    total: count,
                                });
                            };
                            if (needUpgrade()) {
                                openUnlockFeature({
                                    openHelpCenter: (channelId: string) =>
                                        openHelpCenter?.({
                                            channelId,
                                            prefillMessage: t('unlock_feature_prefill_message'),
                                            defaultWebWidget: true,
                                        }),
                                });
                                return false;
                            }

                            const { name, mode, file } = formData;

                            const teamIconUrl = file?.filter((attachment) => attachment.status === 'ok')?.[0]?.url;

                            const createTeamRes = await apiFetch<API.Team>(postTeam.api, postTeam.method, {
                                name,
                                mode,
                                business_unit_id: businessUnit[0].id,
                                icon_url: teamIconUrl,
                                description: '',
                            });
                            if (createTeamRes.status === 200) {
                                askToInviteMembersDialog(createTeamRes.data);
                            }

                            dispatch(fetchAccountThunk({ silent: true }));
                            tableRef.current?.refresh();
                            return true;
                        } catch (error) {
                            const err = error as AxiosError;
                            const {
                                data: { code, message },
                            } = err.response as AxiosResponse<API.ErrorResponse>;
                            console.error('err: ', err.response);
                            if (code === 40000 && message === 'Team already exist') {
                                methods?.setError('name', {
                                    message: t('validation_team_name_duplicated'),
                                });
                            }
                        }
                    },

                    confirmButtonProps: (formData) => {
                        const needUpgrade = () => {
                            if (formData?.mode === 'grab') {
                                if (
                                    features.teams({
                                        assignMode: formData.mode as API.TeamMode,
                                    })
                                ) {
                                    return true;
                                }
                            }
                            return features.teams({
                                total: count,
                            });
                        };
                        return {
                            endIcon: needUpgrade() ? <Icon name="premium" /> : null,
                            sx: {
                                minWidth: '160px',
                                height: '40px',
                            },
                        };
                    },
                    schema: CreateTeamFormSchema(t),
                });
            }
            return true;
        },
        [t, businessUnit, askToInviteMembersDialog, tableRef, dispatch, setSelectedTeam, features, openHelpCenter],
    );

    const columns: Columns<API.TeamListItem> = useMemo(
        () => [
            {
                header: '',
                accessorKey: 'is_joined',
                id: 'is_joined',
                cell: ({ row, isHover }) => {
                    const currentTeam = teamRoles.find((teamRole) => teamRole.team_id === row.original.id);
                    // const isJoined = currentTeam ? currentTeam.state === 'join' : row.original.is_joined;
                    const currentTeamRole = currentTeam?.role;

                    if (isHover && !row.original.is_joined) {
                        if (orgRole === 'owner' && row.original.user_state !== 'invite' && row.original.user_state !== 'request') {
                            return (
                                <JoinTeamButton
                                    teamId={row.original.id}
                                    reload={() => {
                                        tableRef.current?.refresh();
                                    }}
                                />
                            );
                        }
                        if (orgRole === 'admin' || orgRole === 'user') {
                            if (row.original.user_state === 'invite' || row.original.user_state === 'request') {
                                return getUserState(row.original.user_state);
                            }
                            return (
                                <RequestJoinTeamButton
                                    teamId={row.original.id}
                                    reload={() => {
                                        tableRef.current?.refresh();
                                    }}
                                />
                            );
                        }
                    }

                    if (
                        isHover &&
                        row.original.is_joined &&
                        getTeamPermission(orgRole, row.original.is_joined, currentTeamRole).leaveTeam
                    ) {
                        // team members cannot leave team once joined
                        return (
                            <LeaveTeamButton
                                team={row.original}
                                currentTeamRole={currentTeamRole}
                                reload={() => {
                                    tableRef.current?.refresh();
                                }}
                            />
                        );
                    }

                    return row.original.is_joined ? (
                        <Typography style={{ color: 'var(--color-primary-1)' }}>{t('joined')}</Typography>
                    ) : (
                        getUserState(row.original.user_state)
                    );
                },
                meta: {
                    cellStyle: {
                        textAlign: 'center',
                        padding: 0,
                    },
                },
                enableEditing: false,
                size: 90,
                maxSize: 100,
            },
            {
                header: t('team_name'),
                type: 'ShortText',
                accessorKey: 'name',
                id: 'name',
                enableEditing: false,
                enableSorting: true,
                size: 256,
                minSize: 256,
                cell: ({ row }) => {
                    return (
                        <Space size={14}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {row.original.icon_url ? (
                                    <Avatar
                                        avatarUrl={row.original.icon_url}
                                        isActive
                                        width={24}
                                        height={24}
                                        backgroundColor={'var(--color-light-1)'}
                                    />
                                ) : (
                                    <Icon name="allTeams" fontSize={24} style={{ color: 'var(--color-light-5)' }} />
                                )}
                            </div>

                            <EllipsisText element={<Typography />} text={row.original.name} />
                        </Space>
                    );
                },
                meta: {
                    cellStyle: {
                        padding: '6.5px 11px',
                    },
                },
            },
            {
                header: t('created_date'),
                accessorKey: 'created_at',
                id: 'created_at',
                enableEditing: false,
                enableSorting: true,
                size: 180,
                minSize: 180,
                cell: ({ row }) => <Typography>{format(new Date(row.original.created_at), 'MM/dd/yyyy')}</Typography>,
            },
            {
                header: t('teams_no_of_members'),
                accessorKey: 'members_count',
                id: 'members_count',
                enableEditing: false,
                enableSorting: true,
                type: 'ShortText',
                size: 180,
                minSize: 180,
                cell: ({ row }) => <EllipsisText element={<Typography />} text={t('member', { count: row.original.members_count })} />,
            },
            {
                header: '',
                accessorKey: 'operation',
                id: 'operation',
                enableEditing: false,
                type: 'ShortText',
                cell: ({ row }) => {
                    const currentTeam = teamRoles.find((teamRole) => teamRole.team_id === row.original.id);
                    const isJoined = currentTeam?.state === 'join';
                    const currentTeamRole = currentTeam?.role;

                    return (
                        <Space size={0} justify="end" style={{ gap: '12px' }}>
                            <ActivateSwitch
                                current={row.original}
                                isActive={!row.original.is_disabled}
                                reload={() => {
                                    tableRef.current?.refresh();
                                }}
                                disabled={
                                    row.original.is_default ||
                                    !getTeamPermission(orgRole, row.original.is_joined, currentTeamRole).activeTeam
                                }
                                tooltip={row.original.is_default ? t('teams_default_team_deactive_tooltip') : ''}
                            />
                            <Dropdown
                                variant="text"
                                hideArrow
                                hideOnSelect
                                options={[
                                    {
                                        text: t('team_settings'),
                                        index: 'team_settings',
                                        disabled: !getTeamPermission(orgRole, isJoined, currentTeamRole).teamOperation,
                                    },
                                    {
                                        text: t('team_members'),
                                        index: 'team_members',
                                        disabled: !getTeamPermission(orgRole, isJoined, currentTeamRole).viewTeamMembers,
                                    },
                                    {
                                        type: 'divider',
                                    },
                                    {
                                        text: t('delete'),
                                        index: 'delete',
                                        typographyProps: {
                                            style: {
                                                color:
                                                    row.original.is_default ||
                                                    !getTeamPermission(orgRole, isJoined, currentTeamRole).deleteTeam
                                                        ? 'var(--color-light-3)'
                                                        : 'var(--color-danger-1)',
                                            },
                                        },
                                        disabled:
                                            row.original.is_default || !getTeamPermission(orgRole, isJoined, currentTeamRole).deleteTeam,
                                        tooltip: row.original.is_default ? t('teams_default_team_delete_tooltip') : '',
                                    },
                                ]}
                                icon={<Icon name="more" />}
                                onSelect={async (event, selectedIndex) => {
                                    event.stopPropagation();
                                    if (selectedIndex === 'team_settings') {
                                        openDialog(row.original);
                                    }
                                    if (selectedIndex === 'team_members') {
                                        navigate(`/teams/${row.original.id}/members`);
                                    }
                                    if (selectedIndex === 'delete') {
                                        if (localStorage.getItem('dont_asked_delete_team_again') === 'true') {
                                            await onDeleteTeam(row.original.id);
                                            tableRef.current?.refresh();
                                            return;
                                        }
                                        dialog({
                                            title: t('teamlist_delete_team_title'),
                                            content: t('teamlist_delete_team_content'),
                                            showDontAskedAgain: true,
                                            confirmButtonProps: {
                                                type: 'danger',
                                            },
                                            actionsAlign: 'flex-end',
                                            onConfirm: async (dontAskedAgain) => {
                                                if (dontAskedAgain) {
                                                    localStorage.setItem('dont_asked_delete_team_again', 'true');
                                                }
                                                await onDeleteTeam(row.original.id);
                                                tableRef.current?.refresh();
                                            },
                                            onClose: () => {},
                                        });
                                    }
                                }}
                            />
                        </Space>
                    );
                },
                meta: {
                    cellStyle: {
                        padding: 0,
                    },
                },
            },
        ],
        [getUserState, navigate, onDeleteTeam, openDialog, orgRole, t, getTeamPermission, tableRef, teamRoles],
    );

    const renderTeams = useCallback(() => {
        return (
            <FlexibleTable<API.TeamListItem>
                ref={tableRef}
                queryKey={['teams']}
                columns={columns}
                request={fetchTeams}
                globalFilter={globalSearch}
                columnFilterable={false}
                emptyImage={'joinTeam'}
                emptyMessage={
                    globalSearch ? (
                        <Typography variant="SubHeading2">
                            {orgRole === 'admin' || orgRole === 'owner' ? (
                                <Trans i18nKey="teams_empty_search_result">
                                    No matching result has been found.\nCheck the spelling or create{' '}
                                    <LinkButton
                                        onClick={() => {
                                            openDialog();
                                        }}
                                    >
                                        a first record
                                    </LinkButton>{' '}
                                    for it now.
                                </Trans>
                            ) : (
                                <Typography variant="SubHeading2">{t('my_teams_empty_search_result_for_members')}</Typography>
                            )}
                        </Typography>
                    ) : (
                        <>
                            {orgRole === 'admin' || orgRole === 'owner' ? (
                                <Typography variant="SubHeading2">
                                    <Trans i18nKey="teams_empty_message">
                                        <LinkButton
                                            onClick={() => {
                                                openDialog();
                                            }}
                                        >
                                            Create your first team
                                        </LinkButton>{' '}
                                        and start to collaborate now!
                                    </Trans>
                                </Typography>
                            ) : (
                                <Typography variant="SubHeading2">{t('teams_empty_message_members')}</Typography>
                            )}
                        </>
                    )
                }
                fullWidth
                disableHoverEffect
            />
        );
    }, [columns, fetchTeams, openDialog, orgRole, t, globalSearch, tableRef]);

    return renderTeams();
};

export default Teams;
