import { Button, Space, Typography, FieldText, IconButton, Icon } from '@imbrace/ui';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiFetch from '@/services/axios/handler';
import { getBoardById, getBoardRecords, postBoardRecord, putBoardRecord, deleteBoardRecord } from '@/services/api/crm';
import { FieldColumn } from './editableColumn';
import RemoveIcon from '@/assets/icons/general/removeIcon.svg?react';

interface TableInTableDetailProps {
    field: API.BoardField;
    parentRecordId?: string;
    parentRecord: API.BoardItem;
    isEditMode: boolean;
    onUpdate?: () => void;
    onChange?: (val: any) => void;
}

export const TableInTableDetail = ({ field, parentRecordId, parentRecord, isEditMode, onUpdate, onChange }: TableInTableDetailProps) => {
    const { t } = useTranslation();
    const [childBoard, setChildBoard] = useState<API.Board | null>(null);
    const [childBoardError, setChildBoardError] = useState<string | null>(null);
    const [boardItems, setBoardItems] = useState<API.BoardItem[]>([]);
    const [localItems, setLocalItems] = useState<API.BoardItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingRecords, setEditingRecords] = useState<Record<string, Record<string, API.RecordValue>>>({});
    const [hasLoaded, setHasLoaded] = useState(false);

    const boardChildId = field.data?.[0]?._id || field.board_child_mapped || field.settings?.childBoardId;

    // Clear local state when parent record ID changes (e.g. Save success)
    useEffect(() => {
        setLocalItems([]);
    }, [parentRecordId]);

    // Calculate summary data
    const summaryData = useMemo(() => {
        // combine fetched and local for summary
        const allItems = [...boardItems, ...localItems];
        const count = allItems.length;

        // Find the price field (Currency type)
        const priceField = childBoard?.fields?.find((f) => f.type === 'Currency');
        let totalPrice = 0;

        if (priceField) {
            totalPrice = allItems.reduce((sum, item) => {
                // Check edits first, then item value
                const editVal = editingRecords[item._id]?.[priceField._id];
                const itemVal = item.fields?.[priceField._id];
                const val = editVal !== undefined ? editVal : itemVal;
                const num = parseFloat(val as string);
                return sum + (isNaN(num) ? 0 : num);
            }, 0);
        }

        return { count, totalPrice: priceField ? totalPrice : null };
    }, [boardItems, localItems, editingRecords, childBoard]);

    // Fetch Board Definition
    useEffect(() => {
        const fetchBoard = async () => {
            if (!boardChildId) return;
            setChildBoardError(null);
            try {
                const boardResponse = await apiFetch<API.Board>(getBoardById.api(boardChildId), getBoardById.method);
                const board = (boardResponse.data as any)?.data ?? boardResponse.data;
                // Reason: a stale settings.childBoardId can point at a deleted
                // board. The new /data-board API rejects POSTs with missing
                // board_field_id (Zod 400), so refuse to render the editable
                // grid when the child definition is unusable.
                if (!board || !board._id || !Array.isArray(board.fields)) {
                    setChildBoard(null);
                    setChildBoardError(t('databoard_tit_child_board_missing'));
                    return;
                }
                setChildBoard(board);
            } catch (error) {
                console.error('Failed to fetch child board definition:', error);
                const status = (error as any)?.response?.status;
                setChildBoard(null);
                setChildBoardError(
                    status === 404 ? t('databoard_tit_child_board_missing') : t('databoard_tit_child_board_load_failed'),
                );
            }
        };
        fetchBoard();
    }, [boardChildId, t]);

    // Fetch Records
    const fetchRecords = useCallback(async () => {
        if (!boardChildId || !parentRecordId || parentRecordId === 'new') {
            setBoardItems([]);
            setHasLoaded(true);
            return;
        }

        setIsLoading(true);
        try {
            const searchParams = new URLSearchParams();
            searchParams.append('include_parent', 'true');
            const itemsResponse = await apiFetch<{ data: API.BoardItem[]; meta: { total: number } }>(
                getBoardRecords.api(boardChildId),
                getBoardRecords.method,
                searchParams,
            );
            const allItems: API.BoardItem[] = (itemsResponse as any)?.data?.data ?? (itemsResponse as any)?.data ?? [];
            const filtered = allItems.filter((item: any) => item.parent_board_item_id === parentRecordId);
            setBoardItems(filtered);
        } catch (error) {
            console.error('Failed to fetch child records:', error);
            setBoardItems([]);
        } finally {
            setIsLoading(false);
            setHasLoaded(true);
        }
    }, [boardChildId, parentRecordId]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // Auto-add empty row if needed
    useEffect(() => {
        if (
            isEditMode &&
            boardItems.length === 0 &&
            localItems.length === 0 &&
            !isLoading &&
            hasLoaded &&
            childBoard
        ) {
            handleAddRecord(true); // silent add
        }
    }, [isEditMode, boardItems, localItems, isLoading, hasLoaded, childBoard]);

    // Handle field value change
    const handleFieldChange = useCallback((recordId: string, fieldId: string, value: API.RecordValue) => {
        // Reason: bail out when the column has no id — otherwise we end up
        // writing to `fields["undefined"]` and the eventual save POST fails
        // Zod validation on the new /data-board endpoint.
        if (!fieldId) {
            console.warn('TableInTableDetail: handleFieldChange called without fieldId, skip');
            return;
        }
        // If it's a local item, update it directly
        if (recordId.startsWith('local_')) {
            setLocalItems((prev) =>
                prev.map((item) => {
                    if (item._id === recordId) {
                        return {
                            ...item,
                            fields: {
                                ...item.fields,
                                [fieldId]: value,
                            },
                        };
                    }
                    return item;
                }),
            );
        } else {
            setEditingRecords((prev) => ({
                ...prev,
                [recordId]: {
                    ...(prev[recordId] || {}),
                    [fieldId]: value,
                },
            }));
        }
    }, []);

    // Propagate changes for all items (Create & Update flows)
    useEffect(() => {
        if (childBoard?._id) {
            const allItems = [...boardItems, ...localItems];
            const payload = {
                board_field_id: field._id,
                type: 'TableInTable',
                'child-board': childBoard._id,
                value: allItems.map((item) => {
                    const edits = editingRecords[item._id] || {};
                    return {
                        ...item.fields,
                        ...edits,
                    };
                }),
            };
            onChange?.(payload);
        }
    }, [boardItems, localItems, childBoard, field._id, onChange, editingRecords]);

    // Handle save record
    const handleSaveRecord = useCallback(
        async (recordId: string) => {
            if (!childBoard?._id) return;

            // If local, we can't really save to DB without parent ID.
            if (recordId.startsWith('local_') && (!parentRecordId || parentRecordId === 'new')) {
                return;
            }

            // If local but we HAVE parentID (e.g. added new row to existing parent)
            if (recordId.startsWith('local_') && parentRecordId && parentRecordId !== 'new') {
                try {
                    const item = localItems.find((i) => i._id === recordId);
                    if (!item) return;

                    // Reason: drop entries with empty/undefined keys — the
                    // /data-board/boards/<id>/items endpoint rejects payloads
                    // without a string board_field_id (Zod 400).
                    const fields = Object.entries(item.fields || {})
                        .filter(([key]) => key && key !== 'undefined')
                        .map(([key, value]) => ({
                            board_field_id: key,
                            value,
                        }));

                    if (fields.length === 0) {
                        console.warn('TableInTableDetail: no valid fields to save, skip create');
                        return;
                    }

                    await apiFetch(postBoardRecord.api(childBoard._id), postBoardRecord.method, {
                        fields,
                        parent_board_item_id: parentRecordId,
                    });

                    // Remove from local, refetch real
                    setLocalItems((prev) => prev.filter((i) => i._id !== recordId));
                    await fetchRecords();
                    onUpdate?.();
                } catch (error) {
                    console.error('Failed to create record:', error);
                }
                return;
            }

            // Existing record update
            const changes = editingRecords[recordId];
            if (!changes || Object.keys(changes).length === 0) return;

            try {
                const updateData = Object.entries(changes).map(([key, value]) => ({
                    key,
                    value,
                }));

                await apiFetch(putBoardRecord.api(childBoard._id, recordId), putBoardRecord.method, updateData);

                // Clear editing state for this record
                setEditingRecords((prev) => {
                    const newState = { ...prev };
                    delete newState[recordId];
                    return newState;
                });

                // Refetch data
                await fetchRecords();
                onUpdate?.();
            } catch (error) {
                console.error('Failed to update record:', error);
            }
        },
        [childBoard, editingRecords, fetchRecords, onUpdate, localItems, parentRecordId],
    );

    // Handle add new record
    const handleAddRecord = useCallback(
        async (silent = false) => {
            if (!childBoard?._id) return;

            // Always add to local items initially for immediate UI feedback
            const newId = `local_${Date.now()}`;
            const newItem: API.BoardItem = {
                _id: newId,
                id: newId,
                board_id: childBoard._id,
                title: 'New Item',
                fields: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: '',
                updated_by: '',
            };

            setLocalItems((prev) => [...prev, newItem]);
        },
        [childBoard],
    );

    // Handle delete record
    const handleDeleteRecord = useCallback(
        (recordId: string) => {
            if (recordId.startsWith('local_')) {
                setLocalItems((prev) => prev.filter((i) => i._id !== recordId));
            } else {
                setBoardItems((prev) => prev.filter((i) => i._id !== recordId));
            }
        },
        [],
    );

    if (!boardChildId) {
        return <Typography style={{ color: 'var(--color-light-4)' }}>—</Typography>;
    }

    if (!childBoard && isLoading) {
        return <Typography style={{ color: 'var(--color-light-4)' }}>Loading...</Typography>;
    }

    if (!childBoard) {
        return (
            <Typography style={{ color: 'var(--color-light-5)' }}>
                {childBoardError ?? 'No board data'}
            </Typography>
        );
    }

    // Include identifier fields (e.g. Name) — users expect to fill every column,
    // not just the non-identifier ones.
    const visibleFields = childBoard.fields?.filter((f) => !f.hidden_on_record) ?? [];
    const allItemsToRender = [...boardItems, ...localItems];

    const getMinWidth = (type: string) => {
        switch (type) {
            case 'Number':
                return '100px';
            case 'Assignee':
            case 'SingleSelection':
            case 'Date':
            case 'Link':
                return '200px';
            case 'MultipleAssignee':
            case 'MultipleSelection':
            case 'Email':
                return '250px';
            case 'Phone':
                return '180px';
            case 'LongText':
                return '300px';
            case 'Priority':
            case 'Country':
            case 'Time':
                return '150px';
            case 'RichText':
                return '350px';
            case 'TableInTable':
                return '600px';
            default:
                return '200px';
        }
    };

    return (
        <div style={{ width: '100%' }}>
            {/* Summary Section - Input Style Only */}
            {/* Summary Section - Input Style Only */}
            <div style={{ marginBottom: '16px', width: '100%' }}>
                <FieldText
                    value={`${summaryData.count} ${summaryData.count > 1 ? 'items' : 'item'}`}
                    readOnly
                    fullWidth
                />
            </div>

            {/* Table View */}
            <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px', tableLayout: 'auto', marginLeft: '-8px' }}>
                    <thead style={{ background: 'var(--color-light-1)' }}>
                        <tr>
                            {visibleFields.map((f) => (
                                <th key={f._id} style={{ padding: '8px', textAlign: 'left', minWidth: getMinWidth(f.type) }}>
                                    <Typography variant="BodyTight" style={{ fontWeight: 800, color: 'var(--color-light-7)' }}>
                                        {f.name}
                                    </Typography>
                                </th>
                            ))}
                            {/* {isEditMode && (
                                <th style={{
                                    padding: '8px',
                                    textAlign: 'right',
                                    width: '80px',
                                    position: 'sticky',
                                    right: 0,
                                    background: 'var(--color-light-1)',
                                    zIndex: 1
                                }}>
                                    <Typography variant="BodyTight" style={{ fontWeight: 600, color: 'var(--color-light-5)' }}>Action</Typography>
                                </th>
                            )} */}
                        </tr>
                    </thead>
                    <tbody>
                        {allItemsToRender.map((record, index) => {
                            const isLocal = record._id.startsWith('local_');
                            const recordChanges = editingRecords[record._id] || {};
                            const showSave =
                                isEditMode &&
                                ((isLocal && parentRecordId && parentRecordId !== 'new') ||
                                    (!isLocal && Object.keys(recordChanges).length > 0));

                            return (
                                <tr key={record._id} style={{ background: 'transparent' }}>
                                    {visibleFields.map((childField) => {
                                        const fieldValue = isLocal
                                            ? record.fields?.[childField._id]
                                            : recordChanges[childField._id] ?? record.fields?.[childField._id];

                                        const valueEnum = childField.data?.reduce(
                                            (prev, current) => ({
                                                ...prev,
                                                [current._id]: current.value,
                                            }),
                                            {},
                                        );

                                        return (
                                            <td key={childField._id} style={{ padding: '8px 8px', verticalAlign: 'top' }}>
                                                <FieldColumn
                                                    fieldType={childField.type}
                                                    fieldId={childField._id}
                                                    value={fieldValue}
                                                    currentValue={fieldValue}
                                                    record={record}
                                                    editable={isEditMode && childField.type !== 'RichText'}
                                                    readonly={!isEditMode}
                                                    editing={isEditMode}

                                                    onChange={(newValue) => {
                                                        handleFieldChange(record._id, childField._id, newValue);
                                                    }}
                                                    {...((childField.type === 'SingleSelection' ||
                                                        childField.type === 'MultipleSelection' ||
                                                        childField.type === 'Priority') && {
                                                        dataEnum: valueEnum,
                                                    })}
                                                    meta={{
                                                        defaultFieldName: childField.default_field_name,
                                                        defaultCountryCode: childField.settings?.default_country_code,
                                                        defaultCurrencyCode: childField.settings?.default_currency_code,
                                                    }}
                                                />
                                            </td>
                                        );
                                    })}
                                    {isEditMode && (
                                        <td
                                            style={{
                                                padding: '8px',
                                                textAlign: 'right',
                                                verticalAlign: 'top',
                                                position: 'sticky',
                                                right: 0,
                                                background: 'var(--color-light-0)',
                                                zIndex: 1,
                                            }}
                                        >
                                            <Space size={4} justify="end">
                                                {/* {showSave && (
                                                    <Button
                                                        size="xs"
                                                        variant="contained"
                                                        text="Save"
                                                        onClick={() => handleSaveRecord(record._id)}
                                                    />
                                                )} */}
                                                <Icon
                                                    onClick={() => handleDeleteRecord(record._id)}
                                                    style={{ fontSize: 24, cursor: 'pointer', marginTop: '8px' }}
                                                    color="#EE7D7D"
                                                    name="delete"
                                                />
                                                {/* <IconButton onClick={() => handleDeleteRecord(record._id)}>
                                                    <DeleteOutlineIcon sx={{ fontSize: 20, color: 'var(--color-red-6)' }} />
                                                </IconButton> */}
                                            </Space>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {allItemsToRender.length === 0 && (
                    <Typography style={{ color: 'var(--color-light-4)', textAlign: 'center', padding: '24px' }}>No items yet</Typography>
                )}
            </div>

            {/* Add New Record Button - Text Link Style */}
            {isEditMode && (
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-start' }}>
                    <span
                        onClick={() => handleAddRecord()}
                        style={{
                            cursor: 'pointer',
                            color: 'var(--color-primary-1)',
                            userSelect: 'none',
                            fontSize: 14,
                        }}
                    >
                        + Record
                    </span>
                </div>
            )}
        </div>
    );
};
