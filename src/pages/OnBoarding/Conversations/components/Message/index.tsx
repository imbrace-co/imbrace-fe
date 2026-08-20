import { EllipsisText, Icon, Space, Typography } from '@imbrace/ui';
import { CircularProgress } from '@mui/material';
import dayjs from 'dayjs';
import type { CSSProperties, Dispatch, MutableRefObject, ReactElement } from 'react';
import { lazy, Suspense, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// import ImageMessage from './ImageMessage';
import styles from '@/pages/Conversations/components/Message/index.module.scss';
import MultipleChoiceMessage from '@/pages/Conversations/components/Message/MultipleChoiceMessage';
import PDFMessage from '@/pages/Conversations/components/Message/pdfMessage';
import TextMessage from '@/pages/Conversations/components/Message/TextMessage';
import UnsupportedMessage from '@/pages/Conversations/components/Message/UnsupportedMessage';
// import VideoCallMessage from './VideoCallMessage';
// import VideoMessage from './VideoMessage';
import WhatsAppTemplateMessage from '@/pages/Conversations/components/Message/WhatsAppTemplateMessage';
import type { ReduxMessage } from '@/redux/slices/message.types';
import clsx from '@/utils/clsx';

// import AmrAudioMessage from './AmrAudioMessage';
// import AudioMessage from './AudioMessage';
import CommentMessage from './CommentMessage';

const AmrAudioMessage = lazy(() => import('@/pages/Conversations/components/Message/AmrAudioMessage'));
const AudioMessage = lazy(() => import('@/pages/Conversations/components/Message/AudioMessage'));
const VideoMessage = lazy(() => import('@/pages/Conversations/components/Message/VideoMessage'));
const VideoCallMessage = lazy(() => import('@/pages/Conversations/components/Message/VideoCallMessage'));
const ImageMessage = lazy(() => import('@/pages/Conversations/components/Message/ImageMessage'));

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
    } = props;

    const { t } = useTranslation();

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
                <Typography style={{ color: 'var(--color-light-5)' }}>{dayjs(createdAt).format('HH:mm')}</Typography>
            </Space>
        );
    }, [contactId, from, user, createdAt]);

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
                />
            );
        }
    };

    return (
        <>
            {renderTimeline()}
            <div
                ref={containerRef as MutableRefObject<HTMLDivElement | null>}
                {...(setMessageRef && { ref: (ref) => setMessageRef(ref) })}
                className={clsx(styles.messageRoot, contactId === from ? styles.received : styles.sent)}
                style={style}
            >
                <div className={styles.messageRootContent}>
                    <div className={styles.commentContent}>
                        <Space size={4} direction="vertical" align={'start'} className={contactId === from ? styles.received : styles.sent}>
                            {renderUsername()}
                            {renderMessage()}

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

                        {renderComment()}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Message;
