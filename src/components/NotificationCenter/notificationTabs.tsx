import { IconButton, Illustration, Space, Tabs, Typography } from '@imbrace/ui';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { Divider } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SyntheticEvent } from 'react';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SimpleBar from 'simplebar-react';

import { getNotifications } from '@/services/api/notification';
import apiFetch from '@/services/axios/handler';

import styles from './index.module.scss';
import Notification from './notification';

const fetchNotifications = async (skip = 0, type?: 'conversations' | 'assigns' | 'teams') => {
    const { data } = await apiFetch<API.PaginatedResponse<API.NotificationItem[]>>(getNotifications.api, getNotifications.method, {
        skip,
        limit: 20,
        type,
    });
    return {
        ...data,
        previousSkip: Math.max(skip - 20, 0),
        nextSkip: data.has_more ? skip + 20 : undefined,
        currentSkip: skip,
    };
};

const NotificationList = ({ type, onClose }: { type?: 'all' | 'conversations' | 'assigns' | 'teams'; onClose: () => void }) => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const parentRef = useRef<HTMLDivElement>(null);
    const { status, data, hasNextPage, fetchNextPage, isFetchingNextPage, isFetching, isRefetching, refetch } = useInfiniteQuery({
        queryKey: ['notifications', { type }],
        queryFn: ({ pageParam = 0 }) => fetchNotifications(pageParam, type === 'all' ? undefined : type),
        initialPageParam: 0,
        getPreviousPageParam: (firstPage) => firstPage.previousSkip ?? undefined,
        getNextPageParam: (lastPage, groups) => lastPage.nextSkip,
    });

    const allRows = data ? data.pages.flatMap((d) => d.data) : [];

    const rowVirtualizer = useVirtualizer({
        count: hasNextPage ? allRows.length + 1 : allRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 136,
        overscan: 0,
    });
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    const lastRow = useMemo(() => lastItem, [lastItem]);

    useEffect(() => {
        if (!lastRow) {
            return;
        }

        if (lastRow.index >= allRows.length - 1 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, fetchNextPage, allRows.length, isFetchingNextPage, lastRow]);

    useEffect(() => {
        return () => {
            queryClient.removeQueries({ queryKey: ['notifications'] });
        };
    }, [queryClient]);

    const renderNotifications = () => {
        return (
            <>
                <SimpleBar className={styles.simpleBarContainer} scrollableNodeProps={{ ref: parentRef }} autoHide>
                    <div
                        className={isFetching && !isFetchingNextPage && !isRefetching ? styles.blur : ''}
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const isLoaderRow = virtualRow.index > allRows.length - 1;
                            const notificationData = allRows[virtualRow.index];

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
                                    {isLoaderRow ? (
                                        hasNextPage ? (
                                            <div className={styles.loading} style={{ marginTop: 20 }}>
                                                <CircularProgress size={25} />
                                            </div>
                                        ) : null
                                    ) : (
                                        <Notification
                                            item={notificationData}
                                            page={Math.max(Math.ceil(virtualRow.index / 20) - 1, 0)}
                                            onClose={onClose}
                                            type={type}
                                            innerClassName={virtualRow.index !== allRows.length - 1 ? styles.divider : ''}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </SimpleBar>
                {isFetching && !isFetchingNextPage && !isRefetching && (
                    <div className={styles.loadingContainer}>
                        <CircularProgress size={25} />
                    </div>
                )}
            </>
        );
    };

    if (status === 'success' && allRows.length === 0) {
        return (
            <div style={{ marginTop: '72px' }}>
                <Illustration
                    name="emptyNotification"
                    description={
                        <div style={{ width: '404px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <Typography variant="SubHeading2">{t('notification_empty')}</Typography>
                            <Typography variant="Caption">{t('notification_empty_desc')}</Typography>
                        </div>
                    }
                />
            </div>
        );
    }

    return (
        <>
            <div className={styles.listContainer}>
                {renderNotifications()}

                {status === 'error' && (
                    <Space direction="vertical" style={{ height: '100%' }} justify="center">
                        <Typography variant="Caption">{t('notification_no_notifications_error')}</Typography>
                        <IconButton variant="text" onClick={() => refetch()}>
                            <AutorenewIcon />
                        </IconButton>
                    </Space>
                )}
            </div>
        </>
    );
};

export interface NotificationTabsRef {
    getType: () => 'all' | 'conversations' | 'assigns' | 'teams';
}

const NotificationTabs = forwardRef<NotificationTabsRef, { onClose: () => void }>(({ onClose }, ref) => {
    const [value, setValue] = useState<'all' | 'conversations' | 'assigns' | 'teams'>('all');
    const { t } = useTranslation();

    useImperativeHandle(ref, () => ({
        getType: () => value,
    }));

    const handleChange = (event: SyntheticEvent, newValue: any) => {
        setValue(newValue);
    };

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Tabs
                tabs={[
                    {
                        label: t('all'),
                        value: 'all',
                    },
                    {
                        label: t('conversations'),
                        value: 'conversations',
                    },
                    {
                        label: t('assigns'),
                        value: 'assigns',
                    },
                    {
                        label: t('teams'),
                        value: 'teams',
                    },
                ]}
                value={value}
                onChange={handleChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                    padding: '0 32px',
                }}
            />
            <Divider />
            <div role="tabpanel" className={styles.contentContainer}>
                <NotificationList type={value} onClose={onClose} />
            </div>
        </div>
    );
});

export default NotificationTabs;
