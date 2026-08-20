import { Icon, IconButton, Switch, Tooltip } from '@imbrace/ui';
import Grid from '@mui/material/Grid';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import { env } from '@/env';
import FacebookReconnect from '@/pages/Channels/components/ChannelActions/FacebookReconnect';
import WhatsappReconnect from '@/pages/Channels/components/ChannelActions/WhatsappReconnect';
import FacebookDeleteDialog from '@/pages/Credentials/components/FacebookDeleteDialog';
import InstagramDeleteDialog from '@/pages/Credentials/components/InstagramDeleteDialog';
import { updateChannelById } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';
import clsx from '@/utils/clsx';
import { getIsAllowModify } from '@/utils/CookiesHelper';
import { useAppSelector } from '@/redux/store';

import styles from './index.module.scss';
import InstagramReconnect from './InstagramReconnect';

interface ChannelActionsPropsType {
    type: string;
    onEdit: () => void;
    onDelete: (channel: API.Channel) => void;
    onFinish?: () => void;
    channel: API.Channel;
}

const CopyFullPageUrl = ({ url, disabled }: { url: string; disabled?: boolean }) => {
    const [success, setSuccess] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { t } = useTranslation();

    useEffect(() => {
        if (success) {
            const timeout = setTimeout(() => {
                setSuccess(false);
            }, 3000);
            return () => {
                clearTimeout(timeout);
            };
        }
    }, [success]);

    const copy = useCallback(async () => {
        buttonRef.current?.blur();
        if (!success) {
            try {
                await navigator.clipboard.writeText(url);
                setSuccess(true);
            } catch (error) {
                console.error(error);
            }
        }
    }, [url, success]);

    return (
        <Tooltip disableHoverListener={!disabled} placement={'top'} arrow title={t('channel_setup_to_activate_url')}>
            <div>
                <IconButton
                    ref={buttonRef}
                    disabled={disabled}
                    className={styles.copyButton}
                    variant="text"
                    type="secondary"
                    size="s"
                    onClick={copy}
                >
                    {success ? (
                        <Icon name="codeCopied" />
                    ) : (
                        <>
                            <Icon name="linkSide" className={styles.linkIcon} />
                            <Icon name="copy" className={styles.copyIcon} />
                        </>
                    )}
                </IconButton>
            </div>
        </Tooltip>
    );
};

