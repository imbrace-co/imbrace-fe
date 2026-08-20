import { Button, Icon } from '@imbrace/ui';
import { Box, CircularProgress } from '@mui/material';
import { QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { SubmitHandler } from 'react-hook-form';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Provider } from 'react-redux';

import { queryClient } from '@/App';
import FacebookGraphAppApiIcon from '@/assets/icons/credential_facebookGraphAppApi.svg?react';
import GoogleOAuthApiIcon from '@/assets/icons/credential_googleOAuth2Api.svg?react';
import MicrosoftOAuthApiIcon from '@/assets/icons/credential_microsoftOAuth2Api.svg?react';
import PostgresIcon from '@/assets/icons/credential_postgres.svg?react';
import TwitterOAuthApiIcon from '@/assets/icons/credential_twitterOAuth1Api.svg?react';
import WiseApiIcon from '@/assets/icons/credential_wiseApi.svg?react';
import FacebookConnect from '@/pages/Channels/components/FacebookConnect';
import InstagramConnect from '@/pages/Channels/components/InstagramConnect';
import { DynamicIcon } from '@/pages/Credentials/AddNewCredentials';
import DocLinkChip from '@/pages/Credentials/components/DocLinkChip';
import store, { useAppSelector } from '@/redux/store';
import { updateChannelById } from '@/services/api/channel';
import {
    getChannelCredential,
    getCredential,
    getCredentialParams,
    oAuth1Authorize,
    oAuth2Authorize,
    updateChannelCredential,
    updateCredential,
} from '@/services/api/workflow';
import { ImbraceWorkflow } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import { channelCredTypeMap } from '../../helpers';
import DialogModal from '../DialogModal';
import type { LineChannel, WebWidgetEmailChannel, WechatChannel, WhatsappChannel } from '../NewCredential/CreateNewCredential';
import { CONVERSATION_CHANNELS, credentialNameOpt, gitbookDocUrl } from '../NewCredential/CreateNewCredential';
import { StyledDialogTitle, StyledSubtitle } from '../StyledComponents';
import FieldItem from '../TypeFields';

interface Props {
    name: string;
    credentialType: string;
    credentialId: string;
    modalState: string;
    open: boolean;
    onClose: () => void;
    onFetchCredential: () => void;
    onReload?: () => void;
    watchShowParams?: Record<string, string | boolean>;
    channelId?: string;
}

const isSuccessClass = {
    backgroundColor: 'white',
    border: '1px solid var(--color-green-1)',
    '&:disabled': {
        color: 'var(--color-green-1)',
        backgroundColor: 'white',
    },
};

