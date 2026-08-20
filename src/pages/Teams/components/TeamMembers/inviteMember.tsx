import type { Option } from '@imbrace/ui';
import { Dropdown, DropdownMenuItem, FieldText, Icon, IconButton, Typography } from '@imbrace/ui';
import { Autocomplete, Box, Chip, Divider } from '@mui/material';
import type { FC } from 'react';
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Scrollbars from 'react-custom-scrollbars';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import Avatar from '@/components/Avatar';
import type { UserWithIndex } from '@/pages/Teams/components/TeamMembers/index';
import { getTeamInviteUserListV2 } from '@/services/api/team';
import apiFetch from '@/services/axios/handler';

interface CustomListboxComponentProps {
    children: React.ReactNode;
}

const CustomListboxComponent = React.forwardRef<HTMLUListElement, CustomListboxComponentProps>((props, ref) => {
    const { children, ...other } = props;
    return (
        <ul ref={ref} {...other}>
            <Scrollbars autoHeight autoHeightMax={50 * 6} autoHide>
                {children}
            </Scrollbars>
        </ul>
    );
});

export interface InviteMemberForm extends FieldValues {
    selectedUsers: UserWithIndex[];
}

interface InviteMemberProps extends UseFormReturn<InviteMemberForm, any> {
    team: API.Team;
    inviteAsAdmin?: boolean;
}

export type AddMemberFormDataProps = API.User & {
    team_role: API.TeamRoleType;
    user_id?: string;
};

