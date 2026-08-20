import { Checkbox, EllipsisText, Icon, IconButton, Space, Typography } from '@imbrace/ui';
import type { Table } from '@tanstack/react-table';
import type { AxiosResponse } from 'axios';
import { format, isValid, parseISO } from 'date-fns';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router';

import FlexibleTable from '@/components/FlexibleTable';
import type { Columns } from '@/components/FlexibleTable/types';
import { deleteScheduledEvent, getScheduledEventFilterOptions } from '@/services/api/scheduledEvent';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import type { PageLayoutChildrenProps } from '.';
import styles from './index.module.scss';
import type { ChannelSource } from './OneTimeScheduledEvents';
import { cursorMapping, eventType, fetchScheduledEvents } from './utils';

const PastEvents = () => {
    const { t } = useTranslation();
    const { tableRef, globalSearch, filterProps, setFilterCount, onReadEvent } = useOutletContext<PageLayoutChildrenProps>();

    const tableInstanceRef = useRef<Table<API.ScheduledEvent> | null>(null);

    const columns: Columns<API.ScheduledEvent> = [
        {
            accessorKey: 'index',
            id: 'index',
            enableColumnFilter: false,
            enablePinning: false,
            enableEditing: false,
            enableResizing: false,
            maxSize: 65,
            header: ({ table }) => (
                <div>
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected()}
                        indeterminate={table.getIsSomeRowsSelected()}
                        onChange={(checked) => table.toggleAllRowsSelected(checked)}
                    />
                </div>
            ),
            cell: ({ row, table, isHover }) => {
                if (row.getIsSelected() || isHover) {
                    return (
                        <Checkbox disabled={!row.getCanSelect()} checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
                    );
                }
                return (
                    <Typography>{row.index + 1 + table.getState().pagination.pageSize * table.getState().pagination.pageIndex}</Typography>
                );
            },
            meta: {
                cellStyle: {
                    padding: 0,
                    textAlign: 'center',
                },
                headerStyle: {
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                },
            },
        },
        {
            type: 'ShortText',
            accessorKey: 'name',
            id: 'name',
            header: () => t('scheduled_events_table_name'),
            cell: ({ row }) => {
                return (
                    <EllipsisText
                        text={row.original.name}
                        element={
                            <Typography
                                onClick={() => onReadEvent(row.original)}
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    wordBreak: 'break-word',
                                    cursor: cursorMapping(row.original.event_type),
                                }}
                            />
                        }
                    />
                );
            },
            enableColumnFilter: false,
            enableEditing: false,
            enableSorting: true,
            minSize: 300,
            meta: {},
        },
        {
            type: 'SingleSelection',
            accessorKey: 'event_type',
            id: 'event_type',
            enableColumnFilter: true,
            enableEditing: false,
            enableSorting: true,
            minSize: 250,
            meta: {
                type: 'SingleSelection',
            },
            header: () => t('scheduled_events_table_type'),
            cell: ({ row }) => {
                return (
                    <Typography
                        onClick={() => onReadEvent(row.original)}
                        style={{
                            cursor: cursorMapping(row.original.event_type),
                            textTransform: 'capitalize',
                        }}
                    >
                        {eventType[row.original.event_type]}
                    </Typography>
                );
            },
            enum: eventType,
        },
        {
            type: 'Assignee',
            accessorKey: 'channel_source',
            id: 'channel_source',
            enableColumnFilter: true,
            enableEditing: false,
            enableSorting: true,
            minSize: 242,
            meta: {
                type: 'Assignee',
            },
            header: () => t('scheduled_events_table_source'),
            cell: ({ row }) => {
                return (
                    <Typography
                        onClick={() => onReadEvent(row.original)}
                        style={{
                            cursor: cursorMapping(row.original.event_type),
                            color: row.original.channel_source === '' ? 'var(--color-light-4)' : 'inherit',
                            textTransform: 'capitalize',
                        }}
                    >
                        {row.original.job.data.channel?.name ?? '-'}
                    </Typography>
                );
            },
            request: async () => {
                const response: AxiosResponse<ChannelSource[]> = await apiFetch(
                    getScheduledEventFilterOptions.api('channel_source'),
                    getScheduledEventFilterOptions.method,
                    ImbraceClient,
                );

                return response.data.map((channel) => {
                    return {
                        value: channel.channel_source.id,
                        text: channel.channel_source.name,
                    };
                });
            },
        },
        {
            type: 'ShortText',
            accessorKey: 'start_datetime',
            id: 'start_datetime',
            header: () => t('scheduled_events_table_schedules'),
            cell: ({ row }) => {
                const dateString = row.original.start_datetime;
                if (!dateString)
                    return (
                        <Typography
                            onClick={() => onReadEvent(row.original)}
                            style={{
                                color: 'var(--color-light-4)',
                                cursor: cursorMapping(row.original.event_type),
                            }}
                        >
                            —
                        </Typography>
                    );

                const date = parseISO(dateString);
                if (!isValid(date))
                    return (
                        <Typography onClick={() => onReadEvent(row.original)} style={{ cursor: cursorMapping(row.original.event_type) }}>
                            {dateString}
                        </Typography>
                    );

                return (
                    <Typography onClick={() => onReadEvent(row.original)} style={{ cursor: cursorMapping(row.original.event_type) }}>
                        {format(date, 'MM/dd/yyyy, HH:mm')}
                    </Typography>
                );
            },
            enableColumnFilter: false,
            enableEditing: false,
            enableSorting: true,
            minSize: 242,
            meta: {},
        },
        {
            id: 'operation',
            accessorKey: 'operation',
            header: () => null,
            maxSize: 124,
            enableColumnFilter: false,
            enableEditing: false,
            meta: {
                cellStyle: {
                    padding: '7px 0',
                },
            },
            cell: ({ row }) => {
                return (
                    <Space size={12}>
                        {row.original.event_type !== 'board_automation' && (
                            <>
                                <IconButton
                                    variant="text"
                                    type="secondary"
                                    size="s"
                                    onClick={() => {
                                        onReadEvent(row.original);
                                    }}
                                >
                                    <Icon name="record" />
                                </IconButton>
                            </>
                        )}
                    </Space>
                );
            },
        },
    ];

    return (
        <div className={styles.container}>
            <FlexibleTable<API.ScheduledEvent>
                columns={columns}
                ref={tableRef}
                request={(params) => fetchScheduledEvents('past', params)}
                globalFilter={globalSearch}
                isDataDeletable={(row) => {
                    return !!tableRef.current?.isSomeSelected();
                }}
                onDataDelete={async (ids) => {
                    try {
                        for (const id of ids) {
                            await apiFetch(deleteScheduledEvent.api(id), deleteScheduledEvent.method, {}, ImbraceClient);
                        }
                        tableRef.current?.refresh();
                        // Reset row selection after deletion and refresh
                        if (tableInstanceRef.current) {
                            tableInstanceRef.current.resetRowSelection();
                        }
                    } catch (error) {
                        console.error('Error deleting events:', error);
                    }
                }}
                deleteButtonText={t('scheduled_events_remove_selected_event')}
                showFilter={filterProps.visible}
                onColumnFilterChange={(columnFilters) => {
                    if (filterProps.mode === 'filter') {
                        setFilterCount(columnFilters.length);
                    }
                }}
            />
        </div>
    );
};

export default PastEvents;
