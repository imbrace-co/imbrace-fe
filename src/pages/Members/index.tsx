import { EllipsisText } from '@imbrace/ui';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import Collapse from '@mui/material/Collapse';
import List from '@mui/material/List';
import debounce from 'lodash/debounce';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Avatar from '@/components/Avatar';
import ChildListItemText from '@/components/Conversation/ChildListItemText';
import CountText from '@/components/Conversation/CountText';
import HeaderListItemText from '@/components/Conversation/HeaderListItemText';
import ListItemButton from '@/components/Conversation/ListItemButton';
import PageLayout from '@/components/PageLayout';
import RoleTag from '@/components/RoleTag';
import SideBar from '@/components/SideBar';
import StatusTag from '@/components/StatusTag';
import TeamTag from '@/components/TeamTag';
import { FETCH_IN_PROGRESS } from '@/constants/app';
import useAccess from '@/hooks/useAccess';
import type { UserDetailDrawerType } from '@/pages/Members/IMember.types';
import { fetchMembersThunk } from '@/redux/slices/member';
import type { ReduxUser } from '@/redux/slices/member.types';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { getMemberRolesCount } from '@/services/api/member';
import apiFetch from '@/services/axios/handler';

import MemberList from './components/Member';
import ActivateSwitch from './components/Member/ActivateSwitch';
import MemberDetail from './components/MemberDetail';
import styles from './index.module.scss';

