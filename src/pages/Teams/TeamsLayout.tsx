import { Button, Dropdown, Icon, Search, Space, Tabs, Typography, useDialog } from '@imbrace/ui';
import { Box, Divider } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError, AxiosResponse } from 'axios';
import debounce from 'lodash/debounce';
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import PageLayout from '@/components/PageLayout';
import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import useAccess from '@/hooks/useAccess';
import { notificationPayload } from '@/pages/Teams/components/teamHelper';
import { fetchAccountThunk } from '@/redux/slices/account';
import { pushNotification } from '@/redux/slices/notification';
import store, { useAppDispatch, useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';
import { deleteTeam, getMyTeams, getTeamsV2, postTeam, postTeamUsersV2, putTeamV2 } from '@/services/api/team';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import type { SearchBarRef } from '@/components/SearchBar';
import SearchBar from '@/components/SearchBar';
import type { CreateTeamFormType } from './components/OperationTeamModal';
import OperationTeamModal, { CreateTeamFormSchema } from './components/OperationTeamModal';
import type { TeamMemberItem } from './components/TeamMembers';
import type { InviteMemberForm } from './components/TeamMembers/inviteMember';
import InviteMember from './components/TeamMembers/inviteMember';

export interface PageLayoutChildrenProps {
    headerWidth?: number;
    headerHeight?: number;
    scrollableNodeRef?: RefObject<HTMLDivElement>;
    globalSearch?: string;
    selectedTeam?: MyTeams;
    tableRef: RefObject<FlexibleTableRef<API.TeamListItem | TeamMemberItem>>;
    setSelectedTeam: (value: ((prevState: MyTeams | undefined) => MyTeams | undefined) | MyTeams | undefined) => void;
    fetchMyTeams: () => void;
}

interface MyTeams extends API.Team {
    _id: string;
}

const Container = (props: PageLayoutChildrenProps) => {
    return <Outlet context={props} />;
};

const TeamsLayout = () => {
    const { t } = useTranslation();
    const tableRef = useRef<FlexibleTableRef<API.TeamListItem | TeamMemberItem>>(null);
    const searchBarRef = useRef<SearchBarRef>(null);
    const [{ dialog, dialogForm }, dialogHolder] = useDialog();

    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { getTeamPermission, features } = useAccess();
    const { openHelpCenter } = useNavbar();
    const dispatch = useAppDispatch();
    const businessUnit = useAppSelector((state) => state.BusinessUnit.businessUnitList);
    const orgRole = useAppSelector((state) => state.Account.role as API.Role);
    const teamRoles = useAppSelector((state) => state.Account.team_roles);
    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const supportTouchpoint = useAppSelector((state) => state.Account.support?.customer?.touchpoint);
    const [globalSearch, setGlobalSearch] = useState<string>();
    const [searchInput, setSearchInput] = useState<string>();
    const [currentTab, setCurrentTab] = useState<'teams' | 'my-teams'>(pathname.indexOf('my-teams') === -1 ? 'teams' : 'my-teams');
    const [selectedTeam, setSelectedTeam] = useState<MyTeams>();
    const currentTeam = selectedTeam && teamRoles.find((teamRole) => teamRole.team_id === selectedTeam._id);
    const currentTeamRole = currentTeam?.role;

    useEffect(() => {
        setCurrentTab(pathname.indexOf('my-teams') === -1 ? 'teams' : 'my-teams');
    }, [pathname]);

    const fetchMyTeams = useCallback(async () => {
        try {
            const { data } = await apiFetch<MyTeams[]>(getMyTeams.api, getMyTeams.method);
            return data.map((team) => ({ ...team, _id: team._id ?? team.id }));
        } catch (error) {
            console.error('fetch my teams error: ', error);
            return [];
        }
    }, []);

    const { data: myTeamList } = useQuery({
        queryKey: ['my-teams-list'],
        queryFn: fetchMyTeams,
        retry: false,
    });

    const selected = useMemo(() => {
        return selectedTeam ?? (myTeamList && myTeamList[0]);
    }, [selectedTeam, myTeamList]);

    const myTeamsOptions = useMemo(() => {
        if (myTeamList && myTeamList.length > 0) {
            return myTeamList.map((teamRole) => ({
                index: teamRole._id,
                text: teamRole.name,
                icon: <Icon name="allTeams" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            }));
        }
        return [];
    }, [myTeamList]);

    useEffect(() => {
        if (currentTab === 'my-teams') {
            fetchMyTeams();
        }
    }, [currentTab, fetchMyTeams]);

    const onInviteMember = useCallback(
        (team: API.Team) => {
            dialogForm<InviteMemberForm>({
                title: t('team_member_invite_drawer_header'),
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
                            team_id: team.id,
                            users,
                        });
                        if (inviteRes.status === 200) {
                            dispatch(
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
                            dispatch(
                                pushNotification({
                                    notification: notificationPayload(t('invalid_team_id')),
                                }),
                            );
                        }
                        if (err.response?.data.code === 40003) {
                            dispatch(
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
        },
        [t, dispatch, dialogForm],
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
        [t, onInviteMember, navigate, dialog],
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
                        file: [
                            {
                                id: '1',
                                url: team.icon_url,
                                status: 'ok',
                            },
                        ],
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
                            const teamIconUrl = file?.filter((attachment) => attachment.status === 'ok')?.[0]?.url;

                            const { data } = await apiFetch<API.Team>(putTeamV2.api(team.id), putTeamV2.method, {
                                name,
                                mode,
                                icon_url: teamIconUrl,
                            });

                            if (selectedTeam?._id === data?.id) {
                                setSelectedTeam((prev) => {
                                    if (prev) {
                                        return {
                                            ...prev,
                                            name: data?.name,
                                        };
                                    }
                                    return prev;
                                });
                            }
                            tableRef.current?.refresh();
                            return true;
                        } catch (error) {
                            const err = error as AxiosError;
                            const {
                                data: { code },
                            } = err.response as AxiosResponse<API.ErrorResponse>;
                            console.error('err: ', err.response);
                            if (code === 8) {
                                dispatch(
                                    pushNotification({
                                        notification: notificationPayload(t('teams_default_team_delete_tooltip')),
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
                    title: t('create_new_team'),
                    content: (methods) => (
                        <OperationTeamModal
                            businessUnitList={businessUnit}
                            title={t('create_new_team')}
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
                                    channel: supportChannel,
                                    touchpoint: supportTouchpoint,
                                    openHelpCenter: (channelId: string) =>
                                        openHelpCenter?.({
                                            channelId,
                                            prefillMessage: t('unlock_feature_prefill_message'),
                                            defaultWebWidget: true,
                                        }),
                                });
                                return false;
                            }

                            if (!businessUnit[0]?.id) {
                                dispatch(
                                    pushNotification({
                                        notification: notificationPayload(t('error_something_went_wrong')),
                                    }),
                                );
                                return false;
                            }

                            if (!businessUnit[0]?.id) {
                                dispatch(
                                    pushNotification({
                                        notification: notificationPayload(t('error_something_went_wrong')),
                                    }),
                                );
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

                            await fetchMyTeams();
                            dispatch(fetchAccountThunk({ silent: true }));
                            tableRef.current?.refresh();
                            return true;
                        } catch (error) {
                            const err = error as AxiosError<API.ErrorResponse>;
                            const { code, message } = err.response?.data ?? {};
                            console.error('err: ', err.response ?? error);
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
        [
            t,
            businessUnit,
            askToInviteMembersDialog,
            fetchMyTeams,
            dispatch,
            selectedTeam,
            features,
            openHelpCenter,
            supportChannel,
            supportTouchpoint,
            dialogForm,
        ],
    );

    const onDeleteTeam = useCallback(
        async (teamId: string) => {
            try {
                await apiFetch(deleteTeam.api(teamId), deleteTeam.method, undefined, ImbraceClient);
                setSelectedTeam(undefined);
                await fetchMyTeams();
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
        [t, fetchMyTeams],
    );

    const onSearchDebounce = debounce((searchText) => {
        setGlobalSearch(searchText);
    }, 300);

    const onResetSearchInput = useCallback(() => {
        onSearchDebounce('');
        setSearchInput('');
    }, [onSearchDebounce]);

    const renderTeamsExtra = useCallback(() => {
        return (
            <Space size={12}>
                <Search
                    placeholder={t('teams_search_placeholder')}
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
                {getTeamPermission(orgRole).createTeam && <Button text={t('create_new')} onClick={() => openDialog()} />}
            </Space>
        );
    }, [orgRole, openDialog, t, getTeamPermission, onSearchDebounce, onResetSearchInput, searchInput]);

    const renderMyTeamsExtra = useCallback(() => {
        return (
            <Space size={12}>
                {myTeamList && myTeamList.length > 0 && (
                    <>
                        <SearchBar
                            ref={searchBarRef}
                            onSearch={(searchText) => {
                                onSearchDebounce(searchText);
                            }}
                            placeholder={t('teams_member_list_search_placeholder')}
                        />
                        {getTeamPermission(orgRole, true, currentTeamRole).teamOperation && (
                            <Dropdown
                                hideArrow
                                variant="text"
                                icon={<Icon name="settings" fontSize={24} style={{ color: 'var(--color-light-4)' }} />}
                                buttonSx={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                }}
                                options={[
                                    {
                                        text: t('my_teams_team_settings'),
                                        index: 'team-settings',
                                    },
                                    {
                                        type: 'divider',
                                    },
                                    {
                                        text: t('my_teams_delete_team'),
                                        index: 'delete-team',
                                        typographyProps: {
                                            style: { color: 'var(--color-danger-1)' },
                                        },
                                    },
                                ]}
                                hideOnSelect
                                onSelect={async (event, selectedIndex) => {
                                    if (selectedIndex === 'team-settings' && selected) {
                                        dialogForm<CreateTeamFormType>({
                                            title: t('teamlist_edit_team'),
                                            content: (methods) => (
                                                <>
                                                    <OperationTeamModal
                                                        businessUnitList={businessUnit}
                                                        title={t('teamlist_edit_team')}
                                                        current={selected}
                                                        onClose={() => {}}
                                                        {...methods}
                                                    />
                                                </>
                                            ),

                                            defaultValues: {
                                                name: selected?.name,
                                                mode: selected?.mode,
                                                file: selected?.icon_url
                                                    ? [
                                                          {
                                                              id: '1',
                                                              status: 'ok',
                                                              url: selected?.icon_url,
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
                                                    const teamIconUrl =
                                                        file?.filter((attachment) => attachment.status === 'ok')?.[0]?.url || '';

                                                    const res = await apiFetch<API.Team>(putTeamV2.api(selected?._id), putTeamV2.method, {
                                                        name,
                                                        mode,
                                                        icon_url: teamIconUrl,
                                                    });
                                                    await fetchMyTeams();
                                                    setSelectedTeam((prev) => {
                                                        if (prev) {
                                                            return {
                                                                ...prev,
                                                                name: res.data?.name,
                                                            };
                                                        }
                                                        return prev;
                                                    });
                                                    tableRef.current?.refresh();
                                                    return true;
                                                } catch (error) {
                                                    const err = error as AxiosError;
                                                    const {
                                                        data: { code },
                                                    } = err.response as AxiosResponse<API.ErrorResponse>;
                                                    console.error('err: ', err.response); // if (code === 40000 && message === 'Team already exist') {
                                                    if (code === 8) {
                                                        dispatch(
                                                            pushNotification({
                                                                notification: notificationPayload(t('teams_default_team_delete_tooltip')),
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
                                            schema: CreateTeamFormSchema(t),
                                        });
                                    }

                                    if (selectedIndex === 'delete-team') {
                                        if (localStorage.getItem('dont_asked_delete_team_again') === 'true') {
                                            if (!selected) return;
                                            await onDeleteTeam(selected._id);
                                            tableRef.current?.refresh();
                                            navigate('/teams');
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
                                                if (!selected) return;
                                                if (dontAskedAgain) {
                                                    localStorage.setItem('dont_asked_delete_team_again', 'true');
                                                }
                                                await onDeleteTeam(selected._id);
                                                tableRef.current?.refresh();
                                                navigate('/teams');
                                            },
                                            onClose: () => {},
                                        });
                                    }
                                }}
                            />
                        )}

                        <Divider orientation="vertical" variant="middle" flexItem sx={{ height: '24px' }} />

                        <Dropdown
                            variant="text"
                            text={
                                <Box sx={{ gap: '12px', display: 'flex', alignItems: 'center' }}>
                                    <Icon name="allTeams" fontSize={24} style={{ color: 'var(--color-light-5)' }} />
                                    <Typography
                                        variant="Body"
                                        style={{
                                            textTransform: 'initial',
                                            color: 'var(--color-light-7)',
                                            lineHeight: '130%',
                                        }}
                                    >
                                        {selected?.name}
                                    </Typography>
                                </Box>
                            }
                            options={myTeamsOptions}
                            selectedIndex={selected?._id}
                            hideOnSelect
                            buttonSx={{
                                color: 'var(--color-light-4)',
                                height: '40px',
                                borderRadius: '8px',
                            }}
                            onSelect={(event, selectedIndex) => {
                                const newSelectedTeam = myTeamList.find((team) => team._id === selectedIndex);
                                if (newSelectedTeam) {
                                    setSelectedTeam(newSelectedTeam);
                                }
                            }}
                        />
                    </>
                )}
                {getTeamPermission(orgRole, true, currentTeamRole).inviteUser && (
                    <Button
                        text={t('my_teams_invite_member')}
                        onClick={() => {
                            if (selected) {
                                onInviteMember({ ...selected, id: (selected as API.Team).id ?? selected._id });
                            }
                        }}
                    />
                )}
            </Space>
        );
    }, [
        currentTeamRole,
        myTeamList,
        myTeamsOptions,
        onInviteMember,
        orgRole,
        t,
        businessUnit,
        selected,
        onDeleteTeam,
        getTeamPermission,
        onSearchDebounce,
        fetchMyTeams,
        dispatch,
        navigate,
        dialog,
        dialogForm,
    ]);

    const renderExtra = useCallback(() => {
        return (
            <Space size={12}>
                <Box
                    sx={{
                        flex: 1,
                        borderBottom: '1px solid #e0e0e0',
                    }}
                >
                    <Tabs
                        tabs={[
                            {
                                value: 'teams',
                                label: t('all_teams'),
                                onClick: () => {
                                    navigate('/teams');
                                },
                            },
                            {
                                value: 'my-teams',
                                label: t('my_teams'),
                                onClick: () => {
                                    navigate('/teams/my-teams');
                                },
                            },
                        ]}
                        currentTab={currentTab}
                        onChange={(e, tabValue) => {
                            e.stopPropagation();
                            if (tabValue === 'teams') {
                                setGlobalSearch(undefined);
                            }
                            if (tabValue === 'my-teams') {
                                setGlobalSearch(undefined);
                                setSearchInput(undefined);
                            }
                        }}
                    />
                </Box>
                {currentTab === 'teams' ? renderTeamsExtra() : renderMyTeamsExtra()}
            </Space>
        );
    }, [currentTab, navigate, t, renderMyTeamsExtra, renderTeamsExtra]);

    return (
        <PageLayout title={currentTab === 'teams' ? t('teams') : t('my_teams')} extra={renderExtra()}>
            {dialogHolder}
            <Container
                globalSearch={globalSearch}
                selectedTeam={selected}
                tableRef={tableRef}
                setSelectedTeam={setSelectedTeam}
                fetchMyTeams={fetchMyTeams}
            />
        </PageLayout>
    );
};

export default TeamsLayout;
