import { Button, Icon, Typography } from '@imbrace/ui';
import { Box, CircularProgress } from '@mui/material';
import type { QueryFunction } from '@tanstack/react-query';
import { QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { SubmitHandler } from 'react-hook-form';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Provider } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { HistoryRouter as Router } from 'redux-first-history/rr6';

import { queryClient } from '@/App';
import GoogleApiIcon from '@/assets/icons/credential_googleApi.svg?react';
import GoogleOAuthApiIcon from '@/assets/icons/credential_googleOAuth2Api.svg?react';
import GoogleVertexAIApi from '@/assets/icons/credential_googleVertexAIApi.svg?react';
import MicrosoftOAuthApiIcon from '@/assets/icons/credential_microsoftOAuth2Api.svg?react';
import PostgresIcon from '@/assets/icons/credential_postgres.svg?react';
import TwitterOAuthApiIcon from '@/assets/icons/credential_twitterOAuth1Api.svg?react';
import WiseApiIcon from '@/assets/icons/credential_wiseApi.svg?react';
import FacebookConnect from '@/pages/Channels/components/FacebookConnect';
import InstagramConnect from '@/pages/Channels/components/InstagramConnect';
import WhatsAppConnect from '@/pages/Channels/components/WhatsAppConnect';
import { pushNotification } from '@/redux/slices/notification';
import store, { history, useAppDispatch, useAppSelector } from '@/redux/store';
import { channelCount, createEmail, createLine, createWebWidget, createWebWidgetV3, createWechat, createWhatsapp } from '@/services/api/channel';
import { createCredential, getCredentialParams, getCredentialTypeByName, oAuth1Authorize, oAuth2Authorize } from '@/services/api/workflow';
import { ImbraceWorkflow } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { addLeadingZero } from '@/utils/NumberHelper';
import { formatCredentialName } from '@/utils/StringHelper';

import { DynamicIcon } from '../../AddNewCredentials';
import { getDefaultValue, getDisplayOptions } from '../../helpers';
import DialogModal from '../DialogModal';
import DocLinkChip from '../DocLinkChip';
import { StyledDialogTitle, StyledSubtitle } from '../StyledComponents';
import FieldItem from '../TypeFields';

interface Props {
    modalState: string;
    searchParam: string;
    open: boolean;
    onClose: () => void;
    onReload?: () => void;
    generateNewNameWithSuffix?: (name: string) => string;
    onResponseAfterCreate?: (data: API.Channel | API.CredentialData, onClose?: () => void) => void;
    avoidOnBoarding?: boolean;
}

export interface WebWidgetEmailChannel {
    name: string;
}

export interface LineChannel {
    name: string;
    config: {
        type: string;
        line_channel_token: string;
        line_channel_secret: string;
        line_channel_id: string;
    };
}

export interface WhatsappChannel {
    name: string;
    config: {
        type: string;
        access_key: string;
        phone_number: string;
        phone_number_id: string;
        business_account_id: string;
    };
}

export interface WechatChannel {
    name: string;
    config: {
        type: string;
        user_name: string;
        app_id: string;
        secret: string;
        token: string;
        encoding_aes_key: string;
    };
}

interface FieldNameMapping {
    [key: string]: string;
}

export const CONVERSATION_CHANNELS = ['web', 'email', 'facebook', 'whatsapp', 'wechat', 'line', 'instagram'];

const typeMap: Record<string, string> = {
    web: 'Web Widget',
    email: 'Email',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    wechat: 'WeChat',
    line: 'Line',
    instagram: 'Instagram',
};

const isSuccessClass = {
    backgroundColor: 'white',
    border: '1px solid var(--color-green-1)',
    '&:disabled': {
        color: 'var(--color-green-1)',
        backgroundColor: 'white',
    },
};

export const credentialNameOpt = {
    displayName: 'Credential Name',
    name: 'credentialName',
    type: 'string',
    default: '',
    description: '',
    required: true,
};

export const gitbookDocUrl = (name?: string) => {
    switch (name) {
        case 'web':
            return 'https://imbrace.gitbook.io/imbrace-no-code-workflow/channels/web-widget';
        case 'wechat':
            return 'https://imbrace.gitbook.io/imbrace-no-code-workflow/channels/wechat';
        case 'whatsapp':
            return 'https://imbrace.gitbook.io/imbrace-no-code-workflow/channels/whatsapp';
        case 'line':
            return 'https://imbrace.gitbook.io/imbrace-no-code-workflow/channels/line';
        case 'facebook':
            return 'https://imbrace.gitbook.io/imbrace-no-code-workflow/channels/facebook';
        case 'monday':
        case 'mondayCom':
        case 'mondaycom':
            return 'https://imbrace.gitbook.io/imbrace-no-code-workflow/integrations/monday.com';
        case 'zoho':
            return 'https://imbrace.gitbook.io/imbrace-no-code-workflow/integrations/zoho-crm';
        case 'serviceNow':
            return 'https://imbrace.gitbook.io/imbrace-no-code-workflow/integrations/servicenow';
        case 'clickUp':
            return 'https://imbrace.gitbook.io/imbrace-no-code-workflow/integrations/clickup';
        case 'airtable':
        case 'asana':
        case 'aws':
        case 'freshdesk':
        case 'freshservice':
        case 'freshworks':
        case 'google':
        case 'hubspot':
        case 'mailchimp':
        case 'messageBird':
        case 'microsoft':
        case 'mindee':
        case 'odoo':
        case 'salesforce':
        case 'shopify':
        case 'slack':
        case 'stripe':
        case 'telegram':
        case 'trello':
        case 'twilio':
        case 'vonage':
        case 'webflow':
        case 'xero':
        case 'zendesk':
        case 'zoom':
            return `https://imbrace.gitbook.io/imbrace-no-code-workflow/integrations/${name.toLowerCase()}`;
        default:
            return '';
    }
};

