import { Checkbox, EllipsisText, Icon, IconButton, Space, Typography } from '@imbrace/ui';
import type { Table } from '@tanstack/react-table';
import { format, isValid, parseISO } from 'date-fns';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useOutletContext, useParams } from 'react-router';

import FlexibleTable from '@/components/FlexibleTable';
import type { Columns } from '@/components/FlexibleTable/types';
import { cursorMapping, eventType } from '@/pages/Events/utils';

import type { EventType, PageLayoutChildrenProps } from '../journeySchedule';
import { fetchScheduledEvents } from '../journeySchedule';
import styles from '../journeySchedule.module.scss';

const UpcomingJourneySchedules = () => {
    const { t } = useTranslation();
    const { type } = useParams();
    const navigate = useNavigate();
    const { tableRef, globalSearch, onReadEvent, onEditEvent, onDeleteEvent } = useOutletContext<PageLayoutChildrenProps>();
    const tableInstanceRef = useRef<Table<API.ScheduledEvent> | null>(null);

    useEffect(() => {
        if (!type || !(type in eventType)) {
            navigate('/journeys');
        }
    }, [type, navigate]);

    const columns: Columns<API.ScheduledEvent> = [
        {
            accessorKey: 'index',
            id: 'index',
            enableColumnFilter: false,
            enablePinning: false,
            enableEditing: false,
            enableResizing: false,
            maxSize: 65,
            header: ({ table }) => {
                tableInstanceRef.current = table;
                return (
                    <div>
                        <Checkbox
                            checked={table.getIsAllPageRowsSelected()}
                            indeterminate={table.getIsSomeRowsSelected()}
                            onChange={(checked) => table.toggleAllRowsSelected(checked)}
                        />
                    </div>
                );
            },
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
            type: 'ShortText',
            accessorKey: 'event_type',
            id: 'event_type',
            enableColumnFilter: false,
            enableEditing: false,
            enableSorting: true,
            minSize: 156,
            meta: {},
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
        },
        {
            type: 'ShortText',
            accessorKey: 'start_datetime',
            id: 'start_datetime',
            enableColumnFilter: false,
            enableEditing: false,
            enableSorting: true,
            minSize: 156,
            meta: {},
            header: () => t('scheduled_events_table_schedules'),
            cell: ({ row }) => {
                const dateString = row.original.start_datetime;
                if (!dateString)
                    return (
                        <Typography
                            onClick={() => { }}
                            style={{
                                color: 'var(--color-light-4)',
                                cursor: cursorMapping(row.original.event_type),
                            }}
                        >
                            —
                        </Typography>
                    );

                const date = parseISO(dateString);
                if (!isValid(date)) return <Typography>{dateString}</Typography>;

                return <Typography>{format(date, 'MM/dd/yyyy, HH:mm')}</Typography>;
            },
        },
        {
            type: 'ShortText',
            accessorKey: 'updated_at',
            id: 'updated_at',
            enableColumnFilter: false,
            enableEditing: false,
            enableSorting: true,
            minSize: 156,
            meta: {},
            header: () => t('scheduled_events_table_last_updated'),
            cell: ({ row }) => {
                const dateString = row.original.updated_at;
                if (!dateString) return <Typography>-</Typography>;

                const date = parseISO(dateString);
                if (!isValid(date)) return <Typography>{dateString}</Typography>;

                return <Typography>{format(date, 'MM/dd/yyyy, HH:mm')}</Typography>;
            },
        },
        {
            id: 'operation',
            accessorKey: 'operation',
            header: () => null,
            enableEditing: false,
            meta: {
                cellStyle: {
                    padding: '7px 0',
                },
            },
            maxSize: 144,
            cell: ({ row }) => {
                return (
                    <Space size={12} justify="end">
                        <IconButton variant="text" type="secondary" size="s" onClick={() => onReadEvent(row.original)}>
                            <Icon name="record" />
                        </IconButton>
                        <IconButton variant="text" type="secondary" size="s" onClick={() => onEditEvent(row.original)}>
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

    return (
        <div className={styles.container}>
            <FlexibleTable<API.ScheduledEvent>
                columns={columns}
                ref={tableRef}
                request={(params) => fetchScheduledEvents(type as EventType, 'upcoming', params)}
                globalFilter={globalSearch}
                isDataDeletable={(row) => {
                    return !!tableRef.current?.isSomeSelected();
                }}
                onDataDelete={async (id) => {
                    onDeleteEvent(id as string);
                }}
                deleteTooltip={() => {
                    if (!tableRef.current?.isSomeSelected()) {
                        return t('scheduled_events_remove_selected_event');
                    }
                }}
                deleteButtonText={t('scheduled_events_remove_selected_event')}
            />
        </div>
    );
};

export default UpcomingJourneySchedules;