const ChannelActions: FC<ChannelActionsPropsType> = (props) => {
    const { type, onEdit, onDelete, onFinish, channel } = props;
    const { t } = useTranslation();
    const isAllowModifyChannel = getIsAllowModify();
    const organizationId = useAppSelector((state) => state.Account.organizationId);

    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const [toggleState, setToggleState] = useState<boolean>(channel.active);
    const [activeLoading, setActiveLoading] = useState<boolean>(false);
    const [openDialog, setOpenDialog] = useState<boolean>(false);

    useEffect(() => {
        if (channel.active !== toggleState) {
            setToggleState(channel.active);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channel]);

    const handelDelete = async () => {
        try {
            setLoading(true);
            await onDelete(channel);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const onToggleActiveState = useCallback(async () => {
        try {
            setActiveLoading(true);
            const { data } = await apiFetch<API.ChannelToggle>(updateChannelById.api(channel.id), updateChannelById.method, {
                active: !toggleState,
            });
            setToggleState(data.active);
            setActiveLoading(false);
        } catch (error) {
            console.error(error);
            setActiveLoading(false);
        }
    }, [channel.id, toggleState]);

    const renderActions = () => {
        switch (type) {
            case 'web':
                return (
                    <Grid container spacing={0} justifyContent="center" alignItems="center" gap="12px">
                        {isAllowModifyChannel && (
                            <Tooltip title={t('channels_active_tooltip')} placement="top" arrow disableHoverListener={!channel.is_init}>
                                <Grid item sx={{ width: '89px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span className={clsx(styles.activeText, channel.is_init || activeLoading ? styles.disabledText : '')}>
                                        {t('status_active')}
                                    </span>
                                    <Switch disabled={channel.is_init} type="xs" checked={toggleState} onChange={onToggleActiveState} />
                                </Grid>
                            </Tooltip>
                        )}
                        <Grid item>
                            <Tooltip title={t('settings')} placement="top" arrow>
                                <IconButton
                                    variant="text"
                                    type="secondary"
                                    size="s"
                                    onClick={() => {
                                        navigate(`/channels/${channel.id}/web_widget`);
                                    }}
                                >
                                    <Icon name="settings" fontSize={24} />
                                </IconButton>
                            </Tooltip>
                        </Grid>
                        <Grid item>
                            <Tooltip title={t('full_page_widget_link')} disableHoverListener={channel.is_init} placement="top" arrow>
                                <div>
                                    <CopyFullPageUrl
                                        url={`${env.VITE_APP_CHAT_HOST}/full_page.html?channel_id=${
                                            channel?.id || channel?._id
                                        }&org_id=${organizationId}&token=${window.localStorage.getItem(IMBRACE_ACCESS_TOKEN) || ''}`}
                                        disabled={channel.is_init}
                                    />
                                </div>
                            </Tooltip>
                        </Grid>
                        {channel.workflow_id && (
                            <Grid item>
                                <Tooltip title={t('workflow')} placement="top" arrow>
                                    <IconButton
                                        variant="text"
                                        type="secondary"
                                        size="s"
                                        sx={{ ...(!channel.workflow_id && { color: 'var(--color-light-4)' }) }}
                                        disabled={!channel.workflow_id}
                                        onClick={() => {
                                            // always link to ap-wf workflow (v2)
                                            return navigate(`/workflow-v2`, {
                                                state: {
                                                    flowId: channel.workflow_id,
                                                },
                                            });
                                        }}
                                    >
                                        <Icon name="deviceHub" />
                                    </IconButton>
                                </Tooltip>
                            </Grid>
                        )}

                        {isAllowModifyChannel && (
                            <Grid item>
                                <Tooltip title={t('delete')} placement="top" arrow>
                                    <IconButton variant="text" type="secondary" size="s" disabled={loading} onClick={() => handelDelete()}>
                                        <Icon name="delete" />
                                    </IconButton>
                                </Tooltip>
                            </Grid>
                        )}
                    </Grid>
                );
            case 'facebook':
                return (
                    <>
                        <FacebookDeleteDialog
                            open={openDialog}
                            title={t('credential_delete_facebook_title')}
                            content={<Trans i18nKey="credential_delete_facebook_body" t={t} />}
                            onClose={() => setOpenDialog(false)}
                            actionsAlign={'flex-end'}
                            onFinish={onFinish}
                        />

                        <Grid container spacing={0} justifyContent="center" alignItems="center" gap="12px">
                            {isAllowModifyChannel && (
                                <Grid item sx={{ width: '89px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span className={clsx(styles.activeText, channel.is_init || activeLoading ? styles.disabledText : '')}>
                                        {t('status_active')}
                                    </span>
                                    <Switch disabled={channel.is_init} type="xs" checked={toggleState} onChange={onToggleActiveState} />
                                </Grid>
                            )}
                            <Grid item>
                                <Tooltip title={t('reconnect')} placement="top" arrow>
                                    <div>
                                        <FacebookReconnect channel={channel} onFinish={onFinish} />
                                    </div>
                                </Tooltip>{' '}
                            </Grid>
                            {channel.workflow_id && (
                                <Grid item>
                                    <Tooltip title={t('workflow')} placement="top" arrow>
                                        <IconButton
                                            variant="text"
                                            type="secondary"
                                            size="s"
                                            sx={{ ...(!channel.workflow_id && { color: 'var(--color-light-4)' }) }}
                                            disabled={!channel.workflow_id}
                                            onClick={() => {
                                                // always link to ap-wf workflow (v2)
                                                return navigate(`/workflow-v2`, {
                                                    state: {
                                                        flowId: channel.workflow_id,
                                                    },
                                                });
                                            }}
                                        >
                                            <Icon name="deviceHub" />
                                        </IconButton>
                                    </Tooltip>
                                </Grid>
                            )}
                            {isAllowModifyChannel && (
                                <Grid item>
                                    <Tooltip title={t('delete')} placement="top" arrow>
                                        <IconButton
                                            variant="text"
                                            type="secondary"
                                            size="s"
                                            disabled={loading}
                                            onClick={() => {
                                                // setOpenDialog(true) // old fb channel delete flow
                                                handelDelete();
                                            }}
                                        >
                                            <Icon name="delete" />
                                        </IconButton>
                                    </Tooltip>
                                </Grid>
                            )}
                        </Grid>
                    </>
                );
            case 'instagram':
                return (
                    <>
                        <InstagramDeleteDialog
                            open={openDialog}
                            title={t('credential_delete_instagram_title')}
                            content={<Trans i18nKey="credential_delete_instagram_body" t={t} />}
                            onClose={() => setOpenDialog(false)}
                            actionsAlign={'flex-end'}
                            onFinish={onFinish}
                        />

                        <Grid container spacing={0} justifyContent="center" alignItems="center" gap="12px">
                            {isAllowModifyChannel && (
                                <Grid item sx={{ width: '89px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span className={clsx(styles.activeText, channel.is_init || activeLoading ? styles.disabledText : '')}>
                                        {t('status_active')}
                                    </span>
                                    <Switch disabled={channel.is_init} type="xs" checked={toggleState} onChange={onToggleActiveState} />
                                </Grid>
                            )}
                            <Grid item>
                                <Tooltip title={t('reconnect')} placement="top" arrow>
                                    <div>
                                        <InstagramReconnect channel={channel} onFinish={onFinish} />
                                    </div>
                                </Tooltip>{' '}
                            </Grid>
                            {channel.workflow_id && (
                                <Grid item>
                                    <Tooltip title={t('workflow')} placement="top" arrow>
                                        <IconButton
                                            variant="text"
                                            type="secondary"
                                            size="s"
                                            sx={{ ...(!channel.workflow_id && { color: 'var(--color-light-4)' }) }}
                                            disabled={!channel.workflow_id}
                                            onClick={() => {
                                                // always link to ap-wf workflow (v2)
                                                return navigate(`/workflow-v2`, {
                                                    state: {
                                                        flowId: channel.workflow_id,
                                                    },
                                                });
                                            }}
                                        >
                                            <Icon name="deviceHub" />
                                        </IconButton>
                                    </Tooltip>
                                </Grid>
                            )}
                            {isAllowModifyChannel && (
                                <Grid item>
                                    <Tooltip title={t('delete')} placement="top" arrow>
                                        <IconButton variant="text" type="secondary" size="s" onClick={() => handelDelete()}>
                                            <Icon name="delete" />
                                        </IconButton>
                                    </Tooltip>
                                </Grid>
                            )}
                        </Grid>
                    </>
                );
            case 'whatsapp':
                return (
                    <>
                        <Grid container spacing={0} justifyContent="center" alignItems="center" gap="12px">
                            {isAllowModifyChannel && (
                                <Grid item sx={{ width: '89px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span className={clsx(styles.activeText, channel.is_init || activeLoading ? styles.disabledText : '')}>
                                        {t('status_active')}
                                    </span>
                                    <Switch disabled={channel.is_init} type="xs" checked={toggleState} onChange={onToggleActiveState} />
                                </Grid>
                            )}
                            <Grid item>
                                <Tooltip title={t('reconnect')} placement="top" arrow>
                                    <div>
                                        <WhatsappReconnect channel={channel} onFinish={onFinish} />
                                    </div>
                                </Tooltip>
                            </Grid>
                            {channel.workflow_id && (
                                <Grid item>
                                    <Tooltip title={t('workflow')} placement="top" arrow>
                                        <IconButton
                                            variant="text"
                                            type="secondary"
                                            size="s"
                                            sx={{ ...(!channel.workflow_id && { color: 'var(--color-light-4)' }) }}
                                            disabled={!channel.workflow_id}
                                            onClick={() => {
                                                // always link to ap-wf workflow (v2)
                                                return navigate(`/workflow-v2`, {
                                                    state: {
                                                        flowId: channel.workflow_id,
                                                    },
                                                });
                                            }}
                                        >
                                            <Icon name="deviceHub" />
                                        </IconButton>
                                    </Tooltip>
                                </Grid>
                            )}
                            {isAllowModifyChannel && (
                                <Grid item>
                                    <Tooltip title={t('delete')} placement="top" arrow>
                                        <IconButton
                                            variant="text"
                                            type="secondary"
                                            size="s"
                                            disabled={loading}
                                            onClick={() => {
                                                handelDelete();
                                            }}
                                        >
                                            <Icon name="delete" />
                                        </IconButton>
                                    </Tooltip>
                                </Grid>
                            )}
                        </Grid>
                    </>
                );
            case 'line':
            case 'wechat':
                return (
                    <Grid container spacing={0} justifyContent="center" alignItems="center" gap="12px">
                        {isAllowModifyChannel && (
                            <Grid item sx={{ width: '89px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className={clsx(styles.activeText, channel.is_init || activeLoading ? styles.disabledText : '')}>
                                    {t('status_active')}
                                </span>
                                <Switch disabled={channel.is_init} type="xs" checked={toggleState} onChange={onToggleActiveState} />
                            </Grid>
                        )}
                        {channel.workflow_id && (
                            <Grid item>
                                <Tooltip title={t('workflow')} placement="top" arrow>
                                    <IconButton
                                        variant="text"
                                        type="secondary"
                                        size="s"
                                        sx={{ ...(!channel.workflow_id && { color: 'var(--color-light-4)' }) }}
                                        disabled={!channel.workflow_id}
                                        onClick={() => {
                                            // always link to ap-wf workflow (v2)
                                            return navigate(`/workflow-v2`, {
                                                state: {
                                                    flowId: channel.workflow_id,
                                                },
                                            });
                                        }}
                                    >
                                        <Icon name="deviceHub" />
                                    </IconButton>
                                </Tooltip>
                            </Grid>
                        )}
                        {isAllowModifyChannel && (
                            <Grid item>
                                <Tooltip title={t('delete')} placement="top" arrow>
                                    <IconButton
                                        variant="text"
                                        type="secondary"
                                        size="s"
                                        disabled={loading}
                                        onClick={() => {
                                            handelDelete();
                                        }}
                                    >
                                        <Icon name="delete" />
                                    </IconButton>
                                </Tooltip>
                            </Grid>
                        )}
                    </Grid>
                );
            case 'physicalstore':
                return (
                    <Grid container spacing={4} justifyContent="center" alignItems="center">
                        {/* <Grid item>
                            <Switch edge="end" />
                        </Grid> */}
                        <Grid item>
                            <Tooltip title={t('edit')} placement="top" arrow>
                                <IconButton variant="text" type="secondary" size="s" onClick={onEdit}>
                                    <Icon name="edit" />
                                </IconButton>
                            </Tooltip>
                        </Grid>
                        <Grid item>
                            <Tooltip title={t('delete')} placement="top" arrow>
                                <IconButton
                                    variant="text"
                                    type="secondary"
                                    size="s"
                                    disabled={loading}
                                    onClick={() => {
                                        handelDelete();
                                    }}
                                >
                                    <Icon name="delete" />
                                </IconButton>
                            </Tooltip>
                        </Grid>
                    </Grid>
                );
            case 'mail':
                return (
                    <Grid container spacing={4} justifyContent="center" alignItems="center">
                        <Grid item>
                            <Tooltip title={t('workflow')} placement="top" arrow>
                                <IconButton
                                    variant="text"
                                    type="secondary"
                                    size="s"
                                    onClick={() => {
                                        navigate(`/channels/${channel.id}/mail`);
                                    }}
                                >
                                    <Icon name="edit" />
                                </IconButton>
                            </Tooltip>
                        </Grid>
                    </Grid>
                );
            default:
                return null;
        }
    };
    return renderActions();
};

export default ChannelActions;