const displayNameMapping = (name?: string) => {
    if (!name) return;
    switch (name) {
        case 'facebookGraph':
        case 'facebookGraphApp':
            return 'Facebook';
        case 'getResponseOAuth2Api':
            return 'GetResponse';
        case 'mondayCom':
        case 'monday':
            return 'Monday.com';
        default:
            return formatCredentialName(name);
    }
};

export const fetchCredentialType: QueryFunction<API.CredentialType, ['credentialType', string]> = async ({ queryKey }) => {
    const { data } = await apiFetch<API.CredentialType>(getCredentialParams.api(queryKey[1]), getCredentialTypeByName.method);
    return data;
};

export const IntegrationIcon = ({
    credential,
    width = 41,
    height = 41,
}: {
    credential?: API.CredentialType;
    width?: number;
    height?: number;
}) => {
    const size = useMemo(
        () => ({
            width,
            height,
        }),
        [width, height],
    );

    const renderIntegrationIcon = useCallback(() => {
        if (!credential) {
            return null;
        }
        if (credential && !credential.hasOwnProperty('icon')) {
            switch (credential.name) {
                case 'googleOAuth2Api':
                    return <GoogleOAuthApiIcon style={size} />;
                case 'microsoftOAuth2Api':
                    return <MicrosoftOAuthApiIcon style={size} />;
                case 'postgres':
                    return <PostgresIcon style={size} />;
                case 'twitterOAuth1Api':
                    return <TwitterOAuthApiIcon style={size} />;
                case 'wiseApi':
                    return <WiseApiIcon style={size} />;
                default:
                    return <Box sx={size} />;
            }
        }
        if (credential && credential.icon.startsWith('fa:')) {
            const iconName = `${credential.icon.split('fa:')[1]}`;
            return (
                <Box
                    sx={{
                        fontSize: '20px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        ...size,
                    }}
                >
                    <DynamicIcon iconName={iconName} />
                </Box>
            );
        }
        switch (credential.name) {
            case 'googleVertexAIApi':
                return <GoogleVertexAIApi style={size} />;
            case 'googleApi':
                return <GoogleApiIcon style={size} />;
            default:
                return (
                    <img
                        alt={credential.displayName}
                        src={credential.icon}
                        style={{
                            objectFit: 'cover',
                            height: size.height,
                        }}
                    />
                );
        }
    }, [credential, size]);

    return renderIntegrationIcon();
};

