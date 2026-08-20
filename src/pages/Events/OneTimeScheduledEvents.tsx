import { Checkbox, EllipsisText, Icon, IconButton, Space, Typography, useDialog } from '@imbrace/ui';
import { Box } from '@mui/material';
import type { Table } from '@tanstack/react-table';
import type { AxiosResponse } from 'axios';
import { format, isValid, parseISO } from 'date-fns';
import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router';

import FlexibleTable from '@/components/FlexibleTable';
import type { Columns } from '@/components/FlexibleTable/types';
import { deleteScheduledEvent, getScheduledEventFilterOptions } from '@/services/api/scheduledEvent';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import BoardAutomation from '../Databoards/components/BoardAutomation';
import type { PageLayoutChildrenProps } from '.';
import styles from './index.module.scss';
import { cursorMapping, eventType, fetchScheduledEvents } from './utils';

export interface ChannelSource {
    channel_source: {
        id: string;
        name: string;
    };
}

const OneTimeScheduledEvents = () => {
    const { t } = useTranslation();
    const [{ dialogWindow }, dialogsHolder] = useDialog();
    const { tableRef, globalSearch, filterProps, setFilterCount, onReadEvent, onEditEvent, onDeleteEvent } =
        useOutletContext<PageLayoutChildrenProps>();

    const tableInstanceRef = useRef<Table<API.ScheduledEvent> | null>(null);

    const columns = useMemo(() => {
        const columnDefinitions: Columns<API.ScheduledEvent> = [
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
                            <Checkbox
                                disabled={!row.getCanSelect()}
                                checked={row.getIsSelected()}
                                onChange={row.getToggleSelectedHandler()}
                            />
                        );
                    }
                    return (
                        <Typography>
                            {row.index + 1 + table.getState().pagination.pageSize * table.getState().pagination.pageIndex}
                        </Typography>
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
                enableColumnFilter: false,
                enableEditing: false,
                enableSorting: true,
                minSize: 300,
                meta: {},
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
                type: 'Datetime',
                accessorKey: 'start_datetime',
                id: 'start_datetime',
                enableColumnFilter: false,
                enableEditing: false,
                enableSorting: true,
                minSize: 242,
                meta: {},
                header: () => t('scheduled_events_table_schedules'),
                cell: ({ row }) => {
                    const dateString = row.original.start_datetime;
                    if (!dateString) return <Typography>-</Typography>;

                    const date = parseISO(dateString);
                    if (!isValid(date)) return <Typography>{dateString}</Typography>;

                    return (
                        <Typography
                            onClick={() => onReadEvent(row.original)}
                            style={{
                                cursor: cursorMapping(row.original.event_type),
                                color: row.original.channel_source === '' ? 'var(--color-light-4)' : 'inherit',
                                textTransform: 'capitalize',
                            }}
                        >
                            {format(date, 'MM/dd/yyyy, HH:mm')}
                        </Typography>
                    );
                },
            },
            {
                id: 'operation',
                accessorKey: 'operation',
                header: () => null,
                maxSize: 124,
                enableColumnFilter: false,
                enableEditing: false,
                enableSorting: false,
                meta: {
                    cellStyle: {
                        padding: '7px 0',
                    },
                },
                cell: ({ row }) => {
                    if (row.original.event_type === 'board_automation')
                        return (
                            <Space justify="end">
                                <IconButton
                                    variant="text"
                                    type="secondary"
                                    size="s"
                                    onClick={async () => {
                                        const boardId = row.original.job.data?.board_id || '';
                                        const automationId = row.original.job.data?.id || (row.original.job.data as any)?._id;

                                        dialogWindow({
                                            title: <Typography style={{ color: 'var(--color-light-5)' }}>{row.original.name}</Typography>,
                                            content: ({ onClose }) => (
                                                <Box sx={{ height: '100%', padding: '0 20px 20px 20px' }}>
                                                    <BoardAutomation
                                                        crm={false}
                                                        isModal={true}
                                                        databoardId={boardId}
                                                        automationId={automationId}
                                                        onRefreshAfterUpdate={() => {
                                                            tableRef.current?.refresh();
                                                        }}
                                                    />
                                                </Box>
                                            ),
                                            hideCancelButton: true,
                                            hideConfirmButton: true,
                                            showCloseButton: true,
                                            paperSx: {
                                                minWidth: '1085px',
                                                maxWidth: '1200px',
                                                width: '1200px',
                                            },
                                        });
                                    }}
                                >
                                    <Icon name="edit" />
                                </IconButton>
                                <IconButton variant="text" type="secondary" size="s" onClick={() => onDeleteEvent(row.original.id)}>
                                    <Icon name="delete" />
                                </IconButton>
                            </Space>
                        );
                    return (
                        <Space size={12}>
                            <IconButton
                                variant="text"
                                type="secondary"
                                size="s"
                                onClick={() => {
                                    onEditEvent(row.original);
                                }}
                            >
                                <Icon name="edit" />
                            </IconButton>
                            <IconButton variant="text" type="secondary" size="s" onClick={() => onDeleteEvent(row.original.id)}>
                                <Icon name="delete" />
                            </IconButton>
                        </Space>
                    );
                },
            },
        ];
        return columnDefinitions;
    }, [t, tableRef, dialogWindow, onReadEvent, onEditEvent, onDeleteEvent]);

    return (
        <div className={styles.container}>
            {dialogsHolder}
            <FlexibleTable<API.ScheduledEvent>
                columns={columns}
                ref={tableRef}
                request={(params) => fetchScheduledEvents('non_recurring', params)}
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
                deleteTooltip={() => {
                    if (!tableRef.current?.isSomeSelected()) {
                        return t('scheduled_events_remove_selected_event');
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

export default OneTimeScheduledEvents;