const InviteMember: FC<InviteMemberProps> = (props) => {
    const { team, inviteAsAdmin, setValue, getValues, control, trigger } = props;
    const { t } = useTranslation();
    const autocompleteRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(true);
    const [users, setUsers] = useState<UserWithIndex[]>([]);
    const [selected, setSelected] = useState<Option[]>([]);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const api = getTeamInviteUserListV2.api.replace('{{teamId}}', team.id);
            const { data } = await apiFetch<{ data: AddMemberFormDataProps[] }>(api, getTeamInviteUserListV2.method);
            const usersWithIdx = data.data.map((user, index) => ({ ...user, index: index + 1 }));
            setUsers(usersWithIdx);
            setLoading(false);
        } catch (error) {
            setLoading(false);
        }
    }, [team]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const userOptions = useMemo(() => {
        return users.map((user) => ({
            value: user.id,
            text: user.display_name,
            description: user.email,
            icon: user.avatar_url ? (
                <Avatar avatarUrl={user.avatar_url} isActive width={24} height={24} />
            ) : (
                <Icon name="accountCircle" fontSize={24} style={{ color: 'var(--color-light-5)' }} />
            ),
        }));
    }, [users]);

    const roleProp = useMemo(
        () => (roleType: API.Role) => {
            switch (roleType) {
                case 'admin':
                    return {
                        name: t('team_role_admin'),
                        color: 'var(--color-primary-1)',
                        bgColor: 'var(--color-primary-3)',
                    };
                case 'member':
                    return {
                        name: t('team_role_member'),
                        color: 'var(--color-accent-yellow-2)',
                        bgColor: 'var(--color-accent-yellow-7)',
                    };
                default:
                    return {
                        name: 'Unknown',
                        color: '#333',
                        bgColor: '#fff',
                    };
            }
        },
        [t],
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <Typography variant="BodyBold">{t('teams_invite_new_member')}</Typography>
                <Autocomplete
                    multiple
                    filterSelectedOptions
                    disableClearable
                    loading={loading}
                    loadingText={t('loading')}
                    sx={{
                        width: '100%',
                        '& .MuiAutocomplete-popupIndicator': {
                            right: '9px',
                            '& :focus, :hover': {
                                background: 'transparent',
                            },
                        },
                    }}
                    slotProps={{
                        popupIndicator: {
                            disableRipple: true,
                        },
                        paper: {
                            sx: {
                                boxShadow: '0px 2px 24px 0px #E0E0E033, 0px 4px 8px 0px #BDBDBD14',
                                '.MuiAutocomplete-noOptions': {
                                    fontSize: '14px',
                                    fontWeight: 400,
                                    lineHeight: '20px',
                                    color: 'var(--color-light-5)',
                                },
                            },
                        },
                    }}
                    value={selected}
                    renderInput={(params) => {
                        return <FieldText placeholder={t('teams_invite_select_placeholder')} ref={autocompleteRef} {...params} />;
                    }}
                    options={userOptions}
                    renderOption={(optionProps, option) => {
                        return (
                            <DropdownMenuItem
                                sx={{
                                    padding: '8px 12px',
                                    display: 'flex',
                                    gap: '12px',
                                }}
                                {...optionProps}
                            >
                                <Box
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    {option.icon}
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ width: '100%', textAlign: 'left' }}>
                                        <Typography>{option.text}</Typography>
                                    </div>
                                    {option.description && (
                                        <div style={{ width: '100%', textAlign: 'left' }}>
                                            <Typography variant="Caption" style={{ whiteSpace: 'normal', color: 'var(--color-light-5)' }}>
                                                {option.description}
                                            </Typography>
                                        </div>
                                    )}
                                </Box>
                            </DropdownMenuItem>
                        );
                    }}
                    getOptionLabel={(option: Option) => {
                        return option.text as string;
                    }}
                    open={open}
                    onOpen={() => {
                        setOpen(true);
                    }}
                    onClose={(event, reason) => {
                        setOpen(false);
                    }}
                    onChange={(e, selectedOption, reason) => {
                        setSelected(selectedOption);

                        const usersToMove = selectedOption?.map((option) => {
                            const result = users.find((user) => user.id === option?.value);
                            return { ...result, role: inviteAsAdmin ? 'admin' : 'member' };
                        });
                        if (usersToMove) {
                            setValue('selectedUsers', usersToMove as UserWithIndex[], {
                                shouldValidate: true,
                                shouldDirty: true,
                            });
                        }

                        setOpen(false);
                    }}
                    renderTags={(value, getTagProps, ownerState) => {
                        return null;
                    }}
                    noOptionsText={t('teams_empty_invite_list')}
                    // ListboxComponent={({ children }) => (
                    //     <Scrollbars
                    //         autoHeight
                    //         autoHeightMax={56 * 6}
                    //         autoHide
                    //         style={{
                    //             background: 'white',
                    //         }}
                    //     >
                    //         {children}
                    //     </Scrollbars>
                    // )}
                    ListboxComponent={CustomListboxComponent as React.ComponentType<React.HTMLAttributes<HTMLElement>>}
                />
            </div>

            <Controller
                name="selectedUsers"
                control={control}
                rules={{
                    validate: (value) => {
                        return (Array.isArray(value) && value.length > 0) || 'Please select at least one user';
                    },
                }}
                render={() => (
                    <>
                        {getValues('selectedUsers').length > 0 && (
                            <Box>
                                <Typography variant="BodyBold">Team roles</Typography>
                                {getValues('selectedUsers').map((user: UserWithIndex, index: number) => {
                                    const selectedRole = user.role;
                                    return (
                                        <Fragment key={user.id}>
                                            <Box
                                                sx={{
                                                    padding: '12px 0',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        flex: 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        '&:hover': {
                                                            '& .MuiButtonBase-root': {
                                                                visibility: 'visible',
                                                            },
                                                        },
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            marginRight: '12px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        {user.avatar_url ? (
                                                            <Avatar avatarUrl={user.avatar_url} isActive width={24} height={24} />
                                                        ) : (
                                                            <Icon
                                                                name="accountCircle"
                                                                fontSize={24}
                                                                style={{ color: 'var(--color-light-5)' }}
                                                            />
                                                        )}
                                                    </Box>
                                                    <Typography variant="Body" style={{ marginRight: '4px' }}>
                                                        {' '}
                                                        {user.display_name}
                                                    </Typography>

                                                    <IconButton
                                                        type={'secondary'}
                                                        variant="text"
                                                        size="xs"
                                                        onClick={() => {
                                                            const filteredSelected = selected.filter(
                                                                (prevUser) => prevUser.value !== user.id,
                                                            );

                                                            setSelected(filteredSelected);

                                                            const filteredUsers = getValues('selectedUsers').filter(
                                                                (prevUser) => prevUser.id !== user.id,
                                                            );
                                                            setValue('selectedUsers', filteredUsers, {
                                                                shouldDirty: true,
                                                                shouldValidate: true,
                                                            });
                                                            trigger();
                                                        }}
                                                        sx={{ visibility: 'hidden' }}
                                                    >
                                                        <Icon name="delete" fontSize={24} style={{ color: 'var(--color-light-4)' }} />
                                                    </IconButton>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        width: '150px',
                                                        display: 'flex',
                                                        justifyContent: 'flex-end',
                                                    }}
                                                >
                                                    {inviteAsAdmin ? (
                                                        <Chip
                                                            label={t('team_role_admin')}
                                                            sx={{
                                                                backgroundColor: 'var(--color-primary-3)',
                                                                color: 'var(--color-primary-1)',
                                                                padding: '4px 0',
                                                                height: '24px',
                                                                borderRadius: '30px',
                                                            }}
                                                        />
                                                    ) : (
                                                        <Dropdown
                                                            variant="text"
                                                            text={roleProp(selectedRole).name}
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
                                                                    backgroundColor: roleProp(selectedRole).bgColor,
                                                                    color: roleProp(selectedRole).color,
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
                                                            selectedIndex={selectedRole}
                                                            onSelect={(event, selectedIndex) => {
                                                                event.stopPropagation();
                                                                const usersList = getValues('selectedUsers');
                                                                const targetIndex = usersList.findIndex((item) => item.id === user.id);
                                                                if (targetIndex !== -1) {
                                                                    usersList[targetIndex].role = selectedIndex;
                                                                }
                                                                setValue('selectedUsers', usersList, {
                                                                    shouldDirty: true,
                                                                    shouldValidate: true,
                                                                });
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Box>
                                            {index < getValues('selectedUsers').length - 1 && (
                                                <Divider sx={{ width: '100%', marginY: '4px' }} />
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </Box>
                        )}
                    </>
                )}
            />
        </Box>
    );
};

export default InviteMember;
