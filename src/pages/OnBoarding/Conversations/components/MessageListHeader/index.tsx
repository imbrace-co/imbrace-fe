import { EllipsisText, Icon, Space, Tooltip, Typography } from '@imbrace/ui';
import { Groups as GroupsIcon, MeetingRoom as MeetingRoomIcon } from '@mui/icons-material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { IconButton, List, ListItemButton, Popover } from '@mui/material';
import Divider from '@mui/material/Divider';
import isEmpty from 'lodash/isEmpty';
import type { FC } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Avatar from '@/components/Avatar';
import OnlineStatus from '@/components/OnlineStatus';
import { openInviteUserModal } from '@/pages/Conversations/components/InviteUserModal';
import styles from '@/pages/Conversations/components/MessageListHeader/index.module.scss';
import UserItem from '@/pages/Conversations/components/MessageListHeader/userItem';
import { leaveTeamConversationThunk, updateStatusThunk } from '@/redux/slices/teamConversation';
import { useAppDispatch, useAppSelector } from '@/redux/store';

import { dummyContact, dummyTeamConv } from '../../mock';

interface MessageListHeaderProps {
    setCurrentDrawer: (value: string) => void;
    viewMode?: boolean;
    teamConvId?: string;
}

const MessageListHeader: FC<MessageListHeaderProps> = (props) => {
    const { viewMode = false } = props;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const teamConversation = dummyTeamConv;
    const contact = dummyContact;
    const status = useAppSelector((state) => state.TeamConversation.teamConversation?.status);
    const id = useAppSelector((state) => state.TeamConversation.teamConversation?.id);

    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>();
    const open = Boolean(anchorEl);

    const handleUpdateStatus = useCallback(
        (convId: string | undefined, newStatus: 'active' | 'closed') => {
            if (status === newStatus) {
                return;
            }
            if (convId) {
                dispatch(updateStatusThunk({ id: convId, status: newStatus }));
            }
        },
        [dispatch, status],
    );

    const handleClose = () => {
        setAnchorEl(null);
    };

    const openInviteDialog = (teamConversationId: string, conversationId: string, teamId: string) => {
        setAnchorEl(null);
        openInviteUserModal({
            teamConversationId,
            conversationId,
            teamId,
        });
    };

    const joinedUser = useMemo(
        () =>
            teamConversation?.users?.filter((user) => {
                return !user?.is_bot;
            }) || [],
        [teamConversation?.users],
    );

    return (
        <div className={styles.messageListHeaderRoot}>
            {!isEmpty(teamConversation) ? (
                <>
                    <div className={styles.header}>
                        <div className={styles.channelIconContainer}>
                            {contact && (
                                <Avatar
                                    avatarUrl={contact.avatar_url}
                                    displayName={contact?.display_name}
                                    firstName={contact?.first_name}
                                    lastName={contact?.last_name}
                                    width={50}
                                    height={50}
                                    fontSize={20}
                                    isActive
                                />
                            )}
                        </div>
                        <div className={styles.titleContainer} style={{ maxWidth: viewMode ? '100%' : '' }}>
                            <div className={styles.titleForm}>
                                <EllipsisText
                                    text={teamConversation?.name || ''}
                                    style={{
                                        display: 'block',
                                        marginBottom:
                                            teamConversation?.channel_type === 'web' || teamConversation?.channel_type === 'email'
                                                ? '6px'
                                                : '0px',
                                    }}
                                />
                            </div>
                            {teamConversation?.channel_type === 'email' && (
                                <Typography variant="Caption">{`<${teamConversation?.contact?.email}>`}</Typography>
                            )}
                            {teamConversation?.channel_type === 'web' && (
                                <OnlineStatus
                                    isOnline={teamConversation?.is_presence}
                                    showTime={!teamConversation?.is_presence}
                                    time={teamConversation.contact.last_seen}
                                />
                            )}
                        </div>
                    </div>

                    <div className={styles.extra}>
                        <div>
                            <Typography variant="Caption" style={{ color: 'var(--color-light-5)' }}>
                                {teamConversation?.contact?.time_zone}
                            </Typography>
                        </div>
                        <Divider
                            sx={{ height: 24, borderColor: '#e0e0e0', alignSelf: 'center' }}
                            orientation="vertical"
                            variant="middle"
                            flexItem
                        />
                        <div style={{ position: 'relative' }}>
                            <Tooltip title={t('conversation_agent_count')} placement="bottom" arrow>
                                <div
                                    className={styles.groups}
                                    onClick={(event) => {
                                        setAnchorEl(event.currentTarget);
                                    }}
                                >
                                    <GroupsIcon sx={{ height: '24px', width: '24px', color: 'var(--color-light-5)' }} />
                                    <Typography style={{ color: 'var(--color-light-5)', margin: '3px 0px 0px 5px' }}>
                                        {joinedUser.length | 0}
                                    </Typography>
                                </div>
                            </Tooltip>

                            <Popover
                                open={open}
                                anchorEl={anchorEl}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'center',
                                }}
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'center',
                                }}
                                slotProps={{
                                    paper: {
                                        sx: {
                                            width: 264,
                                            marginTop: '10px',
                                            padding: '8px 0',
                                            borderRadius: '4px',
                                            boxShadow: '0px 2px 24px 0px #E0E0E033, 0px 4px 8px 0px #BDBDBD14',
                                        },
                                    },
                                }}
                                onClose={handleClose}
                            >
                                <List sx={{ padding: 0 }}>
                                    {joinedUser.length === 0 && (
                                        <div style={{ padding: '10px 12px' }}>
                                            <Typography style={{ color: 'var(--color-light-5)' }}>{t('no_member_in_chatroom')}</Typography>
                                        </div>
                                    )}
                                    {joinedUser.map((user) => (
                                        <UserItem
                                            key={user.id}
                                            user={user}
                                            conversationId={teamConversation.conversation_id}
                                            teamConvId={props.teamConvId}
                                        />
                                    ))}
                                    <Divider flexItem />

                                    <ListItemButton
                                        onClick={() => {
                                            openInviteDialog(
                                                teamConversation.id,
                                                teamConversation.conversation_id,
                                                teamConversation.team_id,
                                            );
                                        }}
                                        sx={{
                                            color: 'var(--color-primary-1)',
                                            padding: '8px 12px',
                                        }}
                                    >
                                        <Space size={12}>
                                            <Icon name="add" style={{ fontSize: 24 }} />
                                            <Typography>{t('invite')}</Typography>
                                        </Space>
                                    </ListItemButton>
                                </List>
                            </Popover>
                        </div>

                        {/* Agent leave ChatRoom */}
                        {teamConversation?.is_joined && !viewMode && (
                            <>
                                <Divider
                                    sx={{ height: 24, borderColor: '#e0e0e0', alignSelf: 'center' }}
                                    orientation="vertical"
                                    variant="middle"
                                    flexItem
                                />
                                {status !== 'closed' && (
                                    <IconButton sx={{ padding: 0 }} disableRipple onClick={() => handleUpdateStatus(id, 'closed')}>
                                        <CheckCircleRoundedIcon sx={{ height: '21px', width: '21px' }} />
                                        <Typography style={{ marginLeft: '6px' }}>{t('conversation_close')}</Typography>
                                    </IconButton>
                                )}

                                <div className={styles.contactDrawerTrigger}>
                                    <IconButton
                                        sx={{ padding: 0 }}
                                        disableRipple
                                        onClick={() =>
                                            dispatch(
                                                leaveTeamConversationThunk({
                                                    teamConvId: teamConversation?.id,
                                                }),
                                            )
                                        }
                                        disabled={viewMode}
                                    >
                                        <MeetingRoomIcon sx={{ height: '21px', width: '21px', color: '#3399fc' }} />
                                        <Typography style={{ color: '#3399fc', marginLeft: '6px' }}>
                                            {t('conversation_room_leave')}
                                        </Typography>
                                    </IconButton>
                                </div>
                            </>
                        )}
                    </div>
                </>
            ) : null}
        </div>
    );
};

export default MessageListHeader;
