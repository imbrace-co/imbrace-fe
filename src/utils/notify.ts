import type { OptionsObject } from 'notistack';
import type { CSSProperties } from 'react';

import { pushNotification } from '@/redux/slices/notification';
import store from '@/redux/store';

export const notify = ({
    message,
    variant = 'success',
    messageType = 'noti_success',
    anchorOrigin = {
        horizontal: 'right',
        vertical: 'top',
    },
}: {
    message: string;
    variant?: string;
    messageType?: string;
    anchorOrigin?: OptionsObject['anchorOrigin'];
}) => {
    const newNotification: {
        message: string;
        anchorOrigin?: OptionsObject['anchorOrigin'];
        options?: { onClose?: OptionsObject['onClose'] };
        messageType: string;
        dismissed?: boolean;
        roomName?: string;
        roomId?: string;
        roomChannelType?: API.ChannelType;
        timestamp?: string;
        teamId?: string;
        variant?: string;
        joinable?: boolean;
        style?: CSSProperties;
    } = {
        message,
        messageType,
        variant,
        anchorOrigin,
    };
    store.dispatch(pushNotification({ notification: newNotification }));
};
