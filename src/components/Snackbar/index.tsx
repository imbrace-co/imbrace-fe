import './snackbar.css';

import { Icon } from '@imbrace/ui';
import CloseIcon from '@mui/icons-material/Close';
import ForumIcon from '@mui/icons-material/Forum';
import LoadingButton from '@mui/lab/LoadingButton';
import { IconButton } from '@mui/material';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { CustomContentProps, SnackbarKey } from 'notistack';
import { SnackbarContent, useSnackbar } from 'notistack';
import { forwardRef, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { updateNotification } from '@/redux/slices/notification';
import type { FlashNotifications } from '@/redux/slices/notification.types';
import { conversationJoinRequestThunk } from '@/redux/slices/teamConversation';
import { useAppDispatch, useAppSelector } from '@/redux/store';

import useAccess from '../../hooks/useAccess';

export const getBorderColorByType = (type: string) => {
    switch (type) {
        case 'spam':
            return 'var(--color-danger-5)';
        case 'agent_needed':
            return 'var(--color-accent-yellow-2)';
        case 'active':
            return 'var(--color-primary-1)';
        case 'closed':
        default:
            return 'var(--color-light-5)';
    }
};

export interface SnackMessageProps extends CustomContentProps {
    messageData: FlashNotifications['message'];
    snackBarKey: SnackbarKey;
    showDismissIcon?: boolean;
}

const SnackMessage = forwardRef<HTMLDivElement, SnackMessageProps>((props, ref) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [joining, setJoining] = useState(false);
    const [joinable, setJoinable] = useState(true);
    const navigate = useNavigate();
    const { closeSnackbar } = useSnackbar();
    const notifications = useAppSelector((state) => state.Notification.flashNotifications);
    const { isTeamAdmin } = useAccess();
    const { snackBarKey, messageData, showDismissIcon = true, ...restProps } = props;

    const { roomId, roomChannelType, notice, roomName, type, teamId } = messageData;

    useEffect(() => {
        if (type === 'agent_needed') {
            const notification = notifications.filter((noti) => noti.key === snackBarKey);

            if (notification.length > 0 && notification[0].joinable !== joinable) {
                setJoinable(!!notification[0].joinable);
            }
        }
        // eslint-disable-next-line
    }, [type, snackBarKey, notifications]);

    // eslint-disable-next-line no-unused-vars
    const handleDismiss = useCallback(() => {
        closeSnackbar(snackBarKey);
    }, [snackBarKey, closeSnackbar]);

    const joinConvHandler = async () => {
        if (roomId) {
            try {
                setJoining(true);
                const { success, joinable: join } = await dispatch(conversationJoinRequestThunk(roomId)).unwrap();
                if (success) {
                    dispatch(
                        updateNotification({
                            key: snackBarKey as string,
                            joinable: false,
                            dismissed: true,
                        }),
                    );
                }
                setJoining(false);
                setJoinable(join);
            } catch (error) {
                console.log(error);
                setJoinable(false);
                setJoining(false);
                dispatch(
                    updateNotification({
                        key: snackBarKey as string,
                        joinable: false,
                        dismissed: true,
                    }),
                );
            }
        }
    };
    const renderRoomIcon = () => {
        switch (roomChannelType) {
            case 'web':
                return (
                    <Icon
                        namespace="channel"
                        name="web"
                        style={{
                            fontSize: '50px',
                        }}
                    />
                );

            case 'facebook':
                return (
                    <Icon
                        namespace="channel"
                        name="facebook"
                        style={{
                            fontSize: '50px',
                        }}
                    />
                );

            case 'whatsapp':
                return (
                    <Icon
                        namespace="channel"
                        name="whatsapp"
                        style={{
                            fontSize: '50px',
                        }}
                    />
                );

            case 'instagram':
                return (
                    <Icon
                        namespace="channel"
                        name="instagram"
                        style={{
                            fontSize: '50px',
                        }}
                    />
                );

            case 'wechat':
                return (
                    <Icon
                        namespace="channel"
                        name="wechat"
                        style={{
                            fontSize: '50px',
                        }}
                    />
                );

            case 'line':
                return (
                    <Icon
                        namespace="channel"
                        name="line"
                        style={{
                            fontSize: '50px',
                        }}
                    />
                );

            default:
                return (
                    <Icon
                        namespace="channel"
                        name="web"
                        style={{
                            fontSize: '50px',
                        }}
                    />
                );
        }
    };

    return (
        <SnackbarContent ref={ref} {...restProps} id={`${snackBarKey}`}>
            <Paper
                className="snackbar-root"
                elevation={3}
                sx={{ bgcolor: 'var(--color-light-2)', borderColor: getBorderColorByType(type), borderRadius: '5px' }}
            >
                {showDismissIcon && (
                    <div className="snackbar-close-container">
                        <IconButton aria-label="close notification" sx={{ padding: '3px', width: '100%' }} onClick={handleDismiss}>
                            <CloseIcon sx={{ width: 20 }} />
                        </IconButton>
                    </div>
                )}
                <Typography className="snackbar-header" variant="caption" sx={{ fontSize: '14px', fontWeight: 500 }}>
                    <ForumIcon sx={{ width: 16 }} />
                    {t(notice)}
                </Typography>
                <div className="snackbar-main">
                    <div className="snackbar-room-content">
                        <div className="snackbar-item-logo-container">{renderRoomIcon()}</div>
                        <div>
                            <Typography variant="subtitle1" className="snackbar-room-content-header">
                                {roomName}
                            </Typography>
                            <Typography variant="subtitle2" className="roomlist-item-info-subtitle">
                                {roomChannelType}
                            </Typography>
                        </div>
                    </div>
                    <div>
                        {/* TODO: there is currently no agent needed conversation show in chatroom */}
                        {type !== 'agent_needed' && (
                            <Button
                                size={'small'}
                                sx={{
                                    minWidth: 60,
                                    height: 30,
                                    color: '#828282',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    marginRight: type === 'agent_needed' ? '15px' : undefined,
                                }}
                                onClick={() => navigate(`/chatroom?conv_id=${roomId}`)}
                            >
                                {t('snack_message_view')}
                            </Button>
                        )}
                        {type === 'agent_needed' && (
                            <LoadingButton
                                size={'small'}
                                variant="contained"
                                disabled={!joinable || (!!teamId && isTeamAdmin(teamId))}
                                loading={joining}
                                sx={{ minWidth: 60, height: 30, fontSize: 14, fontWeight: 500, bgcolor: 'imbrace_blue.main' }}
                                onClick={() => {
                                    joinConvHandler();
                                }}
                            >
                                {t('snack_message_join')}
                            </LoadingButton>
                        )}
                    </div>
                </div>
            </Paper>
        </SnackbarContent>
    );
});

export default SnackMessage;
