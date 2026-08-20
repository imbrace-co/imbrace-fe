import { Illustration, Space, Spin, Typography } from '@imbrace/ui';
import { Box, CircularProgress } from '@mui/material';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import { getConversationCount } from '@/services/api/channel';
import { getContactCommentById, getContactConversationsById } from '@/services/api/contact';
import apiFetch from '@/services/axios/handler';
import styles from './index.module.scss';
import Message from '@/pages/Conversations/components/Message';
import { CommentContext } from '@/pages/Conversations/components/CommentContext';
import { getMessageIndex } from '@/services/api/teamConversation';
import { useNavigate } from 'react-router-dom';

interface PinnedAndNotesProps {
    inModal?: boolean;
    userId?: string;
    onClose?: () => void;
    isModal?: boolean;
    frameLess?: boolean;
}

interface ChannelCountType {
    all: number;
    whatsapp: number;
    web: number;
    instagram: number;
    facebook: number;
    line: number;
    store: number;
}

const fetchChannels = async ({ queryKey }: { queryKey: (string | undefined)[] }) => {
    if (!queryKey[0]) {
        throw new Error('User Id is missing');
    }

    const api = getConversationCount.api().concat('?view=all');

    const { data } = await apiFetch<ChannelCountType>(api, getConversationCount.method);

    const availableChannels = Object.entries(data)
        .filter(([key, value]) => key !== 'all' && key !== 'store' && value !== 0)
        .map(([key]) => key);

    return availableChannels as API.ChannelType[];
};

const useChannels = () => {
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ['channel'],
        queryFn: fetchChannels,
    });

    useEffect(() => {
        return () => {
            queryClient.removeQueries({
                queryKey: ['channel'],
            });
        };
    }, [queryClient]);

    return { channels: data, loading: isLoading };
};

const Total = 15;
const fetchComments = async ({
    queryKey,
    skip,
}: {
    queryKey: (string | undefined | { filterChannels: API.ChannelType[] })[];
    skip: number;
}) => {
    if (!queryKey[0]) {
        throw new Error('User Id is missing');
    }
    if ((queryKey[2] as { filterChannels: API.ChannelType[] }).filterChannels.length === 0) {
        throw new Error('channel is missing');
    }

    const channels_type = (queryKey[2] as { filterChannels: API.ChannelType[] }).filterChannels.join('&channel_types=');
    const api = getContactCommentById.api(queryKey[0] as string, channels_type, skip, Total).concat('&sort=updated_at&order=desc');
    const { data } = await apiFetch<API.TeamConversationCommentList>(api, getContactCommentById.method);

    return {
        ...data,
        previousSkip: Math.max(skip - Total, 0),
        nextSkip: data.has_more ? skip + Total : undefined,
        currentSkip: skip,
    };
};

const fetchConversations = async ({ queryKey }: { queryKey: (string | undefined | { filterChannels: API.ChannelType[] })[] }) => {
    if (!queryKey[0]) {
        throw new Error('User Id is missing');
    }
    if ((queryKey[2] as { filterChannels: API.ChannelType[] }).filterChannels.length === 0) {
        throw new Error('channel is missing');
    }

    const channels_type = (queryKey[2] as { filterChannels: API.ChannelType[] }).filterChannels.join('&channel_types=');
    const api = getContactConversationsById.api(queryKey[0] as string, channels_type);
    const { data } = await apiFetch<{ data: API.ContactConversation[] }>(api, getContactCommentById.method);

    return data.data;
};


