import type { OptionsObject } from 'notistack';
import type { CSSProperties } from 'react';

export interface InitialState {
    flashNotifications: FlashNotifications[];
    notifications: API.NotificationItem[];
    isOpen: boolean;
    hasMore: boolean;
    total: number;
    count: number;
    skip: number;
    limit: number;
    loadingStatus: LoadingStatus;
    error?: string;
    unreadCount: number;
}

export interface FlashNotifications {
    key: string;
    message: {
        type: string;
        notice: string;
        roomName?: string;
        roomId?: string;
        roomChannelType?: API.ChannelType;
        timestamp?: string;
        teamId?: string;
    };
    anchorOrigin?: OptionsObject['anchorOrigin'];
    style?: CSSProperties;
    joinable?: boolean;
    variant?: string;
    options?: { onClose?: OptionsObject['onClose'] };
    dismissed?: boolean;
}
export interface FetchListPayload {
    notifications: API.NotificationItem[];
    hasMore: boolean;
    total: number;
    count: number;
    skip: number;
    limit: number;
}
