import { Illustration, Space, Spin, Typography } from '@imbrace/ui';
import { Box, CircularProgress } from '@mui/material';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import { getConversationCount } from '@/services/api/channel';
import { getContactCommentById, getContactConversationsById } from '@/services/api/contact';
import apiFetch from '@/services/axios/handler';

import CommentCard from './CommentCard';
import ConversationCard from './ConversationCard';
import styles from './index.module.scss';

interface ConversationsProps {
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
    const api = getContactCommentById.api(queryKey[0] as string, channels_type, skip, Total);
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

const Conversations = (props: ConversationsProps) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { channels } = useChannels();
    const { userId, onClose, isModal = false, frameLess } = props;

    const [filterChannels, setFilterChannels] = useState<API.ChannelType[]>([]);

    const { data: conversations = [], isFetching: isConversationFetching } = useQuery({
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

    useEffect(() => {
        // setFilterChannelOptions(channels ?? []);
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

    // useEffect(() => {
    //     const commentsChannels = allRows.map((comment) => comment.channel_type);
    //     setFilterChannelOptions([...new Set(commentsChannels)] as API.ChannelType[]);
    // }, [allRows]);

    useEffect(() => {
        if (entry?.isIntersecting && !isFetching && !isError) {
            fetchNextPage();
        }
    }, [entry?.isIntersecting, isFetching, fetchNextPage, isError]);

    const render = () => {
        if (allRows.length > 0 || conversations.length > 0) {
            return (
                <div>
                    <Space size={16} align="start" wrap className={`${styles.cards} ${isModal ? styles.isModal : ''}`}>
                        {conversations?.map((contactConversation) => (
                            <ConversationCard key={contactConversation._id} contactConversation={contactConversation} onClose={onClose} />
                        ))}
                        {allRows.map((row) => {
                            return <CommentCard reload={refetch} key={row._id} comment={row} onClose={onClose} />;
                        })}
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
        <div className={styles.container}>
            <Space size={16} direction="vertical" align="stretch" className={clsx(styles.inner, frameLess && styles.frameLess)}>
                {!frameLess && <Typography variant="SubHeading2">{t('comments_in_conversation')}</Typography>}
                <Spin isSpinning={isConversationFetching || isFetching}>{render()}</Spin>
            </Space>
        </div>
    );
};

export default Conversations;
