import 'simplebar-react/dist/simplebar.min.css';

import { useVirtualizer } from '@tanstack/react-virtual';
import type { FC } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router';
import { push, replace } from 'redux-first-history';
import SimpleBar from 'simplebar-react';

import styles from '@/pages/Conversations/components/ConversationList/index.module.scss';
import Conversation from '@/pages/Conversations/components/ConversationListItem';
import { clearShowLatestUnreadMsg } from '@/redux/slices/message';
import { resetMessageTemplate } from '@/redux/slices/messageTemplates';
import { selectConversation } from '@/redux/slices/teamConversation';
import type { ReduxTeamConversations, Views } from '@/redux/slices/teamConversation.types';
import { resetSelectWhatsAppMessage } from '@/redux/slices/whatsAppTemplates';
import { useAppDispatch } from '@/redux/store';

import { dummyConversation } from '../../mock';

export type TeamConversationsQueryData = {
    data: ReduxTeamConversations[];
    previousSkip: number;
    nextSkip?: number;
    currentSkip: number;
};
export type TeamConversationsQueryParams = [
    'teamConversations',
    {
        channelTypes?: API.ChannelType[];
        view?: Views;
        teamId?: string;
        search?: string;
        limit: number;
        businessUnitId: string;
    },
];

const ConversationList: FC = () => {
    const dispatch = useAppDispatch();

    const location = useLocation();
    const { onBoarding } = (location.state || {}) as { onBoarding?: boolean };

    const parentRef = useRef<HTMLDivElement>(null);

    const data = useMemo(() => {
        return [dummyConversation] as ReduxTeamConversations[];
    }, []);

    const rowVirtualizer = useVirtualizer({
        count: data.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 100,
        overscan: 5,
    });

    useEffect(() => {
        if (onBoarding && data) {
            dispatch(resetMessageTemplate());
            dispatch(resetSelectWhatsAppMessage());
            dispatch(selectConversation(data[0]._id));
            dispatch(clearShowLatestUnreadMsg());
            dispatch(replace(`/chatroom?conv_id=${data[0]._id}`));
        }
    }, [onBoarding, dispatch, data]);

    return (
        <>
            {
                <div className={styles.conversationListContainer}>
                    <SimpleBar className={styles.listContainer} scrollableNodeProps={{ ref: parentRef }} autoHide>
                        <div
                            style={{
                                height: `${rowVirtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const isLoaderRow = virtualRow.index > data.length - 1;
                                if (isLoaderRow) {
                                    return (
                                        <div
                                            key={virtualRow.index}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: `${virtualRow.size}px`,
                                                transform: `translateY(${virtualRow.start}px)`,
                                            }}
                                        ></div>
                                    );
                                }
                                const {
                                    id,
                                    conversation_id,
                                    name,
                                    status,
                                    timestamp,
                                    channel_type,
                                    team_name,
                                    is_agent_joined,
                                    is_joined,
                                    is_presence,
                                    latest_message,
                                    contact,
                                } = data[virtualRow.index];

                                return (
                                    <div
                                        key={virtualRow.index}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        <Conversation
                                            key={id}
                                            id={id}
                                            conversationId={conversation_id}
                                            name={name}
                                            status={status}
                                            timestamp={timestamp}
                                            channelType={channel_type}
                                            teamName={team_name}
                                            isAgentJoined={is_agent_joined}
                                            isJoined={is_joined}
                                            onClick={() => {
                                                dispatch(resetMessageTemplate());
                                                dispatch(resetSelectWhatsAppMessage());
                                                dispatch(selectConversation(id));
                                                dispatch(clearShowLatestUnreadMsg());
                                                dispatch(push(`/chatroom?conv_id=${id}`));
                                                // dispatch(fetchTeamConversationByIdThunk(id));
                                            }}
                                            isPresence={is_presence}
                                            latestMessage={latest_message}
                                            contact={contact}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </SimpleBar>
                </div>
            }
        </>
    );
};

export default ConversationList;
