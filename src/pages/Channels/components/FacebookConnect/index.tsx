import { Button } from '@imbrace/ui';
import { ListItemAvatar, styled, Typography } from '@mui/material';
import MuiList from '@mui/material/List';
import MuiListItem from '@mui/material/ListItem';
import MuiListItemText from '@mui/material/ListItemText';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import Avatar from '@/components/Avatar';
import useFacebook from '@/hooks/useFacebook';
import store from '@/redux/store';
import { createFacebook } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';

import styles from './index.module.scss';

interface FacebookConnectType {
    open: boolean;
    setSubmitState?: (state: boolean) => void;
    onClose: () => void;
    onReload?: () => void;
    mode?: 'create' | 'edit';
    onResponseAfterCreate?: (data: API.Channel) => void;
}

export interface Data {
    height: number;
    is_silhouette: boolean;
    url: string;
    width: number;
}

export const PageName = styled(MuiListItemText)(() => ({
    margin: 0,
    '& span.MuiTypography-root': {
        color: 'var(--color-light-7)',
        fontSize: '1.125rem',
        lineHeight: '19px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
    },
    '& p.MuiTypography-root': {
        color: 'var(--color-light-5)',
        fontSize: '0.875rem',
        lineHeight: '16px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
    },
}));

export const List = styled(MuiList)(() => ({
    border: 'solid 1px #e0e0e0',
    borderRadius: '4px',
}));

export const ListItem = styled(MuiListItem)(() => ({
    margin: 0,
    padding: '10px 16px 12px 16px',
    '& + .MuiListItemText-root': {
        marginTop: 40,
    },
}));

export const ListSubHeader = styled(MuiListItemText)(() => ({
    margin: 0,
    marginTop: 24,
    marginBottom: 24,
    '& span.MuiTypography-root': {
        color: 'var(--color-light-7)',
        fontSize: '1rem',
        lineHeight: '19px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
    },
}));

export const InstructionHeader = styled(Typography)(() => ({
    color: 'var(--color-light-7)',
    marginTop: '10px',
    fontWeight: 400,
    fontSize: '14px',
    lineHeight: '21px',
}));

export const SubTitle = styled(Typography)(() => ({
    color: 'var(--color-light-7)',
    marginTop: '24px',
    fontWeight: 600,
    fontSize: '16px',
    lineHeight: '24px',
}));

export const InstructionText = styled(Typography)(() => ({
    color: 'var(--color-light-5)',
    marginTop: '4px',
    fontWeight: 400,
    fontSize: '14px',
    lineHeight: '21px',
}));

