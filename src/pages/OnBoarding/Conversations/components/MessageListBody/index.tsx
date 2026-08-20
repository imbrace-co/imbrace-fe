import 'simplebar-react/dist/simplebar.min.css';

import { EllipsisText, Typography } from '@imbrace/ui';
import { CircularProgress, Slide } from '@mui/material';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import SimpleBar from 'simplebar-react';

import { FETCH_SUCCEEDED } from '@/constants/app';
import styles from '@/pages/Conversations/components/MessageListBody/index.module.scss';
import { clearShowLatestUnreadMsg } from '@/redux/slices/message';
import { useAppDispatch, useAppSelector } from '@/redux/store';

import { dummyContact, dummyMessages, dummyTeamConv } from '../../mock';
import Message from '../Message';

interface MessageListBodyProps {
    drawersOpen: boolean;
    isSmallScreen: boolean;
}

export interface MessageListBodyRef {
    scrollToBottom: () => void;
}

const getSafeContentText = (text: unknown): string => {
    return typeof text === 'string' ? text : 'Wrong type of text';
};

const MessageListBody = forwardRef<MessageListBodyRef, MessageListBodyProps>((props, ref) => {
    // const { drawersOpen, isSmallScreen } = props;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const messages = dummyMessages;

    const skip = 0;
    const loadingStatus: string = FETCH_SUCCEEDED;
    // const showLatestUnreadMsg = false;
    // const teamConversationLoadingStatus: string = FETCH_SUCCEEDED;
    const teamConversationId = dummyTeamConv._id;
    const teamConversationTeamId = dummyTeamConv.team_id;
    const teamConversationUsers = dummyTeamConv.users;
    const teamConversationContact = dummyContact;
    const teamConversationChannelType = dummyTeamConv.channel_type;
    const isJoined = dummyTeamConv.is_joined;
    const accountId = useAppSelector((state) => state.Account.id);
    const scrollRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // const [setLatestMsgNode, LatestMsgEntry] = useIntersectionObserver({
    //     lock: loadingStatus === FETCH_IN_PROGRESS || teamConversationLoadingStatus === FETCH_IN_PROGRESS,
    // });
    // const isLatestMsgVisible = !!LatestMsgEntry?.isIntersecting;

    // const [setOldestMsgNode, OldestMsgEntry] = useIntersectionObserver({
    //     lock: loadingStatus === FETCH_IN_PROGRESS || teamConversationLoadingStatus === FETCH_IN_PROGRESS,
    // });

    const visible = false;

    useImperativeHandle(ref, () => ({
        scrollToBottom: () => {
            if (scrollRef.current && loadingStatus === FETCH_SUCCEEDED) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        },
    }));

    const handleScrollToBottom = useCallback(() => {
        if (scrollRef.current && loadingStatus === FETCH_SUCCEEDED) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [loadingStatus]);

    useEffect(() => {
        if (teamConversationId && skip === 0) {
            handleScrollToBottom();
        }
    }, [teamConversationId, handleScrollToBottom, skip]);

    const renderLatestMessage = () => {
        const renderMessage = () => {
            switch (latestMessage.type) {
                case 'response':
                case 'text':
                case 'jaas.conference':
                    return (
                        <EllipsisText
                            style={{ color: 'var(--color-light-6)' }}
                            text={getSafeContentText(latestMessage.content.text as unknown)}
                        />
                    );
                case 'quick_reply':
                    return <EllipsisText style={{ color: 'var(--color-light-6)' }} text={latestMessage.content.title} />;
                case 'image':
                case 'whatsapp.sticker':
                    return <EllipsisText style={{ color: 'var(--color-light-6)' }} text={t('send_image')} />;
                case 'video':
                case 'audio':
                case 'pdf':
                    return <EllipsisText style={{ color: 'var(--color-light-6)' }} text={t(`send_${latestMessage.type}`)} />;
                case 'whatsapp.template':
                    if (typeof (latestMessage.content.text as unknown) !== 'string') {
                        return (
                            <EllipsisText
                                style={{ color: 'var(--color-light-6)' }}
                                text={getSafeContentText(latestMessage.content.text as unknown)}
                            />
                        );
                    }
                    let message = latestMessage.content.text as string;
                    latestMessage.content.variables.forEach((variable, index) => {
                        message = message.replace(`{{${index + 1}}}`, variable);
                    });
                    return <EllipsisText style={{ color: 'var(--color-light-6)' }} text={message} />;
                default:
                    return <div />;
            }
        };
        const latestMessage = messages[messages.length - 1];
        if (latestMessage && latestMessage.from !== accountId) {
            const username =
                latestMessage.from === latestMessage.contact?._id
                    ? latestMessage.contact?.display_name
                    : teamConversationUsers?.find((user) => user.id === latestMessage.from)?.display_name;
            return (
                <>
                    <Typography variant="BodyBold" className={styles.username}>
                        {username}
                    </Typography>
                    <span>: </span>
                    {renderMessage()}
                </>
            );
        }
        return null;
    };

    return (
        <div className={styles.container} ref={containerRef}>
            <SimpleBar className={styles.outer} scrollableNodeProps={{ ref: scrollRef }}>
                <div className={styles.reverseContainer}>
                    <div className={styles.messageListBody}>
                        {messages.map((el, index) => {
                            const user =
                                el.contact ||
                                teamConversationUsers?.find((userItem: API.SimpleUser) => userItem.id === el.from) ||
                                teamConversationContact;

                            return (
                                <Message
                                    index={index}
                                    key={el.id}
                                    from={el.from}
                                    type={el.type}
                                    contactId={teamConversationContact?.id}
                                    createdAt={el.created_at}
                                    content={el.content}
                                    viewMode={false}
                                    comments={el.comments}
                                    conversationId={el.conversation_id}
                                    msgId={el.id}
                                    messages={messages}
                                    user={user}
                                    isJoined={isJoined}
                                    channelType={teamConversationChannelType}
                                    onLoad={() => {
                                        if (index === messages.length - 1) {
                                            handleScrollToBottom();
                                        }
                                    }}
                                    fromUser={el.contact}
                                    teamId={teamConversationTeamId}
                                />
                            );
                        })}
                    </div>

                    {loadingStatus === 'FETCH_IN_PROGRESS' && skip !== 0 ? (
                        <div className={styles.messageListLoading}>
                            <CircularProgress color="imbrace_blue" />
                        </div>
                    ) : null}
                </div>
            </SimpleBar>
            {/* {!isLatestMsgVisible ? (
                <Fab
                    className={clsx(styles.messageFab, drawersOpen && !isSmallScreen ? styles.drawerOpen : '')}
                    onClick={() => {
                        const scrollEl = scrollRef.current;
                        if (scrollEl) {
                            scrollEl.scrollTo({ behavior: 'smooth', top: scrollEl.scrollHeight });
                        }
                    }}
                >
                    <KeyboardArrowDownIcon />
                </Fab>
            ) : null} */}
            <Slide direction="up" in={visible} container={containerRef.current}>
                <div
                    className={styles.latestUnreadMsg}
                    onClick={() => {
                        dispatch(clearShowLatestUnreadMsg());
                        const scrollEl = scrollRef.current;
                        if (scrollEl) {
                            scrollEl.scrollTo({ behavior: 'smooth', top: scrollEl.scrollHeight });
                        }
                    }}
                >
                    {renderLatestMessage()}
                </div>
            </Slide>
        </div>
    );
});

export default MessageListBody;
