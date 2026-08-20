import { Button, EllipsisText, Icon, IconButton, Space, Tooltip, Typography } from '@imbrace/ui';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import { Box, CircularProgress } from '@mui/material';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import MuiListItem from '@mui/material/ListItem';
import MuiListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import MuiListItemText from '@mui/material/ListItemText';
import styled from '@mui/material/styles/styled';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { FC, LegacyRef, ReactNode } from 'react';
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { dialog } from '@/components/Dialog';
import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import { env } from '@/env';
import useAccess from '@/hooks/useAccess';
import { editCredentialDialog } from '@/pages/Credentials/components/EditCredential';
import CreateNewCredential from '@/pages/Credentials/components/NewCredential/CreateNewCredential';
import { credentialChannelMap } from '@/pages/Credentials/helpers';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';
import { deleteChannelByIdV3 } from '@/services/api/channel';
import { type ChannelProvider } from '@/pages/Channels';
import { deleteStore } from '@/services/api/physicalStore';
import apiFetch from '@/services/axios/handler';
import ChannelActions from '../ChannelActions';
import FacebookReconnect from '../ChannelActions/FacebookReconnect';
import WhatsappReconnect from '../ChannelActions/WhatsappReconnect';
import styles from './index.module.scss';

import { getIsAllowModify } from '@/utils/CookiesHelper';
import useNotification from '@/hooks/useNotification';
import InstagramReconnect from '../ChannelActions/InstagramReconnect';

export const ListTitleButton = styled(MuiListItemButton)(() => ({
    padding: '16.5px 36px 16.5px 32px',
    cursor: 'initial',
    '&:hover': {
        backgroundColor: 'transparent',
    },
}));

export const ListItemTitle = styled(MuiListItemText, { shouldForwardProp: (props) => props !== 'isActive' && props !== 'isEmptyTab' })<{
    isActive: boolean;
    isEmptyTab?: boolean;
}>(({ isActive, isEmptyTab }) => ({
    margin: 0,
    '& .MuiTypography-root': {
        color: isEmptyTab ? 'var(--color-light-5)' : isActive ? 'var(--color-light-8)' : 'var(--color-light-7)',
        fontSize: 16,
        fontWeight: 600,
        lineHeight: '24px',
        fontStyle: 'normal',
        letterSpacing: '0.5px',
    },
}));

export const ItemDivider = styled(Divider)(() => ({
    margin: '0 36px 0 32px',
}));

export const SubListItem = styled(MuiListItem, { shouldForwardProp: (props) => props !== 'isSubTitle' })<{
    isSubTitle?: boolean;
}>(({ isSubTitle }) => ({
    padding: '0 31px 0 64px',
    justifyContent: 'space-between',
    ...(isSubTitle ? { height: 50 } : { height: 64 }),
    '& .MuiListItemSecondaryAction-root': {
        position: 'inherit',
        right: 0,
        top: 0,
        transform: 'none',
    },
}));

export const ChannelTitle = styled(MuiListItemText)(() => ({
    margin: 0,
    '& span.MuiTypography-root': {
        color: 'var(--color-light-7)',
        fontSize: 14,
        fontWeight: 400,
        lineHeight: '21px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
    },
    '& p.MuiTypography-root': {
        color: 'var(--color-light-5)',
        fontSize: 14,
        lineHeight: '16px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
    },
}));

export type ChannelCollapseType = {
    title: string;
    icon: ReactNode;
    inactiveIcon: ReactNode;
    type: string;
    channels?: API.Channel[];
    loading: boolean;
    onRefresh: () => void;
    onAdd?: () => void;
    onEdit?: (channel: API.Channel) => void;
    onDetail?: (channel: API.Channel) => void;
    hasPagination?: boolean;
    containerRef?: LegacyRef<HTMLDivElement>;
    hasMore?: boolean;
    searchInput?: string;
    channelProviders?: ChannelProvider[];
};

// const whatsappErrorMapping = {
//     NOT_APPLICABLE: 'channel_whatsapp_error_not_applicable',
// };

