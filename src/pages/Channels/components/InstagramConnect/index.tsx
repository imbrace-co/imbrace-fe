import { Button } from '@imbrace/ui';
import { CircularProgress, ListItemAvatar } from '@mui/material';
import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import Avatar from '@/components/Avatar';
import useInstagram from '@/hooks/useInstagram';
import { createInstagram } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';

import { InstructionHeader, InstructionText, List, ListItem, ListSubHeader, PageName, SubTitle } from '../FacebookConnect';
import styles from './index.module.scss';
import { env } from '@/env';

interface InstagramConnectType {
    open: boolean;
    setSubmitState?: (state: boolean) => void;
    onClose: () => void;
    onReload?: () => void;
    mode?: 'create' | 'edit';
}

export interface Data {
    height: number;
    is_silhouette: boolean;
    url: string;
    width: number;
}

const InstagramConnect: FC<InstagramConnectType> = (props) => {
    const { t } = useTranslation();
    // const dispatch = useAppDispatch();
    const { accessToken, userID, login, clear } = useInstagram();
    const { open, onClose, onReload, mode } = props;

    const [loading, setLoading] = useState<boolean>(false);
    const [igChannels, setIgChannels] = useState<API.InstagramChannel[]>([]);

    useEffect(() => {
        if (!open) {
            clear();
        }
    }, [open, clear]);

    // const dispatchErrorToast = useCallback(
    //     (error: AxiosError) => {
    //         const validateArr = error?.response?.data?.validate.split('.');
    //         const errorField = validateArr?.[validateArr.length - 1];
    //
    //         const fieldNameMapping: Record<string, string> = {
    //             page_id: 'Page ID', // facebook
    //             igsid: 'IGSID (Instagram Scope ID)', // instagram
    //         };
    //
    //         const message =
    //             error?.response?.data?.message === 'Duplicate key'
    //                 ? `${t('credential_notification_duplicate_key')}: ${fieldNameMapping[errorField]}`
    //                 : error?.response?.data?.message;
    //
    //         const notificationPayload = {
    //             message,
    //             messageType: 'noti_failed',
    //             variant: 'error',
    //         };
    //         dispatch(pushNotification({ notification: notificationPayload }));
    //     },
    //     [dispatch, t],
    // );

    const serialize = useCallback(async () => {
        if (!userID || !accessToken) return;
        setLoading(true);
        try {
            const { data } = await apiFetch<API.InstagramChannel[]>(createInstagram.api(), createInstagram.method, {
                access_token: accessToken,
            });
            setIgChannels(data);
        } catch (err) {
            // const error = err as AxiosError;
            // dispatchErrorToast(error);
            console.log('create instagram error', err);
        }
        setLoading(false);
    }, [userID, accessToken]);

    useEffect(() => {
        serialize();
    }, [serialize]);

    const handleOnClose = () => {
        onClose();
        onReload && onReload();
        if (window.location.pathname === '/credentials/new') {
            window.location.replace('/credentials');
        }
    };

    const newIgChannels = igChannels.filter((item) => !item.is_deleted);
    const deletedIgChannels = igChannels.filter((item) => item.is_deleted);

    const renderPages = () => {
        if (igChannels.length > 0) {
            return (
                <>
                    {newIgChannels.length > 0 && (
                        <>
                            <ListSubHeader>{t('channel_connected_account')}</ListSubHeader>
                            <List>
                                {newIgChannels.map((channel) => {
                                    const avatarUrl = channel.config.ig_profile_picture_url;
                                    return (
                                        <ListItem key={channel.id}>
                                            <ListItemAvatar sx={{ minWidth: '35px', marginRight: '27px', position: 'relative' }}>
                                                <Avatar
                                                    isActive
                                                    avatarUrl={avatarUrl}
                                                    displayName={channel.name}
                                                    backgroundColor={'var(--color-light-3)'}
                                                />
                                            </ListItemAvatar>
                                            <PageName>{channel.name}</PageName>
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </>
                    )}

                    {deletedIgChannels.length > 0 && (
                        <>
                            <ListSubHeader>{t('channel_unconnected_account')}</ListSubHeader>
                            <List>
                                {deletedIgChannels.map((channel) => {
                                    const avatarUrl = channel.config.ig_profile_picture_url;
                                    return (
                                        <ListItem key={channel.id}>
                                            <ListItemAvatar sx={{ minWidth: '35px', marginRight: '27px', position: 'relative' }}>
                                                <Avatar
                                                    isActive
                                                    avatarUrl={avatarUrl}
                                                    displayName={channel.name}
                                                    backgroundColor={'var(--color-light-3)'}
                                                />
                                            </ListItemAvatar>
                                            <PageName>{channel.name}</PageName>
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </>
                    )}
                    <Button
                        onClick={handleOnClose}
                        sx={{
                            marginTop: '24px',
                            fontWeight: 800,
                            width: '160px',
                            height: '40px',
                        }}
                        text={t('credentials_pages_done')}
                    />
                </>
            );
        }
        return null;
    };

    const renderInstruction = () => {
        return (
            <>
                {mode && mode === 'edit' ? (
                    <>
                        <InstructionHeader>{t('credentials_ig_instruction_header')}</InstructionHeader>

                        <SubTitle>{t('credentials_login_and_connect')}</SubTitle>
                        <InstructionText>
                            <span>{t('credentials_ig_login_two_options')}:</span>
                            <ul style={{ margin: '0 0 15px -16px' }}>
                                <li>
                                    <Trans i18nKey="credentials_ig_login_option_instagram" t={t} />
                                </li>
                                <li>
                                    <Trans i18nKey="credentials_ig_login_option_facebook" t={t} />
                                </li>
                            </ul>
                        </InstructionText>

                        <InstructionText>
                            <Trans i18nKey="credentials_ig_login_and_connect_text" t={t} />
                        </InstructionText>

                        <SubTitle>{t('credentials_ig_accounts_selection')}</SubTitle>
                        <InstructionText>
                            <Trans i18nKey="credentials_ig_accounts_selection_text" t={t} />
                        </InstructionText>

                        <SubTitle>{t('credentials_grant_permission')}</SubTitle>
                        <InstructionText>{t('credentials_ig_grant_permission_text')}</InstructionText>

                        <InstructionText sx={{ marginTop: '24px', color: 'var(--color-text)' }}>
                            {t('credentials_ig_blocked_notice_text')}
                        </InstructionText>
                    </>
                ) : (
                    <>
                        <InstructionHeader>{t('credentials_ig_instruction_header')}</InstructionHeader>

                        <SubTitle>{t('credentials_login_and_connect')}</SubTitle>
                        <InstructionText>
                            <span>{t('credentials_ig_login_two_options')}:</span>
                            <ul style={{ margin: '0 0 15px -16px' }}>
                                <li>
                                    <Trans i18nKey="credentials_ig_login_option_instagram" t={t} />
                                </li>
                                <li>
                                    <Trans i18nKey="credentials_ig_login_option_facebook" t={t} />
                                </li>
                            </ul>
                        </InstructionText>

                        <InstructionText>
                            <Trans i18nKey="credentials_ig_login_and_connect_text" t={t} />
                        </InstructionText>

                        <SubTitle>{t('credentials_ig_accounts_selection')}</SubTitle>
                        <InstructionText>
                            <Trans i18nKey="credentials_ig_accounts_selection_text" t={t} />
                        </InstructionText>

                        <SubTitle>{t('credentials_grant_permission')}</SubTitle>
                        <InstructionText>{t('credentials_ig_grant_permission_text')}</InstructionText>

                        <InstructionText sx={{ marginTop: '24px', color: 'var(--color-text)' }}>
                            {t('credentials_ig_blocked_notice_text')}
                        </InstructionText>
                    </>
                )}
            </>
        );
    };

    return (
        <div className={styles.container}>
            {loading && <CircularProgress size={'25px'} />}
            {!loading && igChannels.length > 0 && <div className={styles.pagesContainer}>{renderPages()}</div>}
            {!loading && igChannels.length === 0 && (
                <>
                    <div className={styles.pagesContainer}>{renderInstruction()}</div>
                    <div className={styles.footer}>
                        <Button
                            disabled={loading}
                            loading={loading}
                            sx={{
                                backgroundColor: 'var(--color-primary-1)',
                                textTransform: 'uppercase',
                                width: 'auto',
                                height: '40px',
                                borderRadius: '10px',
                            }}
                            text={t('login_with_instagram')}
                            onClick={() => {
                                const IG_uri =
                                    'https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=1340475523786582';
                                const scopes = ['instagram_business_basic', 'instagram_business_manage_messages'];
                                window.location.href = `${IG_uri}&redirect_uri=${
                                    env.VITE_APP_HOST
                                }/channels&response_type=code&scope=${scopes.join(',')}`;
                            }}
                        />
                        <Button
                            disabled={loading}
                            loading={loading}
                            sx={{
                                backgroundColor: 'var(--color-primary-1)',
                                textTransform: 'uppercase',
                                height: '40px',
                                borderRadius: '10px',
                                width: 'auto',
                            }}
                            text={t('login_via_facebook')}
                            onClick={login}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default InstagramConnect;
