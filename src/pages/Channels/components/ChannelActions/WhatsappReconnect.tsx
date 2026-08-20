import { Button, Icon, IconButton, Typography } from '@imbrace/ui';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import useWhatsAppEmbedded from '@/hooks/useWhatsAppEmbedded';
import { notificationPayload } from '@/utils/notificationPayload';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import { updateWhatsApp } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';
import { getIsAllowModify } from '@/utils/CookiesHelper';
import useNotification from '@/hooks/useNotification';

interface Props {
    channel: API.Channel;
    onFinish?: () => void;
    badge?: boolean;
}

const WhatsappReconnect = (props: Props) => {
    const { channel, onFinish, badge } = props;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { login: whatsappOnBoarding, accessToken, clear } = useWhatsAppEmbedded(channel);
    const [isLoading, setIsLoading] = useState(false);
    const { showViewOnlyToast } = useNotification();

    const isAllowModifyChannel = getIsAllowModify();
    const { data, isSuccess } = useQuery({
        queryKey: ['whatsapp-account', accessToken],
        queryFn: () =>
            apiFetch<API.WhatsAppChannel[]>(updateWhatsApp.api(), updateWhatsApp.method, {
                config: {
                    access_key: accessToken,
                    phone_number_id: channel.config.phone_number_id,
                    business_account_id: channel.config.business_account_id,
                },
            }),
        enabled: !!accessToken,
    });

    const serialize = useCallback(async () => {
        try {
            if (accessToken && data) {
                setIsLoading(true);

                dispatch(
                    pushNotification({
                        notification: notificationPayload(t('channels_reconnect_dialog_title'), 'success'),
                    }),
                );
                clear();
                onFinish?.();
            }

            setIsLoading(false);
        } catch (err) {
            const error = err as AxiosError;
            setIsLoading(false);
            console.log('WhatsApp reconnect error: ', error);
            dispatch(
                pushNotification({
                    notification: notificationPayload(error?.response?.data?.message),
                }),
            );
        } finally {
            setIsLoading(false);
        }
    }, [dispatch, t, onFinish, accessToken, clear, data]);

    useEffect(() => {
        if (accessToken && isSuccess) {
            serialize();
        }
    }, [serialize, accessToken, isSuccess]);

    return (
        <>
            {badge ? (
                <Button
                    className={isAllowModifyChannel ? '' : 'view-only'}
                    variant="outlined"
                    size="xs"
                    type="danger"
                    onClick={async (e) => {
                        if (!isAllowModifyChannel) {
                            showViewOnlyToast();
                            return;
                        }
                        e.stopPropagation();
                        e.preventDefault();
                        await whatsappOnBoarding();
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
                            await whatsappOnBoarding();
                        }}
                    >
                        <Icon name="reconnect" />
                    </IconButton>
                )
            )}
        </>
    );
};

export default WhatsappReconnect;
