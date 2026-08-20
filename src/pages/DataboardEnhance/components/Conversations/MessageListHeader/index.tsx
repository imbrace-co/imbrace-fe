import { Button, EllipsisText, Icon, Space, Tooltip, Typography } from '@imbrace/ui';
import { List, Popover } from '@mui/material';
import isEmpty from 'lodash/isEmpty';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { push } from 'redux-first-history';

import Avatar from '@/components/Avatar';
import OnlineStatus from '@/components/OnlineStatus';
// import { openInviteUserModal } from '@/pages/Dashboard/components/InviteUserModal';
import UserItem from '@/pages/Conversations/components/MessageListHeader/userItem';
import store from '@/redux/store';

import styles from './index.module.scss';

interface MessageListHeaderProps {
    teamConversation?: API.TeamConversation;
    onClose?: () => void;
    teamConvId?: string;
}

const MessageListHeader: FC<MessageListHeaderProps> = (props) => {
    const { teamConversation, onClose } = props;
    const { t } = useTranslation();

    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>();
    const open = Boolean(anchorEl);

    const handleClose = () => {
        setAnchorEl(null);
    };

    // const openInviteDialog = (teamConversationId: string, conversationId: string, teamId: string) => {
    //     setAnchorEl(null);
    //     openInviteUserModal({
    //         teamConversationId,
    //         conversationId,
    //         teamId,
    //     });
    // };

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
                            {teamConversation.contact && (
                                <Avatar
                                    avatarUrl={teamConversation.contact.avatar_url}
                                    displayName={teamConversation.contact?.display_name}
                                    firstName={teamConversation.contact?.first_name}
                                    lastName={teamConversation.contact?.last_name}
                                    width={50}
                                    height={50}
                                    fontSize={20}
                                    isActive
                                />
                            )}
                        </div>
                        <div className={styles.titleContainer} style={{ maxWidth: '100%' }}>
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

                    <Space size={16}>
                        <Space size={8} align="center">
                            <div>
                                <Icon namespace="channel" name={teamConversation.channel_type} style={{ fontSize: '24px' }} />
                            </div>
                            <div>
                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                    {t(`channel_${teamConversation.channel_type}`)}
                                </Typography>
                            </div>
                        </Space>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{teamConversation?.contact?.time_zone}</Typography>

                        <Tooltip title={t('conversation_agent_count')} placement="bottom" arrow>
                            <Space
                                size={6}
                                onClick={(event) => {
                                    setAnchorEl(event.currentTarget);
                                }}
                            >
                                <div>
                                    <Icon name="groups" style={{ fontSize: '24px', color: 'var(--color-light-5)' }} />
                                </div>
                                <div>
                                    <Typography style={{ color: 'var(--color-light-5)' }}>{joinedUser.length | 0}</Typography>
                                </div>
                            </Space>
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
                                        width: 224,
                                        marginTop: '10px',
                                        padding: '6px 0',
                                        borderRadius: '4px',
                                        boxShadow:
                                            '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
                                    },
                                },
                            }}
                            className={styles.joinedUserPopup}
                            onClose={handleClose}
                        >
                            <List sx={{ padding: 0 }}>
                                {joinedUser.map((user) => (
                                    <UserItem
                                        key={user.id}
                                        user={user}
                                        conversationId={teamConversation.conversation_id}
                                        teamConvId={props.teamConvId}
                                    />
                                ))}

                                {/* <ListItemButton
                                    onClick={() => {
                                        openInviteDialog(teamConversation._id, teamConversation.conversation_id, teamConversation.team_id);
                                    }}
                                    sx={{
                                        color: 'var(--color-primary-1)',
                                    }}
                                >
                                    <Space>
                                        <Icon name="add" />
                                        <ListItemText primary={t('invite')} />
                                    </Space>
                                </ListItemButton> */}
                            </List>
                        </Popover>

                        <Button
                            text={t('go_to_chatroom')}
                            sx={{ gap: '8px', fontWeight: 400, textTransform: 'initial' }}
                            size={'xxs'}
                            variant="text"
                            endIcon={<Icon name="openNew" />}
                            onClick={() => {
                                store.dispatch(push(`/chatroom?conv_id=${teamConversation.id}`));
                                onClose?.();
                            }}
                        />
                    </Space>
                </>
            ) : null}
        </div>
    );
};

export default MessageListHeader;
