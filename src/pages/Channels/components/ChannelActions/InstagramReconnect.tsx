import { Button, Icon, IconButton, Space, Typography, useDialog } from '@imbrace/ui';
import { Box } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import useInstagram from '@/hooks/useInstagram';
import { notificationPayload } from '@/utils/notificationPayload';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import { updateInstagram } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';
import { getIsAllowModify } from '@/utils/CookiesHelper';

interface Props {
    channel: API.Channel;
    onFinish?: () => void;
    badge?: boolean;
}

const InstagramReconnect = (props: Props) => {
    const { channel, onFinish, badge } = props;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [{ dialog }, dialogsHolder] = useDialog();
    const { accessToken, login, clear } = useInstagram();

    const dialogShownRef = useRef(false);
    const [isLoading, setIsLoading] = useState(false);
    const isAllowModifyChannel = getIsAllowModify();

    const { data, isSuccess } = useQuery({
        queryKey: ['instagram-pages', accessToken],
        queryFn: async () => {
            const res = await apiFetch<API.Channel[]>(updateInstagram.api(), updateInstagram.method, {
                access_token: accessToken,
            });
            console.log('RES:::: ', res);
            return res.data.filter((page) => !('errorCode' in page));
        },
        enabled: !!accessToken,
    });

    const serialize = useCallback(async () => {
        try {
            if (accessToken && data && !dialogShownRef.current) {
                setIsLoading(true);

                dialogShownRef.current = true;
                dialog({
                    title: (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <Typography variant="Heading2" style={{ color: 'var(--color-light-7)' }}>
                                {data.length >= 1 ? t('channels_reconnect_dialog_title') : t('channels_reconnect_dialog_title_not_found')}
                            </Typography>
                            <Typography style={{ color: 'var(--color-light-5)' }}>
                                {data.length >= 1 ? t('channels_reconnect_dialog_title_not_found') : t('channels_reconnect_dialog_desc')}
                            </Typography>
                        </Box>
                    ),
                    content: () => (
                        <>
                            {data.length >= 1 && (
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
                                    {data.map((page: any, index: number) => {
                                        return (
                                            <Space
                                                key={page.id}
                                                direction="horizontal"
                                                style={{
                                                    padding: '12px 0',
                                                    width: '100%',
                                                    gap: '12px',
                                                    borderBottom: data.length - 1 === index ? '' : '1px solid var(--color-light-3)',
                                                }}
                                            >
                                                <Icon namespace="channel" name="instagram" fontSize={24} />
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
                        clear();
                        onFinish?.();
                    },
                    hideCancelButton: true,
                });
            }
            setIsLoading(false);
        } catch (err) {
            const error = err as AxiosError;
            console.error('Update Instagram Channel error: ', error);
            setIsLoading(false);
            dispatch(
                pushNotification({
                    notification: notificationPayload(error?.response?.data?.message),
                }),
            );
        } finally {
            setIsLoading(false);
        }
    }, [t, dialog, accessToken, onFinish, dispatch, clear, data]);

    useEffect(() => {
        if (accessToken && isSuccess) {
            serialize();
        }
    }, [accessToken, serialize, isSuccess]);

    return (
        <Box>
            {dialogsHolder}
            {badge ? (
                <Button
                    className={isAllowModifyChannel ? '' : 'view-only'}
                    variant="outlined"
                    size="xs"
                    type="danger"
                    onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        await login();
                    }}
                    text={
                        <Typography variant="Caption" style={{ textTransform: 'none' }}>
                            {t('reconnection_needed')}
                        </Typography>
                    }
                    sx={{
                        height: 22,
                        color: 'var(--color-danger-5)',
                        padding: '0 8px',
                        borderRadius: '4px',
                    }}
                />
            ) : (
                isAllowModifyChannel && (
                    <IconButton
                        variant="text"
                        type="secondary"
                        size="s"
                        disabled={isLoading || !('errorCode' in channel)}
                        onClick={async () => {
                            await login();
                        }}
                    >
                        {isLoading ? <CircularProgress size={10} sx={{ color: 'var(--color-light-4)' }} /> : <Icon name="reconnect" />}
                    </IconButton>
                )
            )}
        </Box>
    );
};

export default InstagramReconnect;