const ChannelCollapse: FC<ChannelCollapseType> = (props) => {
    const { title, icon, inactiveIcon, type, channels, loading, onRefresh, onAdd, onEdit, onDetail, hasPagination, containerRef, hasMore, channelProviders } =
        props;
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { features } = useAccess();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const isAllowModifyChannel = getIsAllowModify();
    const { showViewOnlyToast } = useNotification();

    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const supportTouchpoint = useAppSelector((state) => state.Account.support?.customer?.touchpoint);
    const { openHelpCenter } = useNavbar();
    const [avoidOnBoarding, setAvoidOnBoarding] = useState(false);
    const [open, setOpen] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [credentialType, setCredentialType] = useState<string>();

    const providerConfig = channelProviders?.find((p) => p.provider === type);
    const isProviderEnabled = providerConfig?.configured;

    const needUpgrade = useMemo(() => {
        return features.channels({ eachChannelCount: channels ? channels.filter((channel) => channel.config.type === type).length : 0 });
    }, [channels, type, features]);
    const onPhysicalStoreDelete = async (storeId: string) => {
        try {
            await apiFetch(deleteStore.api(storeId), deleteStore.method);
            onRefresh();
        } catch (error) {
            console.error(error);
        }
    };

    const onChannelDelete = useCallback(
        async (channelId: string) => {
            try {
                await apiFetch(deleteChannelByIdV3.api(channelId), deleteChannelByIdV3.method);
            } catch (err) {
                console.error('error deleting channel', err);
                const error = err as AxiosError;
                let errorMessage;
                if ('error' in error?.response?.data && 'code' in error?.response?.data.error) {
                    errorMessage = `${error?.response?.data?.message} - Workflow disconnected`;
                }

                const message = error?.response?.data?.message;
                const notificationPayload = {
                    message: errorMessage ?? message,
                    messageType: 'noti_failed',
                };

                dispatch(pushNotification({ notification: notificationPayload }));
            }
        },
        [dispatch],
    );

    const handleDeleteNotify = useCallback(
        (channelId: string) => {
            dialog({
                title: t('channel_delete_credential_workflows_title'),
                content: <Trans i18nKey="channel_delete_credential_workflows_body" t={t} />,
                confirmText: t('dialog_delete'),
                confirmButtonProps: {
                    type: 'danger',
                },
                actionsAlign: 'flex-end',
                onConfirm: async () => {
                    try {
                        await onChannelDelete(channelId);
                        onRefresh();
                    } catch (error) {
                        console.error('error deleting web widget channel', error);
                    }
                },
                onClose: () => {},
            });
        },
        [t, onRefresh, onChannelDelete],
    );

    const handleInUseNotify = useCallback(
        (channel: API.Channel) => {
            const { touchpoints, id } = channel;
            dialog({
                title: t('channel_delete_in_use_title'),
                content: (
                    <Space direction="vertical" size={24}>
                        <span>
                            <Trans i18nKey="channel_delete_in_use_content">
                                If you delete this channel, the following <strong>touchpoint will be paused</strong>. Its analytics and
                                setup will be stopped immediately.
                            </Trans>
                        </span>
                        <div className={styles.campaigns}>
                            <div>
                                {touchpoints.map((touchpoint) => (
                                    <div key={touchpoint.id} className={styles.campaign}>
                                        <Icon name="campaign" style={{ fontSize: 24 }} />
                                        <EllipsisText text={touchpoint.name} style={{ fontSize: 14, color: 'var(--color-light-7)' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Space>
                ),
                onConfirm: async () => {
                    handleDeleteNotify(id);
                },
                onClose: () => {},
                actionsAlign: 'flex-end',
                confirmButtonProps: {
                    type: 'danger',
                },
            });
        },
        [t, handleDeleteNotify],
    );

    const onDelete = async (channel: API.Channel) => {
        const { touchpoints, id } = channel;

        switch (type) {
            case 'web':
            case 'line':
            case 'facebook':
            case 'instagram':
            case 'wechat':
            case 'whatsapp':
                if (touchpoints?.length > 0) {
                    handleInUseNotify(channel);
                } else {
                    handleDeleteNotify(id);
                }
                break;
            case 'physicalstore':
                dialog({
                    title: t('channel_delete_store'),
                    content: '',
                    confirmText: t('dialog_confirm'),
                    onConfirm: async () => {
                        try {
                            await onPhysicalStoreDelete(channel.id);
                        } catch (error) {
                            console.error(error);
                        }
                    },
                    onClose: () => {},
                });
                break;
            default:
                break;
        }
    };

    const emptyChannelAddBtn = () => (
        <Button
            variant="link"
            size="xs"
            startIcon={<AddIcon />}
            onClick={() => {
                switch (type) {
                    case 'whatsapp':
                    case 'web':
                    case 'facebook':
                    case 'instagram':
                    case 'wechat':
                    case 'line':
                        setCredentialType(type);
                        setOpenModal(true);
                        break;
                    case 'physicalstore':
                        if (onAdd) {
                            onAdd();
                        }
                        break;
                    default:
                        break;
                }
            }}
            text={t('channel_add_new')}
        />
    );

    const addBtn = () => {
        return (
            <>
                {!loading && (
                    <>
                        <ItemDivider sx={{ margin: '0 36px 0 32px' }} />
                        <SubListItem>
                            <Button
                                variant="link"
                                size="xs"
                                startIcon={<AddIcon />}
                                endIcon={needUpgrade ? <Icon name="premium" /> : null}
                                onClick={() => {
                                    if (needUpgrade) {
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
                                        return;
                                    }
                                    switch (type) {
                                        case 'whatsapp':
                                        case 'web':
                                        case 'facebook':
                                        case 'instagram':
                                        case 'wechat':
                                        case 'line':
                                            setCredentialType(type);
                                            setOpenModal(true);
                                            break;
                                        case 'physicalstore':
                                            if (onAdd) {
                                                onAdd();
                                            }
                                            break;
                                        default:
                                            break;
                                    }
                                }}
                                text={t('channel_add_new')}
                            />
                            <div>
                                {type === 'whatsapp' &&
                                    (env.VITE_APP_ENV === 'dev' ||
                                        env.VITE_APP_ENV === 'local' ||
                                        (env.VITE_APP_ENV === 'prod' && organizationId === 'org_imbrace')) && (
                                        <Button
                                            size="s"
                                            variant="outlined"
                                            text={'For Development Use'}
                                            onClick={() => {
                                                setAvoidOnBoarding(true);
                                                setCredentialType(type);
                                                setOpenModal(true);
                                            }}
                                        />
                                    )}
                            </div>
                        </SubListItem>
                    </>
                )}
            </>
        );
    };

    const renderLoadingContainer = () => {
        if (hasPagination && hasMore) {
            return (
                <div className={styles.loadingContainer} ref={containerRef}>
                    <CircularProgress color="imbrace_blue" size={20} />
                </div>
            );
        } else if (loading) {
            return (
                <div className={styles.loadingContainer}>
                    <CircularProgress color="imbrace_blue" size={20} />
                </div>
            );
        }
        return null;
    };

    const renderEmptyChannelTab = (enabled: boolean) => {
        const tabIcon = enabled ? icon : inactiveIcon;
        return (
            <div
                className={styles.channelTypeContainer}
                style={{
                    backgroundColor: loading || enabled ? 'transparent' : 'var(--color-light-2)',
                }}
            >
                {loading ? (
                    <>{renderLoadingContainer()}</>
                ) : (
                    <Box sx={{ display: 'flex' }}>
                        <ListTitleButton disableRipple>
                            {tabIcon && (
                                <ListItemIcon
                                    sx={{
                                        width: '25px',
                                        height: '25px',
                                        minWidth: '25px',
                                        marginRight: '12px',
                                    }}
                                >
                                    {tabIcon}
                                </ListItemIcon>
                            )}
                            <ListItemTitle primary={title} isActive={open} isEmptyTab={!enabled} />
                        </ListTitleButton>
                        {enabled && (
                            <Box sx={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', marginRight: '22px' }}>
                                {emptyChannelAddBtn()}
                            </Box>
                        )}
                    </Box>
                )}
            </div>
        );
    };

    const renderModalContent = () => {
        switch (credentialType) {
            case 'web':
                return (
                    <CreateNewCredential
                        modalState="createNew"
                        open={openModal}
                        onClose={() => setOpenModal(false)}
                        searchParam={'web'}
                        onReload={onRefresh}
                        onResponseAfterCreate={(responseData: API.Channel | API.CredentialData, onClose) => {
                            if ('id' in responseData) {
                                dialog({
                                    title: t('channels_setup_dialog_title'),
                                    content: t('channels_setup_dialog_desc'),
                                    cancelText: t('do_it_later'),
                                    confirmText: t('setup_now'),
                                    onConfirm: () => {
                                        navigate(`/channels/${responseData?.id}/web_widget`);
                                    },
                                    onClose: () => {},
                                });
                            }
                        }}
                    />
                );
            case 'facebook':
                return (
                    <CreateNewCredential
                        modalState="createNew"
                        open={openModal}
                        onClose={() => {
                            setOpenModal(false);
                            queryClient.removeQueries({ queryKey: ['fb-channels'], exact: true });
                        }}
                        searchParam={'facebook'}
                        onReload={onRefresh}
                    />
                );
            case 'instagram':
                return (
                    <CreateNewCredential
                        modalState="createNew"
                        open={openModal}
                        onClose={() => setOpenModal(false)}
                        searchParam={'instagram'}
                        onReload={onRefresh}
                    />
                );
            case 'whatsapp':
                return (
                    <CreateNewCredential
                        modalState="createNew"
                        open={openModal}
                        onClose={() => {
                            setOpenModal(false);
                            setAvoidOnBoarding(false);
                        }}
                        searchParam={'whatsapp'}
                        onReload={onRefresh}
                        avoidOnBoarding={avoidOnBoarding}
                    />
                );
            case 'line':
                return (
                    <CreateNewCredential
                        modalState="createNew"
                        open={openModal}
                        onClose={() => setOpenModal(false)}
                        searchParam={'line'}
                        onReload={onRefresh}
                    />
                );
            case 'wechat':
                return (
                    <CreateNewCredential
                        modalState="createNew"
                        open={openModal}
                        onClose={() => setOpenModal(false)}
                        searchParam={'wechat'}
                        onReload={onRefresh}
                    />
                );
            case 'email':
                return (
                    <CreateNewCredential
                        modalState="createNew"
                        open={openModal}
                        onClose={() => setOpenModal(false)}
                        searchParam={'email'}
                        onReload={onRefresh}
                    />
                );
            default:
                return undefined;
        }
    };

    const handleEditCredential = useCallback(
        (channel: API.Channel) => {
            editCredentialDialog({
                credentialType: credentialChannelMap[channel.config.type],
                name: channel.name,
                // Legacy-Mongo envs (sandbox/prodv2) carry `credential_id`; new
                // PG channel-service doesn't, so fall back to channel.id which
                // the `/channels/credentials/:id` route now aliases against.
                credentialId: channel.credential_id ?? channel.id,
                channelId: channel.id,
                onFetchCredential: () => {
                    onRefresh();
                },
            });
        },
        [onRefresh],
    );

    const renderEditButton = useCallback(
        (channel: API.Channel) => {
            const { type: channelType, use_facebook_login } = channel.config;
            if (channelType === 'whatsapp' && use_facebook_login) return;

            return (
                <Tooltip title={t('channels_edit_tooltip')} placement="top" arrow PopperProps={{ disablePortal: true }}>
                    <IconButton
                        size="s"
                        variant="text"
                        type="secondary"
                        onClick={() => {
                            handleEditCredential(channel);
                        }}
                        sx={{
                            display: 'none',
                        }}
                    >
                        <Icon name="edit" fontSize={24} />
                    </IconButton>
                </Tooltip>
            );
        },
        [t, handleEditCredential],
    );

    return (
        <>
            {renderModalContent()}

            <Box sx={{ maxWidth: '1440px' }}>
                {!isProviderEnabled ? (
                    renderEmptyChannelTab(false)
                ) : channels?.length === 0 ? (
                    renderEmptyChannelTab(true)
                ) : (
                    <div className={styles.channelTypeContainer}>
                        <ListTitleButton onClick={() => setOpen((prevState) => !prevState)}>
                            {icon && (
                                <ListItemIcon
                                    sx={{
                                        width: '25px',
                                        height: '25px',
                                        minWidth: '25px',
                                        marginRight: '12px',
                                    }}
                                >
                                    {icon}
                                </ListItemIcon>
                            )}
                            <ListItemTitle primary={title} isActive={open} />
                            {open ? (
                                <ArrowDropUpIcon sx={{ color: 'var(--color-light-5)' }} />
                            ) : (
                                <ArrowDropDownIcon sx={{ color: 'var(--color-light-5)' }} />
                            )}
                        </ListTitleButton>
                        <Collapse in={open} timeout="auto">
                            <ItemDivider />
                            <List dense={true} sx={{ padding: 0 }}>
                                {channels &&
                                    channels.map((channel, index) => {
                                        return (
                                            <Fragment key={channel.id}>
                                                <SubListItem
                                                    secondaryAction={
                                                        <ChannelActions
                                                            type={type}
                                                            onEdit={() => {
                                                                if (onEdit) {
                                                                    onEdit(channel);
                                                                }
                                                            }}
                                                            channel={channel}
                                                            onDelete={onDelete}
                                                            onFinish={onRefresh}
                                                        />
                                                    }
                                                >
                                                    <ChannelTitle
                                                        primary={
                                                            <Box
                                                                sx={{
                                                                    paddingRight: '12px',
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '12px',
                                                                    '&:hover': {
                                                                        '& button': {
                                                                            display: 'inline-flex',
                                                                        },
                                                                    },
                                                                    transition: 'all 0.5s',
                                                                }}
                                                            >
                                                                <>
                                                                    {type === 'whatsapp' ? (
                                                                        <Box sx={{ height: '100%', display: 'flex', gap: '12px' }}>
                                                                            <Box
                                                                                component="span"
                                                                                sx={{
                                                                                    display: 'flex',
                                                                                    height: '100%',
                                                                                }}
                                                                            >
                                                                                <Box
                                                                                    component="span"
                                                                                    sx={{
                                                                                        padding: '4px 0',
                                                                                        display: 'flex',
                                                                                        flexDirection: 'column',
                                                                                        height: '64px',
                                                                                        justifyContent: 'center',
                                                                                    }}
                                                                                >
                                                                                    <Typography color={'var(--color-light-7)'}>
                                                                                        {channel.name}
                                                                                    </Typography>
                                                                                    <Typography
                                                                                        variant="Caption"
                                                                                        color={'var(--color-light-5)'}
                                                                                    >
                                                                                        {channel.config.phone_number}
                                                                                    </Typography>
                                                                                </Box>
                                                                            </Box>
                                                                            <Box sx={{ paddingTop: '8px', width: '32px', height: '32px' }}>
                                                                                {renderEditButton(channel)}
                                                                            </Box>
                                                                        </Box>
                                                                    ) : (
                                                                        <Box
                                                                            sx={{
                                                                                component: 'span',
                                                                                height: '32px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '12px',
                                                                            }}
                                                                        >
                                                                            <div>{channel.name}</div>
                                                                            {renderEditButton(channel)}
                                                                        </Box>
                                                                    )}
                                                                </>

                                                                {/* Web Widget Update Needed */}
                                                                {channel.is_init && (
                                                                    <Button
                                                                        className={!isAllowModifyChannel ? 'view-only' : ''}
                                                                        variant="outlined"
                                                                        size="xs"
                                                                        type="danger"
                                                                        onClick={() => {
                                                                            if (!isAllowModifyChannel) {
                                                                                showViewOnlyToast();
                                                                                return;
                                                                            }
                                                                            navigate(`/channels/${channel.id}/web_widget`);
                                                                        }}
                                                                        text={
                                                                            <Typography variant="Caption" style={{ textTransform: 'none' }}>
                                                                                {t('channel_setup_needed')}
                                                                            </Typography>
                                                                        }
                                                                        sx={{
                                                                            height: 22,
                                                                            color: 'var(--color-danger-5)',
                                                                            padding: '0 8px',
                                                                            borderRadius: '4px',
                                                                        }}
                                                                    />
                                                                )}
                                                                {/* Facebook & WhatsApp Update Needed */}
                                                                {(channel.config.type === 'facebook' ||
                                                                    channel.config.type === 'whatsapp' ||
                                                                    channel.config.type === 'instagram') &&
                                                                    'errorCode' in channel && (
                                                                        <Tooltip
                                                                            disableTouchListener
                                                                            disableFocusListener
                                                                            placement="top"
                                                                            title={isAllowModifyChannel ? t('channels_reconnect') : ''}
                                                                            arrow
                                                                            sx={{
                                                                                '.MuiTooltip-tooltip': {
                                                                                    maxWidth: 'none',
                                                                                },
                                                                            }}
                                                                        >
                                                                            <div>
                                                                                {channel.config.type === 'facebook' && (
                                                                                    <FacebookReconnect
                                                                                        channel={channel}
                                                                                        onFinish={onRefresh}
                                                                                        badge
                                                                                    />
                                                                                )}
                                                                                {channel.config.type === 'instagram' && (
                                                                                    <InstagramReconnect
                                                                                        channel={channel}
                                                                                        onFinish={onRefresh}
                                                                                        badge
                                                                                    />
                                                                                )}
                                                                                {channel.config.type === 'whatsapp' && (
                                                                                    <WhatsappReconnect
                                                                                        channel={channel}
                                                                                        onFinish={onRefresh}
                                                                                        badge
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                        </Tooltip>
                                                                    )}
                                                            </Box>
                                                        }
                                                        sx={{
                                                            position: 'relative',
                                                            cursor:
                                                                type !== 'web' && type !== 'whatsapp' && type !== 'facebook'
                                                                    ? 'pointer'
                                                                    : 'initial',
                                                        }}
                                                        onClick={() => onDetail && onDetail(channel)}
                                                    />
                                                </SubListItem>
                                                {index < channels.length - 1 && <ItemDivider sx={{ margin: '0 36px 0 32px' }} />}
                                            </Fragment>
                                        );
                                    })}
                                {isAllowModifyChannel && addBtn()}
                                {renderLoadingContainer()}
                            </List>
                        </Collapse>
                    </div>
                )}
            </Box>
        </>
    );
};
export default ChannelCollapse;
