import type { ReactNode } from 'react';
import { createContext, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

import { logoutThunk } from '@/redux/slices/access';
import { fetchAccountThunk } from '@/redux/slices/account';
import { appendMessageThunk } from '@/redux/slices/message';
import { teamJoinedEventThunk, teamUpdateEventThunk } from '@/redux/slices/team';
import {
    agentNeededConversationThunk,
    conversationContactUpdatedEventThunk,
    conversationCreatedEventThunk,
    conversationInvitedEventThunk,
    conversationJoinedEventThunk,
    conversationLeftEventThunk,
    conversationNameUpdatedEventThunk,
    conversationOnlineStatusUpdatedEventThunk,
    fetchViewsCountThunk,
    sortConversationsThunk,
    statusUpdatedEventThunk,
} from '@/redux/slices/teamConversation';
import { useAppDispatch, useAppSelector } from '@/redux/store';

import { IMBRACE_ACCESS_TOKEN } from '../constants/app';
import {
    AGENT_NEEDED,
    BU_CONTACT_CREATED,
    BU_CONTACT_UPDATED,
    CONTACT_OFFLINE,
    CONTACT_ONLINE,
    CONVERSATION_INVITED,
    CONVERSATION_MESSAGE,
    CREATED_CONVERSATION,
    JOINED_CONVERSATION,
    LEFT_CONVERSATION,
    TEAM_JOINED,
    TEAM_UPDATE,
    TEAM_USER_ROLE_UPDATED,
    UPDATED_CONVERSATION_NAME,
    UPDATED_CONVERSATION_STATUS,
    USER_DEACTIVATED,
    WS_DISCONNECTED,
} from '../constants/socket';
import { SOCKET_ENDPOINT } from '../services/baseURL';

export const SocketContext = createContext({});

interface SocketEvents {
    [BU_CONTACT_CREATED]: (payload: Record<string, unknown>) => void;
    [CREATED_CONVERSATION]: (payload: ImbraceSocket.ConversationCreated) => void;
    [CONVERSATION_MESSAGE]: (payload: ImbraceSocket.MessageCreated) => void;
    [AGENT_NEEDED]: (payload: ImbraceSocket.AgentNeeded) => void;
    [UPDATED_CONVERSATION_STATUS]: (payload: ImbraceSocket.StatusUpdated) => void;
    [JOINED_CONVERSATION]: (payload: ImbraceSocket.Joined) => void;
    [LEFT_CONVERSATION]: (payload: ImbraceSocket.Left) => void;
    [UPDATED_CONVERSATION_NAME]: (payload: ImbraceSocket.NameUpdated) => void;
    [TEAM_JOINED]: (payload: ImbraceSocket.TeamJoined) => void;
    [TEAM_USER_ROLE_UPDATED]: (payload: ImbraceSocket.TeamUserRoleUpdated) => void;
    [USER_DEACTIVATED]: () => void;
    [CONTACT_ONLINE]: (payload: ImbraceSocket.ContactStatus) => void;
    [CONTACT_OFFLINE]: (payload: ImbraceSocket.ContactStatus) => void;
    [BU_CONTACT_UPDATED]: (payload: ImbraceSocket.ContactUpdated) => void;
    [TEAM_UPDATE]: (payload: ImbraceSocket.TeamUpdate) => void;
    [CONVERSATION_INVITED]: (payload: ImbraceSocket.ConversationInvited) => void;
}

export function SocketContextProvider(props: { children?: ReactNode }) {
    const dispatch = useAppDispatch();
    const organizationId = useAppSelector((state) => state.Account.organizationId);

    const initWebSocket = useCallback(() => {
        const socketConfig = {
            transports: ['websocket'],
            path: '/ws',
            query: {},
            auth: {
                access_token: window.localStorage.getItem(IMBRACE_ACCESS_TOKEN),
            },
            pingTimeout: 3000,
        };

        if (!organizationId) {
            return;
        }

        const socketUrl = `${SOCKET_ENDPOINT}/${organizationId}`;

        const socket: Socket<SocketEvents> = io(socketUrl, socketConfig);

        socket.on('connect', () => {
            console.log('IS SOCKET CONNECTED?', socket.connected);
            console.log('connected to socket server', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('IS SOCKET DISCONNECTED?', socket.connected);
        });

        socket.on(BU_CONTACT_CREATED, (payload) => {
            console.log('socket bu contact created:');
            console.log(payload);
        });

        socket.on(CREATED_CONVERSATION, (payload) => {
            dispatch(conversationCreatedEventThunk(payload));
            dispatch(fetchViewsCountThunk());
        });

        socket.on(CONVERSATION_MESSAGE, (payload) => {
            dispatch(appendMessageThunk(payload));
            dispatch(sortConversationsThunk(payload));
        });

        socket.on(AGENT_NEEDED, (payload) => {
            dispatch(agentNeededConversationThunk(payload));
        });

        socket.on(UPDATED_CONVERSATION_STATUS, (payload) => {
            dispatch(statusUpdatedEventThunk(payload));
            dispatch(fetchViewsCountThunk());
        });

        socket.on(JOINED_CONVERSATION, (payload) => {
            dispatch(conversationJoinedEventThunk(payload));
            dispatch(fetchViewsCountThunk());
        });

        socket.on(LEFT_CONVERSATION, (payload) => {
            dispatch(conversationLeftEventThunk(payload));
        });

        socket.on(UPDATED_CONVERSATION_NAME, (payload) => {
            dispatch(conversationNameUpdatedEventThunk(payload));
        });

        socket.on(TEAM_JOINED, (payload) => {
            dispatch(teamJoinedEventThunk(payload));
        });

        socket.on(TEAM_USER_ROLE_UPDATED, (payload) => {
            dispatch(fetchAccountThunk({ silent: true }));
        });

        socket.on(USER_DEACTIVATED, () => {
            dispatch(logoutThunk());
        });

        socket.on(CONTACT_ONLINE, (payload) => {
            dispatch(
                conversationOnlineStatusUpdatedEventThunk({
                    ...payload,
                    is_presence: true,
                }),
            );
            dispatch(fetchViewsCountThunk());
        });

        socket.on(CONTACT_OFFLINE, (payload) => {
            dispatch(
                conversationOnlineStatusUpdatedEventThunk({
                    ...payload,
                    is_presence: false,
                }),
            );
            dispatch(fetchViewsCountThunk());
        });

        socket.on(TEAM_UPDATE, (payload) => {
            dispatch(teamUpdateEventThunk(payload));
        });

        socket.on(BU_CONTACT_UPDATED, (payload) => {
            const { channel, action, ...contact } = payload;

            dispatch(conversationContactUpdatedEventThunk(contact));
        });

        socket.on(CONVERSATION_INVITED, (payload) => {
            dispatch(conversationInvitedEventThunk(payload));
        });

        socket.on(WS_DISCONNECTED, (error) => {
            console.log('ws disconnected: ', error);
        });

        return socket;
    }, [dispatch, organizationId]);

    useEffect(() => {
        const socket = initWebSocket();
        return () => {
            if (socket) {
                socket.off();
            }
        };
    }, [initWebSocket]);

    return <SocketContext.Provider value={{}}>{props.children}</SocketContext.Provider>;
}
