import { Button, EllipsisText, Icon, Space, Typography, useDialog } from '@imbrace/ui';
import { Badge } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { format, formatDistance } from 'date-fns';
import { enUS, zhCN, zhHK } from 'date-fns/locale';
import type { CSSProperties, FC } from 'react';
import { useCallback, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';

import { fetchAccountThunk } from '@/redux/slices/account';
import store, { history } from '@/redux/store';
import { dismissNotification, readNotification } from '@/services/api/notification';
import { acceptJoinInvitation, approveJoinRequest, leaveTeamV2 } from '@/services/api/team';
import { postJoinTeamConversation, postTeamConversationJoinRequest } from '@/services/api/teamConversation';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { getRoomReadableTime } from '@/utils/RoomHelper';

import styles from './index.module.scss';

interface NotificationProps {
    innerClassName?: string;
    style?: CSSProperties;
    item: API.NotificationItem;
    page: number;
    onClose: () => void;
    type?: 'all' | 'conversations' | 'assigns' | 'teams';
}

const readableTime = (date: string, locale: string) => {
    if (
        new Date(date).getDate() === new Date().getDate() &&
        new Date(date).getMonth() === new Date().getMonth() &&
        new Date(date).getFullYear() === new Date().getFullYear()
    ) {
        return `${formatDistance(new Date(date), new Date(), {
            addSuffix: true,
            locale: locale === 'en' ? enUS : locale === 'zh' ? zhHK : locale === 'cn' ? zhCN : enUS,
        })}`;
    }
    return format(new Date(date), 'MM/dd/yyyy');
};

const notificationPayloadFn = (msg: string) => {
    return {
        message: msg,
        messageType: 'noti_failed',
        variant: 'error',
    };
};

const Notification: FC<NotificationProps> = (props) => {
    const { t, i18n } = useTranslation();

    const { innerClassName, style, item, onClose, type: notificationType } = props;
    const { type, title, created_at, content, from, id, is_read, channel_type, action_disable, action_to, grab_at, grab_type } = item;
    const [isRead, setIsRead] = useState(is_read);
    const [dismissing, setDismissing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const queryClient = useQueryClient();
    const [{ dialog }, dialogHolder] = useDialog();

    const refetch = useCallback(() => {
        queryClient.refetchQueries({
            queryKey: ['notifications', { type: notificationType }],

            // refetchPage: (lastPage, index, allPages) => {
            //     return index === page;
            // },
        });
    }, [notificationType, queryClient]);

    const grab = async (teamOwnConvId: string) => {
        try {
            setActionLoading(true);
            const { data } = await apiFetch<API.TeamConversation>(
                postTeamConversationJoinRequest.api,
                postTeamConversationJoinRequest.method,
                {
                    id: teamOwnConvId,
                },
            );
            refetch();
            onClose();
            import('@/redux/slices/teamConversation').then(({ updateViewFilter }) => {
                const { TeamConversation } = store.getState();
                if (TeamConversation.viewFilter === 'team' && TeamConversation.viewFilterTeamId !== data.team_id) {
                    store.dispatch(updateViewFilter({ teamId: data.team_id, view: 'team' }));
                }
            });
            setActionLoading(false);
        } catch (err) {
            setActionLoading(false);
            const error = err as AxiosError;
            let message = 'Something went wrong.';
            if (error?.response?.status === 404 || error?.response?.status === 401) {
                message = 'Sorry, this conversation is no longer available`';
                if (error.response?.status === 404) {
                    message = 'Sorry, this conversation has been grabbed.';
                    dialog({
                        title: t('conversation_has_been_grabbed'),
                        content: t('conversation_has_been_grabbed_desc'),
                        confirmText: t('okay'),
                        onClose: () => {},
                        onConfirm: () => {
                            refetch();
                        },
                        hideCancelButton: true,
                    });
                    return;
                }
                if (error.response?.data?.message.indexOf('not allow for team admin') !== -1) {
                    message = 'Team admin is not be able to grab.';
                }

                const notificationPayload = {
                    message,
                    messageType: 'noti_failed',
                    variant: 'error',
                };
                import('@/redux/slices/notification').then(({ pushNotification }) => {
                    store.dispatch(pushNotification({ notification: notificationPayload }));
                });
            }
        }
    };
    const join = async (teamConvUserId: string) => {
        try {
            setActionLoading(true);
            const { data } = await apiFetch<API.TeamConversation>(postJoinTeamConversation.api, postJoinTeamConversation.method, {
                team_conversation_id: teamConvUserId,
            });
            refetch();
            onClose();
            history.push(`/chatroom?conv_id=${data.id}`);
            import('@/redux/slices/teamConversation').then(({ updateViewFilter }) => {
                const { TeamConversation } = store.getState();
                if (TeamConversation.viewFilter === 'team' && TeamConversation.viewFilterTeamId !== data.team_id) {
                    store.dispatch(updateViewFilter({ teamId: data.team_id, view: 'team' }));
                }
            });
            setActionLoading(false);
        } catch (error) {
            setActionLoading(false);
        }
    };
    const viewAssign = async ({ board_id, board_item_id }: API.ActionToCRM) => {
        onClose();
        history.push(`/databoards/${board_id}/${board_item_id}`);
    };
    const viewApprovedRequest = async ({ team_id }: API.ActionToTeamRequest) => {
        onClose();
        history.push(`/teams/${team_id}/members`);
    };

    const acceptInvitation = async ({ team_id, team_user_id }: API.ActionToTeamRequest) => {
        try {
            setActionLoading(true);
            await apiFetch(acceptJoinInvitation.api(team_id, team_user_id), acceptJoinInvitation.method);
            refetch();
            onClose();
            import('@/redux/slices/teamConversation').then(({ updateViewFilter }) => {
                const { TeamConversation } = store.getState();
                if (TeamConversation.viewFilter === 'team' && TeamConversation.viewFilterTeamId !== team_id) {
                    store.dispatch(updateViewFilter({ teamId: team_id, view: 'team' }));
                }
            });
            setActionLoading(false);
        } catch (error) {
            const err = error as AxiosError;
            console.log('err.response: ', err.response);

            if (err.response?.data.code === 10) {
                import('@/redux/slices/notification').then(({ pushNotification }) => {
                    store.dispatch(pushNotification({ notification: notificationPayloadFn(t('user_accepted')) }));
                });
            }
            if (err.response?.data.code === 40003) {
                import('@/redux/slices/notification').then(({ pushNotification }) => {
                    store.dispatch(pushNotification({ notification: notificationPayloadFn(t('insufficient_permission')) }));
                });
            }
            if (err.response?.data.code === 40004) {
                import('@/redux/slices/notification').then(({ pushNotification }) => {
                    store.dispatch(pushNotification({ notification: notificationPayloadFn(t('user_not_found')) }));
                });
            }
            setActionLoading(false);
        }
    };

    const approveRequest = async ({ team_id, team_user_id }: API.ActionToTeamRequest) => {
        try {
            setActionLoading(true);
            await apiFetch(approveJoinRequest.api(team_id, team_user_id), approveJoinRequest.method, {
                role: 'member',
            });
            refetch();
            onClose();
            import('@/redux/slices/teamConversation').then(({ updateViewFilter }) => {
                const { TeamConversation } = store.getState();
                if (TeamConversation.viewFilter === 'team' && TeamConversation.viewFilterTeamId !== team_id) {
                    store.dispatch(updateViewFilter({ teamId: team_id, view: 'team' }));
                }
            });
            setActionLoading(false);
        } catch (error) {
            const err = error as AxiosError;
            console.log('err.response: ', err.response);
            if (err.response?.data.code === 40003) {
                import('@/redux/slices/notification').then(({ pushNotification }) => {
                    store.dispatch(pushNotification({ notification: notificationPayloadFn(t('insufficient_permission')) }));
                });
            }
            if (err.response?.data.code === 40004) {
                import('@/redux/slices/notification').then(({ pushNotification }) => {
                    store.dispatch(pushNotification({ notification: notificationPayloadFn(t('user_not_found')) }));
                });
            }
            if (err.response?.data.code === 3) {
                import('@/redux/slices/notification').then(({ pushNotification }) => {
                    store.dispatch(pushNotification({ notification: notificationPayloadFn(t('role_format_error')) }));
                });
            }
            setActionLoading(false);
        }
    };

    const leaveTeam = async ({ team_id }: API.ActionToLeaveTeam) => {
        try {
            await apiFetch(leaveTeamV2.api, leaveTeamV2.method, {
                team_id: team_id,
            });
            setIsRead(true);
            refetch();
            store.dispatch(fetchAccountThunk({ silent: true }));
        } catch (error) {
            console.error('leave team error: ', error);
        }
    };

    const readNotifications = useCallback(async () => {
        try {
            await apiFetch(readNotification.api, readNotification.method, [id]);
            setIsRead(true);
            refetch();
        } catch (error) {
            console.log(error);
        }
    }, [id, refetch]);

    const { ref } = useInView({
        skip: isRead,
        triggerOnce: true,
        onChange: useCallback(
            (inView: boolean) => {
                if (inView && !isRead) {
                    readNotifications();
                }
            },
            [isRead, readNotifications],
        ),
    });

    const dismiss = async () => {
        try {
            setDismissing(true);
            await apiFetch(dismissNotification.api, dismissNotification.method, {}, ImbraceClient, { data: [id] });
            refetch();
            setDismissing(false);
        } catch (error) {
            setDismissing(false);
        }
    };

    const renderIcon = () => {
        if (type === 301 || type === 302 || type === 303 || type === 304 || type === 305) {
            return <Icon name="allTeams" fontSize={26} color={'var(--color-light-4)'} />;
        }
        if (type === 203) {
            return <Icon name="conversations" fontSize={26} color={'var(--color-light-4)'} />;
        }
        if (type === 101) {
            return <Icon name="assignee" fontSize={26} color={'var(--color-light-4)'} />;
        }
        if (channel_type) {
            return <Icon namespace="channel" name={channel_type} fontSize={26} />;
        }
        return null;
    };

    const getTitle = () => {
        if (type === 101) {
            return t('notification_assign', {
                name: title,
            });
        }
        if (type === 203) {
            return t('notification_invited', {
                conversation: title,
            });
        }
        if (type === 202 || type === 201 || type === 204) {
            return t('notification_grab', {
                conversation: title,
            });
        }
        if (type === 301) {
            return t('notification_invite_to_join', {
                team: title,
            });
        }
        if (type === 302) {
            return t('notification_join_request', {
                team: title,
            });
        }
        if (type === 305) {
            return t('notification_approved_to_leave', {
                team: title,
            });
        }
        return title;
    };
    const getContent = () => {
        if (type === 101) {
            return (
                <Trans
                    i18nKey="assigned_to"
                    values={{
                        who: from,
                        to: title,
                    }}
                >
                    <strong>{from}</strong> assigned you to <strong>{title}</strong>
                </Trans>
            );
        }
        if (type === 301) {
            return (
                <Trans i18nKey="invited_from" values={{ who: from, team: title }}>
                    <strong>{content}</strong> invited you to join team <strong>{title}</strong>. Accept to access team content
                </Trans>
            );
        }
        if (type === 302) {
            return (
                <Trans i18nKey="requested_from" values={{ who: from, team: title }}>
                    <strong>{content}</strong> request to join <strong>{title}</strong>. Approve their request and grant access
                </Trans>
            );
        }
        if (type === 304) {
            return (
                <Trans i18nKey="request_approved_from" values={{ who: from, team: title }}>
                    <strong>{content}</strong> has approved your request to join team <strong>{title}</strong>. You have access to all team
                    content
                </Trans>
            );
        }
        if (type === 305) {
            return (
                <Trans i18nKey="leave_team_accepted" values={{ who: content }}>
                    <strong>{content}</strong> has accepted your invitation as the new admin, you can eave the team now. content
                </Trans>
            );
        }
        return content || t('notification_no_incoming_message');
    };

    const getActionTitle = () => {
        if (type === 101 || type === 204) {
            return t('view');
        }
        if (type === 203 || type === 201) {
            return t('join');
        }
        if (type === 202) {
            return t('grab');
        }
        if (type === 301 && 'approver' in item) {
            return t('accepted');
        }
        if (type === 301) {
            return t('accept');
        }
        if (type === 302 && 'approver' in item) {
            return t('approved');
        }
        if (type === 302) {
            return t('approve');
        }
        if (type === 304) {
            return t('view');
        }
        if (type === 305) {
            return item.action_disable ? t('left') : t('leave');
        }

        return t('view');
    };

    const getCaption = () => {
        if (type !== 301 && type !== 302 && type !== 303 && type !== 304 && type !== 305) {
            return (
                <EllipsisText
                    element={
                        <Typography
                            variant="CaptionBold"
                            style={{
                                color: 'var(--color-light-4)',
                            }}
                        />
                    }
                    text={t('from', { from })}
                />
            );
        }
        if (type === 302 && 'approver' in item && 'approved_at' in item) {
            if (item.approved_at) {
                const timeString = formatDistance(new Date(item.approved_at), new Date(), {
                    addSuffix: true,
                });
                return (
                    <EllipsisText
                        element={
                            <Typography
                                variant="CaptionBold"
                                style={{
                                    color: 'var(--color-light-4)',
                                }}
                            />
                        }
                        text={t('approved_at', { at: timeString, who: item.approver })}
                    />
                );
            }
        }
    };

    return (
        <div className={styles.notification} ref={ref} style={style}>
            {dialogHolder}
            <div className={`${styles.inner} ${innerClassName}`}>
                <Badge
                    variant="dot"
                    color="error"
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    invisible={isRead}
                >
                    <div className={styles.container}>
                        <div style={{ paddingLeft: '4px' }}>{renderIcon()}</div>
                        <Space
                            direction="vertical"
                            size={8}
                            justify="between"
                            align="start"
                            style={{ height: '100%', width: '100%', overflow: 'hidden' }}
                        >
                            <Space justify="between" size={40} align="start" style={{ width: '100%' }}>
                                <Space direction="vertical" size={4} align="start" justify="start" style={{ width: '100%' }}>
                                    <div
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: '20px',
                                        }}
                                    >
                                        <EllipsisText
                                            element={
                                                <Typography
                                                    variant="SubHeading2"
                                                    style={{
                                                        color: 'var(--color-light-7)',
                                                        lineHeight: '23px',
                                                    }}
                                                />
                                            }
                                            text={getTitle()}
                                        />
                                        <Typography
                                            style={{
                                                color: 'var(--color-light-5)',
                                            }}
                                        >
                                            {created_at && getRoomReadableTime(created_at)}
                                        </Typography>
                                    </div>
                                    <div style={{ height: '40px' }}>
                                        <EllipsisText
                                            element={
                                                <Typography
                                                    style={{
                                                        color:
                                                            type === 101
                                                                ? 'var(--color-light-5)'
                                                                : content
                                                                ? 'var(--color-light-5)'
                                                                : 'var(--color-light-4)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        WebkitLineClamp: 2,
                                                        display: '-webkit-box',
                                                        WebkitBoxOrient: 'vertical',
                                                        lineHeight: '20px',
                                                    }}
                                                />
                                            }
                                            whiteSpace="pre-wrap"
                                            text={getContent()}
                                        />
                                    </div>
                                </Space>
                            </Space>
                            <div className={styles.extra}>
                                <Space
                                    size={8}
                                    style={{
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div style={{ overflow: 'hidden' }}>{getCaption()}</div>
                                    {grab_at && (
                                        <div style={{ whiteSpace: 'nowrap' }}>
                                            <Typography
                                                variant="Caption"
                                                style={{
                                                    color: 'var(--color-light-4)',
                                                }}
                                            >{`- ${t(grab_type === 1 ? 'invited_at' : 'grabbed_at', {
                                                at: readableTime(grab_at, i18n.language),
                                            })}`}</Typography>
                                        </div>
                                    )}
                                </Space>
                                <Space size={8}>
                                    <Button
                                        variant="text"
                                        type="secondary"
                                        size="xxs"
                                        text={t('dismiss')}
                                        sx={{
                                            fontWeight: 400,
                                            textTransform: 'capitalize',
                                        }}
                                        loading={dismissing}
                                        onClick={dismiss}
                                    />
                                    <Button
                                        disabled={action_disable}
                                        size="xxs"
                                        loading={actionLoading}
                                        onClick={() => {
                                            if (type === 202 && action_to && 'team_own_conversation_id' in action_to) {
                                                grab(action_to.team_own_conversation_id);
                                            }
                                            if (
                                                (type === 201 || type === 203 || type === 204) &&
                                                action_to &&
                                                'team_conversation_user_id' in action_to
                                            ) {
                                                join(action_to.team_conversation_user_id);
                                            }
                                            if (type === 101 && action_to && 'board_id' in action_to) {
                                                viewAssign(action_to);
                                            }
                                            if (type === 301 && action_to && 'team_id' in action_to && 'team_user_id' in action_to) {
                                                acceptInvitation(action_to);
                                            }
                                            if (type === 302 && action_to && 'team_id' in action_to && 'team_user_id' in action_to) {
                                                approveRequest(action_to);
                                            }
                                            if (type === 304 && action_to && 'team_id' in action_to) {
                                                viewApprovedRequest(action_to);
                                            }
                                            if (type === 305 && action_to && 'team_id' in action_to) {
                                                leaveTeam(action_to);
                                            }
                                        }}
                                        text={getActionTitle()}
                                    />
                                </Space>
                            </div>
                        </Space>
                    </div>
                </Badge>
            </div>
        </div>
    );
};

export default Notification;
