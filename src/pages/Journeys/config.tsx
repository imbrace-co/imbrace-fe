import { useDialog } from '@imbrace/ui';
import { type QueryFunction, useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import type SimpleBarCore from 'simplebar-core';
import { env } from '@/env';
import { Iframe } from '@/components/HelpCenter';
import PageLayout from '@/components/PageLayout';
import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import { useNotify } from '@/contexts/SnackbarContext';
import usePrompt from '@/hooks/usePrompt';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';
import { deleteEmailSender, getAppById, postEmailSender, putApp, putEmailSender } from '@/services/api/app';
import { getAiFile, getProductById, postAiAssistant, postChannelWorkflows, putAiAssistant } from '@/services/api/marketplace';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { addLeadingZero } from '@/utils/NumberHelper';
import { type MarketPlaceMessageEvent, postMessage } from '@/utils/postMessage';

import { openCreateNewCredential } from '../Credentials/components/NewCredential/CreateNewCredential';
import styles from './config.module.scss';
import {
    ADD_NEW,
    ADD_NEW_AI_ASSISTANT,
    CREDENTIAL_CHANGED,
    CURRENT_DATA,
    EDIT_APP,
    OPEN_IN_PROGRESS_MODAL,
    OPEN_UNLOCK_FEATURE,
    REFRESH,
    REMOVE_CREDENTIAL,
    ROUTE,
    SAVE_AND_EXIT,
    SET_LANGUAGE,
    UPDATE_AI_ASSISTANT,
    UPDATE_CREDENTIAL,
} from './constants';
import type { AiAssistantFormData } from './conversationAiAssistant/aiAssistantForm';
import AiAssistantForm, { AiAssistantFormDataSchema } from './conversationAiAssistant/aiAssistantForm';
import EmailSenderForm from './emailCampaign/emailSenderForm';
import { removeOrgApp } from './journeyCard';

const mode = {
    standard: 'Standard AI Assistant',
    advanced: 'Advanced AI Assistant',
};

const fetchApp: QueryFunction<
    {
        url: string;
        title: string;
        type: API.ProductType;
        productId?: string;
    },
    [string, string | undefined]
> = async ({ queryKey }) => {
    const [, appId] = queryKey;
    if (!appId) {
        throw new Error('App Id is missing');
    }
    const { data } = await apiFetch<{ data: API.Journey }>(getAppById.api(appId), getAppById.method);
    return {
        url: data.data.url,
        title: data.data.title,
        type: data.data.product_code,
        productId: data.data.product_id,
    };
};

const fetchProduct: QueryFunction<
    {
        url: string;
        title: string;
        type: API.ProductType;
    },
    [string, string | undefined]
> = async ({ queryKey }) => {
    const [, productId] = queryKey;
    if (!productId) {
        throw new Error('Product Id is missing');
    }
    const { data } = await apiFetch<{ data: API.JourneyLibrary }>(getProductById.api(productId), getProductById.method);
    return {
        url: data.data.template.inherit_info.url,
        title: data.data.template.inherit_info.title,
        type: data.data.product_code,
    };
};

const updateOrgApp = async ({ appId, title }: { appId: string; title: string }) => {
    const {
        data: { data: appData },
    } = await apiFetch<{ data: API.Journey }>(getAppById.api(appId), getAppById.method);
    const { data } = await apiFetch<{ data: API.Journey }>(putApp.api(appId), putApp.method, {
        channel: appData.channel,
        user_progress: appData.user_progress,
        options: appData.options,
        is_active: appData.is_active,
        title: `${appData.title.split(' - ')[0]} - ${title}`,
    });
    return data.data;
};

const handleCreateEmailSender = async (formData: { email: string }) => {
    const { data } = await apiFetch<{ data: API.EmailSender }>(postEmailSender.api, postEmailSender.method, formData);
    return data.data;
};
const handleUpdateEmailSender = async (id: string, formData: { email: string }) => {
    const { data } = await apiFetch<{ data: API.EmailSender }>(putEmailSender.api(id), putEmailSender.method, formData);
    return data.data;
};
const handleDeleteEmailSender = async (id: string) => {
    const { data } = await apiFetch<{ data: API.EmailSender }>(deleteEmailSender.api(id), deleteEmailSender.method);
    return data.data;
};

const handleCreateAssistant = async ({
    apiKey,
    files,
    credential,
    ...assistantData
}: { apiKey: string; credential?: API.Credential } & AiAssistantFormData) => {
    const { data: assistant } = await apiFetch<API.OpenAIAssistant>(
        postAiAssistant.api(),
        postAiAssistant.method,
        {
            ...assistantData,
            file_ids: files?.filter((file) => file.status === 'ok').map((file) => file.fileId),
            description: '',
            workflow_name: `${mode[assistantData.mode]} | ${assistantData.name}`,
            credential_id: credential?.id,
            credential_name: `${mode[assistantData.mode]}  | ${assistantData.name}`,
        },
        ImbraceClient,
        {
            headers: {
                Authorization: `Bearer ${localStorage.getItem(IMBRACE_ACCESS_TOKEN)}`,
                'api-key': apiKey,
            },
        },
    );
    return assistant;
};

const handleUpdateAssistant = async ({
    apiKey,
    id,
    credential,
    files,
    ...assistantData
}: { apiKey: string; id: string; credential?: API.Credential } & AiAssistantFormData) => {
    const { data: assistant } = await apiFetch<API.OpenAIAssistant>(
        putAiAssistant.api(id),
        putAiAssistant.method,
        {
            ...assistantData,
            file_ids: files?.filter((file) => file.status === 'ok').map((file) => file.fileId),
            description: '',
            workflow_name: `${mode[assistantData.mode]}  | ${assistantData.name}`,
            credential_id: credential?.id,
            credential_name: `${mode[assistantData.mode]}  | ${assistantData.name}`,
        },
        ImbraceClient,
        {
            headers: {
                Authorization: `Bearer ${localStorage.getItem(IMBRACE_ACCESS_TOKEN)}`,
                'api-key': apiKey,
            },
        },
    );
    return assistant;
};

const handleConnectLeads = async ({ productId, channelId }: { productId: string; channelId: string }) => {
    await apiFetch<{ message: string }>(postChannelWorkflows.api(), postChannelWorkflows.method, {
        product_id: productId,
        channel_id: channelId,
    });
};

const Config = () => {
    const { appId, productId } = useParams();
    const dispatch = useAppDispatch();
    const { openHelpCenter } = useNavbar();
    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const supportTouchpoint = useAppSelector((state) => state.Account.support?.customer?.touchpoint);
    const navigate = useNavigate();
    const location = useLocation();
    const { from, step } = (location.state as { from: 'marketplace' | 'detail'; step?: number }) || {};
    const { t, i18n } = useTranslation();
    const languageRef = useRef(i18n.language);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const simpleBarRef = useRef<SimpleBarCore>(null);
    const [shouldPrompt, setShouldPrompt] = useState(from !== 'detail');
    const [iframeLoading, setIframeLoading] = useState(true);
    const [title, setTitle] = useState<string>('');
    const {notify} = useNotify();
    const [{ dialog, dialogForm }, dialogHolder] = useDialog();

    const updateApp = useMutation({
        mutationFn: updateOrgApp,
    });

    const removeApp = useMutation<string, Error, string>({
        mutationFn: removeOrgApp,
    });

    const createEmailSender = useMutation({
        mutationFn: (formData: { email: string; user_id: string }) => handleCreateEmailSender(formData),
    });
    const updateEmailSender = useMutation({
        mutationFn: (formData: { id: string; email: string; user_id: string }) =>
            handleUpdateEmailSender(formData.id, { email: formData.email }),
    });
    const removeEmailSender = useMutation({
        mutationFn: handleDeleteEmailSender,
    });

    const createAiAssistant = useMutation({
        mutationFn: handleCreateAssistant,
        onError: (error) => {
            const notificationPayload = {
                message: t('notification_no_notifications_error'),
                messageType: 'noti_failed',
                variant: 'error',
            };
            dispatch(pushNotification({ notification: notificationPayload }));
        },
    });
    const updateAiAssistant = useMutation({
        mutationFn: handleUpdateAssistant,
        onError: (error) => {
            const notificationPayload = {
                message: t('notification_no_notifications_error'),
                messageType: 'noti_failed',
                variant: 'error',
            };
            dispatch(pushNotification({ notification: notificationPayload }));
        },
    });

    const connectLeads = useMutation({
        mutationFn: handleConnectLeads,
    });

    const { data, isFetching } = useQuery({
        queryKey: ['productUrl', productId || appId],
        queryFn: productId ? fetchProduct : fetchApp,
        enabled: !!appId || !!productId,
    });

    useEffect(() => {
        setTitle(data?.title || '');
    }, [data]);

    useEffect(() => {
        const iframeReducer = async (event: MarketPlaceMessageEvent) => {
            const { action } = event.data;
            if ((env.VITE_APP_ENV === 'dev' || env.VITE_APP_ENV === 'local') && !('source' in event.data)) {
                console.log('app config message', event);
            }
            const iframe = iframeRef.current;
            if (iframe) {
                const generateNewNameWithSuffix = (name: string, total?: number): string => {
                    if (typeof total === 'number') {
                        return `${name} ${addLeadingZero(total + 1)}`;
                    }
                    return name;
                };

                switch (action) {
                    case ADD_NEW: {
                        const { data: messageData } = event.data;
                        switch (messageData?.type) {
                            case 'email_campaign':
                            case 'email_outbound':
                                dialogForm<{ emailSender: string }>({
                                    title: t('senders_email'),
                                    content: (methods, onClose) => <EmailSenderForm methods={methods} onClose={onClose} />,
                                    onClose: () => {},
                                    onConfirm: async (formData) => {
                                        let emailSender: { user_id: string; email: string } | undefined = undefined;
                                        try {
                                            emailSender = JSON.parse(formData.emailSender) as { user_id: string; email: string };
                                        } catch (error) {
                                            console.log(error);
                                        }
                                        if (emailSender?.email && emailSender?.user_id) {
                                            const respData = await createEmailSender.mutateAsync(emailSender);
                                            postMessage({
                                                event,
                                                origin: event?.origin,
                                                action: REFRESH,
                                                data: {
                                                    _id: respData._id,
                                                    name: respData.email,
                                                },
                                            });
                                            setTitle((prev) =>
                                                prev?.indexOf(' - ') === -1
                                                    ? `${prev} - ${respData.email}`
                                                    : prev?.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, respData.email),
                                            );
                                            return true;
                                        }
                                        return false;
                                    },
                                    showCloseButton: true,
                                    hideCancelButton: true,
                                    actionsAlign: 'flex-start',
                                    confirmText: t('save'),
                                    confirmButtonProps: {
                                        size: 'default',
                                    },
                                });
                                break;
                            case 'facebook_social_media_management':
                                openCreateNewCredential({
                                    searchParam: 'facebook',
                                    modalState: 'createNew',
                                    generateNewNameWithSuffix: (credentialName) =>
                                        generateNewNameWithSuffix(credentialName, messageData.credentialTotal),
                                    onResponseAfterCreate: (channel, onClose) => {
                                        postMessage({
                                            event,
                                            action: REFRESH,
                                            origin: event?.origin,
                                            data: {
                                                _id: '_id' in channel ? channel._id : channel.id,
                                                name: channel.name,
                                            },
                                        });
                                        if (productId) {
                                            dialog({
                                                title: t('journey_facebook_social_media_management_connect_leads_title'),
                                                content: <Trans i18nKey={'journey_facebook_social_media_management_connect_leads_desc'} />,
                                                confirmText: t('setup_now'),
                                                cancelText: t('not_now'),
                                                onConfirm: async () => {
                                                    try {
                                                        await connectLeads.mutateAsync({
                                                            productId,
                                                            channelId: channel.id,
                                                        });
                                                        dialog({
                                                            title: t(
                                                                'journey_facebook_social_media_management_connect_leads_successfully_title',
                                                            ),
                                                            content: t(
                                                                'journey_facebook_social_media_management_connect_leads_successfully_desc',
                                                            ),
                                                            confirmText: t('continue_setup'),
                                                            cancelText: t('go_to_workflow'),
                                                            onConfirm: async () => {
                                                                onClose?.();
                                                            },
                                                            onClose: () => {
                                                                if ('workflow_id' in channel) {
                                                                    onClose?.();
                                                                    // always link to ap-wf workflow (v2)
                                                                    navigate('/workflow-v2', {
                                                                        state: {
                                                                            flowId: channel.workflow_id,
                                                                        },
                                                                    });
                                                                }
                                                            },
                                                        });
                                                    } catch (error) {
                                                        console.log(error);
                                                    }
                                                },
                                                onClose: () => {
                                                    onClose?.();
                                                },
                                            });
                                        }
                                    },
                                });
                                break;
                            case 'facebook_leads_management':
                                /** Similar to Facebook app above */
                                openCreateNewCredential({
                                    searchParam: 'facebook',
                                    modalState: 'createNew',
                                    generateNewNameWithSuffix: (credentialName) =>
                                        generateNewNameWithSuffix(credentialName, messageData.credentialTotal),
                                    onResponseAfterCreate: (channel, onClose) => {
                                        postMessage({
                                            event,
                                            action: REFRESH,
                                            origin: event?.origin,
                                            data: {
                                                _id: '_id' in channel ? channel._id : channel.id,
                                                name: channel.name,
                                            },
                                        });
                                        if (productId) {
                                            dialog({
                                                title: t('journey_facebook_social_media_management_connect_leads_title'),
                                                content: t('journey_facebook_social_media_management_connect_leads_desc'),
                                                confirmText: t('setup_now'),
                                                cancelText: t('not_now'),
                                                onConfirm: async () => {
                                                    try {
                                                        await connectLeads.mutateAsync({
                                                            productId,
                                                            channelId: channel.id,
                                                        });
                                                        dialog({
                                                            title: t(
                                                                'journey_facebook_social_media_management_connect_leads_successfully_title',
                                                            ),
                                                            content: t(
                                                                'journey_facebook_social_media_management_connect_leads_successfully_desc',
                                                            ),
                                                            confirmText: t('continue_journey_setup'),
                                                            cancelText: t('go_to_workflow'),
                                                            onConfirm: async () => {
                                                                onClose?.();
                                                            },
                                                            onClose: () => {
                                                                if ('workflow_id' in channel) {
                                                                    onClose?.();
                                                                    // always link to ap-wf workflow (v2)
                                                                    navigate('/workflow-v2', {
                                                                        state: {
                                                                            flowId: channel.workflow_id,
                                                                        },
                                                                    });
                                                                }
                                                            },
                                                        });
                                                    } catch (error) {
                                                        console.log(error);
                                                    }
                                                },
                                                onClose: () => {
                                                    onClose?.();
                                                },
                                            });
                                        }
                                    },
                                });
                                break;
                            case 'whatsapp_outbound':
                                /** Similar to Facebook app above */
                                openCreateNewCredential({
                                    searchParam: 'whatsapp',
                                    modalState: 'createNew',
                                    generateNewNameWithSuffix: (credentialName) =>
                                        generateNewNameWithSuffix(credentialName, messageData.credentialTotal),
                                    onResponseAfterCreate: (channel) => {
                                        postMessage({
                                            event,
                                            action: REFRESH,
                                            origin: event?.origin,
                                            data: {
                                                _id: '_id' in channel ? channel._id : channel.id,
                                                name: channel.name,
                                            },
                                        });
                                    },
                                });
                                break;
                            case 'ai-assistant_management': {
                                const { credentialType } = messageData;
                                openCreateNewCredential({
                                    searchParam: credentialType,
                                    modalState: 'createNew',
                                    generateNewNameWithSuffix: (credentialName) =>
                                        generateNewNameWithSuffix(credentialName, messageData.credentialTotal),
                                    onResponseAfterCreate: (channel) => {
                                        postMessage({
                                            event,
                                            action: REFRESH,
                                            origin: event?.origin,
                                            data: {
                                                _id: '_id' in channel ? channel._id : channel.id,
                                                name: channel.name,
                                            },
                                        });
                                    },
                                });
                                break;
                            }
                            default:
                                break;
                        }

                        break;
                    }
                    case UPDATE_CREDENTIAL: {
                        const { data: messageData } = event.data;
                        switch (messageData?.type) {
                            case 'email_campaign':
                                dialogForm<{ emailSender: string }>({
                                    title: t('senders_email'),
                                    defaultValues: {
                                        emailSender:
                                            messageData?.credential?.user_id && messageData?.credential?.email
                                                ? JSON.stringify({
                                                      user_id: messageData?.credential?.user_id as string,
                                                      email: messageData?.credential?.email as string,
                                                  }) || ''
                                                : '',
                                    },
                                    content: (methods, onClose) => <EmailSenderForm methods={methods} onClose={onClose} />,
                                    onClose: () => {},
                                    onConfirm: async (formData) => {
                                        let emailSender: { user_id: string; email: string } | undefined = undefined;
                                        try {
                                            emailSender = JSON.parse(formData.emailSender) as { user_id: string; email: string };
                                        } catch (error) {
                                            console.log(error);
                                        }
                                        if (emailSender?.email && emailSender?.user_id) {
                                            const respData = await updateEmailSender.mutateAsync({
                                                id: messageData.credential._id as string,
                                                ...emailSender,
                                            });
                                            if (messageData.inUse) {
                                                const inUseAppId = messageData.inUse;
                                                await updateApp.mutateAsync({ appId: inUseAppId, title: emailSender?.email });
                                            }
                                            postMessage({
                                                event,
                                                origin: event?.origin,
                                                action: REFRESH,
                                                data: {
                                                    _id: respData._id,
                                                    name: respData.email,
                                                },
                                            });
                                            setTitle((prev) =>
                                                prev?.indexOf(' - ') === -1
                                                    ? `${prev} - ${respData.email}`
                                                    : prev?.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, respData.email),
                                            );
                                            return true;
                                        }
                                        return false;
                                    },
                                    showCloseButton: true,
                                    hideCancelButton: true,
                                    actionsAlign: 'flex-start',
                                    confirmText: t('save'),
                                    confirmButtonProps: {
                                        size: 'default',
                                    },
                                });
                                break;
                            case 'facebook_social_media_management':
                                // openCreateNewCredential({
                                //     searchParam: 'facebook',
                                //     modalState: 'createNew',
                                //     onResponseAfterCreate: (channel) => {
                                //         postMessage({
                                //             event,
                                //             action: REFRESH,
                                //             origin: event?.origin,
                                //             data: {
                                //                 _id: '_id' in channel ? channel._id : channel.id,
                                //                 name: channel.name,
                                //             },
                                //         });
                                //     },
                                // });
                                break;
                            case 'whatsapp_outbound':
                                // Should be similar to Facebook app above
                                // (currently commented out)
                                break;
                            case 'ai-assistant_management': {
                                // openCreateNewCredential({
                                //     searchParam: 'openai',
                                //     modalState: 'createNew',
                                //     onResponseAfterCreate: (channel) => {
                                //         postMessage({
                                //             event,
                                //             action: REFRESH,
                                //             origin: event?.origin,
                                //             data: {
                                //                 _id: '_id' in channel ? channel._id : channel.id,
                                //                 name: channel.name,
                                //             },
                                //         });
                                //     },
                                // });
                                break;
                            }
                            default:
                                break;
                        }

                        break;
                    }
                    case REMOVE_CREDENTIAL: {
                        const { data: messageData } = event.data;
                        switch (messageData?.type) {
                            case 'email_campaign':
                                if (messageData.credential) {
                                    if (messageData.inUse) {
                                        const inUseAppId = messageData.inUse;
                                        dialog({
                                            title: t('journey_delete_email_sender_title'),
                                            content: t('journey_delete_email_sender_desc'),
                                            onConfirm: async () => {
                                                await removeEmailSender.mutateAsync(messageData.credential._id as string);
                                                await removeApp.mutateAsync(inUseAppId);

                                                postMessage({
                                                    event,
                                                    action: REFRESH,
                                                    origin: event?.origin,
                                                });
                                                setTitle((prev) =>
                                                    prev?.indexOf(messageData.credential.email as string) === -1
                                                        ? prev
                                                        : prev?.replace(` - ${messageData.credential.email as string}`, ''),
                                                );
                                            },
                                            confirmButtonProps: {
                                                type: 'danger',
                                            },
                                        });
                                        return;
                                    }
                                    await removeEmailSender.mutateAsync(messageData.credential._id as string);
                                    postMessage({
                                        event,
                                        action: REFRESH,
                                        origin: event?.origin,
                                    });
                                    setTitle((prev) =>
                                        prev?.indexOf(messageData.credential.email as string) === -1
                                            ? prev
                                            : prev?.replace(` - ${messageData.credential.email as string}`, ''),
                                    );
                                }
                                break;

                            case 'facebook_social_media_management':
                                break;
                            case 'whatsapp_outbound':
                                // Should be similar to Facebook app above
                                break;
                            default:
                                break;
                        }

                        break;
                    }
                    case EDIT_APP: {
                        const { data: messageData } = event.data;

                        navigate(`/journey/${messageData.appId}`, {
                            replace: true,
                        });

                        break;
                    }
                    case ROUTE: {
                        const { data: messageData } = event.data;
                        if (messageData.enabled) {
                            notify({
                                type: 'success',
                                message: t('journey_enabled_successfully', { app: data?.title.split(' - ')[0] }),
                            });
                        }
                        if (messageData.url) {
                            navigate(messageData.url);
                        }
                        break;
                    }
                    case CREDENTIAL_CHANGED: {
                        const { data: messageData } = event.data;
                        setTitle((prev) =>
                            prev.indexOf(' - ') === -1 ? `${prev} - ${messageData.name}` : `${prev.split(' - ')[0]} - ${messageData.name}`,
                        );
                        break;
                    }
                    case OPEN_IN_PROGRESS_MODAL: {
                        const { data: messageData } = event.data;
                        dialog({
                            title: t('journey_setup_in_progress_title'),
                            content: t('journey_setup_in_progress_desc'),
                            confirmText: t('continue_setup'),
                            cancelText: t('start_fresh'),

                            onConfirm: async () => {
                                try {
                                    const {
                                        data: { data: appData },
                                    } = await apiFetch<{ data: API.Journey }>(getAppById.api(messageData.appId), getAppById.method);
                                    postMessage({
                                        action: OPEN_IN_PROGRESS_MODAL,
                                        data: {
                                            type: data?.type as API.ProductType,
                                            appData,
                                            action: 'continue_setup',
                                        },
                                        event,
                                        origin: event?.origin,
                                    });
                                    return true;
                                } catch (error) {
                                    return true;
                                }
                            },
                            onClose: async () => {
                                try {
                                    const {
                                        data: { data: appData },
                                    } = await apiFetch<{ data: API.Journey }>(getAppById.api(messageData.appId), getAppById.method);
                                    postMessage({
                                        action: OPEN_IN_PROGRESS_MODAL,
                                        data: {
                                            type: data?.type as API.ProductType,
                                            appData,
                                            action: 'start_fresh',
                                        },
                                        event,
                                        origin: event?.origin,
                                    });
                                } catch (error) {}
                            },
                        });
                        break;
                    }

                    case ADD_NEW_AI_ASSISTANT:
                    case UPDATE_AI_ASSISTANT: {
                        const { data: messageData } = event.data;
                        dialogForm<AiAssistantFormData, ReturnType<typeof AiAssistantFormDataSchema>>({
                            title: t('journey_ai-assistant_management_setting'),
                            defaultValues:
                                'assistant' in messageData
                                    ? {
                                          name: messageData.assistant.name,
                                          mode: messageData.assistant.mode,
                                          instructions: messageData.assistant.instructions,
                                          files:
                                              messageData.assistant.file_ids.map((fileId) => ({
                                                  id: fileId,
                                                  url: getAiFile.api(fileId),
                                              })) || [],
                                      }
                                    : {
                                          files: [],
                                      },
                            content: (methods) => (
                                <AiAssistantForm
                                    methods={methods}
                                    apiKey={messageData.apiKey}
                                    assistantId={'assistant' in messageData ? messageData.assistant.id : undefined}
                                />
                            ),
                            onClose: () => {},
                            onConfirm: async (formData) => {
                                try {
                                    if ('assistant' in messageData) {
                                        await updateAiAssistant.mutateAsync({
                                            id: messageData.assistant.id,
                                            apiKey: messageData.apiKey,
                                            credential: messageData.credential,
                                            ...formData,
                                        });
                                    } else {
                                        await createAiAssistant.mutateAsync({
                                            apiKey: messageData.apiKey,
                                            credential: messageData.credential,
                                            ...formData,
                                        });
                                    }
                                    postMessage({
                                        event,
                                        action: REFRESH,
                                        origin: event?.origin,
                                    });
                                    return true;
                                } catch (error) {
                                    return false;
                                }
                            },
                            schema: AiAssistantFormDataSchema(t),
                            showCloseButton: true,
                            hideCancelButton: true,
                            actionsAlign: 'flex-start',
                            confirmText: t('save'),
                            confirmButtonProps: {
                                size: 'default',
                            },
                        });
                        break;
                    }
                    case OPEN_UNLOCK_FEATURE: {
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
                        break;
                    }
                    default:
                        break;
                }
            }
        };

        window.addEventListener('message', iframeReducer);
        return () => {
            window.removeEventListener('message', iframeReducer);
        };
    }, [
        t,
        createEmailSender,
        updateEmailSender,
        removeEmailSender,
        navigate,
        createAiAssistant,
        updateAiAssistant,
        removeApp,
        data?.title,
        data?.type,
        notify,
        connectLeads,
        productId,
        openHelpCenter,
        supportChannel,
        supportTouchpoint,
        dialog,
        dialogForm,
        updateApp,
    ]);

    useEffect(() => {
        postMessage({
            action: SET_LANGUAGE,
            data: {
                language: i18n.language,
            },
            target: iframeRef.current?.contentWindow,
            origin: env.VITE_APP_ENV === 'local' ? '*' : env.VITE_APP_WCS_HOST,
        });
    }, [i18n.language]);

    const targetUrl = useMemo(() => {
        if (env.VITE_APP_ENV === 'local' && data) {
            return `/marketplace/iframe${data.url.slice(data.url.indexOf('/app'), data.url.length)}`;
        }
        return data?.url || '';
    }, [data]);

    const iframeSrc = useMemo(() => {
        const searchParams = new URLSearchParams();
        if (typeof step !== 'undefined') {
            searchParams.append('step', `${step}`);
        }

        searchParams.append('ac', localStorage.getItem(IMBRACE_ACCESS_TOKEN) || '');
        searchParams.append('lang', languageRef.current ?? 'en');
        if (productId) {
            searchParams.append('p', productId);
        }
        if (appId) {
            searchParams.append('t', appId);
        }
        return `${targetUrl}?${searchParams.toString()}`;
    }, [targetUrl, appId, productId, step]);

    const checkCurrentDataIsDirty = useCallback(() => {
        return new Promise<
            | ({
                  type: API.ProductType;
                  isDirty: boolean;
              } & Partial<API.Journey>)
            | undefined
        >((resolve) => {
            const timer = setTimeout(() => {
                resolve(undefined);
                window.removeEventListener('message', iframeReducer);
            }, 1000);
            const iframeReducer = (event: MarketPlaceMessageEvent) => {
                const { action } = event.data;
                const iframe = iframeRef.current;

                if (iframe) {
                    switch (action) {
                        case CURRENT_DATA: {
                            const { data: appData } = event.data;
                            clearTimeout(timer);
                            window.removeEventListener('message', iframeReducer);
                            resolve(appData);
                            break;
                        }
                        default:
                            break;
                    }
                }
            };
            window.addEventListener('message', iframeReducer);

            postMessage({
                target: iframeRef.current?.contentWindow,
                action: CURRENT_DATA,
                origin: env.VITE_APP_ENV === 'local' ? '*' : env.VITE_APP_WCS_HOST,
            });
        });
    }, []);

    const onBack = useCallback(async () => {
        if (from === 'detail' && (productId || (data && 'productId' in data && data?.productId))) {
            navigate(`/journeys/libraries/${productId || (data && 'productId' in data && data?.productId)}`);
            return;
        }
        if (from === 'marketplace') {
            navigate('/journeys/org');
            return;
        }
        navigate('/journeys/org');
    }, [navigate, from, productId, data]);

    usePrompt(
        {
            title: t('journey_save_and_exit_dialog_title'),
            content: t('journey_save_and_exit_dialog_desc'),
            confirmText: t('save_and_exit'),
            cancelText: t('discard'),
            saveExitFn: async () => {
                postMessage({
                    target: iframeRef.current?.contentWindow,
                    action: SAVE_AND_EXIT,
                    data: {
                        action: 'confirm',
                    },
                    origin: env.VITE_APP_ENV === 'local' ? '*' : env.VITE_APP_WCS_HOST,
                });

                setShouldPrompt(false);
                return false;
            },
            discardFn: async () => {},
        },
        shouldPrompt,
        () => {
            return true;
        },
        async () => {
            const result = await checkCurrentDataIsDirty();
            return (result && result?.isDirty && result.user_progress && result.user_progress.steps > 0) || false;
        },
    );

    return (
        <PageLayout
            onBack={onBack}
            backBtnText={t(from === 'detail' ? 'journey_detail_preview' : from === 'marketplace' ? 'menu_journeys' : 'menu_journeys')}
            title={
                data
                    ? `${t(`journey_${data.type}_title`, title.split(' - ')[0])}${
                          title.split(' - ')[1] ? ` - ${title.split(' - ')[1]}` : ''
                      }`
                    : ''
            }
            loading={isFetching || iframeLoading}
            simpleBarRef={simpleBarRef}
        >
            {dialogHolder}
            <div className={styles.container}>
                {data?.url && (
                    <Iframe
                        ref={iframeRef}
                        title={`${title}`}
                        allow="fullscreen"
                        src={iframeSrc}
                        onLoad={() => {
                            setIframeLoading(false);
                        }}
                    />
                )}
            </div>
        </PageLayout>
    );
};

export default Config;