const CreateNewCredential: FC<Props> = (props) => {
    const { open, modalState, searchParam, onClose, onReload, generateNewNameWithSuffix, onResponseAfterCreate, avoidOnBoarding } = props;
    const dispatch = useAppDispatch();
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const organizationPartition = useAppSelector((state) => state.Account.partition);
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [submitState, setSubmitState] = useState<boolean>(false);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);
    const [activeStep, setActiveStep] = useState<number>(0);
    const stepTitle = useRef<string>();
    const wechatUserName = useRef<string>();

    const isChannelCredential = CONVERSATION_CHANNELS.includes(searchParam);

    const { data: credential, isFetching } = useQuery({
        queryFn: fetchCredentialType,
        queryKey: ['credentialType', searchParam],
        enabled: open && !!searchParam,
    });

    const changeCredentialName = useMutation({
        mutationFn: async (credentialName: string) => {
            if (isChannelCredential) {
                // Default title for Facebook
                if (searchParam === 'facebook') {
                    return t('credentials_facebook_setup');
                }
                if (searchParam === 'instagram') {
                    return t('credentials_instagram_setup');
                }

                const { data } = await apiFetch<API.ChannelCount>(channelCount.api(), channelCount.method);
                if (data) {
                    const count = data[searchParam as keyof API.ChannelCount];
                    return `${typeMap[searchParam]} ${addLeadingZero(count + 1)}`;
                }
                return '';
            }
            if (generateNewNameWithSuffix) {
                return generateNewNameWithSuffix(credentialName);
            }
            return '';
        },
        onSuccess: (data) => {
            setValue('credentialName', data);
        },
    });

    useEffect(() => {
        if (open && changeCredentialName.isIdle && credential) {
            changeCredentialName.mutate(credential.displayName);
        }
    }, [open, changeCredentialName, credential]);

    useEffect(() => {
        if (!open || isChannelCredential) return;
        const url = gitbookDocUrl(credential?.documentationUrl ?? searchParam);
        const screenLeft = window.screenLeft;
        const screenTop = window.screenTop;
        const left = window.outerWidth - 500 + screenLeft;
        const top = window.outerHeight - 762 + screenTop;
        if (url === '') return;
        window.open(
            gitbookDocUrl(credential?.documentationUrl ?? searchParam),
            'Setup Step by Step Guide',
            `scrollbars=no,resizable=yes,status=no,titlebar=noe,location=no,toolbar=no,menubar=no,width=500,height=700,left=${left},top=${top}`,
        );
    }, [credential, searchParam, open, isChannelCredential]);

    const fieldNameMapping = useMemo<FieldNameMapping>(() => {
        return {
            line_channel_id: t(`imbrace_credentials.${searchParam}.line_channel_id.displayName`),
            line_channel_secret: t(`imbrace_credentials.${searchParam}.line_channel_secret.displayName`),
            line_channel_token: t(`imbrace_credentials.${searchParam}.line_channel_token.displayName`),
            page_id: t(`imbrace_credentials.${searchParam}.page_id.displayName`), // facebook
            phone_number: t(`imbrace_credentials.${searchParam}.phone_number.displayName`), // whatsapp
            phone_number_id: t(`imbrace_credentials.${searchParam}.phone_number_id.displayName`), // whatsapp
            business_account_id: t(`imbrace_credentials.${searchParam}.business_account_id.displayName`), // whatsapp
            access_key: t(`imbrace_credentials.${searchParam}.access_key.displayName`), // whatsapp
            app_id: t(`imbrace_credentials.${searchParam}.app_id.displayName`), // wechat
            token: t(`imbrace_credentials.${searchParam}.token.displayName`), // wechat
            secret: t(`imbrace_credentials.${searchParam}.secret.displayName`), // wechat
            encoding_aes_key: t(`imbrace_credentials.${searchParam}.encoding_aes_key.displayName`), // wechat
            user_name: t(`imbrace_credentials.${searchParam}.user_name.displayName`), // wechat
        };
    }, [searchParam, t]);

    const methods = useForm<Record<string, string>>({
        mode: 'all',
        defaultValues: {
            credentialName: '',
        },
    });
    const {
        handleSubmit,
        control,
        watch,
        setValue,
        reset,
        trigger,
        clearErrors,
        formState: { errors },
    } = methods;

    const isOAuthType = useCallback(() => {
        return searchParam.includes('OAuth');
    }, [searchParam]);

    const dispatchErrorToast = useCallback(
        (error: AxiosError) => {
            const validateArr = error?.response?.data?.validate.split('.');
            const errorField = validateArr?.[validateArr.length - 1];

            const message =
                error?.response?.data?.message === 'Duplicate key'
                    ? `${t('credential_notification_duplicate_key')}: ${fieldNameMapping[errorField]}`
                    : error?.response?.data?.message;

            const notificationPayload = {
                message,
                messageType: 'noti_failed',
                variant: 'error',
            };
            dispatch(pushNotification({ notification: notificationPayload }));
        },
        [dispatch, t, fieldNameMapping],
    );

    const handleOnClose = useCallback(() => {
        clearErrors();
        onClose();
        setActiveStep(0);
        onReload && onReload();
    }, [clearErrors, onClose, onReload]);

    const createWebWidgetChannel = useCallback(
        async (newData: WebWidgetEmailChannel) => {
            try {
                const { data } = await apiFetch<API.Channel | { data: API.Channel }>(
                    createWebWidgetV3.api(),
                    createWebWidgetV3.method,
                    newData,
                );
                // v3 endpoint may wrap the channel in a `{ data }` envelope; unwrap so the
                // created channel (with top-level `id`) reaches onResponseAfterCreate.
                const channel = (data && 'data' in data ? data.data : data) as API.Channel | undefined;
                if (channel?.id) {
                    changeCredentialName.reset();
                    onResponseAfterCreate && onResponseAfterCreate(channel, handleOnClose);
                }
            } catch (err) {
                console.error('createWebWidgetChannel error: ', err);
            }
        },
        [onResponseAfterCreate, handleOnClose, changeCredentialName],
    );

    const createEmailChannel = useCallback(
        async (newData: WebWidgetEmailChannel) => {
            try {
                await apiFetch<API.Channel>(createEmail.api(), createEmail.method, newData);
                changeCredentialName.reset();
            } catch (err) {
                console.error('createEmailChannel error: ', err);
            }
        },
        [changeCredentialName],
    );

    const createLineChannel = useCallback(
        async (newData: LineChannel) => {
            try {
                const { data } = await apiFetch<API.Channel>(createLine.api(), createLine.method, newData);
                if (data) {
                    changeCredentialName.reset();
                    onResponseAfterCreate && onResponseAfterCreate(data, handleOnClose);
                }
            } catch (err) {
                const error = err as AxiosError;
                dispatchErrorToast(error);
                console.error('createLineChannel error: ', err);
            }
        },
        [dispatchErrorToast, onResponseAfterCreate, handleOnClose, changeCredentialName],
    );

    const createWhatsappChannel = useCallback(
        async (newData: WhatsappChannel) => {
            try {
                const { data } = await apiFetch<API.Channel>(createWhatsapp.api(), createWhatsapp.method, newData);
                if (data) {
                    onResponseAfterCreate && onResponseAfterCreate(data, handleOnClose);
                }
            } catch (err) {
                const error = err as AxiosError;
                dispatchErrorToast(error);
                console.error('whatsapp error: ', error?.response?.data?.message);
            }
        },
        [dispatchErrorToast, onResponseAfterCreate, handleOnClose],
    );

    const createWechatChannel = useCallback(
        async (newData: WechatChannel) => {
            try {
                const res = await apiFetch<API.Channel>(createWechat.api(), createWechat.method, newData);
                const { data } = res;
                if (data) {
                    changeCredentialName.reset();
                    onResponseAfterCreate && onResponseAfterCreate(data, handleOnClose);
                }
                return res;
            } catch (err) {
                const error = err as AxiosError;
                console.error('createWechatChannel error: ', error);
                dispatchErrorToast(error);
            }
        },
        [dispatchErrorToast, onResponseAfterCreate, handleOnClose, changeCredentialName],
    );

    const createNewCredential = useCallback(
        async (newData: Credential) => {
            try {
                const res = await apiFetch<{
                    data: API.CredentialData;
                }>(createCredential.api(), createCredential.method, newData, ImbraceWorkflow);
                const { data } = res;
                if (data) {
                    changeCredentialName.reset();
                    onResponseAfterCreate && onResponseAfterCreate(data.data, handleOnClose);
                }
                return res;
            } catch (error) {
                setSubmitState(false);
                console.error('createCredential error: ', error);
            }
        },
        [onResponseAfterCreate, handleOnClose, changeCredentialName],
    );

    const oAuthCredentialAuthorize = useCallback(
        async (credentialId: string | undefined) => {
            if (!credentialId) return;

            try {
                const propertyMap: Record<string, string> = {};
                credential?.properties.forEach((item) => {
                    propertyMap[item.name] = item.default;
                });
                const param = `authUrl=${propertyMap.authUrl}&accessTokenUrl=${propertyMap.accessTokenUrl}&clientId=${watch(
                    'clientId',
                )}&clientSecret=${watch('clientSecret')}&scope=${propertyMap.scope}&authQueryParameters=${
                    propertyMap.authQueryParameters
                }&authentication=${propertyMap.authentication}&id=${credentialId}`;

                if (credential?.name.includes('OAuth2')) {
                    const { data } = await apiFetch<{ data: URL }>(oAuth2Authorize.api(param), oAuth2Authorize.method);
                    return data;
                } else if (credential?.name.includes('OAuth1')) {
                    const { data } = await apiFetch<{ data: URL }>(oAuth1Authorize.api(param), oAuth1Authorize.method);
                    return data;
                }
            } catch (error) {
                console.error('OAuth Credential Auth error: ', error);
            }
        },
        [credential, watch],
    );

    const formSubmitHandler: SubmitHandler<Record<string, string>> = useCallback(
        async (data) => {
            try {
                setSubmitState(true);
                const newCredentialData: Omit<API.Credential, 'touchpoints' | 'workflows'> = {
                    id: '',
                    name: data.credentialName,
                    type: searchParam, // type = credential name
                    data: {
                        ...data,
                    },
                    nodesAccess: [],
                };

                let newChannel: API.Channel | undefined;

                // Create new channel
                if (isChannelCredential) {
                    if (searchParam === 'web') {
                        const newData: WebWidgetEmailChannel = {
                            name: data.credentialName,
                        };
                        const res = await createWebWidgetChannel(newData);
                        newChannel = res as unknown as API.Channel;
                    }
                    if (searchParam === 'email') {
                        const newData: WebWidgetEmailChannel = {
                            name: data.credentialName,
                        };
                        await createEmailChannel(newData);
                        reset({
                            credentialName: '',
                        });
                    }
                    if (searchParam === 'line') {
                        const newData: LineChannel = {
                            name: data.credentialName,
                            config: {
                                type: 'line',
                                line_channel_token: data.line_channel_token,
                                line_channel_secret: data.line_channel_secret,
                                line_channel_id: data.line_channel_id,
                            },
                        };
                        await createLineChannel(newData);
                        reset({
                            credentialName: '',
                            line_channel_token: '',
                            line_channel_secret: '',
                            line_channel_id: '',
                        });
                    }
                    if (searchParam === 'whatsapp') {
                        const newData: WhatsappChannel = {
                            name: data.credentialName,
                            config: {
                                type: 'whatsapp',
                                access_key: data.access_key,
                                phone_number: data.phone_number,
                                phone_number_id: data.phone_number_id,
                                business_account_id: data.business_account_id,
                            },
                        };
                        await createWhatsappChannel(newData);
                        reset({
                            credentialName: '',
                            access_key: '',
                            phone_number: '',
                            phone_number_id: '',
                            business_account_id: '',
                        });
                    }
                    if (searchParam === 'wechat') {
                        const newData: WechatChannel = {
                            name: data.credentialName,
                            config: {
                                type: 'wechat',
                                user_name: data.user_name,
                                app_id: data.app_id,
                                secret: data.secret,
                                token: data.token,
                                encoding_aes_key: data.encoding_aes_key,
                            },
                        };
                        const res = await createWechatChannel(newData);
                        if (res && res.status === 200) {
                            stepTitle.current = res.data.name;
                            wechatUserName.current = res.data.config.user_name;
                            setActiveStep((prevState) => prevState + 1);

                            reset({
                                credentialName: '',
                                user_name: '',
                                app_id: '',
                                secret: '',
                                token: '',
                                encoding_aes_key: '',
                            });
                        }
                    }
                    // if (pathname === '/channels/new') {
                    //     navigate('/channels');
                    // }
                } else {
                    // Create workflow third-party credentials
                    const res = await createNewCredential(newCredentialData);

                    if (isOAuthType()) {
                        const credentialId = res?.data.data.id;
                        const oAuth2Res = await oAuthCredentialAuthorize(credentialId);
                        const url = oAuth2Res?.data;
                        const params =
                            'scrollbars=no,resizable=yes,status=no,titlebar=noe,location=no,toolbar=no,menubar=no,width=500,height=700';
                        const oauthPopup = window.open(url, 'OAuth2 Authorization', params);

                        const receiveMessage = (event: MessageEvent) => {
                            if (event.data === 'success') {
                                setIsSuccess(true);
                                window.removeEventListener('message', receiveMessage, false);

                                // Close the window
                                if (oauthPopup) {
                                    oauthPopup.close();
                                }
                            }
                        };
                        window.addEventListener('message', receiveMessage, false);
                    }
                }

                onReload && onReload();
                setSubmitState(false);

                if (isChannelCredential && searchParam !== 'web' && pathname === '/channels/new') {
                    navigate('/channels');
                    return;
                }

                // make sure the following type not auto-close dialog when task completed
                !isOAuthType() &&
                    searchParam !== 'wechat' &&
                    searchParam !== 'facebook' &&
                    searchParam !== 'instagram' &&
                    !(searchParam === 'web' && newChannel && 'response' in newChannel) &&
                    handleOnClose();

                if (pathname === '/credentials/new' && searchParam !== 'wechat') {
                    navigate('/credentials');
                }
            } catch (error) {
                setSubmitState(false);
                return;
            }
        },
        [
            isChannelCredential,
            navigate,
            pathname,
            reset,
            createNewCredential,
            searchParam,
            isOAuthType,
            oAuthCredentialAuthorize,
            handleOnClose,
            onReload,
            createWebWidgetChannel,
            createLineChannel,
            createEmailChannel,
            createWhatsappChannel,
            createWechatChannel,
        ],
    );

    const onNext = async () => {
        if (activeStep === 2) return;

        try {
            const errorCheck = await trigger();
            if (!errorCheck) return;
            await handleSubmit(formSubmitHandler)();
        } catch (error) {
            console.error('wechat form error', error);
        }
    };

    const onCloseAndRedirect = () => {
        onClose();
        if (onReload) onReload();
    };

    const workflowDomain = useMemo(() => {
        return '';
    }, [organizationPartition, organizationId]);

    const renderFormFields = () => {
        if (!credential) return null;

        const credentialParamsProps: API.PropertyType[] =
            credential.name === 'wechat'
                ? credential.properties.filter((fieldItem) => fieldItem.name !== 'webhookUrl')
                : credential && credential.properties;

        // Add credential name to properties without mutating the original array
        const modifiedCredentialParamsProps = !CONVERSATION_CHANNELS.includes(searchParam)
            ? [credentialNameOpt, ...credentialParamsProps]
            : credentialParamsProps;

        return (
            <>
                {modifiedCredentialParamsProps &&
                    modifiedCredentialParamsProps.map((fieldItem: API.PropertyType) => {
                        const { displayName, displayOptions, typeOptions, name, ...rest } = fieldItem;
                        const displayOpts = getDisplayOptions(credentialParamsProps);
                        const optDefaultValue = getDefaultValue(credentialParamsProps, Object.keys(displayOpts)[0]);

                        const watchShowParams = {} as Record<string, string | boolean>;
                        if (displayOptions?.show) {
                            Object.keys(displayOptions.show).forEach((key) => {
                                watchShowParams[key] = watch(key) ?? optDefaultValue;
                            });
                        }

                        if (fieldItem.name === 'webhookUrl') {
                            setValue('webhookUrl', fieldItem.default);
                        }

                        let val;
                        // OAuth Redirect URL
                        if (fieldItem.name === 'oAuthRedirectUrl') {
                            val = `${workflowDomain}/rest/oauth2-credential/callback`;
                        } else {
                            val = fieldItem.default;
                        }

                        const lastExtend = credential.totalExtends && credential.totalExtends[credential.totalExtends.length - 1];

                        return (
                            <Controller
                                key={fieldItem.name}
                                name={fieldItem.name}
                                control={control}
                                rules={{
                                    required: {
                                        value: !!fieldItem?.required,
                                        message: t('validation_field_required'),
                                    },
                                }}
                                defaultValue={val}
                                render={({ field }) => {
                                    return (
                                        <FieldItem
                                            {...field}
                                            displayName={displayName}
                                            error={errors[fieldItem.name]}
                                            watchShowParams={watchShowParams}
                                            displayOptions={displayOptions}
                                            credentialType={
                                                credential.hasOwnProperty('extends') && credential.extends.length > 0
                                                    ? (lastExtend as string)
                                                    : credential.name
                                            }
                                            {...rest}
                                        />
                                    );
                                }}
                            />
                        );
                    })}
            </>
        );
    };

    const renderWebhookField = () => {
        return (
            <>
                {credential?.properties
                    .filter((fieldItem) => fieldItem.name === 'webhookUrl')
                    .map((fieldItem) => {
                        const { displayName, displayOptions, typeOptions, ...rest } = fieldItem;
                        return (
                            <Controller
                                key={fieldItem.name}
                                name={fieldItem.name}
                                control={control}
                                defaultValue={`${fieldItem.default}/${wechatUserName.current}`}
                                render={({ field }) => {
                                    return (
                                        <FieldItem
                                            {...field}
                                            displayName={displayName}
                                            error={errors[fieldItem.name]}
                                            credentialType={credential.name}
                                            {...rest}
                                        />
                                    );
                                }}
                            />
                        );
                    })}
            </>
        );
    };

    const renderButton = () => {
        if (isOAuthType()) {
            return (
                <Box>
                    <Button
                        disabled={isSuccess}
                        text={isSuccess ? t('credentials_oauth_connected') : t('credentials_oauth_connect')}
                        onClick={handleSubmit(formSubmitHandler)}
                        loading={submitState}
                        sx={{ minWidth: '160px', ...(isSuccess && isSuccessClass) }}
                    />
                </Box>
            );
        } else {
            if (searchParam === 'facebook' || searchParam === 'instagram') {
                return null;
            } else {
                return (
                    <Box>
                        <Button
                            text={t('credentials_new_dialog_create_button')}
                            onClick={handleSubmit(formSubmitHandler)}
                            loading={submitState}
                            sx={{ minWidth: '160px' }}
                        />
                    </Box>
                );
            }
        }
    };

    const isSocialConnect = searchParam === 'facebook' || searchParam === 'instagram';

    const channelModalHeader = () => {
        return (
            <>
                {activeStep === 0 && (
                    <>
                        <Box
                            sx={{
                                height: '70px',
                                paddingBottom: '16px',
                                borderBottom: '1px solid var(--color-light-3)',
                                marginBottom: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                {renderChannelIcon()}
                            </Box>
                            <div>
                                <Box sx={{ display: 'flex', alignItems: 'center', height: 24 }}>
                                    <StyledDialogTitle sx={{ padding: '0 6px 4px 0' }}>
                                        {t('channels_setup_heading', {
                                            name: typeMap[searchParam],
                                        })}
                                    </StyledDialogTitle>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <StyledSubtitle>{typeMap[searchParam]}</StyledSubtitle>
                                    {gitbookDocUrl(searchParam) !== '' && <DocLinkChip url={gitbookDocUrl(searchParam)} />}
                                </Box>
                            </div>
                        </Box>
                    </>
                )}

                {activeStep === 1 && (
                    <Box sx={{ height: '100%' }}>
                        <Box
                            sx={{
                                height: '70px',
                                paddingBottom: '16px',
                                borderBottom: '1px solid var(--color-light-3)',
                                marginBottom: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                {renderChannelIcon()}
                            </Box>

                            <div>
                                <Box sx={{ display: 'flex', alignItems: 'center', height: 24 }}>
                                    <StyledDialogTitle sx={{ padding: '0 6px 4px 0' }}>{watch('credentialName')}</StyledDialogTitle>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <StyledSubtitle>{typeMap[searchParam]}</StyledSubtitle>
                                    {gitbookDocUrl(searchParam) !== '' && <DocLinkChip url={gitbookDocUrl(searchParam)} />}
                                </Box>
                            </div>
                        </Box>
                    </Box>
                )}

                {/* For WeChat Only */}
                {activeStep === 2 && (
                    <Box sx={{ height: '100%' }}>
                        <Box
                            sx={{
                                height: '70px',
                                paddingBottom: '16px',
                                borderBottom: '1px solid var(--color-light-3)',
                                marginBottom: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                {renderChannelIcon()}
                            </Box>

                            <div>
                                <Box sx={{ display: 'flex', alignItems: 'center', height: 24 }}>
                                    <StyledDialogTitle sx={{ padding: '0 6px 4px 0' }}>
                                        {/*{watch('credentialName')}*/}
                                        {stepTitle.current}
                                    </StyledDialogTitle>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <StyledSubtitle>{typeMap[searchParam]}</StyledSubtitle>
                                    {gitbookDocUrl(searchParam) !== '' && <DocLinkChip url={gitbookDocUrl(searchParam)} />}
                                </Box>
                            </div>
                        </Box>
                    </Box>
                )}
            </>
        );
    };

    const integrationModalHeader = () => {
        return (
            <>
                {activeStep === 0 && (
                    <>
                        <Box
                            sx={{
                                height: '70px',
                                paddingBottom: '16px',
                                borderBottom: '1px solid var(--color-light-3)',
                                marginBottom: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <IntegrationIcon credential={credential} />
                            </Box>
                            <div>
                                <Box sx={{ display: 'flex', alignItems: 'center', height: 24 }}>
                                    <StyledDialogTitle sx={{ padding: '0 6px 4px 0' }}>
                                        {t('integrations_heading', {
                                            name: displayNameMapping(credential?.documentationUrl ?? credential?.name),
                                        })}
                                    </StyledDialogTitle>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <StyledSubtitle>{credential?.displayName}</StyledSubtitle>
                                    {credential && gitbookDocUrl(credential.documentationUrl) !== '' && (
                                        <DocLinkChip url={gitbookDocUrl(credential.documentationUrl)} />
                                    )}
                                </Box>
                            </div>
                        </Box>
                    </>
                )}

                {activeStep === 1 && (
                    <Box sx={{ height: '100%' }}>
                        <Box
                            sx={{
                                height: '70px',
                                paddingBottom: '16px',
                                borderBottom: '1px solid var(--color-light-3)',
                                marginBottom: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <IntegrationIcon credential={credential} />
                            </Box>

                            <div>
                                <Box sx={{ display: 'flex', alignItems: 'center', height: 24 }}>
                                    <StyledDialogTitle sx={{ padding: '0 6px 4px 0' }}>{watch('credentialName')}</StyledDialogTitle>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <StyledSubtitle>{credential?.displayName}</StyledSubtitle>
                                    {credential && gitbookDocUrl(credential.documentationUrl) !== '' && (
                                        <DocLinkChip url={gitbookDocUrl(credential.documentationUrl)} />
                                    )}
                                </Box>
                            </div>
                        </Box>
                    </Box>
                )}
            </>
        );
    };

    const renderChannelIcon = useCallback(() => {
        switch (searchParam) {
            case 'facebook':
                return <Icon namespace="channel" name="facebook" fontSize={41} />;
            case 'instagram':
                return <Icon namespace="channel" name="instagram" fontSize={41} />;
            case 'web':
                return <Icon namespace="channel" name="web" fontSize={41} />;
            case 'whatsapp':
                return <Icon namespace="channel" name="whatsapp" fontSize={41} />;
            case 'line':
                return <Icon namespace="channel" name="line" fontSize={41} />;
            case 'email':
                return <Icon namespace="channel" name="email" fontSize={41} />;
            case 'wechat':
                return <Icon namespace="channel" name="wechat" fontSize={41} />;
            default:
                return <Box sx={{ width: '41px', height: '41px' }} />;
        }
    }, [searchParam]);

    const defaultComponent = () => {
        return (
            <>
                <Typography>{t(`channels_desc_${searchParam}`)}</Typography>
                <div>
                    <Typography variant="SubHeading2">{t('channels_what_can_it_do')}</Typography>
                    <Typography style={{ color: 'var(--color-light-5)' }}>{t(`channels_what_${searchParam}`)}</Typography>
                </div>
                <div>
                    <Typography variant="SubHeading2">{t('channels_ready_to_connect')}</Typography>
                    <Typography style={{ color: 'var(--color-light-5)' }}>{t(`channels_what_${searchParam}`)}</Typography>
                </div>
                {/* The following paragraph should not appear if there's no guide link */}
                {gitbookDocUrl(searchParam) !== '' && <Typography>{t('channels_step_by_step_guide')}</Typography>}
                <Box>
                    <Button text={t('start')} onClick={() => setActiveStep(1)} sx={{ minWidth: '160px' }} />
                </Box>
            </>
        );
    };

    const renderChannelIntroContent = () => {
        switch (searchParam) {
            case 'facebook':
                return (
                    <FacebookConnect
                        open={props.open}
                        setSubmitState={setSubmitState}
                        onClose={onClose}
                        onReload={onReload}
                        onResponseAfterCreate={(data) => onResponseAfterCreate?.(data, handleOnClose)}
                    />
                );
            case 'instagram':
                return <InstagramConnect open={props.open} setSubmitState={setSubmitState} onClose={onClose} onReload={onReload} />;
            case 'whatsapp':
                if (avoidOnBoarding) {
                    return defaultComponent();
                }
                return (
                    <WhatsAppConnect
                        setSubmitState={setSubmitState}
                        onClose={onClose}
                        onReload={onReload}
                        onResponseAfterCreate={(data) => onResponseAfterCreate?.(data, handleOnClose)}
                    />
                );
            default:
                return defaultComponent();
        }
    };

    const channelModalContent = () => {
        return (
            <>
                {activeStep === 0 && (
                    <Box
                        sx={{
                            paddingRight: '131px',
                            color: 'var(--color-light-7)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px',
                        }}
                    >
                        {renderChannelIntroContent()}
                    </Box>
                )}

                {activeStep === 1 && (
                    <Box sx={{ height: '100%' }}>
                        {!credential ? (
                            <Box
                                sx={{
                                    width: '100%',
                                    height: 'calc(100% - 95px)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <CircularProgress size={22} />
                            </Box>
                        ) : (
                            <form onSubmit={handleSubmit(formSubmitHandler)}>
                                {!credential ? (
                                    <Box
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <CircularProgress size={22} />
                                    </Box>
                                ) : (
                                    <Box
                                        sx={{
                                            width: isSocialConnect ? '100%' : '80%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        <>
                                            {/* WeChat Form */}
                                            {searchParam === 'wechat' ? (
                                                <Box>
                                                    {renderFormFields()}
                                                    <Box>
                                                        <Button
                                                            text={t('credentials_new_dialog_create_button')}
                                                            onClick={onNext}
                                                            loading={submitState}
                                                            sx={{ minWidth: '160px' }}
                                                        />
                                                    </Box>
                                                </Box>
                                            ) : (
                                                <>
                                                    {/* add Credential Name field to all third-party credentials */}
                                                    {renderFormFields()}
                                                    {renderButton()}
                                                </>
                                            )}
                                        </>
                                    </Box>
                                )}
                            </form>
                        )}
                    </Box>
                )}

                {/* For WeChat Only */}
                {activeStep === 2 && (
                    <Box sx={{ height: '100%' }}>
                        {!credential ? (
                            <Box
                                sx={{
                                    width: '100%',
                                    height: 'calc(100% - 95px)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <CircularProgress size={22} />
                            </Box>
                        ) : (
                            <form onSubmit={handleSubmit(formSubmitHandler)}>
                                {!credential ? (
                                    <Box
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <CircularProgress size={22} />
                                    </Box>
                                ) : (
                                    <Box
                                        sx={{
                                            width: isSocialConnect ? '100%' : '80%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        <>
                                            {renderWebhookField()}
                                            <Box>
                                                <Button
                                                    text={t('credentials_done_button')}
                                                    onClick={() => {
                                                        setActiveStep(0);
                                                        onCloseAndRedirect();
                                                    }}
                                                    loading={false}
                                                    sx={{ minWidth: '160px' }}
                                                />
                                            </Box>
                                        </>
                                    </Box>
                                )}
                            </form>
                        )}
                    </Box>
                )}
            </>
        );
    };

    const integrationModalContent = () => {
        return (
            <>
                {activeStep === 0 && (
                    <>
                        <Box
                            sx={{
                                paddingRight: '131px',
                                color: 'var(--color-light-7)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '24px',
                            }}
                        >
                            <Typography>{t(`integrations_desc_${credential?.name}`)}</Typography>
                            <div>
                                <Typography variant="SubHeading2">{t('integrations_what_can_it_do')}</Typography>
                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                    {t(`integrations_what_${credential?.name}`)}
                                </Typography>
                            </div>
                            <div>
                                <Typography variant="SubHeading2">{t('integrations_ready_to_connect')}</Typography>
                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                    {t(`integrations_ready_${credential?.name}`)}
                                </Typography>
                            </div>
                            {/* The following paragraph should not appear if there's no guide link */}
                            {credential && gitbookDocUrl(credential.documentationUrl) !== '' && (
                                <Typography>{t('integrations_step_by_step_guide')}</Typography>
                            )}
                            <Box>
                                <Button text={t('start')} onClick={() => setActiveStep(1)} sx={{ minWidth: '160px' }} />
                            </Box>
                        </Box>
                    </>
                )}

                {activeStep === 1 && (
                    <Box sx={{ height: '100%' }}>
                        {!credential ? (
                            <Box
                                sx={{
                                    width: '100%',
                                    height: 'calc(100% - 95px)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <CircularProgress size={22} />
                            </Box>
                        ) : (
                            <form onSubmit={handleSubmit(formSubmitHandler)}>
                                <Box
                                    sx={{
                                        width: isSocialConnect ? '100%' : '80%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    <>
                                        {/* add Credential Name field to all third-party credentials */}
                                        {renderFormFields()}
                                        {renderButton()}
                                    </>
                                </Box>
                            </form>
                        )}
                    </Box>
                )}
            </>
        );
    };

    return (
        <DialogModal
            open={open}
            modalState={modalState}
            onClose={handleOnClose}
            isFetching={isFetching}
            header={isFetching ? undefined : isChannelCredential ? channelModalHeader() : integrationModalHeader()}
        >
            <Box sx={{ height: '100%' }}>{isChannelCredential ? channelModalContent() : integrationModalContent()}</Box>
        </DialogModal>
    );
};

const HOC = (props: Omit<Props, 'open' | 'onClose'>) => {
    const [open, setOpen] = useState(true);
    const onClose = () => setOpen(false);
    return <CreateNewCredential open={open} onClose={onClose} {...props} />;
};

export const openCreateNewCredential = (props: Omit<Props, 'open' | 'onClose'>) => {
    const fragment = document.createDocumentFragment();
    const root = createRoot(fragment);
    return root.render(
        createPortal(
            <Provider store={store}>
                <QueryClientProvider client={queryClient}>
                    <Router history={history}>
                        <HOC {...props} />
                    </Router>
                </QueryClientProvider>
            </Provider>,
            document.body,
        ),
    );
};

export default CreateNewCredential;