const PinnedAndNotes = (props: PinnedAndNotesProps) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { channels } = useChannels();
    const { userId, onClose, isModal = false, frameLess, inModal } = props;
    const navigate = useNavigate();

    const [filterChannels, setFilterChannels] = useState<API.ChannelType[]>([]);
    const [filterChannelOptions, setFilterChannelOptions] = useState<API.ChannelType[]>([]);
    const { data: conversations, isFetching: isConversationFetching } = useQuery({
        queryKey: [userId, 'conversations', { filterChannels: ['whatsapp', 'web', 'instagram', 'facebook', 'line'] }],
        queryFn: fetchConversations,
    });

    const { data, hasNextPage, fetchNextPage, isFetching, refetch, isError } = useInfiniteQuery({
        queryKey: [userId, 'comments', { filterChannels }],
        queryFn: ({ pageParam = 0, queryKey }) => fetchComments({ skip: pageParam, queryKey }),
        initialPageParam: 0,
        getPreviousPageParam: (firstPage) => firstPage?.previousSkip ?? undefined,
        getNextPageParam: (lastPage, groups) => lastPage?.nextSkip,
    });

    const [setNodeRef, entry] = useIntersectionObserver({});
    const allRows = useMemo(() => (data ? data.pages.flatMap((d) => d.items) : []), [data]);

    // Aggregate all comments from messages and pinned messages
    const allComments = useMemo(() => {
        const items: Array<{
            comment?: API.ConversationMessageComments;
            message: any;
            type: 'comment' | 'pinned';
            sortDate: string;
        }> = [];

        allRows.forEach((message) => {
            // Add messages with comments
            if (message.comments && message.comments.length > 0) {
                message.comments.forEach((comment: API.ConversationMessageComments) => {
                    items.push({
                        comment,
                        message,
                        type: 'comment',
                        sortDate: comment.created_at,
                    });
                });
            }
            
            // Add pinned messages (regardless of whether they have comments or not)
            if ((message as any).pinned) {
                items.push({
                    message,
                    type: 'pinned',
                    sortDate: (message as any).date_pinned || message.created_at,
                });
            }
        });

        // Sort by creation date (newest first)
        return items.sort((a, b) => 
            new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
        );
    }, [allRows]);

    const handleFinish = async () => {
        await refetch();
    };

    useEffect(() => {
        setFilterChannelOptions(channels ?? []);
        setFilterChannels(channels ?? []);
    }, [channels]);

    useEffect(() => {
        return () => {
            queryClient.removeQueries({
                queryKey: [userId, 'conversations', { filterChannels }],
            });
            queryClient.removeQueries({
                queryKey: [userId, 'contact'],
            });
        };
    }, [queryClient, userId, filterChannels]);

    useEffect(() => {
        const commentsChannels = allRows.map((comment) => comment.channel_type);
        setFilterChannelOptions([...new Set(commentsChannels)] as API.ChannelType[]);
    }, [allRows]);

    useEffect(() => {
        if (entry?.isIntersecting && !isFetching && !isError) {
            fetchNextPage();
        }
    }, [entry?.isIntersecting, isFetching, fetchNextPage, isError]);

    const fetchMessageIndex = async (message: any) => {
        try {
            const { data } = await apiFetch<{ count: number }>(
                getMessageIndex.api(message.conversation_id, message._id),
                getMessageIndex.method,
            );
            if (data) {
                return data.count;
            }
        } catch (error) {
            console.log(error);
        }
    };

    const goToConversation = async (message: any) => {
        try {
            const index = await fetchMessageIndex(message);
            navigate(`/chatroom?conv_id=${message.team_conversation.id}&messageIndex=${index}`);
            onClose?.();
        } catch (error) {
            console.log(error);
        }
    };

    const renderMessageHeader = (message: any, comment?: API.ConversationMessageComments) => {
        const hasComments = message.comments && message.comments.length > 0;
        const isPinned = (message as any).pinned;
        const datePinned = (message as any).date_pinned;

        console.log({message});

        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', margin: '5px 5px' }}>
                <Space direction="vertical" align="start" size={4}>
                    {hasComments && comment && (
                        <Typography style={{ color: 'var(--color-light-5)' }}>
                            Added note on {dayjs(comment.created_at).format('MM/DD/YYYY')}
                        </Typography>
                    )}
                    {isPinned && !comment && (
                        <Typography style={{ color: 'var(--color-light-5)' }}>
                            Pinned on {dayjs(datePinned).format('MM/DD/YYYY')}
                        </Typography>
                    )}
                </Space>
                <Typography  
                    style={{ 
                        color: 'var(--color-primary-1)',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                    onClick={() => {
                        goToConversation(message);
                    }}
                >
                    Full conversation {'>'}
                </Typography>
            </div>
        );
    };

    const render = () => {
        if (allComments.length > 0) {
            return (
                <div style={{ height: '100%', overflow: 'scroll' }}>
                    <Space size={16} direction="vertical" align="stretch" className={`${styles.cards} ${isModal ? styles.isModal : ''}`}>
                        {allComments.map(({ comment, message, type }) => (
                            <div key={`${message._id}-${comment?._id || 'pinned'}`} style={{ width: '100%' }}>
                                {renderMessageHeader(message, comment)}
                                <div style={{ marginBottom: '36px' }}>
                                    <Message
                                        key={message._id}
                                        type={message.type}
                                        from={message.from}
                                        content={message.content}
                                        createdAt={message.created_at}
                                        msgId={message._id}
                                        conversationId={message.conversation_id}
                                        comments={comment ? [comment] : []} // Handle undefined comment
                                        teamId={message.team_conversation.team_id}
                                        contactId={message.team_conversation.contact_id}
                                        isPinned={(message as any).pinned}
                                        viewMode={false}
                                        index={0}
                                        messages={[message]}
                                        user={message.team_conversation.contact}
                                        isJoined={true}
                                        disableHover={true}
                                    />
                                </div>
                            </div>
                        ))}
                    </Space>
                    {(hasNextPage || isFetching) && (
                        <div className={styles.loadingContainer} ref={(ref) => ref && setNodeRef(ref)}>
                            <CircularProgress size={25} />
                        </div>
                    )}
                </div>
            );
        }
        return (
            <Illustration
                size={8}
                name="commentMissing"
                style={{ width: '240px', height: '200px' }}
                description={
                    <Box sx={{ width: '328px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Typography variant="SubHeading2">{t('contacts_conversation_comments_empty')}</Typography>
                        <Typography variant="Caption">{t('contacts_conversation_comments_empty_sub')}</Typography>
                    </Box>
                }
            />
        );
    };

    return (
        <CommentContext.Provider value={{ onFinish: handleFinish }}>
            <div className={styles.container} style={{ height: inModal ? '80%' : 'auto' }}>
                <Space size={16} direction="vertical" align="stretch" className={clsx(styles.inner, frameLess && styles.frameLess)}>
                    {!frameLess && <Typography variant="SubHeading2">{t('comments_in_conversation')}</Typography>}
                    <Spin isSpinning={isConversationFetching || isFetching}>{render()}</Spin>
                </Space>
            </div>
        </CommentContext.Provider>
    );
};

export default PinnedAndNotes;      
