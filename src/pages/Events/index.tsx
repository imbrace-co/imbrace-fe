import { EllipsisText, Icon, IconButton, Search, Space, Tabs, Tooltip, Typography, useDialog, useModal } from '@imbrace/ui';
import { Badge, Box, Divider } from '@mui/material';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import type { RefObject, SyntheticEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Scrollbars from 'react-custom-scrollbars';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { env } from '@/env';
import type { FilterValue } from '@/components/FlexibleTable/filterPopover';
import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import PageLayout from '@/components/PageLayout';
import { deleteScheduledEvent } from '@/services/api/scheduledEvent';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import { FileItem } from '../Databoards/components/emailContentPreview';
import { IframeContainer } from '../Journeys/iframeModal';
import styles from './index.module.scss';

export interface FilterValueObj extends FilterValue {
    type: string;
}

export interface PageLayoutChildrenProps {
    headerWidth?: number;
    headerHeight?: number;
    scrollableNodeRef?: RefObject<HTMLDivElement>;
    globalSearch?: string;
    field: 'title' | 'content' | 'all';
    tableRef: RefObject<FlexibleTableRef<any>>;
    filterProps: FilterPropsType;
    setFilterProps: React.Dispatch<React.SetStateAction<FilterPropsType>>;
    setFilterCount: React.Dispatch<React.SetStateAction<number>>;
    onReadEvent: (event: API.ScheduledEvent) => void;
    onEditEvent: (event: API.ScheduledEvent) => void;
    onDeleteEvent: (id: string) => void;
}

export interface FilterPropsType {
    visible: boolean;
    mode: 'filter';
}

const Container = (props: PageLayoutChildrenProps) => {
    return <Outlet context={props} />;
};

const Events = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const location = useLocation();

    const tableRef = useRef<FlexibleTableRef<API.ScheduledEvent>>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const [currentTab, setCurrentTab] = useState<'scheduled' | 'recurring' | 'past'>('scheduled');
    const [globalSearch, setGlobalSearch] = useState<string>();
    const [{ dialog, dialogForm }, dialogHolder] = useDialog();
    const [{ modal }, modalHolder] = useModal();

    const [field] = useState<'title' | 'content' | 'all'>('title');
    const [openFilter, setOpenFilter] = useState(false);
    const [filterValues] = useState<FilterValueObj[]>([]);
    const [filterProps, setFilterProps] = useState<FilterPropsType>({
        visible: false,
        mode: 'filter',
    });
    const [filterCount, setFilterCount] = useState(0);

    const onFilterChange = useCallback((mode: 'filter' | 'segmentation') => {
        if (mode === 'filter') {
            setFilterProps((prev) => ({
                visible: prev.mode === 'filter' ? !prev.visible : !prev.visible ? true : prev.visible,
                mode: 'filter',
            }));
        }
    }, []);

    useEffect(() => {
        setFilterCount(0);
        setFilterProps((prev) => ({
            visible: false,
            mode: 'filter',
        }));
    }, [currentTab]);

    const renderScheduledTabExtra = useCallback(
        () => (
            <Space size={12}>
                <Badge
                    badgeContent={filterCount}
                    sx={{
                        '& .MuiBadge-badge': {
                            background: 'var(--color-primary-3)',
                            color: 'var(--color-primary-1)',
                            width: '16px',
                            height: '16px',
                            minWidth: '16px',
                            fontSize: '12px',
                            borderRadius: '8px',
                            padding: 0,
                            top: '4px',
                            right: '4px',
                        },
                    }}
                >
                    <Tooltip arrow title={t('filter')} placement="top">
                        <IconButton
                            sx={{
                                background: openFilter || filterValues.length > 0 ? 'var(--color-secondary-2)' : undefined,
                            }}
                            onClick={(e) => {
                                setOpenFilter((prev) => !prev);
                                onFilterChange('filter');
                                e.currentTarget.blur();
                            }}
                            type="secondary"
                            variant="text"
                        >
                            <Icon name="filter" />
                        </IconButton>
                    </Tooltip>
                </Badge>

                <Search
                    value={globalSearch}
                    placeholder={t('search')}
                    onSearch={(inputValue) => setGlobalSearch(inputValue)}
                    onReset={() => setGlobalSearch('')}
                    sx={{ width: '248px' }}
                />
            </Space>
        ),
        [openFilter, filterValues, globalSearch, t, onFilterChange, filterCount],
    );

    const renderRecurringTabExtra = useCallback(
        () => (
            <Space size={12}>
                <Badge
                    badgeContent={filterCount}
                    sx={{
                        '& .MuiBadge-badge': {
                            background: 'var(--color-primary-3)',
                            color: 'var(--color-primary-1)',
                            width: '16px',
                            height: '16px',
                            minWidth: '16px',
                            fontSize: '12px',
                            borderRadius: '8px',
                            padding: 0,
                            top: '4px',
                            right: '4px',
                        },
                    }}
                >
                    <Tooltip arrow title={t('filter')} placement="top">
                        <IconButton
                            sx={{
                                background: openFilter || filterValues.length > 0 ? 'var(--color-secondary-2)' : undefined,
                            }}
                            onClick={(e) => {
                                setOpenFilter((prev) => !prev);
                                onFilterChange('filter');
                                e.currentTarget.blur();
                            }}
                            type="secondary"
                            variant="text"
                        >
                            <Icon name="filter" />
                        </IconButton>
                    </Tooltip>
                </Badge>

                <Search
                    value={globalSearch}
                    placeholder={t('search')}
                    onSearch={(inputValue) => setGlobalSearch(inputValue)}
                    onReset={() => setGlobalSearch('')}
                    sx={{ width: '248px' }}
                />
            </Space>
        ),
        [openFilter, filterValues, globalSearch, t, filterCount, onFilterChange],
    );

    const renderPastTabExtra = useCallback(
        () => (
            <Space size={12}>
                <Badge
                    badgeContent={filterCount}
                    sx={{
                        '& .MuiBadge-badge': {
                            background: 'var(--color-primary-3)',
                            color: 'var(--color-primary-1)',
                            width: '16px',
                            height: '16px',
                            minWidth: '16px',
                            fontSize: '12px',
                            borderRadius: '8px',
                            padding: 0,
                            top: '4px',
                            right: '4px',
                        },
                    }}
                >
                    <Tooltip arrow title={t('filter')} placement="top">
                        <IconButton
                            sx={{
                                background: openFilter || filterValues.length > 0 ? 'var(--color-secondary-2)' : undefined,
                            }}
                            onClick={(e) => {
                                setOpenFilter((prev) => !prev);
                                onFilterChange('filter');
                                e.currentTarget.blur();
                            }}
                            type="secondary"
                            variant="text"
                        >
                            <Icon name="filter" />
                        </IconButton>
                    </Tooltip>
                </Badge>

                <Search
                    value={globalSearch}
                    placeholder={t('search')}
                    onSearch={(inputValue) => setGlobalSearch(inputValue)}
                    onReset={() => setGlobalSearch('')}
                    sx={{ width: '248px' }}
                />
            </Space>
        ),
        [openFilter, filterValues, globalSearch, t, filterCount, onFilterChange],
    );

    const renderRightSideExtra = useCallback(() => {
        switch (currentTab) {
            case 'scheduled':
                return <Space>{renderScheduledTabExtra()}</Space>;
            case 'recurring':
                return <Space>{renderRecurringTabExtra()}</Space>;
            case 'past':
                return <Space>{renderPastTabExtra()}</Space>;
        }
        return null;
    }, [currentTab, renderScheduledTabExtra, renderRecurringTabExtra, renderPastTabExtra]);

    const renderExtra = useCallback(() => {
        return (
            <Space size={12}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flex: 1,
                    }}
                >
                    <Tabs
                        tabs={[
                            {
                                value: 'scheduled',
                                label: t('scheduled_events_tab_one_time'),
                            },
                            {
                                value: 'recurring',
                                label: t('scheduled_events_tab_recurring'),
                            },
                            {
                                value: 'past',
                                label: t('scheduled_events_tab_past'),
                            },
                        ]}
                        currentTab={currentTab}
                        onChange={(e: SyntheticEvent, tabValue: any) => {
                            e.stopPropagation();
                            if (tabValue === 'scheduled') {
                                setCurrentTab('scheduled');
                                navigate('/events');
                            }
                            if (tabValue === 'recurring') {
                                setCurrentTab('recurring');
                                navigate(`/events/${tabValue}`);
                            }
                            if (tabValue === 'past') {
                                setCurrentTab('past');
                                navigate(`/events/${tabValue}`);
                            }
                        }}
                    />
                    {renderRightSideExtra()}
                </Box>
            </Space>
        );
    }, [currentTab, navigate, t, renderRightSideExtra]);

    const onDeleteEvent = useCallback(
        async (id: string) => {
            dialog({
                title: t('scheduled_events_delete_dialog_header'),
                content: t('scheduled_events_delete_dialog_content'),
                onConfirm: async (): Promise<void> => {
                    await apiFetch(deleteScheduledEvent.api(id), deleteScheduledEvent.method, {}, ImbraceClient);
                    tableRef.current?.refresh();
                },
                confirmText: t('delete'),
                confirmButtonProps: {
                    size: 's',
                    type: 'danger',
                },
            });
        },
        [t, dialog],
    );

    const onReadEvent = useCallback(
        (event: API.ScheduledEvent) => {
            if (event.event_type === 'board_automation') return;
            if (event.event_type === 'email_outbound') {
                const content = event.job.data?.content;

                modal({
                    title: t('sent_email_content'),
                    paperSx: {
                        background: '#333333F2',
                    },
                    content: () => {
                        return (
                            <div className={styles.previewContainer}>
                                <Scrollbars autoHeight autoHeightMax={600}>
                                    <Space size={0} align="start" direction="vertical">
                                        <Space size={12} direction="vertical" align="start" style={{ padding: '32px 48px' }}>
                                            <Space size={12} justify="start">
                                                <Typography variant="BodyBold" style={{ color: 'var(--color-light-5)' }}>
                                                    {t('journey_email_subject_title')}
                                                </Typography>
                                                <EllipsisText text={event.job.data?.subject} element={<Typography />} />
                                            </Space>
                                            <Space size={12} justify="start">
                                                <Typography variant="BodyBold" style={{ color: 'var(--color-light-5)' }}>
                                                    {t('senders_email')}
                                                </Typography>
                                                <EllipsisText text={event.job.data?.sender?.email} element={<Typography />} />
                                            </Space>
                                        </Space>
                                        <Divider flexItem />
                                        <Space size={0} direction="vertical" align="stretch" style={{ width: '100%' }}>
                                            <div
                                                className={clsx('ql-preview', styles.content)}
                                                dangerouslySetInnerHTML={{ __html: content?.content || '' }}
                                            ></div>
                                            {content?.files && content?.files.length > 0 && (
                                                <div style={{ padding: '0 48px' }}>
                                                    <Divider flexItem style={{ marginBottom: '24px' }} />
                                                    <Space size={8} direction="vertical" align="stretch" style={{ width: '100%' }}>
                                                        {content.files.map((file) => (
                                                            <FileItem key={file.id} file={file} />
                                                        ))}
                                                    </Space>
                                                </div>
                                            )}
                                        </Space>
                                    </Space>
                                </Scrollbars>
                            </div>
                        );
                    },
                });
                return;
            }
            if (event.event_type === 'telegram_outbound') {
                const scheduledOnDate = parseISO(event.start_datetime);
                const lastUpdatedDate = parseISO(event.updated_at);

                modal({
                    title: `${t('journey_telegram_outbound_title')} - ${event.name}`,
                    paperSx: {
                        background: '#333333F2',
                    },
                    content: () => {
                        return (
                            <div className={styles.previewContainerWhatsapp}>
                                <div className={styles.headerSection}>
                                    <Space direction="vertical" align="start" style={{ gap: 0 }}>
                                        <Typography variant="Heading2" style={{ color: 'var(--color-light-7)' }}>
                                            {event.name}
                                        </Typography>
                                        <Typography>
                                            {t(`${event.job.data.outboundType}_outbound`)}{' '}
                                            <span style={{ color: 'var(--color-light-5)' }}> through </span>{' '}
                                            {event?.job?.data?.channel?.name}
                                        </Typography>

                                        <Space size={12} justify="between" style={{ width: '100%', marginTop: 16 }}>
                                            <Space size={4} justify="start">
                                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                                    {t('scheduled_events_scheduled_on')}
                                                </Typography>
                                                <EllipsisText
                                                    text={format(scheduledOnDate, 'MM/dd/yyyy, HH:mm')}
                                                    element={<Typography />}
                                                />
                                            </Space>
                                            <Space size={4} justify="start">
                                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                                    {t('scheduled_events_audiences')}
                                                </Typography>
                                                <EllipsisText
                                                    text={
                                                        event.job.data.outboundType === 'single' ? event.job.data.customerPhoneNumber : '－'
                                                    }
                                                    element={<Typography />}
                                                />
                                            </Space>
                                            <Space size={4} justify="start">
                                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                                    {t('scheduled_events_scheduled_by')}
                                                </Typography>
                                                <EllipsisText text={event.job.data?.sender?.name} element={<Typography />} />
                                            </Space>
                                        </Space>
                                        <Space size={12} justify="between">
                                            <Space size={4} justify="start">
                                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                                    {t('scheduled_events_last_updated')}
                                                </Typography>
                                                <EllipsisText
                                                    text={format(lastUpdatedDate, 'MM/dd/yyyy, HH:mm')}
                                                    element={<Typography />}
                                                />
                                            </Space>
                                        </Space>
                                    </Space>
                                </div>
                                <Scrollbars>
                                    <div className={styles.contentSection}>
                                        <Space size={0} direction="vertical" align="stretch" style={{ width: '100%' }}>
                                            <div
                                                className={clsx('ql-preview', styles.content)}
                                                dangerouslySetInnerHTML={{ __html: event.job.data?.message || '' }}
                                            />
                                            {event.job.files && event.job.files.length > 0 && (
                                                <div style={{ padding: '0 48px' }}>
                                                    <Divider flexItem style={{ marginBottom: '24px' }} />
                                                    <Space size={8} direction="vertical" align="stretch" style={{ width: '100%' }}>
                                                        {event.job.files.map((file) => (
                                                            <FileItem
                                                                key={file.file_id}
                                                                file={{ id: file.file_id, name: file.name, url: file.file_url }}
                                                            />
                                                        ))}
                                                    </Space>
                                                </div>
                                            )}
                                        </Space>
                                    </div>
                                </Scrollbars>
                            </div>
                        );
                    },
                });
                return;
            }
            if (event.event_type === 'whatsapp_outbound') {
                const scheduledOnDate = parseISO(event.start_datetime);
                const lastUpdatedDate = parseISO(event.updated_at);

                modal({
                    title: `${t('journey_whatsapp_outbound_title')} - ${event.name}`,
                    paperSx: {
                        background: '#333333F2',
                    },
                    content: () => {
                        return (
                            <div className={styles.previewContainerWhatsapp}>
                                <div className={styles.headerSection}>
                                    <Space direction="vertical" align="start" style={{ gap: 0 }}>
                                        <Typography variant="Heading2" style={{ color: 'var(--color-light-7)' }}>
                                            {event.name}
                                        </Typography>
                                        <Typography>
                                            {t(`${event.job.data.outboundType}_outbound`)}{' '}
                                            <span style={{ color: 'var(--color-light-5)' }}> through </span>{' '}
                                            {event?.job?.data?.channel?.name}
                                        </Typography>

                                        <Space size={12} justify="between" style={{ width: '100%', marginTop: 16 }}>
                                            <Space size={4} justify="start">
                                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                                    {t('scheduled_events_scheduled_on')}
                                                </Typography>
                                                <EllipsisText
                                                    text={format(scheduledOnDate, 'MM/dd/yyyy, HH:mm')}
                                                    element={<Typography />}
                                                />
                                            </Space>
                                            <Space size={4} justify="start">
                                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                                    {t('scheduled_events_audiences')}
                                                </Typography>
                                                <EllipsisText
                                                    text={
                                                        event.job.data.outboundType === 'single' ? event.job.data.customerPhoneNumber : '－'
                                                    }
                                                    element={<Typography />}
                                                />
                                            </Space>
                                            <Space size={4} justify="start">
                                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                                    {t('scheduled_events_scheduled_by')}
                                                </Typography>
                                                <EllipsisText text={event.job.data?.sender?.name} element={<Typography />} />
                                            </Space>
                                        </Space>
                                        <Space size={12} justify="between">
                                            <Space size={4} justify="start">
                                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                                    {t('scheduled_events_last_updated')}
                                                </Typography>
                                                <EllipsisText
                                                    text={format(lastUpdatedDate, 'MM/dd/yyyy, HH:mm')}
                                                    element={<Typography />}
                                                />
                                            </Space>
                                        </Space>
                                    </Space>
                                </div>
                                <Scrollbars>
                                    <div className={styles.contentSection}>
                                        <Space size={0} direction="vertical" align="stretch" style={{ width: '100%' }}>
                                            <div
                                                className={clsx('ql-preview', styles.content)}
                                                dangerouslySetInnerHTML={{ __html: event.job.data?.message || '' }}
                                            />
                                        </Space>
                                    </div>
                                </Scrollbars>
                            </div>
                        );
                    },
                });
                return;
            }
            if (event.event_type === 'email_campaign') {
                const content = event.job.data?.content;
                modal({
                    title: t('sent_email_content'),
                    paperSx: {
                        background: '#333333F2',
                    },
                    content: () => {
                        return (
                            <div className={styles.previewContainer}>
                                <Scrollbars autoHeight autoHeightMax={600}>
                                    <Space size={0} align="start" direction="vertical">
                                        <Space size={12} direction="vertical" align="start" style={{ padding: '32px 48px' }}>
                                            <Space size={12} justify="start">
                                                <Typography variant="BodyBold" style={{ color: 'var(--color-light-5)' }}>
                                                    {t('journey_email_subject_title')}
                                                </Typography>
                                                <EllipsisText text={event.job.data?.subject} element={<Typography />} />
                                            </Space>
                                            <Space size={12} justify="start">
                                                <Typography variant="BodyBold" style={{ color: 'var(--color-light-5)' }}>
                                                    {t('senders_email')}
                                                </Typography>
                                                <EllipsisText text={event.job.data?.sender?.email} element={<Typography />} />
                                            </Space>
                                        </Space>
                                        <Divider flexItem />
                                        <Space size={0} direction="vertical" align="stretch" style={{ width: '100%' }}>
                                            <div
                                                className={clsx('ql-preview', styles.content)}
                                                dangerouslySetInnerHTML={{ __html: content?.content || '' }}
                                            ></div>
                                            {content?.files && content?.files.length > 0 && (
                                                <div style={{ padding: '0 48px' }}>
                                                    <Divider flexItem style={{ marginBottom: '24px' }} />
                                                    <Space size={8} direction="vertical" align="stretch" style={{ width: '100%' }}>
                                                        {content.files.map((file) => (
                                                            <FileItem key={file.id} file={file} />
                                                        ))}
                                                    </Space>
                                                </div>
                                            )}
                                        </Space>
                                    </Space>
                                </Scrollbars>
                            </div>
                        );
                    },
                });
                return;
            }
            dialogForm({
                title: t('add_dialog_edit_sample_message'),
                content: (methods) => {
                    return <div>event content</div>;
                },
                onConfirm: async (formData) => {
                    tableRef.current?.refresh();
                    return true;
                },
                onClose: () => {},
                defaultValues: {},
                hideCancelButton: true,
                confirmText: t('update'),
                actionsAlign: 'flex-start',
                confirmButtonProps: {
                    size: 'default',
                },
                paperSx: {
                    width: 500,
                    maxWidth: 500,
                },
                showCloseButton: true,
            });
        },
        [dialogForm, t, tableRef, modal],
    );

    const onEditEvent = useCallback(
        (event: API.ScheduledEvent) => {
            const journeyEventTitle = event?.job?.data?.channel?.name;
            if (event.event_type === 'board_automation') return;
            if (event.event_type === 'whatsapp_outbound') {
                const newUrl = new URL(`${env.VITE_APP_WCS_HOST}/app/whatsapp-outbound/send-v2?`, window.location.href);
                newUrl.searchParams.append('id', event.id);
                newUrl.searchParams.append('type', 'schedule');
                modal({
                    onClose: async () => {},
                    content: ({ onClose: onModalClose, changeTitle }) => {
                        return (
                            <IframeContainer
                                onClose={() => {}}
                                iframeRef={iframeRef}
                                url={newUrl.toString()}
                                id={event.job.data.appId ?? ''}
                                appType="marketplace"
                                changeTitle={changeTitle}
                                title={`${t(`journey_${event.event_type}_title`)} - ${journeyEventTitle}`}
                            />
                        );
                    },
                });

                return;
            }
            if (event.event_type === 'telegram_outbound') {
                const newUrl = new URL(`${env.VITE_APP_WCS_HOST}/app/telegram-outbound/send?`, window.location.href);
                newUrl.searchParams.append('id', event.id);
                newUrl.searchParams.append('type', 'schedule');

                modal({
                    onClose: async () => {},
                    content: ({ onClose: onModalClose, changeTitle }) => {
                        return (
                            <IframeContainer
                                onClose={() => {}}
                                iframeRef={iframeRef}
                                url={newUrl.toString()}
                                id={event.job.data.appId ?? ''}
                                appType="marketplace"
                                changeTitle={changeTitle}
                                title={`${t(`journey_${event.event_type}_title`)}`}
                            />
                        );
                    },
                });
                return;
            }
            if (event.event_type === 'email_campaign') {
                const newUrl = new URL(`${env.VITE_APP_WCS_HOST}/email-campaign/starter?`, window.location.href);
                newUrl.searchParams.append('id', event.id);
                newUrl.searchParams.append('type', 'schedule');

                modal({
                    onClose: async () => {},
                    content: ({ onClose: onModalClose, changeTitle }) => (
                        <IframeContainer
                            onClose={() => {}}
                            iframeRef={iframeRef}
                            url={newUrl.toString()}
                            id={event.job.data.appId ?? ''}
                            appType="marketplace"
                            changeTitle={changeTitle}
                            title={`${t(`journey_${event.event_type}_title`)} - ${journeyEventTitle}`}
                        />
                    ),
                });
                return;
            }
            if (event.event_type === 'email_outbound') {
                const newUrl = new URL(`${env.VITE_APP_WCS_HOST}/email-outbound/start?`, window.location.href);
                newUrl.searchParams.append('id', event.id);

                modal({
                    onClose: async () => {},
                    content: ({ onClose: onModalClose, changeTitle }) => {
                        return (
                            <IframeContainer
                                onClose={() => {}}
                                iframeRef={iframeRef}
                                url={newUrl.toString()}
                                id={event.job.data.appId ?? ''}
                                appType="marketplace"
                                changeTitle={changeTitle}
                                title={`${t(`journey_${event.event_type}_title`)} - ${journeyEventTitle}`}
                            />
                        );
                    },
                });

                return;
            }
        },
        [modal, t],
    );

    useEffect(() => {
        const path = location.pathname;
        if (path === '/events') {
            setCurrentTab('scheduled');
        } else if (path === '/events/recurring') {
            setCurrentTab('recurring');
        } else if (path === '/events/past') {
            setCurrentTab('past');
        }
    }, [location]);

    return (
        <PageLayout title={t('journey_scheduled_events')} extra={renderExtra()}>
            {dialogHolder}
            {modalHolder}
            <Container
                tableRef={tableRef}
                globalSearch={globalSearch}
                field={field}
                onReadEvent={onReadEvent}
                onEditEvent={onEditEvent}
                onDeleteEvent={onDeleteEvent}
                filterProps={filterProps}
                setFilterProps={setFilterProps}
                setFilterCount={setFilterCount}
            />
        </PageLayout>
    );
};

export default Events;
