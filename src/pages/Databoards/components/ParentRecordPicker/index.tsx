import { Search, Space, Typography } from '@imbrace/ui';
import { Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { Row as RowType } from '@tanstack/react-table';
import { useDebounce } from '@uidotdev/usehooks';
import type { TFunction } from 'i18next';
import { useMemo, useState } from 'react';
import { Controller, type UseFormReturn, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import FlexibleTable from '@/components/FlexibleTable';
import type { Columns } from '@/components/FlexibleTable/types';
import { getBoardById, getBoardRecords } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';

export const parentRecordPickerSchema = (t: TFunction) =>
    z.object({
        parent_record_id: z
            .string({ required_error: t('validation_field_required') })
            .min(1, { message: t('validation_field_required') }),
    });

export type ParentRecordPickerFormType = z.infer<ReturnType<typeof parentRecordPickerSchema>>;

interface ParentRecordPickerProps {
    methods: UseFormReturn<ParentRecordPickerFormType>;
    parentBoardId: string;
}

const MAX_PREVIEW_COLUMNS = 4;

const renderCellValue = (value: unknown): string => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) return `${value.length} item(s)`;
    if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if (typeof obj.display_name === 'string') return obj.display_name;
        if (typeof obj.country_name === 'string') return obj.country_name;
        if (typeof obj.country_code === 'string') return obj.country_code;
    }
    return '';
};

const ParentRecordPicker = ({ methods, parentBoardId }: ParentRecordPickerProps) => {
    const { control, setValue } = methods;
    const { t } = useTranslation();
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebounce(searchInput, 250);
    const selectedId = useWatch({ control, name: 'parent_record_id' }) as string | undefined;

    const { data: parentBoard } = useQuery({
        queryKey: ['parentRecordPicker:board', parentBoardId],
        queryFn: async () => {
            const { data } = await apiFetch<API.Board>(getBoardById.api(parentBoardId), getBoardById.method);
            return data;
        },
        enabled: !!parentBoardId,
    });

    const { data: records = [], isLoading: loadingRecords } = useQuery({
        queryKey: ['parentRecordPicker:records', parentBoardId],
        queryFn: async () => {
            const { data } = await apiFetch<API.PaginatedResponse<API.BoardItem[]>>(
                getBoardRecords.api(parentBoardId),
                getBoardRecords.method,
                { limit: 0, skip: 0, sort: '-created_at' },
            );
            // Flatten `fields.<id>` onto the row so tanstack's `accessorKey: field._id`
            // resolves directly — otherwise globalFilter sees `undefined` and can't match.
            return (data?.data || []).map((r) => ({ ...r.fields, ...r, id: r._id }));
        },
        enabled: !!parentBoardId,
    });

    const previewFields = useMemo(() => {
        if (!parentBoard) return [] as API.BoardField[];
        const identifier = parentBoard.fields.find((f) => f.is_identifier);
        const others = parentBoard.fields.filter(
            (f) => !f.is_identifier && !f.hidden && !f.hidden_on_record && f.type !== 'TableInTable',
        );
        return [identifier, ...others].filter(Boolean).slice(0, MAX_PREVIEW_COLUMNS) as API.BoardField[];
    }, [parentBoard]);

    const columns: Columns<API.BoardItem> = useMemo(() => {
        const selectRow = (row: RowType<API.BoardItem>) => {
            // Flip tanstack selection so FlexibleTable's native .selected class paints
            // the whole row (not just our cell). `enableMultiRowSelection={false}` below
            // keeps this single-select behavior.
            row.toggleSelected(true);
            setValue('parent_record_id', row.original._id, { shouldValidate: true, shouldDirty: true });
        };
        return previewFields.map(
            (field) =>
                ({
                    accessorKey: field._id,
                    id: field._id,
                    header: () => field.name,
                    enableColumnFilter: false,
                    enableEditing: false,
                    enableSorting: false,
                    type: field.type,
                    tooltip: field.description,
                    cell: ({ row }: { row: RowType<API.BoardItem> }) => {
                        const raw = row.original.fields?.[field._id];
                        const display = renderCellValue(raw) || (field.is_identifier ? row.original.public_id : '');
                        const isSelected = selectedId === row.original._id;
                        return (
                            <Box
                                onClick={() => selectRow(row)}
                                sx={{
                                    cursor: 'pointer',
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <Typography
                                    variant="Body"
                                    style={{
                                        fontWeight: isSelected && field.is_identifier ? 600 : 400,
                                        color: isSelected ? '#135DD5' : undefined,
                                    }}
                                >
                                    {display || '—'}
                                </Typography>
                            </Box>
                        );
                    },
                }) as Columns<API.BoardItem>[number],
        );
    }, [previewFields, selectedId, setValue]);

    return (
        <Space size={16} direction="vertical" align="stretch" style={{ width: '100%' }}>
            <Typography variant="Body" color="text.secondary">
                {t('databoard_pick_parent_hint', { boardName: parentBoard?.name ?? '' })}
            </Typography>

            <Search
                sx={{
                    minWidth: 'auto',
                    width: '100%',
                    '& .MuiInputBase-root': { borderRadius: 'none' },
                }}
                value={searchInput}
                onSearch={(v) => setSearchInput(v ?? '')}
                onReset={() => setSearchInput('')}
                placeholder={t('databoard_pick_parent_search_placeholder')}
                search={{
                    containerStyle: { padding: 0 },
                    iconButtonProps: { size: 'default' },
                }}
            />

            <Controller
                control={control}
                name="parent_record_id"
                defaultValue=""
                render={({ fieldState: { error } }) => (
                    <Box sx={{ border: error ? '1px solid #DC2626' : undefined, borderRadius: 1 }}>
                        <FlexibleTable<API.BoardItem>
                            outlined
                            fullWidth
                            showFilter={false}
                            enableMultiRowSelection={false}
                            dataSource={records}
                            columns={columns}
                            globalFilter={debouncedSearch}
                            pagination={{ pageIndex: 0, pageSize: 10 }}
                            queryKey={['parentRecordPickerTable', parentBoardId, records.length, selectedId ?? '']}
                            containerStyle={{ maxHeight: 460 }}
                            emptyMessage={loadingRecords ? t('loading') : t('databoard_pick_parent_empty')}
                        />
                        {error?.message && (
                            <Typography variant="Body" style={{ color: '#DC2626', padding: '8px 12px', fontSize: 12 }}>
                                {error.message}
                            </Typography>
                        )}
                    </Box>
                )}
            />
        </Space>
    );
};

export default ParentRecordPicker;
