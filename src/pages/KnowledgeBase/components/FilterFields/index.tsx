import type { Option } from '@imbrace/ui';
import { Icon, Space, Typography } from '@imbrace/ui';
import type { Column, ColumnDef, Header } from '@tanstack/react-table';
import React, { useCallback, useState } from 'react';

import FilteredChip from '@/components/FlexibleTable/filteredChip';
import type { FilterValue } from '@/components/FlexibleTable/filterPopover';
import styles from '@/components/FlexibleTable/index.module.scss';
import type { ColumnType, ColumnValue } from '@/components/FlexibleTable/types';
import { getMembers } from '@/services/api/user';
import apiFetch from '@/services/axios/handler';

import { openFilterPopover } from './FilterPopover';

const FilterFields = <D extends { id: string }>({
    column,
    header,
    onFilter,
    request,
}: {
    column: Column<D, unknown>;
    header: Header<D, ColumnValue>;
    onFilter?: (filter?: { id: string; value: FilterValue }) => void;
    request?: () => Promise<Option[]>;
}) => {
    const [open, setOpen] = useState(false);
    const columnDef = column.columnDef as ColumnDef<D, ColumnValue> & ColumnType;
    const columnFilterValue = column.getFilterValue() as FilterValue;
    const headerText = typeof columnDef.header === 'function' ? columnDef.header(header.getContext()) : columnDef.header;

    console.log('columnFilterValue: ', columnFilterValue);

    const getMemberOptionRequest = useCallback(async () => {
        const { data } = await apiFetch<API.User[]>(getMembers.api, getMembers.method, {
            status: 'active',
        });
        return data.map((user) => ({
            value: user.id,
            text: user.display_name,
        }));
    }, []);

    const renderFilteredChip = () => {
        return (
            <FilteredChip
                key={`filter-${column.id}`}
                header={headerText}
                fieldType={columnDef.meta?.type}
                value={columnFilterValue?.value}
                operator={columnFilterValue?.operator}
                onClick={(e) => {
                    openFilterPopover<D>({
                        request: getMemberOptionRequest,
                        column: columnDef,
                        anchorEl: e.currentTarget,
                        title: headerText,
                        type: column.columnDef.meta?.type,
                        onFilter: async (filterValue) => {
                            if (filterValue?.operator !== 'is_empty' && filterValue?.operator !== 'is_not_empty') {
                                if (filterValue?.value === '') {
                                    return;
                                }
                                if (
                                    Array.isArray(filterValue?.value) &&
                                    filterValue?.value.some((v) => v === '' || v === null || v === undefined)
                                ) {
                                    return;
                                }
                            }

                            column.setFilterValue(filterValue);
                        },
                        initialValue: {
                            operator: columnFilterValue?.operator,
                            value:
                                column.columnDef.meta?.type === 'MultipleSelection'
                                    ? ((columnFilterValue?.value ?? []) as string[])
                                    : ((columnFilterValue?.value ?? '') as string),
                        },
                        valueEnum: column.columnDef.meta?.enum,
                        onClose: () => {},
                    });
                }}
                onDelete={() => {
                    column.setFilterValue(undefined);
                }}
                {...((columnDef.meta?.type === 'Assignee' || column.id === 'owner') && {
                    remoteEnum: columnDef.request,
                })}
            />
        );
        // });
    };

    if (columnFilterValue) {
        return (
            <Space style={{ flex: 1, width: '100%' }} size={12}>
                {renderFilteredChip()}
            </Space>
        );
    }

    return (
        <div
            key={`filter-${column.id}`}
            className={styles.filterField}
            onClick={(e) => {
                setOpen(true);
                openFilterPopover<D>({
                    request: request,
                    column: columnDef,
                    anchorEl: e.currentTarget,
                    title: headerText,
                    type: column.columnDef.meta?.type,
                    onFilter: async (filterValue) => {
                        if (filterValue?.operator !== 'is_empty' && filterValue?.operator !== 'is_not_empty') {
                            if (filterValue?.value === '') {
                                return;
                            }
                            if (
                                Array.isArray(filterValue?.value) &&
                                filterValue?.value.some((v) => v === '' || v === null || v === undefined)
                            ) {
                                return;
                            }
                        }
                        if (filterValue) {
                            onFilter?.({ id: column.id, value: filterValue });
                        }
                    },
                    initialValue: {
                        operator: (columnFilterValue as FilterValue)?.operator,
                        value:
                            column.columnDef.meta?.type === 'MultipleSelection'
                                ? (((columnFilterValue as FilterValue)?.value ?? []) as string[])
                                : column.columnDef.meta?.type === 'Date'
                                ? (((columnFilterValue as FilterValue)?.value ?? ['exactly']) as string[])
                                : (((columnFilterValue as FilterValue)?.value ?? '') as string),
                    },
                    valueEnum: column.columnDef.meta?.enum,
                    onClose: () => {
                        setOpen(false);
                    },
                });
            }}
        >
            <Typography style={{ flex: 1 }}>{headerText}</Typography>
            <div>
                <Icon name={open ? 'dropUp' : 'dropDown'} style={{ fontSize: 24 }} />
            </div>
        </div>
    );
};

export default FilterFields;
