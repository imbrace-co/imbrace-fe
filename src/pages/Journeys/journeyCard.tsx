import type { DropdownProps, DropdownRef, generalIconMapping, IconProps } from '@imbrace/ui';
import { Button, Copy, Dropdown, EllipsisText, FieldSelect, Icon, Space, Typography, useDialog, useModal } from '@imbrace/ui';
import { Box } from '@mui/material';
import type { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import clsx from 'clsx';
import { MutableRefObject, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useOutletContext } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import { useNotify } from '@/contexts/SnackbarContext';
import useFacebook from '@/hooks/useFacebook';
import useWhatsAppEmbedded from '@/hooks/useWhatsAppEmbedded';
import { notificationPayload } from '@/utils/notificationPayload';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';
import { deleteApp, getEmailTemplates, patchActivateApp, patchDeactivateApp } from '@/services/api/app';
import { updateFacebook, updateWhatsApp } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';
import { type MarketPlaceMessageEvent, postMessage } from '@/utils/postMessage';
import { env } from '@/env';

import { eventType } from '../Events/utils';
import { CURRENT_DATA, NOT_ABLE_TO_SAVE, NOT_ABLE_TO_SAVE_BEFORE_CLOSE, ROUTE, SAVE_AND_EXIT_BEFORE_CLOSE } from './constants';
import { IframeContainer } from './iframeModal';
import styles from './journeys.module.scss';
import { getIsAllowModify } from '@/utils/CookiesHelper';
import useNotification from '@/hooks/useNotification';

const handleActivateApp = async (appId: string) => {
    const { data } = await apiFetch<{ message: string }>(patchActivateApp.api(appId), patchActivateApp.method);
    return data;
};

const handleDeactivateApp = async (appId: string) => {
    const { data } = await apiFetch<{ message: string }>(patchDeactivateApp.api(appId), patchDeactivateApp.method);
    return data;
};

export const removeOrgApp = async (appId: string) => {
    const { data } = await apiFetch<{ data: string }>(deleteApp.api(appId), deleteApp.method);
    return data.data;
};

interface JourneyCardProps {
    orgApp: API.Journey;
    refetch?: (options?: RefetchOptions | undefined) => Promise<QueryObserverResult<API.Journey[], Error>>;
    asButton?: boolean;
}
export const waitingForResponse = async (params: {
    target: HTMLIFrameElement | null;
    actionName: 'CURRENT_DATA' | 'SAVE_AND_EXIT_BEFORE_CLOSE';
}) => {
    const { target, actionName } = params;
    return new Promise<{ name?: string; is_create?: boolean } | boolean | undefined>((resolve) => {
        const iframeReducer = (event: MarketPlaceMessageEvent) => {
            const { action } = event.data;

            switch (action) {
                case CURRENT_DATA: {
                    const { data: appData } = event.data;
                    window.removeEventListener('message', iframeReducer);
                    resolve(appData.isDirty || undefined);
                    break;
                }
                case SAVE_AND_EXIT_BEFORE_CLOSE: {
                    const { data: appData } = event.data;
                    window.removeEventListener('message', iframeReducer);

                    resolve({ name: appData.name, is_create: appData.is_create });

                    break;
                }
                case NOT_ABLE_TO_SAVE_BEFORE_CLOSE: {
                    window.removeEventListener('message', iframeReducer);
                    resolve(false);
                    break;
                }
                default:
                    break;
            }
        };
        window.addEventListener('message', iframeReducer);
        if (actionName === CURRENT_DATA) {
            postMessage({
                action: CURRENT_DATA,
                target: target?.contentWindow,
                origin: env.VITE_APP_ENV === 'local' ? '*' : env.VITE_APP_WCS_HOST,
            });
        }
        if (actionName === SAVE_AND_EXIT_BEFORE_CLOSE) {
            postMessage({
                action: SAVE_AND_EXIT_BEFORE_CLOSE,
                target: target?.contentWindow,
                origin: env.VITE_APP_ENV === 'local' ? '*' : env.VITE_APP_WCS_HOST,
            });
        }
    });
};

const EMAIL_CAMPAIGN_TYPE = {
    INSTANCE: 'instance',
    SCHEDULE: 'schedule',
};

const JourneyCard = ({ orgApp, refetch, asButton }: JourneyCardProps) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const menuRef = useRef<DropdownRef>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null) as MutableRefObject<HTMLIFrameElement | null>;
    const [iframeElement, setIframeElement] = useState<HTMLIFrameElement | null>(null);
    const { openHelpCenter } = useNavbar();
    const { showViewOnlyToast } = useNotification();
    const { accessToken: facebookAccessToken, login: loginFacebook, clear: clearFacebook } = useFacebook();
    const viewOnlyColor = '#E0E0E0';
    const {
        accessToken: whatsappAccessToken,
        phoneNumberID,
        wabaID,
        login: whatsappOnBoarding,
        clear: clearWhatsapp,
    } = useWhatsAppEmbedded();
    const queryClient = useQueryClient();
    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const role = useAppSelector((state) => state.Account.role);
    const [{ dialog, dialogForm }, dialogHolder] = useDialog();
    const [{ modal }, modalHolder] = useModal();
    const [isOpenSendAnother, setIsOpenSendAnother] = useState(false);

    const isAllowModifyJourney = getIsAllowModify();
    const { notify } = useNotify();
    const { searchValue } = useOutletContext<{
        data?: API.JourneyLibrary[] | API.Journey[];
        searchValue?: string;
        refetch: (options?: RefetchOptions | undefined) => Promise<QueryObserverResult<API.Journey[], Error>>;
    }>();

    const handleIframeRef = useCallback((el: HTMLIFrameElement | null) => {
        iframeRef.current = el;
        setIframeElement(el);
    }, []);

    const serialize = useCallback(async () => {
        try {
            if (facebookAccessToken) {
                const res = await apiFetch<API.Channel[]>(updateFacebook.api(), updateFacebook.method, {
                    access_token: facebookAccessToken,
                });

                const filteredData = res?.data?.filter((page) => !('errorCode' in page));
                if (res && res.status === 200) {
                    dialog({
                        title:
                            filteredData.length >= 1 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <Typography variant="Heading2" style={{ color: 'var(--color-light-7)' }}>
                                        {t('channels_reconnect_dialog_title')}
                                    </Typography>
                                    <Typography style={{ color: 'var(--color-light-5)' }}>{t('channels_reconnect_dialog_desc')}</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <Typography variant="Heading2" style={{ color: 'var(--color-light-7)' }}>
                                        {t('channels_reconnect_dialog_title_not_found')}
                                    </Typography>
                                    <Typography style={{ color: 'var(--color-light-5)' }}>
                                        {t('channels_reconnect_dialog_desc_not_found')}
                                    </Typography>
                                </Box>
                            ),
                        content: () => (
                            <>
                                {filteredData.length >= 1 && (
                                    <Space
                                        direction="vertical"
                                        style={{
                                            padding: '4px 16px',
                                            width: '100%',
                                            border: '1px solid var(--color-light-3)',
                                            borderRadius: '4px',
                                            gap: 0,
                                        }}
                                    >
                                        {filteredData.map((page: any, index: number) => {
                                            return (
                                                <Space
                                                    key={page.id}
                                                    direction="horizontal"
                                                    style={{
                                                        padding: '12px 0',
                                                        width: '100%',
                                                        gap: '12px',
                                                        borderBottom:
                                                            filteredData.length - 1 === index ? '' : '1px solid var(--color-light-3)',
                                                    }}
                                                >
                                                    <Icon namespace="channel" name="facebook" fontSize={24} />
                                                    <Typography>{page.name}</Typography>
                                                </Space>
                                            );
                                        })}
                                    </Space>
                                )}
                            </>
                        ),
                        confirmText: t('done'),
                        onConfirm: () => {
                            clearFacebook();
                            refetch?.();
                        },
                        hideCancelButton: true,
                    });
                }
            }
            if (whatsappAccessToken && phoneNumberID && wabaID) {
                const res = await apiFetch<API.WhatsAppChannel[]>(updateWhatsApp.api(), updateWhatsApp.method, {
                    config: {
                        access_key: whatsappAccessToken,
                        phone_number_id: phoneNumberID,
                        business_account_id: wabaID,
                    },
                });

                if (res && res.status === 200) {
                    dispatch(
                        pushNotification({
                            notification: notificationPayload(t('channels_reconnect_dialog_title'), 'success'),
                        }),
                    );
                    clearWhatsapp();
                    refetch?.();
                }
            }
        } catch (err) {
            const error = err as AxiosError;
            console.error('Reconnect Channel error: ', error);
            dispatch(
                pushNotification({
                    notification: notificationPayload(error?.response?.data?.message),
                }),
            );
        }
    }, [t, dialog, facebookAccessToken, whatsappAccessToken, phoneNumberID, wabaID, dispatch, clearFacebook, clearWhatsapp, refetch]);

    useEffect(() => {
        serialize();
    }, [serialize]);

    const handleOpenHelpCenter = useCallback(
        (prefillMessage?: string) => {
            if (supportChannel) {
                openHelpCenter?.({
                    channelId: supportChannel._id,
                    prefillMessage,
                    defaultWebWidget: true,
                });
            }
        },
        [supportChannel, openHelpCenter],
    );

    const openIframeModal = useCallback(
        (props: {
            url: string;
            title: string | React.ReactNode;
            id: string;
            onAfterClose?: () => void;
            appType: 'marketplace' | 'customization';
            handleOpenHelpCenter?: (prefillMessage?: string) => void;
            paperSx?: React.CSSProperties;
        }) => {
            modal({
                title: props.title,
                onClose: async () => {
                    if (orgApp.product_code === 'form_management') {
                        const result = await waitingForResponse({
                            target: iframeRef.current,
                            actionName: CURRENT_DATA,
                        });
                        if (result) {
                            const secResult = new Promise<boolean | undefined>((resolve) =>
                                dialog({
                                    title: t('journey_save_and_exit_dialog_title'),
                                    content: t('journey_save_and_exit_dialog_desc'),
                                    confirmText: t('save_and_exit'),
                                    cancelText: t('discard'),
                                    backdropClosable: false,
                                    onConfirm: async () => {
                                        const isSaved = await waitingForResponse({
                                            target: iframeRef.current,
                                            actionName: SAVE_AND_EXIT_BEFORE_CLOSE,
                                        });
                                        if (!isSaved) {
                                            dialog({
                                                title: t('journey_not_able_to_save_dialog_title'),
                                                content: t('journey_not_able_to_save_dialog_desc'),
                                                confirmText: t('back_to_edit'),
                                                cancelText: t('discard'),
                                                backdropClosable: false,
                                                onConfirm: async () => {
                                                    resolve(false);
                                                    postMessage({
                                                        action: NOT_ABLE_TO_SAVE,
                                                        data: {
                                                            action: 'confirm',
                                                        },
                                                        target: iframeRef.current?.contentWindow,
                                                        origin:
                                                            env.VITE_APP_ENV === 'local'
                                                                ? '*'
                                                                : env.VITE_APP_WCS_HOST,
                                                    });
                                                },
                                                onClose: async () => {
                                                    resolve(true);
                                                },
                                            });
                                            return;
                                        }
                                        if (isSaved && typeof isSaved === 'object' && isSaved.name) {
                                            notify({
                                                type: 'success',
                                                message: t('journey_form_management_create_form_successfully', { name: isSaved.name }),
                                            });
                                        }
                                        resolve(true);
                                    },
                                    onClose: async () => {
                                        resolve(undefined);
                                    },
                                }),
                            );
                            return secResult;
                        }
                        return result as boolean;
                    }
                    if (orgApp.product_code === 'ai-assistant_management') {
                        const result = await waitingForResponse({
                            target: iframeRef.current || iframeElement,
                            actionName: CURRENT_DATA,
                        });
                        if (result) {
                            const secResult = await new Promise<boolean | undefined>((resolve) => {
                                waitingForResponse({
                                    target: iframeRef.current || iframeElement,
                                    actionName: SAVE_AND_EXIT_BEFORE_CLOSE,
                                });
                            });
                            return secResult;
                        }
                        return result as boolean;
                    }
                },
                content: ({ onClose: onModalClose, changeTitle }) => (
                    <IframeContainer
                        onClose={() => {
                            onModalClose();
                            if (props.onAfterClose) {
                                return props.onAfterClose;
                            }
                        }}
                        iframeRef={iframeRef}
                        onIframeRef={handleIframeRef}
                        journey={orgApp}
                        changeTitle={changeTitle}
                        {...props}
                    />
                ),
                paperSx: props.paperSx,
            });
        },
        [modal, orgApp, dialog, t, notify, iframeElement],
    );

    const activateApp = useMutation<{ message: string }, Error, string>({
        mutationFn: handleActivateApp,
        onSuccess: () => {
            refetch?.();
        },
    });

    const deactivateApp = useMutation<{ message: string }, Error, string>({
        mutationFn: handleDeactivateApp,
        onSuccess: () => {
            refetch?.();
        },
    });

    const removeApp = useMutation<string, Error, string>({
        mutationFn: removeOrgApp,
        onSuccess: () => {
            refetch?.();
            queryClient.refetchQueries({ queryKey: ['journeyLibraries', { search: searchValue ?? '' }] });
        },
    });

    const isAppActive = useMemo(
        () =>
            orgApp.app_type === 'customization' ? orgApp.is_active : orgApp.is_active && !orgApp.error && orgApp.user_progress?.finished,
        [orgApp],
    );

    const iconProps = {
        namespace: orgApp.icon?.namespace,
        name: orgApp.icon?.name,
        inactive: !isAppActive,
    } as IconProps;

    const openShareUrlsDialog = useCallback(() => {
        const findShareUrlMenu = orgApp.options.menu?.find((menu) => 'index' in menu && menu.index === 'share_urls') as
            | API.NormalAppMenuItem
            | undefined;
        if (findShareUrlMenu) {
            dialog({
                title: orgApp.title,
                content: () => (
                    <Space size={24} direction="vertical" align="start" style={{ width: '100%' }}>
                        <Typography
                            style={{
                                color: 'var(--color-light-5)',
                                maxWidth: '388px',
                            }}
                        >
                            {t('journey_share_urls_desc')}
                        </Typography>
                        <Space size={8} direction="vertical" align="start" style={{ width: '100%' }}>
                            {findShareUrlMenu.options?.subscribe && (
                                <>
                                    <Typography variant="BodyBold" style={{ color: 'var(--color-light-7)' }}>
                                        {t('journey_subscribe_page_url')}
                                    </Typography>
                                    <Copy
                                        displayText={`${findShareUrlMenu.options.subscribe}?appId=${orgApp._id}`}
                                        copyValue={`${findShareUrlMenu.options.subscribe}?appId=${orgApp._id}`}
                                        copyIcon={<Icon name="linkSide" />}
                                        copyText={t('copy_url')}
                                    />
                                </>
                            )}
                            {findShareUrlMenu.options?.unsubscribe && (
                                <>
                                    <Typography variant="BodyBold" style={{ color: 'var(--color-light-7)' }}>
                                        {t('journey_unsubscribe_page_url')}
                                    </Typography>
                                    <Copy
                                        displayText={`${findShareUrlMenu.options.unsubscribe}?appId=${orgApp._id}`}
                                        copyValue={`${findShareUrlMenu.options.unsubscribe}?appId=${orgApp._id}`}
                                        copyIcon={<Icon name="linkSide" />}
                                        copyText={t('copy_url')}
                                    />
                                </>
                            )}
                        </Space>
                    </Space>
                ),
                hideCancelButton: true,
                hideConfirmButton: true,
                showCloseButton: true,
                paperOnClick: (e) => {
                    e.stopPropagation();
                },
            });
        }
    }, [t, orgApp, dialog]);

    const onMenuSelect = useCallback(
        async (selectedIndex: string) => {
            switch (selectedIndex) {
                case 'deactivate':
                    try {
                        await deactivateApp.mutateAsync(orgApp._id);
                    } catch (error) {
                        console.log(error);
                    }

                    menuRef.current?.close();
                    break;
                case 'activate':
                    try {
                        await activateApp.mutateAsync(orgApp._id);
                    } catch (error) {
                        console.log(error);
                    }

                    menuRef.current?.close();
                    break;
                case 'edit':
                case 'continue_setup':
                case 'edit_setting':
                    navigate(`/journey/${orgApp._id}`);
                    break;
                case 'remove':
                    dialog({
                        title: t('journey_remove_dialog_title'),
                        content: t(`journey_${orgApp.product_code}_remove_dialog_desc`),
                        onConfirm: async () => {
                            await removeApp.mutateAsync(orgApp._id);
                            menuRef.current?.close();
                            return true;
                        },
                        confirmText: t('remove'),
                        confirmButtonProps: {
                            type: 'danger',
                        },
                        paperOnClick: (e) => {
                            e.stopPropagation();
                        },
                    });
                    break;
                case 'templates':
                    navigate(`/journey/${orgApp._id}/email-templates`);
                    menuRef.current?.close();
                    break;
                case 'share_urls':
                    openShareUrlsDialog();
                    menuRef.current?.close();
                    break;
                case 'reconnect-facebook':
                    await loginFacebook();
                    break;
                case 'reconnect-whatsapp':
                    await whatsappOnBoarding();
                    break;
                case 'scheduled_events':
                    navigate(`/journey/schedule/upcoming/${orgApp.product_code}`, {
                        state: {
                            orgApp: orgApp,
                        },
                    });
                    menuRef.current?.close();
                    break;
                default:
                    break;
            }
        },
        [deactivateApp, activateApp, removeApp, navigate, t, orgApp, openShareUrlsDialog, dialog, loginFacebook, whatsappOnBoarding],
    );

    const openEmailTemplateDialog = useCallback(
        (url: string) => {
            dialogForm<{ templateId: string }>({
                title: t('journey_choose_template_to_use'),
                content: ({ control }) => (
                    <Controller
                        control={control}
                        name="templateId"
                        render={({ field, fieldState: { error } }) => (
                            <FieldSelect
                                fullWidth
                                queryKey={['emailTemplate', { id: orgApp._id, data_board: orgApp.data_board }]}
                                placeholder={t('click_to_select')}
                                formControlSx={{
                                    marginTop: '8px',
                                }}
                                searchable
                                {...field}
                                request={async () => {
                                    const newSearchParams = new URLSearchParams();
                                    const {
                                        data: { data: emailTemplates },
                                    } = await apiFetch<{ data: API.EmailTemplate[] }>(
                                        getEmailTemplates.api(),
                                        getEmailTemplates.method,
                                        newSearchParams,
                                    );

                                    return emailTemplates.map((emailTemplate) => ({
                                        text: emailTemplate.name,
                                        value: emailTemplate._id,
                                        description: `${emailTemplate.category?.name || '—'}`,
                                    }));
                                }}
                                error={!!error}
                                helperText={error?.message}
                            />
                        )}
                    />
                ),
                onConfirm: async ({ templateId }) => {
                    const newUrl = new URL(url);
                    newUrl.searchParams.append('templateId', templateId);
                    newUrl.searchParams.append('type', EMAIL_CAMPAIGN_TYPE.INSTANCE);
                    openIframeModal({
                        title: `${t(`journey_${orgApp.product_code}_title`, orgApp.title.split(' - ')[0])}${
                            orgApp.title.split(' - ')[1] ? ` - ${orgApp.title.split(' - ')[1]}` : ''
                        }`,
                        url: newUrl.toString(),
                        id: orgApp._id,
                        appType: orgApp.app_type,
                        onAfterClose: () => {
                            setIsOpenSendAnother(true);
                        },
                    });
                    return true;
                },
                onClose: () => {},
                hideCancelButton: true,
                confirmText: t('apply'),
                confirmButtonProps: {
                    size: 'default',
                },
                showCloseButton: true,
                actionsAlign: 'flex-start',
                paperOnClick: (e) => {
                    e.stopPropagation();
                },
            });
        },
        [t, orgApp._id, orgApp.title, orgApp.data_board, orgApp.product_code, orgApp.app_type, dialogForm, openIframeModal],
    );

    const openEmailCampaignInstance = useCallback(() => {
        dialog({
            title: t('journey_starter_title'),
            content: ({ onClose }) => (
                <Space size={16} style={{ marginTop: '8px' }}>
                    <Space
                        direction="vertical"
                        size={12}
                        className={styles.card}
                        style={{ flex: 1, height: '142px' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            const url = orgApp.options.interaction?.data.url;
                            if (url) {
                                onClose?.();
                                const targetUrl = () => {
                                    if (env.VITE_APP_ENV === 'local' && url) {
                                        return `http://localhost:3000/marketplace/iframe${url.slice(
                                            url.indexOf('/email-campaign'),
                                            url.length,
                                        )}?ac=${localStorage.getItem(IMBRACE_ACCESS_TOKEN)}&t=${orgApp._id}&type=${
                                            EMAIL_CAMPAIGN_TYPE.INSTANCE
                                        }`;
                                    }
                                    return `${url}`;
                                };
                                const newUrl = new URL(targetUrl());
                                newUrl.searchParams.append('type', EMAIL_CAMPAIGN_TYPE.INSTANCE);
                                openIframeModal({
                                    title: `${t(`journey_${orgApp.product_code}_title`, orgApp.title.split(' - ')[0])}${
                                        orgApp.title.split(' - ')[1] ? ` - ${orgApp.title.split(' - ')[1]}` : ''
                                    }`,
                                    url: newUrl.toString(),
                                    id: orgApp._id,
                                    appType: orgApp.app_type,
                                    onAfterClose: () => {
                                        openEmailCampaignInstance();
                                    },
                                });
                            }
                        }}
                    >
                        <Space justify="between" style={{ width: '100%' }}>
                            <div style={{ width: '32px', height: '32px' }}>
                                <Icon
                                    name="edit"
                                    style={{
                                        fontSize: 32,
                                        color: 'var(--color-secondary-3)',
                                    }}
                                />
                            </div>
                        </Space>
                        <Space
                            size={0}
                            direction="vertical"
                            align="start"
                            justify="end"
                            style={{ overflow: 'hidden', width: '100%', height: 64 }}
                        >
                            <EllipsisText
                                element={<Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }} />}
                                text={t('journey_start_from_scratch')}
                            />
                            <div style={{ maxHeight: '40px' }}>
                                <EllipsisText
                                    element={
                                        <Typography
                                            variant="Body"
                                            style={{
                                                color: 'var(--color-secondary-3)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                WebkitLineClamp: 2,
                                                display: '-webkit-box',
                                                WebkitBoxOrient: 'vertical',
                                            }}
                                        />
                                    }
                                    text={t('journey_start_from_scratch_desc')}
                                    whiteSpace="pre-wrap"
                                />
                            </div>
                        </Space>
                    </Space>
                    <Space
                        direction="vertical"
                        size={12}
                        className={styles.card}
                        style={{ flex: 1, height: '140px' }}
                        onClick={(e) => {
                            setIsOpenSendAnother(false);
                            e.stopPropagation();
                            const url = `${orgApp.options.interaction?.data.url}`;
                            if (url) {
                                const targetUrl = () => {
                                    if (env.VITE_APP_ENV === 'local' && url) {
                                        return `http://localhost:3000/marketplace/iframe${url.slice(
                                            url.indexOf('/email-campaign'),
                                            url.length,
                                        )}?ac=${localStorage.getItem(IMBRACE_ACCESS_TOKEN)}&t=${orgApp._id}&type=${
                                            EMAIL_CAMPAIGN_TYPE.INSTANCE
                                        }`;
                                    }
                                    return `${url}`;
                                };
                                openEmailTemplateDialog(targetUrl());
                                onClose?.();
                            }
                        }}
                    >
                        <Space justify="between" style={{ width: '100%' }}>
                            <div style={{ width: '32px', height: '32px' }}>
                                <Icon
                                    name="template"
                                    style={{
                                        fontSize: 32,
                                        color: 'var(--color-secondary-3)',
                                    }}
                                />
                            </div>
                        </Space>
                        <Space
                            size={0}
                            direction="vertical"
                            align="start"
                            justify="end"
                            style={{ overflow: 'hidden', width: '100%', height: 62 }}
                        >
                            <EllipsisText
                                element={<Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }} />}
                                text={t('journey_start_with_email_template')}
                            />
                            <div style={{ maxHeight: '40px' }}>
                                <EllipsisText
                                    element={
                                        <Typography
                                            variant="Body"
                                            style={{
                                                color: 'var(--color-secondary-3)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                WebkitLineClamp: 2,
                                                display: '-webkit-box',
                                                WebkitBoxOrient: 'vertical',
                                            }}
                                        />
                                    }
                                    text={t('journey_start_with_email_template_desc')}
                                    whiteSpace="pre-wrap"
                                />
                            </div>
                        </Space>
                    </Space>
                </Space>
            ),
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            paperSx: {
                width: 600,
            },
            paperOnClick: (e) => {
                e.stopPropagation();
            },
        });
    }, [t, openEmailTemplateDialog, orgApp, dialog, openIframeModal]);
    type onCloseType = ((dontAskAgain?: boolean) => void) | undefined;
    const openJourneyIncludeScheduleStarter = useCallback(
        (cbInstance: (onClose: onCloseType) => void, cbSchedule: (onClose: onCloseType) => void) => {
            const translation_key = {
                instance: 'journey_start_instance',
                instance_desc: 'journey_start_instance_desc',
                schedule: 'journey_start_schedule',
                schedule_desc: 'journey_start_schedule_desc',
            };
            const renderSpaceItem = (
                cbNextStep: () => void,
                cardTitle: string,
                cardDescription: string,
                cardTitleType: string,
                cardDescriptionType: string,
                icon: string,
            ) => {
                return (
                    <Space
                        direction="vertical"
                        size={12}
                        className={styles.card}
                        style={{ flex: 1, height: '142px' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            cbNextStep();
                        }}
                    >
                        <Space justify="between" style={{ width: '100%' }}>
                            <Icon
                                name={icon as keyof typeof generalIconMapping}
                                style={{
                                    fontSize: 32,
                                    color: 'var(--color-secondary-3)',
                                }}
                            />
                        </Space>
                        <Space
                            size={0}
                            direction="vertical"
                            align="start"
                            justify="end"
                            style={{ overflow: 'hidden', width: '100%', height: 64 }}
                        >
                            <EllipsisText
                                element={<Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }} />}
                                text={t(cardTitle, { type: cardTitleType })}
                            />
                            <div style={{ maxHeight: '40px' }}>
                                <EllipsisText
                                    element={
                                        <Typography
                                            variant="Body"
                                            style={{
                                                color: 'var(--color-secondary-3)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                WebkitLineClamp: 2,
                                                display: '-webkit-box',
                                                WebkitBoxOrient: 'vertical',
                                            }}
                                        />
                                    }
                                    text={t(cardDescription, { type: cardDescriptionType })}
                                    whiteSpace="pre-wrap"
                                />
                            </div>
                        </Space>
                    </Space>
                );
            };
            dialog({
                title: t('journey_starter_title'),
                content: ({ onClose }) => (
                    <Space size={16} style={{ marginTop: '8px' }}>
                        {renderSpaceItem(
                            () => cbInstance(onClose),
                            translation_key.instance,
                            translation_key.instance_desc,
                            'Outbound',
                            'outbound message',
                            'send',
                        )}
                        {renderSpaceItem(
                            () => cbSchedule(onClose),
                            translation_key.schedule,
                            translation_key.schedule_desc,
                            'an Outbound',
                            'outbound message',
                            'timeTrigger',
                        )}
                    </Space>
                ),
                hideCancelButton: true,
                hideConfirmButton: true,
                showCloseButton: true,
                paperSx: {
                    width: 600,
                },
                paperOnClick: (e) => {
                    e.stopPropagation();
                },
            });
        },
        [t, dialog],
    );

    const openModalStarter = useCallback(() => {
        const openModal = (temgramType: string, onClose: onCloseType) => {
            const targetUrl = orgApp.options.interaction?.data?.url;
            if (targetUrl && typeof targetUrl === 'string') {
                onClose?.();
                const newUrl = new URL(targetUrl);
                newUrl.searchParams.append('type', temgramType);
                openIframeModal({
                    title: `${t(`journey_${orgApp.product_code}_title`, orgApp.title.split(' - ')[0])}${
                        orgApp.title.split(' - ')[1] ? ` - ${orgApp.title.split(' - ')[1]}` : ''
                    }`,
                    url: newUrl.toString(),
                    id: orgApp._id,
                    appType: orgApp.app_type,
                });
            }
        };
        const navigateToInstance = (onClose: onCloseType) => {
            openModal(EMAIL_CAMPAIGN_TYPE.INSTANCE, onClose);
        };
        const navigateToSchedule = (onClose: onCloseType) => {
            openModal(EMAIL_CAMPAIGN_TYPE.SCHEDULE, onClose);
        };
        openJourneyIncludeScheduleStarter(navigateToInstance, navigateToSchedule);
    }, [
        openIframeModal,
        openJourneyIncludeScheduleStarter,
        orgApp.app_type,
        orgApp.options?.interaction?.data?.url,
        orgApp.product_code,
        orgApp.title,
        orgApp._id,
        t,
    ]);

    const openEmailCampaignStarter = useCallback(() => {
        const renderSpaceItem = (
            cbNextStep: () => void,
            cardTitle: string,
            cardDescription: string,
            cardTitleType: string,
            cardDescriptionType: string,
            icon: string,
        ) => {
            return (
                <Space
                    direction="vertical"
                    size={12}
                    className={styles.card}
                    style={{ flex: 1, height: '142px' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        cbNextStep();
                    }}
                >
                    <Space justify="between" style={{ width: '100%' }}>
                        <div style={{ width: '32px', height: '32px' }}>
                            <Icon
                                name={icon as keyof typeof generalIconMapping}
                                style={{
                                    fontSize: 32,
                                    color: 'var(--color-secondary-3)',
                                }}
                            />
                        </div>
                    </Space>
                    <Space
                        size={0}
                        direction="vertical"
                        align="start"
                        justify="end"
                        style={{ overflow: 'hidden', width: '100%', height: 64 }}
                    >
                        <EllipsisText
                            element={<Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }} />}
                            text={t(cardTitle, { type: cardTitleType })}
                        />
                        <div style={{ maxHeight: '40px' }}>
                            <EllipsisText
                                element={
                                    <Typography
                                        variant="Body"
                                        style={{
                                            color: 'var(--color-secondary-3)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            WebkitLineClamp: 2,
                                            display: '-webkit-box',
                                            WebkitBoxOrient: 'vertical',
                                        }}
                                    />
                                }
                                text={t(cardDescription, { type: cardDescriptionType })}
                                whiteSpace="pre-wrap"
                            />
                        </div>
                    </Space>
                </Space>
            );
        };
        const navigateEmailCampainSchedule = (onClose: any) => {
            const url = orgApp.options.interaction?.data.url;
            if (url) {
                onClose?.();
                const targetUrl = () => {
                    if (env.VITE_APP_ENV === 'local' && url) {
                        return `http://localhost:3000/marketplace/iframe${url.slice(
                            url.indexOf('/email-campaign'),
                            url.length,
                        )}?ac=${localStorage.getItem(IMBRACE_ACCESS_TOKEN)}&t=${orgApp._id}&type=${EMAIL_CAMPAIGN_TYPE.SCHEDULE}`;
                    }
                    return `${url}`;
                };
                const newUrl = new URL(targetUrl());
                newUrl.searchParams.append('type', EMAIL_CAMPAIGN_TYPE.SCHEDULE);
                openIframeModal({
                    title: `${t(`journey_${orgApp.product_code}_title`, orgApp.title.split(' - ')[0])}${
                        orgApp.title.split(' - ')[1] ? ` - ${orgApp.title.split(' - ')[1]}` : ''
                    }`,
                    url: newUrl.toString(),
                    id: orgApp._id,
                    appType: orgApp.app_type,
                    onAfterClose: () => {
                        openEmailCampaignStarter();
                    },
                });
            }
        };
        const navigateEmailCampaignInstance = (onClose: any) => {
            const url = orgApp.options.interaction?.data.url;
            if (url) {
                onClose?.();
                openEmailCampaignInstance();
            }
        };
        dialog({
            title: t('journey_starter_title'),
            content: ({ onClose }) => (
                <Space size={16} style={{ marginTop: '8px' }}>
                    {renderSpaceItem(
                        () => navigateEmailCampaignInstance(onClose),
                        'journey_start_instance',
                        'journey_start_instance_desc',
                        'Campaign',
                        'campaign newsletter',
                        'send',
                    )}
                    {renderSpaceItem(
                        () => navigateEmailCampainSchedule(onClose),
                        'journey_start_schedule',
                        'journey_start_schedule_desc',
                        'a Campaign',
                        'campaign newsletter',
                        'timeTrigger',
                    )}
                </Space>
            ),
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            paperSx: {
                width: 600,
            },
            paperOnClick: (e) => {
                e.stopPropagation();
            },
        });
    }, [t, orgApp, dialog, openIframeModal, openEmailCampaignInstance]);

    const openEmailOutboundStarter = useCallback(() => {
        dialog({
            title: t('journey_starter_title'),
            content: ({ onClose }) => (
                <Space size={16} style={{ marginTop: '8px' }}>
                    <Space
                        direction="vertical"
                        size={12}
                        className={styles.card}
                        style={{ flex: 1, height: '142px' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            const url = orgApp.options.interaction?.data.url;
                            if (url) {
                                onClose?.();
                                const targetUrl = () => {
                                    if (env.VITE_APP_ENV === 'local' && url) {
                                        return `http://localhost:3000/marketplace/iframe${url.slice(
                                            url.indexOf('/email-outbound'),
                                            url.length,
                                        )}?ac=${localStorage.getItem(IMBRACE_ACCESS_TOKEN)}&t=${orgApp._id}`;
                                    }
                                    return `${url}`;
                                };

                                openIframeModal({
                                    title: `${t(`journey_${orgApp.product_code}_title`, orgApp.title.split(' - ')[0])}${
                                        orgApp.title.split(' - ')[1] ? ` - ${orgApp.title.split(' - ')[1]}` : ''
                                    }`,
                                    url: targetUrl(),
                                    id: orgApp._id,
                                    appType: orgApp.app_type,
                                    onAfterClose: () => {
                                        openEmailOutboundStarter();
                                    },
                                });
                            }
                        }}
                    >
                        <Space justify="between" style={{ width: '100%' }}>
                            <div style={{ width: '32px', height: '32px' }}>
                                <Icon
                                    name={'edit'}
                                    style={{
                                        fontSize: 32,
                                        color: 'var(--color-secondary-3)',
                                    }}
                                />
                            </div>
                        </Space>
                        <Space
                            size={0}
                            direction="vertical"
                            align="start"
                            justify="end"
                            style={{ overflow: 'hidden', width: '100%', height: 64 }}
                        >
                            <EllipsisText
                                element={<Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }} />}
                                text={t('journey_start_from_scratch')}
                            />
                            <div style={{ maxHeight: '40px' }}>
                                <EllipsisText
                                    element={
                                        <Typography
                                            variant="Body"
                                            style={{
                                                color: 'var(--color-secondary-3)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                WebkitLineClamp: 2,
                                                display: '-webkit-box',
                                                WebkitBoxOrient: 'vertical',
                                            }}
                                        />
                                    }
                                    text={t('journey_email_outbound_start_from_scratch_desc')}
                                    whiteSpace="pre-wrap"
                                />
                            </div>
                        </Space>
                    </Space>
                    <Space
                        direction="vertical"
                        size={12}
                        className={styles.card}
                        style={{ flex: 1, height: '142px' }}
                        onClick={(e) => {
                            setIsOpenSendAnother(false);
                            e.stopPropagation();
                            const url = orgApp.options.interaction?.data.url;
                            if (url) {
                                onClose?.();
                                const targetUrl = () => {
                                    if (env.VITE_APP_ENV === 'local' && url) {
                                        return `http://localhost:3000/marketplace/iframe${url.slice(
                                            url.indexOf('/email-outbound'),
                                            url.length,
                                        )}?ac=${localStorage.getItem(IMBRACE_ACCESS_TOKEN)}&t=${orgApp._id}`;
                                    }
                                    return `${url}`;
                                };

                                openEmailTemplateDialog(targetUrl());
                                onClose?.();
                            }
                        }}
                    >
                        <Space justify="between" style={{ width: '100%' }}>
                            <div style={{ width: '32px', height: '32px' }}>
                                <Icon
                                    name={'template'}
                                    style={{
                                        fontSize: 32,
                                        color: 'var(--color-secondary-3)',
                                    }}
                                />
                            </div>
                        </Space>
                        <Space
                            size={0}
                            direction="vertical"
                            align="start"
                            justify="end"
                            style={{ overflow: 'hidden', width: '100%', height: 64 }}
                        >
                            <EllipsisText
                                element={<Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }} />}
                                text={t('journey_start_with_email_template')}
                            />
                            <div style={{ maxHeight: '40px' }}>
                                <EllipsisText
                                    element={
                                        <Typography
                                            variant="Body"
                                            style={{
                                                color: 'var(--color-secondary-3)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                WebkitLineClamp: 2,
                                                display: '-webkit-box',
                                                WebkitBoxOrient: 'vertical',
                                            }}
                                        />
                                    }
                                    text={t('journey_email_outbound_start_with_email_template_desc')}
                                    whiteSpace="pre-wrap"
                                />
                            </div>
                        </Space>
                    </Space>
                </Space>
            ),
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            paperSx: {
                width: 600,
            },
            paperOnClick: (e) => {
                e.stopPropagation();
            },
        });
    }, [t, orgApp, dialog, openIframeModal, openEmailTemplateDialog]);

    useEffect(() => {
        const appType = orgApp?.options?.interaction?.data?.type;
        if (isOpenSendAnother) {
            if (appType === 'email_campaign') {
                openEmailCampaignInstance();
            }
            if (appType === 'email_outbound') {
                openEmailOutboundStarter();
            }
        }
    }, [isOpenSendAnother, openEmailCampaignInstance, openEmailOutboundStarter, orgApp]);

    const openBusinessContactCollectorStarter = useCallback(() => {
        dialog({
            title: t('journey_starter_title'),
            content: ({ onClose }) => (
                <Space size={16} style={{ marginTop: '8px' }}>
                    <Space
                        direction="vertical"
                        size={12}
                        className={styles.card}
                        style={{ flex: 1, height: '140px' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            const urls = orgApp.options.interaction?.data.url;
                            if (Array.isArray(urls)) {
                                onClose?.();
                                const url = urls[0];
                                const targetUrl = () => {
                                    if (env.VITE_APP_ENV === 'local' && url) {
                                        return `http://localhost:3000/marketplace/iframe${url.slice(
                                            url.indexOf('/business-contact-collector'),
                                            url.length,
                                        )}?ac=${localStorage.getItem(IMBRACE_ACCESS_TOKEN)}&t=${orgApp._id}`;
                                    }
                                    return `${url}`;
                                };
                                openIframeModal({
                                    title: `${t(`journey_${orgApp.product_code}_title`, orgApp.title.split(' - ')[0])}${
                                        orgApp.title.split(' - ')[1] ? ` - ${orgApp.title.split(' - ')[1]}` : ''
                                    }`,
                                    url: targetUrl(),
                                    id: orgApp._id,
                                    appType: orgApp.app_type,
                                });
                            }
                        }}
                    >
                        <Space justify="between" style={{ width: '100%' }}>
                            <div style={{ width: '32px', height: '32px' }}>
                                <Icon
                                    name="record"
                                    style={{
                                        fontSize: 32,
                                        color: 'var(--color-secondary-3)',
                                    }}
                                />
                            </div>
                        </Space>
                        <Space
                            size={0}
                            direction="vertical"
                            align="start"
                            justify="end"
                            style={{ overflow: 'hidden', width: '100%', height: 62 }}
                        >
                            <EllipsisText
                                element={<Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }} />}
                                text={t('journey_upload_single_contact')}
                            />
                            <div style={{ maxHeight: '40px' }}>
                                <EllipsisText
                                    element={
                                        <Typography
                                            variant="Body"
                                            style={{
                                                color: 'var(--color-secondary-3)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                WebkitLineClamp: 2,
                                                display: '-webkit-box',
                                                WebkitBoxOrient: 'vertical',
                                            }}
                                        />
                                    }
                                    text={t('journey_upload_single_contact_desc')}
                                    whiteSpace="pre-wrap"
                                />
                            </div>
                        </Space>
                    </Space>
                    <Space
                        direction="vertical"
                        size={12}
                        className={styles.card}
                        style={{ flex: 1, height: '142px' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            const urls = orgApp.options.interaction?.data.url;
                            if (Array.isArray(urls)) {
                                onClose?.();
                                const url = urls[1];
                                const targetUrl = () => {
                                    if (env.VITE_APP_ENV === 'local' && url) {
                                        return `http://localhost:3000/marketplace/iframe${url.slice(
                                            url.indexOf('/business-contact-collector'),
                                            url.length,
                                        )}?ac=${localStorage.getItem(IMBRACE_ACCESS_TOKEN)}&t=${orgApp._id}`;
                                    }
                                    return `${url}`;
                                };

                                openIframeModal({
                                    title: `${t(`journey_${orgApp.product_code}_title`, orgApp.title.split(' - ')[0])}${
                                        orgApp.title.split(' - ')[1] ? ` - ${orgApp.title.split(' - ')[1]}` : ''
                                    }`,
                                    url: targetUrl(),
                                    id: orgApp._id,
                                    handleOpenHelpCenter,
                                    appType: orgApp.app_type,
                                });
                            }
                        }}
                    >
                        <Space justify="between" style={{ width: '100%' }}>
                            <div style={{ width: '32px', height: '32px' }}>
                                <Icon
                                    name="multipleRecords"
                                    style={{
                                        fontSize: 32,
                                        color: 'var(--color-secondary-3)',
                                    }}
                                />
                            </div>
                        </Space>
                        <Space
                            size={0}
                            direction="vertical"
                            align="start"
                            justify="end"
                            style={{ overflow: 'hidden', width: '100%', height: 64 }}
                        >
                            <EllipsisText
                                element={<Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }} />}
                                text={t('journey_upload_multiple_contact')}
                            />
                            <div style={{ maxHeight: '40px' }}>
                                <EllipsisText
                                    element={
                                        <Typography
                                            variant="Body"
                                            style={{
                                                color: 'var(--color-secondary-3)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                WebkitLineClamp: 2,
                                                display: '-webkit-box',
                                                WebkitBoxOrient: 'vertical',
                                            }}
                                        />
                                    }
                                    text={t('journey_upload_multiple_contact_desc')}
                                    whiteSpace="pre-wrap"
                                />
                            </div>
                        </Space>
                    </Space>
                </Space>
            ),
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            paperSx: {
                width: 600,
            },
            paperOnClick: (e) => {
                e.stopPropagation();
            },
        });
    }, [t, orgApp, handleOpenHelpCenter, dialog, openIframeModal]);

    const openIframeApp = useCallback(
        (urlPath: string, customSx = {}) => {
            return openIframeModal({
                title: `${t(`journey_${orgApp.product_code}_title`, orgApp.title.split(' - ')[0])}${
                    orgApp.title.split(' - ')[1] ? ` - ${orgApp.title.split(' - ')[1]}` : ''
                }`,
                url: `${env.VITE_APP_WCS_HOST}/${urlPath}`,
                id: orgApp._id,
                appType: orgApp.app_type,
                paperSx: {
                    maxWidth: '1080px',
                    ...customSx,
                },
            });
        },
        [t, orgApp, openIframeModal],
    );

    const onCardClick = useCallback(() => {
        if (orgApp.product_code === 'ai-assistant_management') {
            return navigate(`/journey/ai-assistant-management`, {
                state:{
                    id: orgApp._id,
                    appType: orgApp.app_type
                }
            });
        }
        if (orgApp.product_code === 'nvidia_fraud_detection') {
            return navigate(`/journey/nvidia-fraud-detection`, {
                state:{
                    id: orgApp._id,
                    appType: orgApp.app_type
                }
            });
        }
        if (orgApp.product_code === 'document_ocr') {
            return openIframeApp('document-ocr', {
                maxWidth: '624px',
                maxHeight: '514px',
            });
        }
        if (orgApp.product_code === 'financial_management') {
            return openIframeApp('financial-management', {
                maxWidth: '80%',
            });
        }
        if (orgApp.app_type === 'customization' && orgApp.is_active) {
            if (!orgApp.url) {
                return;
            }
            openIframeModal({
                title: `${t(`journey_${orgApp.product_code}_title`, orgApp.title.split(' - ')[0])}${
                    orgApp.title.split(' - ')[1] ? ` - ${orgApp.title.split(' - ')[1]}` : ''
                }`,
                url: orgApp.url,
                id: orgApp._id,
                appType: orgApp.app_type,
            });
        } else {
            if (orgApp.app_type === 'customization' && orgApp.is_active) {
                if (!orgApp.url) {
                    return;
                }
                openIframeModal({
                    title: `${t(`journey_${orgApp.product_code}_title`, orgApp.title.split(' - ')[0])}${
                        orgApp.title.split(' - ')[1] ? ` - ${orgApp.title.split(' - ')[1]}` : ''
                    }`,
                    url: orgApp.url,
                    id: orgApp._id,
                    appType: orgApp.app_type,
                });
                return;
            }
            if (!isAppActive) {
                return;
            }
            if (orgApp.options?.interaction && orgApp.is_active) {
                switch (orgApp.options?.interaction?.type) {
                    case 'MODAL': {
                        const appType = orgApp.options.interaction?.data?.type;

                        if (appType === 'email_campaign') {
                            openEmailCampaignStarter();
                        }
                        if (appType === 'email_outbound') {
                            openEmailOutboundStarter();
                        }
                        if (appType === 'business_contact_collector') {
                            openBusinessContactCollectorStarter();
                        }
                        if (appType === 'whatsapp_outbound') {
                            openModalStarter();
                            break;
                        }
                        break;
                    }
                    case 'ROUTE': {
                        const targetUrl = orgApp.options.interaction?.data?.url;
                        if (targetUrl) {
                            navigate(targetUrl);
                        }
                        break;
                    }
                    case 'IFRAME': {
                        const targetUrl = orgApp.options.interaction?.data?.url;
                        const appType = orgApp.options.interaction?.data?.type;

                        // ***Note: should change data return from get Schedule app api from IFRAME => MODAL for telegram
                        if (appType === 'telegram_outbound') {
                            openModalStarter();
                            break;
                        }
                        if (targetUrl) {
                            openIframeModal({
                                title: `${t(`journey_${orgApp.product_code}_title`, orgApp.title.split(' - ')[0])}${
                                    orgApp.title.split(' - ')[1] ? ` - ${orgApp.title.split(' - ')[1]}` : ''
                                }`,
                                url: targetUrl,
                                id: orgApp._id,
                                appType: orgApp.app_type,
                            });
                        }

                        break;
                    }
                    default:
                        break;
                }
            }
        }
    }, [
        orgApp,
        navigate,
        openEmailCampaignStarter,
        openBusinessContactCollectorStarter,
        t,
        openIframeModal,
        isAppActive,
        openModalStarter,
        openEmailOutboundStarter,
    ]);

    useEffect(() => {
        if (searchParams.get('target') === orgApp._id) {
            if (searchParams.get('action') === 'open') {
                onCardClick();
                navigate(
                    {
                        search: '',
                    },
                    {
                        replace: true,
                    },
                );
            }
        }
    }, [searchParams, onCardClick, navigate, orgApp._id]);

    const appMenuOptions = useCallback(() => {
        const removeOption = () => {
            if (role === 'owner' || role === 'admin') {
                return [
                    {
                        text: t('journey_remove'),
                        index: 'remove',
                        textColor: !isAllowModifyJourney ? viewOnlyColor : 'var(--color-danger-1)',
                    },
                ];
            }
            return [];
        };
        if (orgApp.error) {
            return [
                ...(orgApp.error === 'reconnection_needed' && orgApp?.channel?.channel_type === 'facebook'
                    ? [{ text: t('reconnect_the_channel'), index: 'reconnect-facebook', textColor: !isAllowModifyJourney && viewOnlyColor }]
                    : []),
                ...(orgApp.error === 'reconnection_needed' && orgApp?.channel?.channel_type === 'whatsapp'
                    ? [{ text: t('reconnect_the_channel'), index: 'reconnect-whatsapp', textColor: !isAllowModifyJourney && viewOnlyColor }]
                    : []),
                {
                    text: t('journey_remove'),
                    index: 'remove',
                    textColor: !isAllowModifyJourney ? viewOnlyColor : 'var(--color-danger-1)',
                },
            ] as DropdownProps<string | number>['options'];
        }
        if (orgApp.user_progress && 'finished' in orgApp.user_progress && !orgApp.user_progress.finished) {
            return [
                {
                    text: t('continue_setup'),
                    index: 'continue_setup',
                    textColor: !isAllowModifyJourney && viewOnlyColor,
                },
                ...removeOption(),
            ].filter(Boolean) as DropdownProps<string | number>['options'];
        }
        if (orgApp.options?.menu && orgApp.is_active) {
            const menu = orgApp.options.menu
                .filter(
                    (option) =>
                        'type' in option ||
                        option.index !== 'remove' ||
                        (option.index === 'remove' && (role === 'owner' || role === 'admin')),
                )
                .map((option) => {
                    if ('type' in option) {
                        return option;
                    }
                    if (option.text === 'activate') {
                        return {
                            ...option,
                            text: orgApp.is_active ? t('deactivate') : t('activate'),
                            index: orgApp.is_active ? 'deactivate' : 'activate',
                            loading: orgApp.is_active
                                ? deactivateApp.isPending && deactivateApp.variables === orgApp._id
                                : activateApp.isPending && activateApp.variables === orgApp._id,
                            textColor: !isAllowModifyJourney && viewOnlyColor,
                        };
                    }
                    return {
                        ...option,
                        text: t(`journey_${option.text}`),
                        textColor: !isAllowModifyJourney && viewOnlyColor,
                    };
                }) as DropdownProps<string | number>['options'];

            return [
                orgApp.product_code in eventType
                    ? {
                          text: t('journey_scheduled_events'),
                          index: 'scheduled_events',
                          textColor: !isAllowModifyJourney && viewOnlyColor,
                      }
                    : {},
                ...menu,
            ].filter(Boolean) as DropdownProps<string | number>['options'];
        }
        return [
            orgApp.product_code in eventType
                ? {
                      text: t('journey_scheduled_events'),
                      index: 'scheduled_events',
                      textColor: !isAllowModifyJourney && viewOnlyColor,
                  }
                : {},
            {
                text: t('journey_edit_setting'),
                index: 'edit',
                textColor: !isAllowModifyJourney && viewOnlyColor,
            },
            { type: 'divider' },
            orgApp.is_active
                ? {
                      text: t('journey_deactivate'),
                      index: 'deactivate',
                      loading: deactivateApp.isPending && deactivateApp.variables === orgApp._id,
                      textColor: !isAllowModifyJourney && viewOnlyColor,
                  }
                : {
                      text: t('journey_activate'),
                      index: 'activate',
                      loading: activateApp.isPending && activateApp.variables === orgApp._id,
                      textColor: !isAllowModifyJourney && viewOnlyColor,
                  },

            ...removeOption(),
        ].filter(Boolean) as DropdownProps<string | number>['options'];
    }, [orgApp, activateApp, deactivateApp, t, role]);

    const renderAppStatusTag = useCallback(() => {
        if (orgApp.error) {
            switch (orgApp.error) {
                case 'reconnection_needed': {
                    return (
                        <div className={`${styles.tag} ${styles.danger}`}>
                            <Typography variant="Caption">{t(`${orgApp.error}`)}</Typography>
                        </div>
                    );
                }
                default: {
                    return (
                        <div className={`${styles.tag} ${styles.danger}`}>
                            <Typography variant="Caption">{t(`error_${orgApp.error}`)}</Typography>
                        </div>
                    );
                }
            }
        }
        if (orgApp.user_progress && 'finished' in orgApp.user_progress && !orgApp.user_progress.finished) {
            return (
                <div className={`${styles.tag} ${styles.secondary}`}>
                    <Typography variant="Caption">{t('setup_in_progress')}</Typography>
                </div>
            );
        }
        return null;
    }, [orgApp, t]);

    if (asButton) {
        return (
            <>
                {modalHolder}
                {dialogHolder}
                <Button
                    text="New Schedule"
                    onClick={(e) => {
                        onCardClick();
                    }}
                />
            </>
        );
    }

    return (
        <Space
            direction="vertical"
            size={20}
            align="start"
            className={clsx(styles.card, !isAppActive && styles.disabled)}
            onClick={(e) => {
                e.stopPropagation();
                onCardClick();
            }}
        >
            {modalHolder}
            {dialogHolder}
            <Space justify="between" style={{ width: '100%' }}>
                <div style={{ width: '32px', height: '32px' }}>
                    <Icon
                        {...iconProps}
                        style={{
                            fontSize: 32,
                            color: isAppActive ? 'var(--color-secondary-3)' : 'var(--color-secondary-4)',
                        }}
                    />
                </div>
                <Space size={12}>
                    {renderAppStatusTag()}
                    {orgApp.product_id && (
                        <Dropdown
                            icon={<Icon style={{ color: 'var(--color-light-5)' }} name="more" />}
                            variant="text"
                            hideArrow
                            options={appMenuOptions()}
                            onSelect={(e, selectedIndex) => {
                                if (!isAllowModifyJourney) {
                                    showViewOnlyToast();
                                    return;
                                }
                                e.stopPropagation();
                                onMenuSelect(selectedIndex as string);
                            }}
                            ref={menuRef}
                        />
                    )}
                </Space>
            </Space>
            <Space size={8} direction="vertical" align="start" justify="end" style={{ overflow: 'hidden', width: '100%', height: 96 }}>
                <div style={{ maxHeight: '38px', display: 'flex', alignItems: 'flex-end' }}>
                    <EllipsisText
                        element={
                            <Typography
                                variant="SubHeading2Tight"
                                style={{
                                    color: isAppActive ? 'var(--color-light-7)' : 'var(--color-light-4)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    WebkitLineClamp: 2,
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                }}
                            />
                        }
                        text={`${t(`journey_${orgApp.product_code}_title`, orgApp.title.split(' - ')[0])}${
                            orgApp.title.split(' - ')[1] ? ` - ${orgApp.title.split(' - ')[1]}` : ''
                        }`}
                        whiteSpace="pre-wrap"
                    />
                </div>
                {orgApp.description && (
                    <div style={{ maxHeight: '50px' }}>
                        <EllipsisText
                            element={
                                <Typography
                                    variant="BodyTight"
                                    style={{
                                        color: isAppActive ? 'var(--color-secondary-3)' : 'var(--color-light-4)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        WebkitLineClamp: 3,
                                        display: '-webkit-box',
                                        WebkitBoxOrient: 'vertical',
                                    }}
                                />
                            }
                            text={t(`journey_${orgApp.product_code}_short_description`, orgApp.description)}
                            whiteSpace="pre-wrap"
                        />
                    </div>
                )}
            </Space>
        </Space>
    );
};

export default JourneyCard;
