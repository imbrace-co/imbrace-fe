import { fetchMethod } from '../axios/index';

export const getNotifications = {
    api: '/channel-service/v1/notifications',
    method: fetchMethod.GET,
};

export const readNotification = {
    api: '/channel-service/v1/notifications/read',
    method: fetchMethod.PUT,
};

export const dismissNotification = {
    api: '/channel-service/v1/notifications/dismiss',
    method: fetchMethod.DELETE,
};

export const dismissAllNotifications = {
    api: '/channel-service/v1/notifications/dismiss/all',
    method: fetchMethod.DELETE,
};
