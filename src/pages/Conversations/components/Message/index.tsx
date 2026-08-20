import { EllipsisText, Icon, Space, Typography } from '@imbrace/ui';
import { CircularProgress } from '@mui/material';
import dayjs from 'dayjs';
import type { CSSProperties, Dispatch, MutableRefObject, ReactElement } from 'react';
import { lazy, Suspense, useCallback, useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { pinConversationMessage, unpinConversationMessage } from '@/services/api/teamConversation';

import type { ReduxMessage } from '@/redux/slices/message.types';
import clsx from '@/utils/clsx';

// import AmrAudioMessage from './AmrAudioMessage';
// import AudioMessage from './AudioMessage';
import CommentMessage from './CommentMessage';
// import ImageMessage from './ImageMessage';
import styles from './index.module.scss';
import MultipleChoiceMessage from './MultipleChoiceMessage';
import PDFMessage from './pdfMessage';
import TextMessage from './TextMessage';
import UnsupportedMessage from './UnsupportedMessage';
// import VideoCallMessage from './VideoCallMessage';
// import VideoMessage from './VideoMessage';
import WhatsAppTemplateMessage from './WhatsAppTemplateMessage';
import apiFetch from '@/services/axios/handler';
import { CommentContext } from '../CommentContext';

const AmrAudioMessage = lazy(() => import('./AmrAudioMessage'));
const AudioMessage = lazy(() => import('./AudioMessage'));
const VideoMessage = lazy(() => import('./VideoMessage'));
const VideoCallMessage = lazy(() => import('./VideoCallMessage'));
const ImageMessage = lazy(() => import('./ImageMessage'));

type MessageProps = Pick<API.ConversationMessage, 'from' | 'type' | 'content'> & {
    createdAt: string;
    index: number;
    style?: CSSProperties;
    viewMode?: boolean;
    comments?: API.ConversationMessageComments[];
    conversationId: string;
    msgId: string;
    id?: string;
    setMessageRef?: (ref: HTMLDivElement | null) => void;
    containerRef?: MutableRefObject<HTMLElement | null> | Dispatch<HTMLElement>;
    messages: ReduxMessage[];
    user?: API.User | API.Contact | API.SimpleUser;
    isJoined?: boolean;
    contactId?: string;
    channelType?: API.ChannelType;
    onLoad?: () => void;
    fromUser?: API.User | API.Contact;
    teamId?: string;
    isPinned?: boolean;
    disableHover?: boolean;
};

const Message = (props: MessageProps) => {
    const {
        setMessageRef,
        from,
        type,
        createdAt,
        index,
        content,
        style,
        viewMode = false,
        comments,
        conversationId,
        msgId,
        containerRef,
        messages,
        user,
        isJoined,
        contactId,
        channelType,
        onLoad,
        fromUser,
        teamId,
        isPinned,
        disableHover = false,
    } = props;

    const { t } = useTranslation();
    const { onFinish } = useContext(CommentContext);
    const [showHoverIcons, setShowHoverIcons] = useState(false);
    const [isEditingComment, setIsEditingComment] = useState(false);

    const prevMsg = messages[index + 1] || {};
    const nextMsg = messages[index - 1] || {};

    const getSafeText = (value: unknown): string => {
        return typeof value === 'string' ? value : 'Wrong type of text';
    };

    const message: Record<API.MessageType, ReactElement> = {
        image: (
            <Suspense fallback={<CircularProgress size={20} />}>
                <ImageMessage
                    imageSrc={(content as API.MediaContent).url}
                    imageCaption={(content as API.MediaContent).caption}
                    createdAt={createdAt}
                    onLoad={onLoad}
                />
            </Suspense>
        ),
        message_template: <TextMessage content={getSafeText((content as API.TextContent).text as unknown)} />,
        text: <TextMessage content={getSafeText((content as API.TextContent).text as unknown)} />,
        response: (
            <MultipleChoiceMessage
                content={getSafeText((content as API.QuickReply).text as unknown)}
                quickReplies={(content as API.QuickReply).quick_replies}
            />
        ),
        audio: (
            <Suspense fallback={<CircularProgress size={20} />}>
                {channelType === 'wechat' ? (
                    <AmrAudioMessage audioUrl={(content as API.MediaContent).url} />
                ) : (
                    <AudioMessage audioUrl={(content as API.MediaContent).url} />
                )}
            </Suspense>
        ),
        quick_reply: (
            <TextMessage
                content={getSafeText((content as API.QuickReply).title as unknown)}
                description={(content as API.QuickReply).description}
            />
        ),
        'whatsapp.template': <WhatsAppTemplateMessage content={content as API.WhatsAppTemplateContent} />,
        'jaas.conference': (
            <Suspense fallback={<CircularProgress size={20} />}>
                <VideoCallMessage
                    content={getSafeText((content as API.VideoContent).text as unknown)}
                    url={(content as API.VideoContent).url}
                />
            </Suspense>
        ),
        'whatsapp.sticker': (
            <Suspense fallback={<CircularProgress size={20} />}>
                <ImageMessage
                    imageSrc={(content as API.MediaContent).url}
                    imageCaption={(content as API.MediaContent).caption}
                    createdAt={createdAt}
                    onLoad={onLoad}
                />
            </Suspense>
        ),
        pdf: <PDFMessage url={(content as API.MediaContent).url} caption={(content as API.MediaContent).caption} createdAt={createdAt} />,
        video: (
            <Suspense fallback={<CircularProgress size={20} />}>
                <VideoMessage url={(content as API.MediaContent).url} />
            </Suspense>
        ),
    };

    const renderMessage = () => {
        if (message[type]) {
            return message[type];
        }
        return <UnsupportedMessage />;
    };

    const renderUsername = useCallback(() => {
        if (contactId !== from) {
            return null;
        }

        return (
            <Space size={8}>
                <Typography variant={'BodyBold'} style={{ color: 'var(--color-primary-1)' }}>
                    {user?.display_name}
                </Typography>
                {isPinned && (
                    <Icon
                        style={{ cursor: isJoined ? 'pointer' : 'default' }}
                        onClick={() => unpinMessage(conversationId, msgId)}
                        name="star"
                        color="#FA9917"
                        fontSize={14}
                    />
                )}
                <Typography style={{ color: 'var(--color-light-5)' }}>{dayjs(createdAt).format('HH:mm')}</Typography>
            </Space>
        );
    }, [contactId, from, user, createdAt, isPinned]);

    const renderTimeline = useCallback(() => {
        if (dayjs(nextMsg.created_at).isSame(dayjs(createdAt), 'day')) {
            return null;
        }

        if (dayjs(nextMsg.created_at).isSame(dayjs(prevMsg.created_at), 'day')) {
            return null;
        }

        return <Typography style={{ alignSelf: 'center' }}>{dayjs(createdAt).format('DD/MM/YYYY')}</Typography>;
    }, [createdAt, nextMsg.created_at, prevMsg.created_at]);

    const renderTimestamp = () => {
        // if (content && 'is_mail' in content && content.is_mail) {
        //     return `${t('send_by_email', { when: dayjs(createdAt).format('HH:mm') })}`;
        // }

        return dayjs(createdAt).format('HH:mm');
    };

    const renderComment = () => {
        if (type === 'text') {
            return (
                <CommentMessage
                    conversationId={conversationId}
                    msgId={msgId}
                    contactId={contactId}
                    comments={comments}
                    teamId={teamId}
                    viewMode={!isJoined ? true : viewMode}
                    isEditing={isEditingComment}
                    onEditingChange={setIsEditingComment}
                />
            );
        }
    };

    const pinMessage = useCallback(async (convId: string, commentId: string) => {
        try {
            await apiFetch(pinConversationMessage.api(convId, commentId), pinConversationMessage.method);
            onFinish?.();
        } catch (error) {
            console.log('pinMessage error: ', error);
        }
    }, []);
 
    const unpinMessage = useCallback(async (convId: string, commentId: string) => {
        try {
            await apiFetch(unpinConversationMessage.api(convId, commentId), unpinConversationMessage.method);
            onFinish?.();
        } catch (error) {
            console.log('unpinMessage error: ', error);
        }
    }, []);

    return (
        <>
            {renderTimeline()}
            <div
                ref={containerRef as MutableRefObject<HTMLDivElement | null>}
                {...(setMessageRef && { ref: (ref) => setMessageRef(ref) })}
                className={clsx(styles.messageRoot, contactId === from ? styles.received : styles.sent)}
                style={style}
                onMouseEnter={() => !disableHover && setShowHoverIcons(true)}
                onMouseLeave={() => !disableHover && setShowHoverIcons(false)}
            >
                <div className={styles.messageRootContent}>
                    <div className={styles.commentContent}>
                        <Space style={{ position: 'relative' }} size={4} direction="vertical" align={'start'} className={contactId === from ? styles.received : styles.sent}>
                            {renderUsername()}
                            {renderMessage()}
                            {contactId === from && comments && comments.length > 0 && (
                                <Space justify="center" align="center" style={{ width: 30, height: 30, backgroundColor: 'white', position: 'absolute', bottom: -15, right: -6, border: '1px solid #F2F2F2', zIndex: 1000, borderRadius: '50%' }}>
                                    <Icon name="stickyNote2Outlined" fontSize={26} color="#156DF2" />
                                </Space>
                            )}

                            {contactId !== from && (
                                <Space size={8} style={{ alignSelf: 'flex-end', opacity: '0.6' }}>
                                    <Space size={4}>
                                        {content && 'is_mail' in content && content.is_mail && <Icon name="email" />}
                                        <EllipsisText
                                            element={
                                                <Typography
                                                    style={{
                                                        color: 'white',
                                                        textAlign: 'right',
                                                    }}
                                                />
                                            }
                                            text={
                                                fromUser && 'is_bot' in fromUser && fromUser.is_bot
                                                    ? t('system_automation')
                                                    : t('by', {
                                                          who: fromUser?.display_name,
                                                      })
                                            }
                                        />
                                    </Space>

                                    <Typography
                                        style={{
                                            color: 'white',
                                            textAlign: 'right',
                                            display: 'inline-block',
                                        }}
                                    >
                                        {renderTimestamp()}
                                    </Typography>
                                </Space>
                            )}
                        </Space>
                        {showHoverIcons && contactId === from && isJoined && (
                            <Space size={8} className={styles.hoverIcons}>
                                {(comments === undefined || (comments && comments.length < 3)) && (
                                    <div className={styles.hoverIcon} onClick={() => setIsEditingComment(true)}>
                                        <Icon name="comment" fontSize={20} />
                                        <Typography style={{ fontSize: 12, marginLeft: 6 }}>Add Note</Typography>
                                    </div>
                                )}
                                <div
                                    style={{ visibility: isPinned ? 'hidden' : 'visible' }}
                                    className={styles.hoverIcon}
                                    onClick={() => pinMessage(conversationId, msgId)}
                                >
                                    <Icon name="star" fontSize={20} />
                                    <Typography style={{ fontSize: 12, marginLeft: 6 }}>Pin Message</Typography>
                                </div>
                            </Space>
                        )}
                        {renderComment()}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Message;
