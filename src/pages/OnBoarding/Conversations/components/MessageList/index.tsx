import useMediaQuery from '@mui/material/useMediaQuery';
import type { FC } from 'react';
import { useCallback, useRef } from 'react';

import CommentContextProvider from '@/pages/Conversations/components/CommentContext';
import styles from '@/pages/Conversations/components/MessageList/index.module.scss';
import type { MessageListBodyRef } from '@/pages/Conversations/components/MessageListBody';
import { fetchMessagesCommentThunk } from '@/redux/slices/message';
import { useAppDispatch, useAppSelector } from '@/redux/store';

import { dummyTeamConv } from '../../mock';
import MessageInput from '../MessageInput';
import MessageListBody from '../MessageListBody';
import MessageListHeader from '../MessageListHeader';
import JoinRoom from '@/pages/Conversations/components/MessageList/JoinRoom';

interface MessageListProps {
    drawersOpen: boolean;
    currentDrawer: string;
    setCurrentDrawer: (drawer: string) => void;
}

const MessageList: FC<MessageListProps> = (props) => {
    const { drawersOpen, currentDrawer, setCurrentDrawer } = props;
    const dispatch = useAppDispatch();

    const msgLoadingStatus = useAppSelector((state) => state.Message.loadingStatus);
    const skip = useAppSelector((state) => state.Message.skip);
    const teamConversationLoadingStatus = useAppSelector((state) => state.TeamConversation.getTeamConversationByIdStatus);
    const teamConversation = dummyTeamConv;
    const isSmallScreen = useMediaQuery('(max-width:1919px)');
    const isLoading = (msgLoadingStatus === 'FETCH_IN_PROGRESS' || teamConversationLoadingStatus === 'FETCH_IN_PROGRESS') && skip === 0;
    const messageListBodyRef = useRef<MessageListBodyRef>(null);

    const onFinish = useCallback(async () => {
        try {
            if (teamConversation?.id) {
                dispatch(fetchMessagesCommentThunk(teamConversation.id));
            }
        } catch (error) {
            console.log(error);
        }
    }, [teamConversation?.id, dispatch]);

    return (
        <>
            <div className={styles.messageListRoot}>
                <MessageListHeader teamConvId={teamConversation?.id} setCurrentDrawer={setCurrentDrawer} />
                <div className={`${styles.listContainer} ${isLoading ? styles.blur : ''}`}>
                    <CommentContextProvider onFinish={onFinish}>
                        <MessageListBody ref={messageListBodyRef} drawersOpen={drawersOpen} isSmallScreen={isSmallScreen} />
                    </CommentContextProvider>

                    {teamConversation?.is_joined ? (
                        <MessageInput
                            currentDrawer={currentDrawer}
                            setCurrentDrawer={setCurrentDrawer}
                            messageListBodyRef={messageListBodyRef}
                            mode={teamConversation?.mode || ''}
                        />
                    ) : (
                        <JoinRoom />
                    )}
                </div>
            </div>
        </>
    );
};

export default MessageList;