const EditCredential: FC<Props> = (props) => {
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const organizationPartition = useAppSelector((state) => state.Account.partition);
    const { t } = useTranslation();
    const formRef = useRef<HTMLFormElement>(null);
    const { name, credentialType, credentialId, channelId, modalState, open, onClose, onFetchCredential, onReload } = props;
    const [submitState, setSubmitState] = useState<boolean>(false);
    const [isSuccess, setIsSuccess] = useState<boolean>();

    const { setValue, handleSubmit, control, watch, formState } = useForm<Record<string, string>>({
        mode: 'all',
        defaultValues: {
            credentialName: '',
        },
    });

    const { errors, isDirty } = formState;

    const isOAuthType = useCallback(() => {
        return credentialType.includes('OAuth');
    }, [credentialType]);

    const fetchCredentialParams = useCallback(async () => {
        try {
            let credType = credentialType;
            if (credType === 'whatsApp') {
                credType = 'WhatsApp';
            }
            const channelCredentialType = channelCredTypeMap[credType] ?? credType;

            // fetch credential type properties
            const { data } = await apiFetch<API.CredentialType>(getCredentialParams.api(channelCredentialType), getCredentialParams.method);
            return data;
        } catch (error) {
            console.error('fetchCredentialParams error: ', error);
        }
    }, [credentialType]);

    const fetchCredential = useCallback(async () => {
        try {
            // check if incoming credential type is matching Channel Credential Type
            const channelCredentialType = channelCredTypeMap[credentialType];
            if (!!channelCredentialType) {
                const { data } = await apiFetch<API.Channel>(getChannelCredential.api(credentialId), getChannelCredential.method);
                // loop over data.config and spread all keys and values, if 'email_config' key exists, omitting it
                const channelData = Object.keys(data.config).reduce<API.ChannelCredentialData>((acc, key) => {
                    if (key !== 'email_config') {
                        return {
                            ...acc,
                            [key]: data.config[key as keyof typeof data.config],
                        };
                    }
                    return acc;
                }, {} as API.ChannelCredentialData);

                const modifiedData = {
                    id: credentialId,
                    name: data.name,
                    nodesAccess: [],
                    type: data.config.type,
                    data: channelData,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                    channelId: data.id,
                };
                if (data) {
                    return modifiedData;
                }
                return null;
            }

            const {
                data: { data },
            } = await apiFetch<{ data: API.Credential }>(getCredential.api(credentialId), getCredential.method);
            if ('oauthTokenData' in data.data) {
                setIsSuccess(true);
            } else {
                setIsSuccess(false);
            }
            if (data) {
                return data;
            }
        } catch (error) {
            console.error('fetchCredential error: ', error);
            return {
                createdAt: '',
                data: {},
                id: '',
                name: '',
                nodesAccess: [],
                type: '',
                updatedAt: '',
            };
        }
    }, [credentialId, credentialType]);

    const { data: credentialParams } = useQuery({
        queryKey: ['credentialParams', credentialType],
        queryFn: fetchCredentialParams,
    });

    const { data: credentialData, isLoading: isLoadingCredentialData } = useQuery({
        queryKey: ['fetchCredentialData', credentialId],
        queryFn: fetchCredential,
        enabled: !!credentialParams,
    });

    useEffect(() => {
        if (isDirty) {
            setIsSuccess(false);
        }
    }, [isDirty]);

    // channel credential (backend update)
    const updateChannelCredentialData = useCallback(
        async (updatedData: LineChannel | WhatsappChannel | WechatChannel | WebWidgetEmailChannel) => {
            try {
                return await apiFetch<API.Channel>(updateChannelCredential.api(credentialId), updateChannelCredential.method, updatedData);
            } catch (error) {
                console.error('updateChannelCredential error: ', error);
            }
        },
        [credentialId],
    );

    // workflow credential
    const updateCredentialData = useCallback(
        async (updatedData: Credential) => {
            try {
                return await apiFetch<API.CredentialData>(
                    updateCredential.api(credentialId),
                    updateCredential.method,
                    updatedData,
                    ImbraceWorkflow,
                );
            } catch (error) {
                // error
                setSubmitState(false);
            }
        },
        [credentialId],
    );

    const updateChannel = useCallback(async (chId: string, channelName: string) => {
        try {
            return await apiFetch<API.Channel>(updateChannelById.api(chId), updateChannelById.method, {
                name: channelName,
            });
        } catch (error) {
            console.error('update channel error: ', error);
        }
    }, []);

    const oAuthCredentialAuthorize = useCallback(async () => {
        try {
            const fields = ['authUrl', 'accessTokenUrl', 'scope', 'authQueryParameters', 'authentication'];
            const data: Record<string, any> = credentialData?.data || {};
            const params: Record<string, string> = fields.reduce((acc, field) => {
                acc[field] = data[field] || '';
                return acc;
            }, {} as Record<string, string>);

            const param = `authUrl=${params.authUrl}&accessTokenUrl=${params.accessTokenUrl}&clientId=${watch(
                'clientId',
            )}&clientSecret=${watch('clientSecret')}&scope=${params.scope}&authQueryParameters=${
                params.authQueryParameters
            }&authentication=${params.authentication}&id=${credentialId}`;

            if (credentialParams?.name.includes('OAuth2')) {
                const { data: oAuthData } = await apiFetch<{
                    data: URL;
                }>(oAuth2Authorize.api(param), oAuth2Authorize.method);
                return oAuthData;
            } else if (credentialParams?.name.includes('OAuth1')) {
                const { data: oAuthData } = await apiFetch<{
                    data: URL;
                }>(oAuth1Authorize.api(param), oAuth1Authorize.method);
                return oAuthData;
            }
        } catch (error) {
            console.error('error: ', error);
        }
    }, [watch, credentialData, credentialId, credentialParams?.name]);

    useEffect(() => {
        setValue('credentialName', name);
    }, [name, setValue]);

    const formSubmitHandler: SubmitHandler<Record<string, string>> = useCallback(
        async (data) => {
            setSubmitState(true);

            // Channel Credentials
            const channelCredentialType = channelCredTypeMap[credentialType];
            if (!!channelCredentialType) {
                const channelType = channelCredTypeMap[credentialType];
                let res;
                if (channelType === 'line') {
                    const dataToBeUpdated: LineChannel = {
                        name: data.credentialName,
                        config: {
                            type: 'line',
                            line_channel_token: data.line_channel_token,
                            line_channel_secret: data.line_channel_secret,
                            line_channel_id: data.line_channel_id,
                        },
                    };
                    res = await updateChannelCredentialData(dataToBeUpdated);
                }
                if (channelType === 'whatsapp') {
                    const dataToBeUpdated: WhatsappChannel = {
                        name: data.credentialName,
                        config: {
                            type: 'whatsapp',
                            access_key: data.access_key,
                            phone_number: data.phone_number,
                            phone_number_id: data.phone_number_id,
                            business_account_id: data.business_account_id,
                        },
                    };
                    res = await updateChannelCredentialData(dataToBeUpdated);
                }
                if (channelType === 'wechat') {
                    const dataToBeUpdated: WechatChannel = {
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
                    res = await updateChannelCredentialData(dataToBeUpdated);
                }
                if (channelType === 'web') {
                    const dataToBeUpdated: WebWidgetEmailChannel = {
                        name: data.credentialName,
                    };
                    res = await updateChannelCredentialData(dataToBeUpdated);
                }

                if (channelType === 'facebook') {
                    const dataToBeUpdated: WebWidgetEmailChannel = {
                        name: data.credentialName,
                    };
                    res = await updateChannelCredentialData(dataToBeUpdated);
                }

                // update channel name
                if (formState.dirtyFields.hasOwnProperty('credentialName') && channelId) {
                    await updateChannel(channelId, data.credentialName);
                }

                if (res === undefined) {
                    setSubmitState(false);
                    return;
                }
                if (res.status === 200) {
                    onFetchCredential();
                    setSubmitState(false);
                    onClose();
                    return;
                }
            }

            // Integration Credentials (workflow)
            const newData = { ...credentialData, data: { ...data }, name: watch('credentialName') };
            const res = await updateCredentialData(newData as Credential);

            if (isOAuthType()) {
                const oAuth2Res = await oAuthCredentialAuthorize();
                const url = oAuth2Res?.data;
                const params = 'scrollbars=no,resizable=yes,status=no,titlebar=noe,location=no,toolbar=no,menubar=no,width=500,height=700';
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

            if (res === undefined) {
                setSubmitState(false);
                return;
            }
            if (res.status === 200) {
                onFetchCredential();
                setSubmitState(false);
                !isOAuthType() && onClose();
            }
        },
        [
            channelId,
            credentialData,
            credentialType,
            formState,
            isOAuthType,
            onClose,
            onFetchCredential,
            updateChannel,
            updateCredentialData,
            updateChannelCredentialData,
            oAuthCredentialAuthorize,
            watch,
        ],
    );

    const defaultValue = useCallback(
        (fieldName: string, fieldType: string) => {
            if (!credentialData) return '';
            const data: Record<string, any> = credentialData?.data || {};
            switch (fieldType) {
                case 'string': {
                    if (data[fieldName]) {
                        return data[fieldName];
                    }
                    return '';
                }
                case 'boolean': {
                    return data[fieldName];
                }
                case 'number': {
                    if (data[fieldName]) return data[fieldName];
                    return 0;
                }
                case 'options': {
                    if (data[fieldName]) return data[fieldName];
                    return '';
                }
                case 'hidden': {
                    return data[fieldName];
                }
                default: {
                    return '';
                }
            }
        },
        [credentialData],
    );

    const workflowDomain = useMemo(() => {
        return '';
    }, [organizationPartition, organizationId]);

    const renderFormFields = useCallback(() => {
        // Add credential name to properties without mutating the original array
        const modifiedCredentialParamsProps = !CONVERSATION_CHANNELS.includes(channelCredTypeMap[credentialType])
            ? [credentialNameOpt, ...(credentialParams?.properties ?? [])]
            : credentialParams?.properties || [];

        return (
            <>
                {modifiedCredentialParamsProps &&
                    modifiedCredentialParamsProps.map((fieldItem: API.PropertyType) => {
                        const { displayName, displayOptions, typeOptions, ...rest } = fieldItem;

                        const watchShowParams = {} as Record<string, string | boolean>;
                        if (displayOptions?.show) {
                            Object.keys(displayOptions.show).forEach((key) => {
                                watchShowParams[key] = watch(key) ?? (credentialData?.data as any)[key];
                            });
                        }

                        if (fieldItem.name === 'webhookUrl') {
                            const val =
                                credentialType === 'WeChat'
                                    ? `${fieldItem.default}/${(credentialData?.data as any)?.user_name}`
                                    : `${fieldItem.default}`;
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
                                                credentialType={credentialType.toLowerCase()}
                                                {...rest}
                                            />
                                        );
                                    }}
                                />
                            );
                        }

                        const lastExtend =
                            credentialParams &&
                            credentialParams.totalExtends &&
                            credentialParams.totalExtends[credentialParams.totalExtends.length - 1];

                        let val;
                        // OAuth Redirect URL
                        if (fieldItem.name === 'oAuthRedirectUrl') {
                            val = `${workflowDomain}/rest/oauth2-credential/callback`;
                        } else {
                            val = defaultValue(fieldItem.name, fieldItem.type) ?? fieldItem.default;
                        }

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
                                                credentialParams &&
                                                credentialParams.hasOwnProperty('extends') &&
                                                credentialParams.extends.length > 0
                                                    ? (lastExtend as string)
                                                    : credentialParams?.name || ''
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
    }, [control, credentialData, credentialParams, credentialType, errors, t, watch, defaultValue, workflowDomain]);

    const renderButton = () => {
        if (isOAuthType()) {
            if (isSuccess === undefined || isLoadingCredentialData) {
                return (
                    <Box sx={{ width: '160px', textAlign: 'center' }}>
                        <CircularProgress size={20} />
                    </Box>
                );
            }
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
            if (credentialType === 'facebook') {
                return (
                    <Box>
                        {submitState && (
                            <Button
                                text={t('credentials_new_dialog_create_button')}
                                onClick={handleSubmit(formSubmitHandler)}
                                loading={submitState}
                                sx={{ minWidth: '160px' }}
                            />
                        )}
                    </Box>
                );
            } else {
                return (
                    <Box>
                        <Button
                            text={t('credentials_new_dialog_edit_button')}
                            onClick={handleSubmit(formSubmitHandler)}
                            loading={submitState}
                            sx={{ minWidth: '160px' }}
                        />
                    </Box>
                );
            }
        }
    };

    const renderSocialMediaConnect = () => {
        switch (credentialType) {
            case 'Facebook':
                return (
                    <FacebookConnect
                        open={props.open}
                        setSubmitState={setSubmitState}
                        onClose={onClose}
                        onReload={onReload}
                        mode={'edit'}
                    />
                );
            case 'Instagram':
                return (
                    <InstagramConnect
                        open={props.open}
                        setSubmitState={setSubmitState}
                        onClose={onClose}
                        onReload={onReload}
                        mode={'edit'}
                    />
                );
            default:
                return null;
        }
    };

    const renderIntegrationIcon = useCallback(() => {
        if (credentialParams && !credentialParams.hasOwnProperty('icon')) {
            switch (credentialParams.name) {
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
                case 'facebookGraphAppApi':
                    return <FacebookGraphAppApiIcon style={{ width: '41px', height: '41px' }} />;
                case 'googleOAuth2Api':
                    return <GoogleOAuthApiIcon style={{ width: '41px', height: '41px' }} />;
                case 'microsoftOAuth2Api':
                    return <MicrosoftOAuthApiIcon style={{ width: '41px', height: '41px' }} />;
                case 'postgres':
                    return <PostgresIcon style={{ width: '41px', height: '41px' }} />;
                case 'twitterOAuth1Api':
                    return <TwitterOAuthApiIcon style={{ width: '41px', height: '41px' }} />;
                case 'wiseApi':
                    return <WiseApiIcon style={{ width: '41px', height: '41px' }} />;
                default:
                    return <Box sx={{ width: '41px', height: '41px' }} />;
            }
        }
        if (credentialParams && credentialParams.icon.startsWith('fa:')) {
            const iconName = `${credentialParams.icon.split('fa:')[1]}`;
            return (
                <Box
                    sx={{
                        fontSize: '20px',
                        width: '41px',
                        height: '41px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <DynamicIcon iconName={iconName} />
                </Box>
            );
        }
        return <img src={credentialParams?.icon} style={{ height: '41px', objectFit: 'cover' }} alt={credentialParams?.displayName} />;
    }, [credentialParams]);

    const renderHeader = () => {
        return (
            <Box
                sx={{
                    height: '70px',
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
                    {renderIntegrationIcon()}
                </Box>
                <div>
                    <Box sx={{ display: 'flex', alignItems: 'center', height: 24 }}>
                        <StyledDialogTitle sx={{ padding: '0 6px 4px 0' }}>{watch('credentialName')}</StyledDialogTitle>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <StyledSubtitle>{credentialParams?.displayName}</StyledSubtitle>
                        {credentialParams && (
                            <DocLinkChip
                                url={gitbookDocUrl(
                                    channelCredTypeMap[credentialParams?.documentationUrl] ?? credentialParams?.documentationUrl,
                                )}
                            />
                        )}
                    </Box>
                </div>
            </Box>
        );
    };

    return (
        <DialogModal open={open} modalState={modalState} onClose={onClose} header={renderHeader()}>
            <div>
                {!credentialParams || isLoadingCredentialData ? (
                    <Box
                        sx={{
                            position: 'fixed',
                            left: '50%',
                            top: '50%',
                        }}
                    >
                        <CircularProgress size={22} />
                    </Box>
                ) : (
                    <form onSubmit={handleSubmit(formSubmitHandler)} ref={formRef} style={{ marginBottom: '32px' }}>
                        <Box sx={{ width: '80%', display: 'flex', flexDirection: 'column' }}>
                            <>
                                {credentialType === 'Facebook' || credentialType === 'Instagram' ? (
                                    <>{renderSocialMediaConnect()}</>
                                ) : (
                                    <>
                                        {/* add Credential Name field to all third-party credentials */}
                                        {renderFormFields()}
                                        {renderButton()}
                                    </>
                                )}
                            </>
                        </Box>
                    </form>
                )}
            </div>
        </DialogModal>
    );
};

const EditCredentialHOC = (props: Omit<Props, 'open' | 'modalState' | 'onClose'>) => {
    const [open, setOpen] = useState(true);
    const client = useQueryClient(queryClient);

    return (
        <Provider store={store}>
            <QueryClientProvider client={client}>
                <EditCredential
                    open={open}
                    onClose={async () => {
                        await queryClient.invalidateQueries({
                            queryKey: ['fetchCredentialData', props.credentialId],
                            exact: true,
                        });

                        queryClient.removeQueries({ queryKey: ['fetchCredentialData', props.credentialId], exact: true });
                        setOpen(false);
                    }}
                    modalState={'edit'}
                    {...props}
                />
                ;
            </QueryClientProvider>
        </Provider>
    );
};

export const editCredentialDialog = (props: Omit<Props, 'open' | 'modalState' | 'onClose'>) => {
    const fragment = document.createDocumentFragment();
    const root = createRoot(fragment);
    return root.render(createPortal(<EditCredentialHOC {...props} />, document.body));
};

export default EditCredential;