const FacebookConnect: FC<FacebookConnectType> = (props) => {
    const { onClose, onReload, mode, onResponseAfterCreate } = props;
    const { pages, accessToken, userID, login, clear } = useFacebook();
    const { t } = useTranslation();
    const [facebookPages, setFacebookPages] = useState<API.FacebookPage[]>();
    const [, setIsSubmitted] = useState<boolean>(false);

    const handleOnClose = () => {
        onClose();
        onReload && onReload();
        setIsSubmitted(false);
        clear();
        if (window.location.pathname === '/credentials/new') {
            window.location.replace('/credentials');
        }
    };

    const {
        data: channels,
        isLoading: loading,
        isFetching,
        isSuccess,
    } = useQuery<API.Channel[]>({
        queryKey: ['fb-channels'],
        queryFn: async () => {
            try {
                const { data } = await apiFetch<API.Channel[]>(createFacebook.api(), createFacebook.method, {
                    access_token: accessToken,
                });
                if (data.length > 0) {
                    onResponseAfterCreate && onResponseAfterCreate(data[0]);
                    setFacebookPages(pages);
                    return data;
                }
                return [];
            } catch (err) {
                const error = err as AxiosError;
                console.error(error);
                const message =
                    error?.response?.data.message === 'Duplicate key' ? t('channel_duplicated_key') : error?.response?.data?.message;
                const notificationPayload = {
                    message,
                    messageType: 'noti_failed',
                };
                import('@/redux/slices/notification').then(({ pushNotification }) => {
                    store.dispatch(pushNotification({ notification: notificationPayload }));
                });
                return [];
            } finally {
                setIsSubmitted(true); // set Start button to Done
                clear();
            }
        },
        gcTime: 0,
        enabled: !!accessToken && !!userID,
    });
    const renderPages = useCallback(() => {
        if (channels) {
            return (
                <>
                    {channels.filter((page) => !page.is_deleted).length > 0 && (
                        <>
                            <ListSubHeader>{t('channel_connected_account')}</ListSubHeader>
                            <List>
                                {channels
                                    .filter((channel) => !channel.is_deleted && (channel.errorCode === 3 || !('errorCode' in channel)))
                                    .map((channel) => {
                                        const avatarUrl = facebookPages?.find((page) => page.name === channel.name)?.picture?.data?.url;
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

                    {channels.filter((page) => page.is_deleted).length > 0 && (
                        <>
                            <ListSubHeader>{t('channel_unconnected_account')}</ListSubHeader>
                            <List>
                                {channels
                                    .filter((page) => page.is_deleted)
                                    .map((channel) => {
                                        const avatarUrl = facebookPages?.find((page) => page.name === channel.name)?.picture?.data?.url;
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
                </>
            );
        }
    }, [channels, facebookPages, t]);

    const renderInstruction = () => {
        return (
            <>
                {mode && mode === 'edit' ? (
                    <>
                        <InstructionHeader>{t('credentials_instruction_header_edit')}</InstructionHeader>

                        <SubTitle>{t('credentials_login_and_connect')}</SubTitle>
                        <InstructionText>
                            <Trans i18nKey="credentials_login_and_connect_text_edit" t={t} />
                        </InstructionText>

                        <SubTitle>{t('credentials_pages_selection')}</SubTitle>
                        <InstructionText>{t('credentials_pages_selection_text_edit')}</InstructionText>

                        <SubTitle>{t('credentials_grant_permission')}</SubTitle>
                        <InstructionText>{t('credentials_grant_permission_text')}</InstructionText>

                        <InstructionText sx={{ mt: '24px', color: 'var(--color-light-7)' }}>
                            {t('credentials_ig_blocked_notice_text')}
                        </InstructionText>
                    </>
                ) : (
                    <>
                        <InstructionHeader>{t('credentials_instruction_header')}</InstructionHeader>

                        <SubTitle>{t('credentials_login_and_connect')}</SubTitle>
                        <InstructionText>
                            <Trans i18nKey="credentials_login_and_connect_text" t={t} />
                        </InstructionText>

                        <SubTitle>{t('credentials_pages_selection')}</SubTitle>
                        <InstructionText>{t('credentials_pages_selection_text')}</InstructionText>

                        <SubTitle>{t('credentials_grant_permission')}</SubTitle>
                        <InstructionText>{t('credentials_grant_permission_text')}</InstructionText>

                        <InstructionText sx={{ mt: '24px', color: 'var(--color-light-7)' }}>
                            {t('credentials_ig_blocked_notice_text')}
                        </InstructionText>
                    </>
                )}
            </>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.instructionContainer}>{(channels === undefined || channels.length === 0) && renderInstruction()}</div>
            <div className={styles.pagesContainer}>{renderPages()}</div>

            <div className={styles.footer}>
                {isSuccess ? (
                    <Button onClick={handleOnClose} sx={{ fontWeight: 800, width: '160px' }} text={t('credentials_pages_done')} />
                ) : (
                    <Button
                        disabled={loading || isFetching}
                        loading={loading || isFetching}
                        sx={{
                            backgroundColor: 'var(--color-primary-1)',
                            textTransform: 'uppercase',
                            width: '160px',
                            height: '40px',
                            borderRadius: '10px',
                        }}
                        text={t('login_facebook')}
                        onClick={login}
                    />
                )}
            </div>
        </div>
    );
};

export default FacebookConnect;
