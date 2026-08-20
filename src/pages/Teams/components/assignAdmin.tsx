import { FieldSelect, Icon, Typography } from '@imbrace/ui';
import { Box } from '@mui/material';
import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import Avatar from '@/components/Avatar';
import { getAllTeamUsers } from '@/services/api/team';
import apiFetch from '@/services/axios/handler';

export interface AssignAdminForm extends FieldValues {
    selectedUser: TeamUser | undefined;
}

interface InviteMemberProps extends UseFormReturn<AssignAdminForm, any> {
    team: API.Team;
    userId: string;
}

export type AddMemberFormDataProps = API.User & {
    team_role: API.TeamRoleType;
    user_id?: string;
};

export interface TeamUser {
    role: API.TeamRoleType;
    _id: string;
    user: API.User;
}

const AssignAdmin: FC<InviteMemberProps> = (props) => {
    const { team, userId, setValue, control } = props;
    const { t } = useTranslation();
    const [users, setUsers] = useState<TeamUser[]>([]);

    const fetchUsers = useCallback(async () => {
        try {
            const { data } = await apiFetch<TeamUser[]>(getAllTeamUsers.api(team.id), getAllTeamUsers.method);
            setUsers(data);
        } catch (error) {}
    }, [team]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const userOptions = useMemo(() => {
        return users
            .filter((user) => user.user._id !== userId)
            .map((user) => ({
                value: user.user._id,
                text: user.user.display_name,
                description: user.user.email,
                icon: user.user.avatar_url ? (
                    <Avatar avatarUrl={user.user.avatar_url} isActive width={24} height={24} />
                ) : (
                    <Icon name="accountCircle" fontSize={24} style={{ color: 'var(--color-light-5)' }} />
                ),
            }));
    }, [users, userId]);

    return (
        <>
            {team && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <Typography variant="BodyBold">{t('teams_assign_admin_to')}</Typography>
                    <Controller
                        name="selectedUser"
                        control={control}
                        render={({ field }) => {
                            return (
                                <FieldSelect
                                    queryKey={['team_admin_assign', { userOptions }]}
                                    fullWidth
                                    // sx={{
                                    //     minWidth: 'auto',
                                    //     maxWidth: 'none',
                                    //     '& .MuiInputBase-input': { padding: '7px 11px' },
                                    //     height: '40px',
                                    //     maxHeight: 72,
                                    //     background: 'white',
                                    //     minHeight: '40px',
                                    //     overflow: 'hidden',
                                    //     flexWrap: 'wrap',
                                    // }}
                                    formControlSx={{ width: '100%', minWidth: 'auto' }}
                                    request={async () => {
                                        return userOptions;
                                    }}
                                    onChange={async (value) => {
                                        const selectedUser = users.find((user) => user.user._id === value);

                                        if (selectedUser) {
                                            setValue(
                                                'selectedUser',
                                                {
                                                    ...selectedUser,
                                                    role: 'admin',
                                                },
                                                { shouldDirty: true, shouldValidate: true },
                                            );
                                        }
                                    }}
                                    placeholder={t('click_to_select')}
                                />
                            );
                        }}
                    />
                </Box>
            )}
        </>
    );
};

export default AssignAdmin;
