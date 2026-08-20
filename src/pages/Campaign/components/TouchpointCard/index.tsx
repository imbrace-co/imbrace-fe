import type { DropdownProps } from '@imbrace/ui';
import { Button, Dropdown, EllipsisText, Icon, Space, Typography, useDialog } from '@imbrace/ui';
import { Divider, Tooltip as MuiTooltip } from '@mui/material';
import { format } from 'date-fns';
import type { FC, MouseEvent as ReactMouseEvent, ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { env } from '@/env';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import { getCookie } from 'typescript-cookie';
import { deleteTouchpointById, putTouchpointById } from '@/services/api/campaign';
import apiFetch from '@/services/axios/handler';

import { useMoveTouchPointDialog } from '../MoveTouchPointModal';
import QRCode from '../QRCode';
import type { Type } from '../Status';
import Status from '../Status';
import { openStepDialog } from '../StepDialog';
import { MediaTypes } from '../TouchpointForm/selectMedia';
import CopyUrl from './copyUrl';
import styles from './index.module.scss';
import { getIsAllowModify } from '@/utils/CookiesHelper';
import useNotification from '@/hooks/useNotification';

interface TouchpointCardProps {
    touchpoint: API.Touchpoint;
    refresh: () => void;
    type: 'grid' | 'list';
}

export const Tooltip = ({
    title,
    children,
    placement = 'top',
}: {
    title: string;
    children: ReactElement;
    placement?: 'top' | 'bottom';
}) => {
    return (
        <MuiTooltip
            placement={placement}
            arrow
            enterDelay={500}
            enterNextDelay={500}
            componentsProps={{
                tooltip: {
                    sx: {
                        bgcolor: '#D9D9D9',
                        color: 'var(--color-light-7)',
                        fontWeight: 400,
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        maxWidth: '432px',
                        '& .MuiTooltip-arrow': {
                            color: '#D9D9D9',
                        },
                    },
                },
            }}
            title={title}
        >
            {children}
        </MuiTooltip>
    );
};

const TouchpointCard: FC<TouchpointCardProps> = (props) => {
    const { t } = useTranslation();

    const { touchpoint, refresh, type } = props;
    const [expand, setExpand] = useState<boolean>(false);
    const navigate = useNavigate();
    const [setNodeRef, entry] = useIntersectionObserver({});
    const [{ dialog }, dialogHolder] = useDialog();
    const [{ openMoveDialog }, moveTouchPointDialogHolder] = useMoveTouchPointDialog();
    const isAllowModifyCampaign = getIsAllowModify();
    const { showViewOnlyToast } = useNotification();
    const viewOnlyColor = '#E0E0E0';

    const qrCodeUrl = useMemo(() => {
        const { organization_id, wechat_config, id, utm_tracking, source, media_name, name, description, paid_keywords, url } = touchpoint;
        if (utm_tracking) {
            const customEncode = (str: string) => {
                if (!str) return '';
                return str.replace(/ /g, '+').replace(/,/g, '%2C');
            };
            const utmParams = [
                `utm_source=${customEncode(source || '')}`,
                `utm_medium=${customEncode(media_name || '')}`,
                `utm_campaign=${customEncode(name || '')}`,
                `utm_id=${id || ''}`,
                `utm_content=${customEncode(description || '')}`,
            ];
            if (paid_keywords && paid_keywords.length > 0) {
                utmParams.push(`utm_term=${customEncode(paid_keywords.join(','))}`);
            }
            return `${url}?${utmParams.filter((param) => !param.endsWith('=')).join('&')}`;
        } else {
            if (wechat_config?.wechat_url_with_initiation_phase) {
                return wechat_config.wechat_url_with_initiation_phase;
            } else if (id) {
                return `${env.VITE_APP_CAMPAIGN_DOMAIN}?id=${id}&orgId=${organization_id || getCookie('org_id')}&env=${
                    env.VITE_APP_ENV
                }&isFromQRcode=true`;
            } else {
                return '';
            }
        }
    }, [touchpoint]);

    const accessToken = localStorage.getItem('imbrace-access-token') || '';
    const qrImageUrl = qrCodeUrl ? `${qrCodeUrl}&token=${accessToken}` : '';
    const qrCopyUrl = qrCodeUrl ? `${qrCodeUrl.replace('&isFromQRcode=true', '')}&token=${accessToken}` : '';

    const handleDelete = useCallback(async () => {
        try {
            await apiFetch(deleteTouchpointById.api(touchpoint.id), deleteTouchpointById.method);

            refresh();
        } catch (error) {
            console.log('handleDelete error: ', error);
        }
    }, [touchpoint.id, refresh]);

    const handleActivate = useCallback(async () => {
        try {
            const {
                _id,
                channel,
                id,
                doc_name,
                deleted_at,
                business_unit_id,
                created_at,
                campaign_name,
                public_id,
                organization_id,
                status,
                scan_qrcode_count,
                from_url_count,
                execute_workflow_name,
                default_channel_workflow_name,
                campaign,
                wechat_config,
                ...restData
            } = touchpoint;
            const data: API.TouchpointPostType = {
                ...restData,
                start_datetime: new Date(),
                is_paused: false,
                channel_id: touchpoint.channel?.id,
            };
            await apiFetch(putTouchpointById.api(id), putTouchpointById.method, data);

            refresh();
            return true;
        } catch (error) {
            console.log('handleActivate error: ', error);
            return true;
        }
    }, [touchpoint, refresh]);

    const togglePause = useCallback(
        async (paused: boolean) => {
            try {
                const {
                    _id,
                    channel,
                    id,
                    doc_name,
                    deleted_at,
                    business_unit_id,
                    created_at,
                    campaign_name,
                    public_id,
                    organization_id,
                    status,
                    scan_qrcode_count,
                    from_url_count,
                    execute_workflow_name,
                    default_channel_workflow_name,
                    campaign,
                    wechat_config,
                    ...restData
                } = touchpoint;
                const data: API.TouchpointPostType = {
                    ...restData,
                    is_paused: paused,
                    channel_id: touchpoint.channel?.id,
                };
                await apiFetch(putTouchpointById.api(id), putTouchpointById.method, data);

                refresh();
                return true;
            } catch (error) {
                console.log(error);
                return false;
            }
        },
        [touchpoint, refresh],
    );

    const toggleArchived = useCallback(
        async (is_archived: boolean) => {
            try {
                const {
                    _id,
                    channel,
                    id,
                    doc_name,
                    deleted_at,
                    business_unit_id,
                    created_at,
                    campaign_name,
                    public_id,
                    organization_id,
                    status,
                    scan_qrcode_count,
                    from_url_count,
                    execute_workflow_name,
                    default_channel_workflow_name,
                    campaign,
                    wechat_config,
                    ...restData
                } = touchpoint;
                const data: API.TouchpointPostType = {
                    ...restData,
                    is_archived,
                    channel_id: touchpoint.channel?.id,
                };
                await apiFetch(putTouchpointById.api(id), putTouchpointById.method, data);

                refresh();
                if (!is_archived) {
                    dialog({
                        title: t('campaign_unarchive_touchpoint'),
                        content: (
                            <div className={styles.campaignCard}>
                                <Space direction="vertical" size={12}>
                                    <span>{t('campaign_unarchive_touchpoint_description')}</span>
                                    <div className={styles.cardContainer}>
                                        <Space size={12} align="center">
                                            <Icon name="folderOutline" />
                                            <span>{campaign_name || t('all')}</span>
                                        </Space>
                                    </div>
                                </Space>
                            </div>
                        ),
                        cancelText: t('go_to_touchpoint'),
                        confirmText: t('done'),
                        actionsAlign: 'flex-end',
                        onConfirm: () => {},
                        onClose: () => {
                            navigate(`../${campaign?.id || 'all'}`);
                        },
                    });
                }
            } catch (error) {
                console.log(error);
            }
        },
        [touchpoint, refresh, t, navigate, dialog],
    );

    const onSelect = useCallback(
        (event: ReactMouseEvent<HTMLLIElement, MouseEvent>, selectedIndex: string) => {
            switch (selectedIndex) {
                case 'edit': {
                    navigate(`/touchpoint/${touchpoint.id}`);
                    break;
                }
                case 'delete': {
                    if (localStorage.getItem('dont_asked_delete_touchpoint_again') === 'true') {
                        handleDelete();
                        return;
                    }
                    dialog({
                        title: t('campaign_delete_touchpoint'),
                        content: t('campaign_delete_touchpoint_description'),
                        showDontAskedAgain: true,
                        confirmButtonProps: {
                            type: 'danger',
                        },
                        actionsAlign: 'flex-end',
                        onConfirm: async (dontAskedAgain) => {
                            if (dontAskedAgain) {
                                localStorage.setItem('dont_asked_delete_touchpoint_again', 'true');
                            }
                            await handleDelete();
                        },
                        onClose: (dontAskedAgain) => {},
                    });
                    break;
                }
                case 'reactivate': {
                    togglePause(false);
                    break;
                }
                case 'pause': {
                    if (localStorage.getItem('dont_asked_pause_touchpoint_again') === 'true') {
                        togglePause(true);
                        return;
                    }
                    dialog({
                        title: t('campaign_pause_touchpoint'),
                        content: t('campaign_pause_touchpoint_description'),
                        confirmText: t('pause'),
                        showDontAskedAgain: true,
                        actionsAlign: 'flex-end',
                        onConfirm: async (dontAskedAgain) => {
                            if (dontAskedAgain) {
                                localStorage.setItem('dont_asked_pause_touchpoint_again', 'true');
                            }
                            return togglePause(true);
                        },
                        onClose: () => {},
                    });
                    break;
                }
                case 'archive': {
                    if (localStorage.getItem('dont_asked_archive_touchpoint_again') === 'true') {
                        toggleArchived(true);
                        return;
                    }
                    openStepDialog({
                        title: [t('campaign_archive_touchpoint'), t('campaign_archive_touchpoint_done')],
                        content: [t('campaign_archive_touchpoint_description'), t('campaign_archive_touchpoint_done_description')],
                        confirmText: [t('archive'), t('done')],
                        showDontAskedAgain: true,
                        actionsAlign: 'flex-end',
                        onConfirm: async (dontAskedAgain) => {
                            if (dontAskedAgain) {
                                localStorage.setItem('dont_asked_archive_touchpoint_again', 'true');
                            }
                            await toggleArchived(true);
                            return true;
                        },
                        onClose: () => {},
                    });
                    break;
                }
                case 'unarchive': {
                    toggleArchived(false);
                    break;
                }
                case 'move': {
                    openMoveDialog({
                        touchpoint,
                        onClose: (campaign) => {
                            if (campaign) {
                                // navigate(`/campaignlist/${campaign.id}`);
                                refresh();
                            }
                        },
                    });
                    break;
                }
                case 'activate': {
                    if (localStorage.getItem('dont_asked_activate_touchpoint_again') === 'true') {
                        handleActivate();
                        return;
                    }
                    dialog({
                        title: t('campaign_activate_touchpoint'),
                        content: t('campaign_activate_touchpoint_description'),
                        showDontAskedAgain: true,
                        confirmText: t('activate_now'),
                        actionsAlign: 'flex-end',
                        onConfirm: async (dontAskedAgain) => {
                            if (dontAskedAgain) {
                                localStorage.setItem('dont_asked_activate_touchpoint_again', 'true');
                            }
                            const result = await handleActivate();
                            return result;
                        },
                        onClose: (dontAskedAgain) => {},
                    });
                    break;
                }
                default:
                    break;
            }
        },
        [touchpoint, navigate, refresh, t, handleDelete, togglePause, toggleArchived, handleActivate, dialog, openMoveDialog],
    );
    const getOptions = useCallback(() => {
        if (touchpoint.status === 'active') {
            return [
                {
                    index: 'edit',
                    text: t('edit'),
                    textColor: !isAllowModifyCampaign && viewOnlyColor,
                },
                {
                    index: 'move',
                    text: t('move_to'),
                    textColor: !isAllowModifyCampaign && viewOnlyColor,
                },
                {
                    index: 'delete',
                    text: t('delete'),
                    textColor: !isAllowModifyCampaign && viewOnlyColor,
                },
                { type: 'divider', textColor: !isAllowModifyCampaign && viewOnlyColor },
                { index: 'pause', text: t('pause'), textColor: !isAllowModifyCampaign && viewOnlyColor },
                { index: 'archive', text: t('archive'), textColor: !isAllowModifyCampaign && viewOnlyColor },
            ];
        }
        if (touchpoint.status === 'inactive' && !touchpoint.is_paused) {
            return [
                {
                    index: 'edit',
                    text: t('edit'),
                },
                {
                    index: 'move',
                    text: t('move_to'),
                },
                {
                    index: 'delete',
                    text: t('delete'),
                },
                { type: 'divider' },
                { index: 'activate', text: t('activate') },
                { index: 'archive', text: t('archive') },
            ];
        }
        if (touchpoint.status === 'inactive' && touchpoint.is_paused) {
            return [
                {
                    index: 'edit',
                    text: t('edit'),
                },
                {
                    index: 'move',
                    text: t('move_to'),
                },
                {
                    index: 'delete',
                    text: t('delete'),
                },
                { type: 'divider' },
                { index: 'reactivate', text: t('reactivate') },
                { index: 'archive', text: t('archive') },
            ];
        }
        if (touchpoint.status === 'archived') {
            return [
                {
                    index: 'edit',
                    text: t('edit'),
                },
                {
                    index: 'delete',
                    text: t('delete'),
                },
                { type: 'divider' },
                { index: 'unarchive', text: t('unarchive') },
            ];
        }
        return [
            {
                index: 'edit',
                text: t('edit'),
            },
            {
                index: 'move',
                text: t('move_to'),
            },
            {
                index: 'delete',
                text: t('delete'),
            },
            { type: 'divider' },
            { index: 'archive', text: t('archive') },
        ];
    }, [touchpoint.status, touchpoint.is_paused, t]);

    const renderCard = useCallback(() => {
        const {
            id,
            name,
            start_datetime,
            end_datetime,
            media_name,
            description,
            channel,
            url,
            initial_phrase,
            default_channel_workflow_id,
            default_channel_workflow_name,
            execute_workflow_id,
            execute_workflow_name,
            logo,
            campaign_name,
            status,
            is_paused,
            destination_url,
            wechat_config,
        } = touchpoint;

        const disabled = status !== 'active';

        const renderDestination = () => {
            if (channel) {
                return (
                    <div className={styles.destination}>
                        <div className={styles.content}>
                            <span>{t('destination')}</span>
                            <div>
                                <Icon namespace="channel" name={channel.config.type as API.ChannelType} />
                                <div>
                                    <span>{channel.name}</span>
                                    <div>
                                        <Icon name="subRight" />
                                        <span>{`${t('default')} ${default_channel_workflow_name || ''}`}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Icon name="rightWide" />
                        <div className={`${styles.workflowToExecute} ${styles.content}`}>
                            <span>{t('campaign_workflow')}</span>
                            <div>
                                <Icon
                                    name={default_channel_workflow_id === execute_workflow_id ? 'workflowTrigger' : 'subWorkflow'}
                                    namespace="workflow"
                                />
                                <span>{execute_workflow_name}</span>
                            </div>
                        </div>
                    </div>
                );
            }
            return (
                <div className={styles.destination}>
                    <div className={styles.content}>
                        <span>{t('destination')}</span>
                        <div>
                            {url && <Icon name="link" />}
                            <div>
                                <span className={url ? '' : styles.disabled}>{url || t('na')}</span>
                                {destination_url && url && (
                                    <div>
                                        <Icon name="subRight" />
                                        <span>{`${t('default')} ${destination_url || ''}`}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        if (type === 'grid') {
            return (
                <div ref={(ref) => ref && setNodeRef(ref)} className={`${styles.container} ${styles[type]}`}>
                    {dialogHolder}
                    {moveTouchPointDialogHolder}
                    {entry?.isIntersecting && (
                        <>
                            <div className={styles.header}>
                                <div>
                                    <div className={styles.name}>
                                        <EllipsisText
                                            text={name}
                                            element={
                                                <Typography
                                                    variant="Inherit"
                                                    style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        WebkitLineClamp: 2,
                                                        display: '-webkit-box',
                                                        WebkitBoxOrient: 'vertical',
                                                    }}
                                                />
                                            }
                                            whiteSpace="pre-wrap"
                                        />
                                    </div>
                                    <div className={styles.description}>
                                        <EllipsisText
                                            text={description}
                                            element={
                                                <Typography
                                                    variant="Inherit"
                                                    style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        WebkitLineClamp: 2,
                                                        display: '-webkit-box',
                                                        WebkitBoxOrient: 'vertical',
                                                    }}
                                                />
                                            }
                                            whiteSpace="pre-wrap"
                                        />
                                    </div>
                                </div>

                                <Dropdown
                                    icon={<Icon style={{ color: 'var(--color-light-5)' }} name="more" />}
                                    variant="text"
                                    hideArrow
                                    hideOnSelect
                                    buttonSx={{ padding: 0, height: 24, width: 24, color: 'var(--color-light-5)' }}
                                    options={getOptions() as DropdownProps<string>['options']}
                                    onSelect={onSelect}
                                />
                            </div>
                            <div className={styles.body}>
                                <Status type={status as Type} />
                            </div>
                            <div className={styles.footer}>
                                <div>
                                    {((is_paused && status === 'inactive') ||
                                        status === 'update_needed' ||
                                        status === 'archived' ||
                                        status === 'active') && (
                                        <div className={styles.tracking}>
                                            <div className={disabled ? styles.disabled : ''}>
                                                <Icon name={'linkSide'} />
                                                <span>
                                                    <Trans i18nKey="click" count={touchpoint.from_url_count}>
                                                        <span>{'{{ clicks }}'}</span> clicks
                                                    </Trans>
                                                </span>
                                            </div>
                                            <div className={disabled ? styles.disabled : ''}>
                                                <Icon name={'qrCode'} />
                                                <span>
                                                    <Trans i18nKey="scan" count={touchpoint.scan_qrcode_count}>
                                                        <span>{'{{ scans }}'}</span> scans
                                                    </Trans>
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {status === 'inactive' && (
                                        <div className={styles.status}>
                                            {is_paused && <Icon name={'pause'} />}
                                            {is_paused ? (
                                                <span>{t('campaign_tracking_paused')}</span>
                                            ) : status !== 'inactive' ? null : (
                                                <span>{t('campaign_touchpoint_not_start')}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.qrCodeContainer}>
                                    <QRCode url={qrImageUrl} logo={logo} fileName={`${name}`} />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            );
        }

        if (type === 'list') {
            return (
                <div ref={(ref) => ref && setNodeRef(ref)} className={`${styles.container} ${styles[type]}`}>
                    {dialogHolder}
                    {moveTouchPointDialogHolder}
                    {entry?.isIntersecting && (
                        <div className={styles.inner}>
                            <Icon name="insights" className={status === 'active' ? styles.active : ''} />
                            <div>
                                <div className={styles.info}>
                                    <div className={styles.header}>
                                        <Space direction="vertical" align="start">
                                            <div className={styles.name}>
                                                <EllipsisText
                                                    text={name}
                                                    element={
                                                        <Typography
                                                            variant="Inherit"
                                                            style={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                WebkitLineClamp: 2,
                                                                display: '-webkit-box',
                                                                WebkitBoxOrient: 'vertical',
                                                            }}
                                                        />
                                                    }
                                                    whiteSpace="pre-wrap"
                                                />
                                            </div>
                                            <div className={styles.description}>
                                                <EllipsisText
                                                    text={description}
                                                    element={
                                                        <Typography
                                                            variant="Inherit"
                                                            style={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                WebkitLineClamp: 2,
                                                                display: '-webkit-box',
                                                                WebkitBoxOrient: 'vertical',
                                                            }}
                                                        />
                                                    }
                                                    whiteSpace="pre-wrap"
                                                />
                                            </div>
                                        </Space>
                                        <Space size={24}>
                                            <Status type={status as Type} />
                                            <Dropdown
                                                variant="text"
                                                icon={<Icon name="more" />}
                                                buttonSx={{
                                                    padding: 0,
                                                    height: 24,
                                                    width: 24,
                                                    color: 'var(--color-light-5)',
                                                }}
                                                options={getOptions() as DropdownProps<string>['options']}
                                                hideArrow
                                                hideOnSelect
                                                onSelect={(e, selectedIndex) => {
                                                    if (!isAllowModifyCampaign) {
                                                        showViewOnlyToast();
                                                        return;
                                                    }
                                                    onSelect(e, selectedIndex);
                                                }}
                                            />
                                        </Space>
                                    </div>
                                    <div className={styles.body}>
                                        <div className={styles.detail}>
                                            <div>
                                                <div>
                                                    <Tooltip title={t('campaign_tooltip_touchpoint_type')}>
                                                        <span>
                                                            <Icon name="campaign" />
                                                        </span>
                                                    </Tooltip>

                                                    <span>Organic</span>
                                                </div>
                                                <div>
                                                    <Tooltip title={t('campaign_tooltip_campaign_folder')}>
                                                        <span>
                                                            <Icon name="folderOutline" />
                                                        </span>
                                                    </Tooltip>
                                                    <EllipsisText
                                                        className={!campaign_name ? styles.disabled : ''}
                                                        text={campaign_name || t('na')}
                                                    />
                                                </div>
                                                <div>
                                                    <Tooltip title={t('campaign_tooltip_touchpoint_duration')} placement="bottom">
                                                        <span>
                                                            <Icon name="calendar" />
                                                        </span>
                                                    </Tooltip>

                                                    <span>{`${
                                                        start_datetime ? `${format(new Date(start_datetime), 'dd/MM/yyyy')}` : ''
                                                    } - ${
                                                        end_datetime ? format(new Date(end_datetime), 'dd/MM/yyyy') : t('present')
                                                    }`}</span>
                                                </div>
                                                <div>
                                                    <Tooltip title={t('campaign_tooltip_touchpoint_media')} placement="bottom">
                                                        <span>
                                                            <Icon name="file" />
                                                        </span>
                                                    </Tooltip>
                                                    <EllipsisText
                                                        className={!media_name ? styles.disabled : ''}
                                                        text={
                                                            media_name && Object.keys(MediaTypes).includes(media_name)
                                                                ? t(MediaTypes[media_name])
                                                                : media_name || t('na')
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <Button
                                                text={expand ? t('less_details') : t('more_details')}
                                                endIcon={<Icon name={expand ? 'expandLess' : 'expandMore'} />}
                                                variant="link"
                                                size="xs"
                                                sx={{
                                                    fontWeight: 400,
                                                }}
                                                onClick={() => {
                                                    setExpand(!expand);
                                                }}
                                            />
                                        </div>
                                        <Divider orientation="vertical" flexItem sx={{ marginRight: '32px', height: '98px' }} />
                                        <div className={styles.extra}>
                                            <div className={`${styles.tracking} ${styles.content}`}>
                                                <span>{t('trackings')}</span>
                                                {!(!is_paused && status === 'inactive') && (
                                                    <>
                                                        <div className={disabled ? styles.disabled : ''}>
                                                            <Icon name={'linkSide'} />
                                                            <span>
                                                                <Trans i18nKey="click" count={touchpoint.from_url_count}>
                                                                    <span>{'{{ clicks }}'}</span> clicks
                                                                </Trans>
                                                            </span>
                                                        </div>
                                                        <div className={disabled ? styles.disabled : ''}>
                                                            <Icon name={'qrCode'} />
                                                            <span>
                                                                <Trans i18nKey="scan" count={touchpoint.scan_qrcode_count}>
                                                                    <span>{'{{ scans }}'}</span> scans
                                                                </Trans>
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {status === 'inactive' && (
                                                <div className={styles.status}>
                                                    {is_paused && <Icon name={'pause'} />}

                                                    <span>
                                                        {is_paused ? t('campaign_tracking_paused') : t('campaign_touchpoint_not_start')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {expand && (
                                    <>
                                        <Divider flexItem sx={{ margin: '24px 0', marginRight: '36px' }} />
                                        <div className={styles.detail}>
                                            <div className={styles.setup}>
                                                {renderDestination()}
                                                {channel && (
                                                    <div className={`${styles.initiationPhrase} ${styles.content}`}>
                                                        <span>{t('campaign_initiation_phrase')}</span>
                                                        <div>
                                                            <span className={!initial_phrase ? styles.disabled : ''}>
                                                                {initial_phrase || t('na')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`${styles.touchpoint} ${styles.content}`}>
                                                <span>{t('touchpoint')}</span>
                                                <div className={styles.qrCodeContainer}>
                                                    <QRCode url={qrImageUrl} logo={logo} fileName={`${name}`} />
                                                </div>
                                                <CopyUrl url={qrCopyUrl} />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    }, [touchpoint, expand, entry?.isIntersecting, getOptions, t, onSelect, type, setNodeRef, dialogHolder, moveTouchPointDialogHolder]);

    return <>{renderCard()}</>;
};

export default TouchpointCard;
