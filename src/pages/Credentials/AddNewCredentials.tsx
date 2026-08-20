import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Icon, Search, useDialog } from '@imbrace/ui';
import { Box, Grid } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatch, useNavigate } from 'react-router-dom';

import GoogleApiIcon from '@/assets/icons/credential_googleApi.svg?react';
import GoogleOAuthApiIcon from '@/assets/icons/credential_googleOAuth2Api.svg?react';
import GoogleVertexAIApi from '@/assets/icons/credential_googleVertexAIApi.svg?react';
import MicrosoftOAuthApiIcon from '@/assets/icons/credential_microsoftOAuth2Api.svg?react';
import PostgresIcon from '@/assets/icons/credential_postgres.svg?react';
import TwitterOAuthApiIcon from '@/assets/icons/credential_twitterOAuth1Api.svg?react';
import WiseApiIcon from '@/assets/icons/credential_wiseApi.svg?react';
import PageLayout from '@/components/PageLayout';
import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import { env } from '@/env';
import useAccess from '@/hooks/useAccess';
import type { ChannelCountType } from '@/pages/Channels';
import { openCreateNewCredential } from '@/pages/Credentials/components/NewCredential/CreateNewCredential';
import { useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';
import { getChannelCount } from '@/services/api/channel';
import { getCredentials, getProcessedCredentialTypes } from '@/services/api/workflow';
import apiFetch from '@/services/axios/handler';
import { addLeadingZero } from '@/utils/NumberHelper';

import styles from './components/index.module.scss';

const capitalizeWords = (str: string) => {
    return str
        .split(/(\s+)/)
        .map((word) => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join('');
};
export const DynamicIcon = ({ iconName }: { iconName: string }) => {
    const [icon, setIcon] = useState<IconDefinition | null>(null);

    useEffect(() => {
        const importIcon = async () => {
            try {
                // Assuming all icons are from the solid style - adjust as needed
                const importedIcon = await import('@fortawesome/free-solid-svg-icons');
                library.add(importedIcon[`fa${capitalizeWords(iconName)}` as keyof typeof importedIcon] as IconDefinition);
                setIcon(importedIcon[`fa${capitalizeWords(iconName)}` as keyof typeof importedIcon] as IconDefinition);
            } catch (err) {
                console.error('Icon not found:', err);
            }
        };

        importIcon();
    }, [iconName]);

    return icon ? <FontAwesomeIcon icon={icon} /> : null;
};

const fetchChannelCount = async () => {
    const { data } = await apiFetch<ChannelCountType>(getChannelCount.api(), getChannelCount.method);
    return data;
};

const fetchCredentials = async () => {
    const {
        data: { data },
    } = await apiFetch<{ data: API.Credential[] }>(getCredentials.api(), getCredentials.method);
    return data;
};

const fetchCredentialTypes = async () => {
    const { data } = await apiFetch<Record<string, API.CredentialType[]>>(
        getProcessedCredentialTypes.api(),
        getProcessedCredentialTypes.method,
        { withIcons: true },
    );
    if (data) {
        const filteredChannels =
            env.VITE_APP_ENV !== 'dev' && env.VITE_APP_ENV !== 'local'
                ? data.channel.filter((channel) => channel.name !== 'instagram')
                : data.channel;
        return {
            channels: filteredChannels,
            integrations: data.integration,
        };
    }

    return { channels: [], integrations: [] };
};

const AddNewCredentials = () => {
    const { t } = useTranslation();
    const match = useMatch({
        path: '/:page/new',
    });
    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const supportTouchpoint = useAppSelector((state) => state.Account.support?.customer?.touchpoint);
    const navigate = useNavigate();
    const { openHelpCenter } = useNavbar();
    const { features } = useAccess();
    const [{ dialog }, dialogHolder] = useDialog();

    const [searchbarInput, setSearchbarInput] = useState('');

    const { data: channels } = useQuery({
        queryFn: fetchChannelCount,
        queryKey: ['channels-count'],
    });

    const { data: credentialData } = useQuery({
        queryFn: fetchCredentials,
        queryKey: ['credentials'],
    });
    const { data, isFetching } = useQuery({
        queryFn: fetchCredentialTypes,
        queryKey: ['credentialTypes'],
        initialData: { channels: [], integrations: [] },
    });

    const generateNewNameWithSuffix = useCallback(
        (name: string): string => {
            const nameExist = credentialData?.filter((credential) => credential.type.includes(name));
            if (nameExist) {
                return `${name} ${addLeadingZero(nameExist.length + 1)}`;
            }
            return name;
        },
        [credentialData],
    );

    const renderSearchBar = useCallback(() => {
        return (
            <div style={{ width: 248 }}>
                <Search
                    value={searchbarInput}
                    placeholder={t('search')}
                    onSearch={(inputValue) => setSearchbarInput(inputValue)}
                    onReset={() => setSearchbarInput('')}
                />
            </div>
        );
    }, [t, searchbarInput]);

    const renderChannelIcon = useCallback((credentialTypeName: string) => {
        switch (credentialTypeName) {
            case 'facebook':
                return <Icon namespace="channel" name="facebook" fontSize={24} />;
            case 'instagram':
                return <Icon namespace="channel" name="instagram" fontSize={24} />;
            case 'web':
                return <Icon namespace="channel" name="web" fontSize={24} />;
            case 'whatsapp':
                return <Icon namespace="channel" name="whatsapp" fontSize={24} />;
            case 'line':
                return <Icon namespace="channel" name="line" fontSize={24} />;
            case 'email':
                return <Icon namespace="channel" name="email" fontSize={24} />;
            case 'wechat':
                return <Icon namespace="channel" name="wechat" fontSize={24} />;
        }
    }, []);

    const renderIntegrationIcon = useCallback((credentialType: API.CredentialType) => {
        if (!credentialType.hasOwnProperty('icon')) {
            switch (credentialType.name) {
                case 'googleOAuth2Api':
                    return (
                        <Box sx={{ width: '30px' }}>
                            <GoogleOAuthApiIcon style={{ width: '26px' }} />
                        </Box>
                    );
                case 'microsoftOAuth2Api':
                    return (
                        <Box sx={{ width: '30px' }}>
                            <MicrosoftOAuthApiIcon style={{ width: '30px' }} />
                        </Box>
                    );
                case 'postgres':
                    return (
                        <Box sx={{ width: '30px' }}>
                            <PostgresIcon style={{ width: '30px' }} />
                        </Box>
                    );
                case 'twitterOAuth1Api':
                    return (
                        <Box sx={{ width: '30px' }}>
                            <TwitterOAuthApiIcon style={{ width: '30px' }} />
                        </Box>
                    );
                case 'wiseApi':
                    return (
                        <Box sx={{ width: '30px' }}>
                            <WiseApiIcon style={{ width: '30px' }} />
                        </Box>
                    );
                default:
                    return <Box sx={{ width: '30px' }} />;
            }
        }

        if (credentialType?.icon?.startsWith('fa:') && credentialType?.icon?.split('fa:')?.[1]) {
            const iconName = `${credentialType.icon.split('fa:')[1]}`;
            return (
                <Box sx={{ fontSize: '20px', textAlign: 'center' }}>
                    <DynamicIcon iconName={iconName} />
                </Box>
            );
        }

        switch (credentialType.name) {
            case 'googleVertexAIApi':
                return (
                    <Box sx={{ width: '30px' }}>
                        <GoogleVertexAIApi style={{ width: '26px' }} />
                    </Box>
                );
            case 'googleApi':
                return (
                    <Box sx={{ width: '30px' }}>
                        <GoogleApiIcon style={{ width: '28px' }} />
                    </Box>
                );
            default:
                return (
                    <img
                        alt={credentialType.displayName}
                        src={credentialType.icon}
                        style={{
                            width: '30px',
                        }}
                    />
                );
        }
    }, []);

    const renderChannelCredentials = useCallback(() => {
        return (
            <>
                <Grid container spacing={{ xs: 2 }} columns={{ xs: 4, sm: 8, md: 12 }}>
                    {data.channels
                        .filter((credential) => credential.displayName.toLowerCase().includes(searchbarInput.toLowerCase()))
                        .map((credentialType) => {
                            const needUpgrade = features.channels({
                                eachChannelCount: channels ? channels[credentialType.name as keyof ChannelCountType] : 0,
                            });

                            // temporarily hide email credential
                            if (credentialType.name === 'email') return null;
                            return (
                                <Grid item xs={4} sm={4} md={4} key={credentialType.name}>
                                    <Button
                                        text={credentialType.displayName}
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
                                            openCreateNewCredential({
                                                modalState: 'createNew',
                                                searchParam: credentialType.name,
                                                generateNewNameWithSuffix: (credentialName) => generateNewNameWithSuffix(credentialName),
                                                onResponseAfterCreate: (responseData: API.Channel | API.CredentialData, onClose) => {
                                                    if ('id' in responseData) {
                                                        dialog({
                                                            title: t('channels_setup_dialog_title'),
                                                            content: t('channels_setup_dialog_desc'),
                                                            cancelText: t('do_it_later'),
                                                            confirmText: t('setup_now'),
                                                            onConfirm: () => {
                                                                navigate(`/channels/${responseData?.id}/web_widget`);
                                                            },
                                                            onClose: () => {
                                                                navigate('/channels');
                                                            },
                                                        });
                                                    }
                                                },
                                            });
                                        }}
                                        loading={false}
                                        startIcon={renderChannelIcon(credentialType.name)}
                                        endIcon={needUpgrade ? <Icon name="premium" color="var(--color-primary-1)" /> : null}
                                        sx={{
                                            width: '100%',
                                            padding: '0 15px',
                                            height: '74px',
                                            color: 'var(--color-light-7)',
                                            borderColor: 'var(--color-light-3)',
                                            boxShadow: '0px 1px 8px rgba(189, 189, 189, 0.08), 0px 2px 16px rgba(224, 224, 224, 0.2)',
                                            borderRadius: '10px',
                                            justifyContent: 'flex-start',
                                            textTransform: 'none',
                                            textAlign: 'left',
                                        }}
                                        variant="outlined"
                                    />
                                </Grid>
                            );
                        })}
                </Grid>
            </>
        );
    }, [
        navigate,
        dialog,
        channels,
        data.channels,
        features,
        openHelpCenter,
        renderChannelIcon,
        searchbarInput,
        supportChannel,
        supportTouchpoint,
        t,
        generateNewNameWithSuffix,
    ]);

    const renderIntegrationCredentials = useCallback(() => {
        return (
            <Grid
                container
                spacing={{ xs: 2 }}
                columns={{ xs: 4, sm: 12, md: 12 }}
                sx={{ flex: 1, overflowY: 'hidden', paddingBottom: '34px' }}
            >
                {data.integrations
                    .filter((credential) => credential.displayName.toLowerCase().includes(searchbarInput.toLowerCase()))
                    .map((credentialType) => {
                        // const needUpgrade = features.channels({
                        //     eachChannelCount:
                        //         credentialData?.filter(
                        //             (credential) => credential.type === getN8NCredentialType(credentialType.name),
                        //         ).length ?? 0,
                        // });
                        return (
                            <Grid item xs={4} sm={4} md={4} key={credentialType.name}>
                                <Button
                                    text={credentialType.displayName}
                                    onClick={() => {
                                        openCreateNewCredential({
                                            modalState: 'createNew',
                                            searchParam: credentialType.name,
                                            generateNewNameWithSuffix: (credentialName) => generateNewNameWithSuffix(credentialName),
                                        });
                                    }}
                                    loading={false}
                                    startIcon={renderIntegrationIcon(credentialType)}
                                    sx={{
                                        width: '100%',
                                        padding: '0 15px',
                                        height: '74px',
                                        color: 'var(--color-light-7)',
                                        borderColor: 'var(--color-light-3)',
                                        boxShadow: '0px 1px 8px rgba(189, 189, 189, 0.08), 0px 2px 16px rgba(224, 224, 224, 0.2)',
                                        borderRadius: '10px',
                                        justifyContent: 'flex-start',
                                        textTransform: 'none',
                                        textAlign: 'left',
                                    }}
                                    variant="outlined"
                                />
                            </Grid>
                        );
                    })}
            </Grid>
        );
    }, [data.integrations, renderIntegrationIcon, searchbarInput, generateNewNameWithSuffix]);

    return (
        <>
            {dialogHolder}
            <PageLayout
                title={match?.params.page === 'channels' ? t('channels_add_new_header') : t('credentials_add_new_header')}
                onBack={() => {
                    if (match?.params.page === 'channels') {
                        navigate('/channels');
                        return;
                    }
                    navigate('/credentials');
                }}
                backBtnText={match?.params.page === 'channels' ? t('channels_list') : t('credentials_list')}
                containerClassName={styles.headerContainer}
                contentContainerClassName={styles.contentContainer}
                rightSideComponent={
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px',
                            alignItems: 'center',
                        }}
                    >
                        {match?.params.page === 'credentials' ? (
                            <>
                                <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>{renderSearchBar()}</Box>
                            </>
                        ) : undefined}
                    </Box>
                }
                loading={isFetching}
            >
                {/* Channels */}
                {match?.params.page === 'channels' && renderChannelCredentials()}

                {/* Integration Connectors */}
                {match?.params.page === 'credentials' && renderIntegrationCredentials()}
            </PageLayout>
        </>
    );
};

export default AddNewCredentials;
