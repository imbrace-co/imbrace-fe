import type { OptionsObject } from 'notistack';
import { useTranslation } from 'react-i18next';

import store from '@/redux/store';
import { waringTopRight } from '@/utils/notificationHelper';

interface NotificationPayloadProps {
    message: string;
    anchorOrigin?: OptionsObject['anchorOrigin'];
    messageType: string;
    variant?: string;
}

const useNotification = () => {
    const { t } = useTranslation();
    const viewOnlyNotificationPayload = {
        message: t('notification_member_role_view_only_access'),
        ...waringTopRight,
    };

    const showToast = (notificationPayload: NotificationPayloadProps) => {
        import('@/redux/slices/notification').then(({ pushNotification }) => {
            store.dispatch(pushNotification({ notification: notificationPayload }));
        });
    };

    const showViewOnlyToast = () => {
        showToast(viewOnlyNotificationPayload);
    };

    return {
        showViewOnlyToast,
    };
};

export default useNotification;
