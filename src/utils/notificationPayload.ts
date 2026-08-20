import type { OptionsObject } from 'notistack';
import type { CSSProperties } from 'react';

export const notificationPayload = (msg: string, variant: 'error' | 'success' | 'info' = 'error') => {
    let type = 'noti_failed';
    if (variant === 'success') {
        type = 'noti_success';
    }
    if (variant === 'info') {
        type = 'noti_warning';
    }
    const newNotification: {
        message: string;
        anchorOrigin?: OptionsObject['anchorOrigin'];
        options?: { onClose?: OptionsObject['onClose'] };
        messageType: string;
        variant?: string;
        style?: CSSProperties;
    } = {
        message: msg,
        messageType: type,
        variant,
        anchorOrigin: {
            horizontal: 'right',
            vertical: 'top',
        },
    };
    return newNotification;
};