const Members = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const userID = useAppSelector((state) => state.Account.id);
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const loadingStatus = useAppSelector((state) => state.Member.loadingStatus);
    const memberList = useAppSelector((state) => state.Member.list);
    const total = useAppSelector((state) => state.Member.total);
    const count = useAppSelector((state) => state.Member.count);
    const limit = useAppSelector((state) => state.Member.limit);
    const skip = useAppSelector((state) => state.Member.skip);

    const [roleCounts, setRoleCounts] = useState<API.RolesCount>({
        owner: 0,
        admin: 0,
        user: 0,
        technician: 0,
    });

    const [isRoleBarOpen, setIsRoleBarOpen] = useState(true);
    const [searchbarInput, setSearchbarInput] = useState('');
    const [userDetailDrawer, setUserDetailDrawer] = useState<UserDetailDrawerType>({
        open: false,
    });
    const filterRoleAllOptions = 'owner,member,admin,user,technician';
    // OSS has 2 roles: owner + member. 'member' covers 'member' (canonical OSS role) + admin/user/technician (legacy)
    const memberRoleOptions = 'member,admin,user,technician';
    const getRolesParam = (role: string) =>
        role === 'all' ? filterRoleAllOptions : role === 'member' ? memberRoleOptions : role;
    const memberCount =
        ((roleCounts as { member?: number }).member ?? 0) +
        (roleCounts.admin ?? 0) +
        (roleCounts.user ?? 0) +
        (roleCounts.technician ?? 0);
    const sort = useRef('-created_at');
    const { isUnderRole } = useAccess();

    const fetchMemberCount = useCallback(async () => {
        try {
            const { data } = await apiFetch<API.RolesCount>(getMemberRolesCount.api, getMemberRolesCount.method);
            setRoleCounts(data);
        } catch (error) {
            console.log(error);
        }
    }, []);

    const reload = useCallback(() => {
        dispatch(fetchMembersThunk({ limit, skip, search: searchbarInput }));
        fetchMemberCount();
    }, [dispatch, limit, skip, searchbarInput, fetchMemberCount]);

    const columns = useMemo(
        () => [
            {
                id: 'id',
                label: '',
                disableSorter: true,
                disablePadding: true,
                width: 60,
                align: 'center',
                customize: (key: string, row: ReduxUser) => (row.id === userID ? <span className={styles.you}>{t('you')}</span> : <span />),
            },
            {
                id: 'first_name',
                label: 'member_table_header_firstname',
                hasExtraTool: false,
                width: 220,
                customize: (key: string, row: ReduxUser) => (
                    <div className={styles.avatarContainer}>
                        <Avatar
                            avatarUrl={row.avatar_url}
                            isActive={row.is_active}
                            displayName={row.display_name}
                            firstName={row.first_name}
                            lastName={row.last_name}
                        />
                        <EllipsisText text={row.first_name || '-'} />
                    </div>
                ),
            },
            {
                id: 'last_name',
                label: 'member_table_header_lastname',
                width: 200,
                customize: (key: string, row: ReduxUser) => <EllipsisText text={row.last_name || '-'} />,
            },
            {
                id: 'display_name',
                label: 'member_table_header_displayname',
                width: 300,
                customize: (key: string, row: ReduxUser) => <EllipsisText text={row.display_name || '-'} />,
            },
            {
                id: 'role',
                label: 'member_table_header_role',
                width: 140,
                customize: (key: string, row: ReduxUser) => <RoleTag role={row.role} />,
            },
            {
                id: 'status',
                label: 'member_table_header_status',
                width: 150,
                filter: {
                    active: {
                        label: t('status_active'),
                        defaultChecked: true,
                    },
                    deactivated: {
                        label: t('status_deactivated'),
                        defaultChecked: true,
                    },
                },
                filterOptions: {
                    atLeastOne: true,
                },
                customize: (key: string, row: ReduxUser) => (
                    <StatusTag isActive={row.status === 'active'} text={t(`status_${row.status}`)} />
                ),
            },
            {
                id: 'teams',
                label: 'member_table_header_teams',
                disableSorter: true,
                width: 300,
                customize: (key: string, row: ReduxUser) => <TeamTag teams={row.joined_teams} />,
            },
            {
                id: 'is_active',
                label: 'member_table_activate',
                disableSorter: true,
                width: 100,
                customize: (key: string, row: ReduxUser) => (
                    <div
                        style={{ display: 'flex', width: '100%' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {isUnderRole(row.role) && row.id !== userID ? (
                            <ActivateSwitch userId={row.id} isActive={row.status === 'active'} reload={reload} />
                        ) : null}
                    </div>
                ),
            },
            // {
            //     id: 'extra',
            //     label: '',
            //     disableSorter: true,
            //     style: { width: 50 },
            //     customize: (key, row) =>
            //         id !== row.id ? (
            //             <IconButton
            //                 onClick={() => {
            //                     // onRemove(row.id);
            //                 }}
            //             >
            //                 <PersonRemoveIcon />
            //             </IconButton>
            //         ) : null,
            // },
        ],
        [userID, t, reload, isUnderRole],
    );

    useEffect(() => {
        fetchMemberCount();
    }, [fetchMemberCount]);
    const fetchMembers = useMemo(
        () =>
            debounce((name) => {
                dispatch(
                    fetchMembersThunk({
                        limit: 10,
                        skip: 0,
                        search: name,
                        roles: getRolesParam(filterRole),
                        sort: sort.current,
                        status: filterStatus,
                    }),
                );
            }, 200),
        [dispatch, filterRole, filterStatus],
    );

    useEffect(() => {
        fetchMembers(searchbarInput);
    }, [fetchMembers, searchbarInput]);

    const handleChangePage = (event: ChangeEvent<HTMLInputElement>, page: number) => {
        if (limit * (page - 1) !== skip) {
            dispatch(
                fetchMembersThunk({
                    limit,
                    skip: limit * (page - 1),
                    search: searchbarInput,
                    roles: getRolesParam(filterRole),
                    sort: sort.current,
                    status: filterStatus,
                }),
            );
        }
    };

    const handleFilterChange = (name: string, checked: string[]) => {
        if (name === 'status') {
            if (checked.length === 2) {
                setFilterStatus('');
            } else {
                setFilterStatus(checked[0]);
            }
        }
    };

    const handelSort = (property = 'created_at', direction = 'desc') => {
        sort.current = `${direction === 'desc' ? '-' : ''}${property}`;
        dispatch(
            fetchMembersThunk({
                limit,
                skip,
                search: searchbarInput,
                roles: getRolesParam(filterRole),
                sort: sort.current,
                status: filterStatus,
            }),
        );
    };

    const onFinish = (userData: ReduxUser | API.User | API.Contact) => {
        setUserDetailDrawer({
            ...userDetailDrawer,
            user: {
                ...userDetailDrawer.user,
                ...(userData as ReduxUser),
            },
        });
        dispatch(fetchMembersThunk({ limit, skip }));
    };

    const renderSideBar = () => {
        return (
            <SideBar title={t('member_header')}>
                <List dense={true} sx={{ padding: 0 }}>
                    <ListItemButton onClick={() => setIsRoleBarOpen((prevState) => !prevState)}>
                        <HeaderListItemText>{t('member_roles')}</HeaderListItemText>
                        {isRoleBarOpen ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
                    </ListItemButton>
                    <Collapse in={isRoleBarOpen} timeout="auto" unmountOnExit>
                        <List dense={true} sx={{ padding: 0 }} className="conversation-status-nav">
                            <ListItemButton
                                onClick={() => {
                                    setFilterRole('all');
                                }}
                                isActive={filterRole === 'all'}
                            >
                                <ChildListItemText>{t('all')}</ChildListItemText>
                                <CountText variant="body1" align="left">
                                    {Object.values(roleCounts).reduce((prev, currentCount) => prev + currentCount, 0)}
                                </CountText>
                            </ListItemButton>

                            <ListItemButton
                                onClick={() => {
                                    setFilterRole('owner');
                                }}
                                isActive={filterRole === 'owner'}
                            >
                                <ChildListItemText>{t('role_owner')}</ChildListItemText>
                                <CountText variant="body1">{roleCounts.owner}</CountText>
                            </ListItemButton>

                            <ListItemButton
                                onClick={() => {
                                    setFilterRole('member');
                                }}
                                isActive={filterRole === 'member'}
                            >
                                <ChildListItemText>{t('role_member')}</ChildListItemText>
                                <CountText variant="body1">{memberCount}</CountText>
                            </ListItemButton>
                        </List>
                    </Collapse>
                </List>
            </SideBar>
        );
    };

    return (
        <>
            <PageLayout title={t('member_header')} sideBar={renderSideBar()}>
                <div className={styles.listContainer}>
                    <MemberList
                        data={memberList}
                        columns={columns}
                        onRowClick={(row: ReduxUser) => setUserDetailDrawer({ open: true, user: row })}
                        searchbarInput={searchbarInput}
                        setSearchbarInput={setSearchbarInput}
                        pagination={{
                            page: Math.ceil(skip / 10) + 1,
                            rowsPerPage: 10,
                            total,
                            count,
                        }}
                        handleFilterChange={handleFilterChange}
                        handleChangePage={handleChangePage}
                        handelSort={handelSort}
                        loading={loadingStatus === FETCH_IN_PROGRESS}
                        reload={reload}
                    />
                </div>
            </PageLayout>
            <MemberDetail
                title={t('member_profile')}
                open={userDetailDrawer.open}
                user={userDetailDrawer.user}
                onFinish={onFinish}
                resizable
                onClose={() => {
                    setUserDetailDrawer({ open: false });
                }}
                onBackdropClick={() => {
                    setUserDetailDrawer({ open: false });
                }}
            />
        </>
    );
};

export default Members;
