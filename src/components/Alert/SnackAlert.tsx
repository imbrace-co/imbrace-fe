import type { AlertProps } from '@imbrace/ui';
import { Alert, Button } from '@imbrace/ui';
import type { CustomContentProps } from 'notistack';
import { SnackbarContent, useSnackbar } from 'notistack';
import { forwardRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import type { FlashNotifications } from '@/redux/slices/notification.types';
import { getTeamConversationByConvId } from '@/services/api/teamConversation';
import apiFetch from '@/services/axios/handler';

export interface SnackAlertProps extends Omit<AlertProps, 'onClose'>, Omit<CustomContentProps, 'message'> {
    snackBarId: string;
    messageData?: FlashNotifications['message'];
}

const SnackAlert = forwardRef<HTMLDivElement, SnackAlertProps>((props, ref) => {
    const { message, messageData, snackBarId, style, ...restProps } = props;
    const { closeSnackbar } = useSnackbar();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleConfirm = useCallback(async () => {
        setLoading(true);
        if (messageData?.type === 'noti_invited' && messageData?.roomId) {
            try {
                const { data } = await apiFetch<{ data: API.Conversation[] }>(
                    getTeamConversationByConvId.api(messageData.roomId),
                    getTeamConversationByConvId.method,
                );
                const convs = data.data;
                if (convs.length > 0) {
                    navigate(`/chatroom?conv_id=${convs[0].id}`, { replace: true });
                }
            } catch (error) {
                console.log(error);
            }
        }
        closeSnackbar(snackBarId);
        setLoading(false);
    }, [messageData, navigate, snackBarId, closeSnackbar]);

    const onClose = async () => {
        closeSnackbar(snackBarId);
    };

    return (
        <SnackbarContent ref={ref} style={style}>
            <Alert
                message={message}
                {...restProps}
                {...(messageData?.type === 'noti_invited' && {
                    actionButton: (
                        <Button
                            type="success"
                            loading={loading}
                            variant="text"
                            size="xs"
                            text={t('step_confirm')}
                            onClick={handleConfirm}
                        />
                    ),
                })}
                onClose={onClose}
            />
        </SnackbarContent>
    );
});

export default SnackAlert;
