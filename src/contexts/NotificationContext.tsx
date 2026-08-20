import 'babel-polyfill';

import { useDialog } from '@imbrace/ui';
import Pushy from 'pushy-sdk-web';
import type { ReactNode } from 'react';
import { createContext, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { env } from '@/env';
import { conversationJoinRequestThunk } from '@/redux/slices/teamConversation';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { getTeamConversationByConvId } from '@/services/api/teamConversation';
import apiFetch from '@/services/axios/handler';

export const NotificationContext = createContext({});

export function NotificationContextProvider(props: { children: ReactNode }) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const id = useAppSelector((state) => state.Account.id);
    const navigate = useNavigate();
    const { search, pathname } = useLocation();
    const [{ dialog }, dialogHolder] = useDialog();

    const subscribeTopics = useCallback(async (topics: string) => {
        const isRegistered = await Pushy.isRegistered();
        if (isRegistered) {
            await Pushy.unsubscribe('*');
            await Pushy.subscribe(topics);
        }
    }, []);

    const registerPushy = useCallback(
        async (uid: string) => {
            try {
                await Pushy.register({ appId: env.VITE_APP_PUSHY_APP_ID });

                Pushy.setNotificationListener((data) => {
                    console.log('Received notification: ', data);
                });
                await subscribeTopics(uid);
            } catch (error) {
                console.error(error);
            }
        },
        [subscribeTopics],
    );

    const joinConvHandler = useCallback(
        async (uid: string) => {
            try {
                await dispatch(conversationJoinRequestThunk(uid));
                navigate(pathname, { replace: true });
            } catch (error) {}
        },
        [dispatch, navigate, pathname],
    );

    const getTeamConvs = useCallback(
        async (convId: string) => {
            try {
                const { data } = await apiFetch<{ data: API.Conversation[] }>(
                    getTeamConversationByConvId.api(convId),
                    getTeamConversationByConvId.method,
                );
                const convs = data.data;
                if (convs.length === 1) {
                    navigate(`/chatroom?conv_id=${convs[0].id}`, { replace: true });
                } else if (convs.length > 1) {
                    const joinedConvs = convs.filter((conv) => conv.is_joined);
                    if (joinedConvs.length) {
                        navigate(`/chatroom?conv_id=${joinedConvs[0].id}`, { replace: true });
                    } else {
                        navigate(`/chatroom?conv_id=${convs[0].id}`, { replace: true });
                    }
                } else {
                    dialog({
                        title: t('error_no_permission_to_access_conversation'),
                        content: t('error_no_permission_to_access_conversation_desc'),
                        hideCancelButton: true,
                        confirmText: t('okay'),
                    });
                }
            } catch (error) {
                console.log(error);
            }
        },
        [navigate, dialog, t],
    );

    useEffect(() => {
        if (id) {
            registerPushy(id);
        }
    }, [id, registerPushy]);

    useEffect(() => {
        const searchParam = new URLSearchParams(search);
        const grabId = searchParam.get('grab_id');
        const convId = searchParam.get('to_conv');
        if (grabId) {
            joinConvHandler(grabId);
        }
        if (convId) {
            getTeamConvs(convId);
        }
    }, [search, joinConvHandler, getTeamConvs]);

    return (
        <NotificationContext.Provider value={{}}>
            {dialogHolder}
            {props.children}
        </NotificationContext.Provider>
    );
}
