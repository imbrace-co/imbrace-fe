import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import uniqBy from 'lodash/uniqBy';
import type { OptionsObject } from 'notistack';
import type { CSSProperties } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { FETCH_FAILED, FETCH_IN_PROGRESS, FETCH_SUCCEEDED, IDLE } from '@/constants/app';
import { getNotifications } from '@/services/api/notification';
import apiFetch from '@/services/axios/handler';

import type { AsyncThunkOptions, PaginationParams } from './index.types';
import type { FetchListPayload, FlashNotifications, InitialState } from './notification.types';

const initialState: InitialState = {
    flashNotifications: [],
    notifications: [],
    isOpen: false,
    hasMore: false,
    total: 0,
    count: 0,
    skip: 0,
    limit: 10,
    loadingStatus: IDLE,
    unreadCount: 0,
};

/**
 * @param {number} limit - Notifications list limit
 * @param {number} skip - Notifications list skip/offset
 */

export const fetchNotificationsThunk = createAsyncThunk<FetchListPayload, PaginationParams, AsyncThunkOptions>(
    'Notification/fetchList',
    async ({ limit = 50, skip = 0 }, { getState, rejectWithValue }) => {
        try {
            const state = getState();
            const { data } = await apiFetch<API.PaginatedResponse<API.NotificationItem[]>>(getNotifications.api, getNotifications.method, {
                skip,
                limit: 20,
            });

            let notifications;

            if (skip > 0) {
                notifications = uniqBy([...state.Notification.notifications, ...data.data], (el) => el.id);
            } else {
                notifications = data.data;
            }

            const payload = {
                notifications,
                hasMore: data.has_more,
                total: data.total,
                count: data.count,
                skip: skip,
                limit: limit,
                unreadCount: data.unread_count,
            };

            return payload;
        } catch (err) {
            const error = err as AxiosError<API.ErrorResponse>;
            let message = 'Something went wrong';

            if (!error.response) {
                if (err instanceof Error) {
                    message = err.message;
                }
            } else {
                message = error.response.data.message;
            }
            return rejectWithValue({ message });
        }
    },
);

export const notificationSlice = createSlice({
    name: 'Notification',
    initialState,
    reducers: {
        toggleDrawer: (state) => {
            state.isOpen = !state.isOpen;
        },
        pushNotification: (
            state,
            {
                payload,
            }: PayloadAction<{
                notification: {
                    message: string;
                    anchorOrigin?: OptionsObject['anchorOrigin'];
                    style?: CSSProperties;
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
                };
            }>,
        ) => {
            const {
                message,
                messageType,
                anchorOrigin = {
                    vertical: 'bottom',
                    horizontal: 'left',
                },
                roomName,
                roomId,
                roomChannelType,
                timestamp,
                teamId,
                ...restData
            } = payload.notification;

            const newNotification: FlashNotifications = {
                key: uuidv4(),
                message: {
                    type: messageType,
                    notice: message,
                    roomName,
                    roomId,
                    roomChannelType,
                    timestamp,
                    teamId,
                },
                anchorOrigin,
                ...restData,
            };

            state.flashNotifications = [...state.flashNotifications, newNotification];
        },
        updateNotification: (
            state,
            {
                payload,
            }: PayloadAction<{
                key: string;
                joinable: boolean;
                dismissed: boolean;
            }>,
        ) => {
            const nextNotifications = [...state.flashNotifications];
            const selectedNotificationIndex = state.flashNotifications.findIndex((el) => el.key === payload.key);
            nextNotifications[selectedNotificationIndex] = {
                ...nextNotifications[selectedNotificationIndex],
                joinable: payload.joinable,
                dismissed: payload.dismissed,
            };

            state.flashNotifications = nextNotifications;
        },
        removeNotification: (state, { payload }: PayloadAction<string>) => {
            const nextNotifications = state.flashNotifications.filter((el) => el.key !== payload);

            state.flashNotifications = nextNotifications;
        },
    },
    extraReducers: (builder) => {
        // Notification/fetchList
        builder
            .addCase(fetchNotificationsThunk.pending, (state, action) => {
                state.loadingStatus = FETCH_IN_PROGRESS;
            })
            .addCase(fetchNotificationsThunk.fulfilled, (state, action) => {
                if (state.loadingStatus === FETCH_IN_PROGRESS) {
                    return {
                        ...state,
                        loadingStatus: FETCH_SUCCEEDED,
                        ...action.payload,
                    };
                }
            })
            .addCase(fetchNotificationsThunk.rejected, (state, action) => {
                state.loadingStatus = FETCH_FAILED;
                if (action.payload) {
                    state.error = action.payload.message;
                }
            });
    },
});

export const { toggleDrawer, pushNotification, updateNotification, removeNotification } = notificationSlice.actions;

export default notificationSlice.reducer;
