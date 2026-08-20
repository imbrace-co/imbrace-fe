import React from 'react';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { Button, Checkbox, EllipsisText, Icon, Space, Typography, useDialog } from '@imbrace/ui';
import { Chip, Collapse, CircularProgress } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import apiFetch from '@/services/axios/handler';
import {
    getBoardById,
    getBoardRecords,
    postBoardRecord,
    putBoardRecord,
    deleteBoardRecord,
    postBoardUpload,
    getRelatedRecords,
} from '@/services/api/crm';
import { getMembers } from '@/services/api/user';
import { ImbraceFileUpload } from '@/services/axios';
import FlexibleTable from '@/components/FlexibleTable';
import type { Columns, FlexibleTableBaseProps, AttachmentValue, FlexibleTableRef } from '@/components/FlexibleTable/types';
import type { channelIconMapping } from '@imbrace/ui';
// import EmailContentPreview from ';
// import { useFieldPopover } from '../FieldPopover';
import { queryClient } from '@/App';
import dayjs from 'dayjs';
import EmailContentPreview from './emailContentPreview';
import { useFieldPopover } from './FieldPopover';

const TableInTableCell = ({
    field,
    parentRecordId,
    parentRecord,
    parentBoardId,
    initialData,
    knowledgeHub,
}: {
    field: API.BoardField;
    parentRecordId?: string;
    parentRecord: any;
    parentBoardId?: string;
    initialData?: any[];
    knowledgeHub?: boolean;
}) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [childBoard, setChildBoard] = useState<API.Board | null>(null);
    const [childBoardError, setChildBoardError] = useState<string | null>(null);
    const [boardItems, setBoardItems] = useState<API.BoardItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const tableRef = useRef<FlexibleTableRef<API.BoardItem>>(null);
    const [{ openFieldPopover }, fieldPopoverHolder] = useFieldPopover();

    // console.log('initialData', initialData);
    const boardChildId = field.data?.[0]?._id || field.board_child_mapped || field.settings?.childBoardId;

    // Extract summary data from parentRecord field value
    const summaryData = useMemo(() => {
        const fieldValue = parentRecord?.[field._id];
        if (!fieldValue || typeof fieldValue !== 'object') {
            return { count: 0, totalPrice: null };
        }
        const count = fieldValue.count ?? 0;
        const sumObj = fieldValue.sum ?? {};
        const sumKeys = Object.keys(sumObj);
        const totalPrice = sumKeys.length > 0 ? sumObj[sumKeys[sumKeys.length - 1]] : null;
        return { count, totalPrice, sumObj };
    }, [parentRecord, field._id]);

    // Mutations for CRUD operations
    const createRecord = useMutation({
        mutationFn: async (params: { boardId: string; fields: { board_field_id: string; value: unknown }[] }) => {
            // Reason: /data-board endpoint Zod-validates board_field_id; drop
            // any entry without one so an undefined columnId from a broken
            // child board can't trigger a 400.
            const validFields = (params.fields || []).filter((f) => !!f?.board_field_id);
            if (validFields.length === 0) {
                throw new Error('TableInTableCell.createRecord: no valid board_field_id');
            }
            const { data: record } = await apiFetch<API.BoardItem>(postBoardRecord.api(params.boardId), postBoardRecord.method, {
                fields: validFields,
            });
            return { ...record, ...record.fields } as unknown as API.BoardItem;
        },
        onSuccess: () => {
            fetchData();
        },
    });

    const updateRecord = useMutation({
        mutationFn: async (params: { boardId: string; recordId: string; data: { key: string; value: unknown }[] }) => {
            const { data: record } = await apiFetch<API.BoardItem>(
                putBoardRecord.api(params.boardId, params.recordId),
                putBoardRecord.method,
                {
                    data: params.data,
                },
            );
            return { ...record, ...record.fields } as unknown as API.BoardItem;
        },
        onError: (err) => {
            console.error('Update error:', err);
            fetchData();
        },
    });

    const deleteRecord = useMutation({
        mutationFn: async (params: { boardId: string; recordId: string }) => {
            await apiFetch(deleteBoardRecord.api(params.boardId, params.recordId), deleteBoardRecord.method);
            return true;
        },
        onSuccess: () => {
            fetchData();
        },
    });

    // Fetch data when collapse opens
    const fetchData = useCallback(async () => {
        if (!boardChildId || !parentRecordId) return;

        setIsLoading(true);
        setChildBoardError(null);
        try {
            // Fetch child board definition
            const boardResponse = await apiFetch<any>(getBoardById.api(boardChildId), getBoardById.method);
            const boardData = boardResponse.data.data || boardResponse.data;
            // Reason: backend may return 200 with `{error: "..."}` shape (no _id),
            // or the child board ref points to a deleted/missing board. Either
            // way we can't safely allow create/update without a valid board.
            if (!boardData || !boardData._id || !Array.isArray(boardData.fields)) {
                setChildBoard(null);
                setChildBoardError(t('databoard_tit_child_board_missing'));
                setBoardItems([]);
                return;
            }
            setChildBoard(boardData);

            let recordsToUse = initialData || [];

            // If the initial data is just an array of ID strings, we need to fetch the full records
            const isIdArray = Array.isArray(recordsToUse) && recordsToUse.length > 0 && typeof recordsToUse[0] === 'string';

            if (recordsToUse.length === 0 || isIdArray) {
                const fieldValue = parentRecord?.[field._id];
                if (Array.isArray(fieldValue)) {
                    recordsToUse = fieldValue;
                } else if (fieldValue && typeof fieldValue === 'object' && Array.isArray(fieldValue.data)) {
                    recordsToUse = fieldValue.data;
                }
            }

            // If we still only have IDs, force a fetch from the API
            const stillIdArray = Array.isArray(recordsToUse) && recordsToUse.length > 0 && typeof recordsToUse[0] === 'string';

            // If still no records or only IDs but summary says we have items, fetch from API
            if ((recordsToUse.length === 0 || stillIdArray) && summaryData.count > 0 && parentBoardId) {
                try {
                    const { data: paginatedResult } = await apiFetch<API.PaginatedResponse<API.BoardItem[]>>(
                        getRelatedRecords.api(parentBoardId, parentRecordId, boardChildId),
                        getRelatedRecords.method,
                    );
                    recordsToUse = paginatedResult.data;
                } catch (fetchError) {
                    console.error('Failed to fetch related records:', fetchError);
                }
            }

            const formattedData = recordsToUse.map((item: any, index: number) => {
                const itemData = typeof item === 'object' ? item : { _id: item, id: item };
                return {
                    ...itemData,
                    fields: itemData.fields || itemData,
                    _id: itemData._id || itemData.id || `row-${parentRecordId}-${field._id}-${index}`,
                };
            });
            setBoardItems(formattedData);
        } catch (error) {
            console.error('Failed to fetch child board data:', error);
            const status = (error as AxiosError)?.response?.status;
            setChildBoard(null);
            setChildBoardError(
                status === 404 ? t('databoard_tit_child_board_missing') : t('databoard_tit_child_board_load_failed'),
            );
            setBoardItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [boardChildId, parentRecordId, initialData, t]);

    useEffect(() => {
        if (open && boardChildId && parentRecordId) {
            fetchData();
        }
    }, [open, fetchData]);

    // Handle auto-close when another cell is opened
    useEffect(() => {
        const handleOtherCellOpen = (event: CustomEvent) => {
            if (event.detail.parentRecordId !== parentRecordId) {
                setOpen(false);
            }
        };

        window.addEventListener('map-to-board-cell-open' as any, handleOtherCellOpen);
        return () => {
            window.removeEventListener('map-to-board-cell-open' as any, handleOtherCellOpen);
        };
    }, [parentRecordId]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newOpenState = !open;
        setOpen(newOpenState);

        if (newOpenState) {
            const event = new CustomEvent('map-to-board-cell-open', {
                detail: { parentRecordId },
            });
            window.dispatchEvent(event);
        }
    };

    // Handle data updates (create/update)
    const onDataUpdate: FlexibleTableBaseProps<API.BoardItem>['onDataUpdate'] = useCallback(
        async ({ columnId, value, id }: { columnId: string; value: unknown; id: string }) => {
            console.log('DATA update', { columnId, value, id });

            if (!childBoard?._id) return;
            // Reason: backend `/data-board/boards/<id>/items` rejects with 400
            // when board_field_id is missing. Bail out here so we don't fire a
            // request guaranteed to fail.
            if (!columnId) {
                console.warn('TableInTableCell: missing columnId, skip update', { value, id });
                return;
            }

            if (id === 'new') {
                try {
                    const result = await createRecord.mutateAsync({
                        boardId: childBoard._id,
                        fields: [
                            {
                                board_field_id: columnId,
                                value,
                            },
                        ],
                    });
                    // Refetch data to get latest state
                    await fetchData();
                    return result;
                } catch (error) {
                    console.error('Create error:', error);
                }
            } else {
                let newValue = value;
                const currentField = childBoard.fields.find((f) => f._id === columnId);

                // Handle attachment uploads
                if (currentField?.type === 'Attachment' && Array.isArray(newValue)) {
                    const formData = new FormData();
                    (newValue as AttachmentValue[]).forEach((item) => {
                        if (item.extra?.file) {
                            formData.append('', item.extra.file);
                        }
                    });

                    if ([...formData.entries()].length > 0) {
                        const { data } = await apiFetch<
                            {
                                name: string;
                                extension: string;
                                url: string;
                                key: string;
                                uploader?: string;
                                user_id?: string;
                                sizeInBytes?: number;
                                uploadDate?: string;
                            }[]
                        >(postBoardUpload.api, postBoardUpload.method, formData, ImbraceFileUpload);
                        newValue = (newValue as AttachmentValue[]).map((item) => {
                            const itemName = item.data?.name;
                            const nameWithoutExtension = itemName?.includes('.')
                                ? itemName.substring(0, itemName.lastIndexOf('.'))
                                : itemName || '';
                            const targetData = data.find((d) => d.name === nameWithoutExtension);
                            return {
                                type: item.type,
                                data: {
                                    name: item.data?.name || "",
                                    url: targetData?.url || item.data?.url || "",
                                    key: targetData?.key || item.data?.key || "",
                                    extension: targetData?.extension || item.data?.extension || "",
                                    uploader: targetData?.uploader || undefined,
                                    user_id: targetData?.user_id || undefined,
                                    sizeInBytes: targetData?.sizeInBytes || undefined,
                                    uploadDate: targetData?.uploadDate || undefined,
                                },
                            };
                        });
                    } else {
                        newValue = (newValue as AttachmentValue[]).map((item) => {
                            return {
                                type: item.type,
                                data: {
                                    name: item.data?.name,
                                    url: item.data?.url,
                                    key: item.data?.key,
                                    extension: item.data?.extension,
                                },
                            };
                        });
                    }
                }

                // Handle MultipleAssignee
                if (currentField?.type === 'MultipleAssignee' && Array.isArray(newValue)) {
                    newValue = (newValue as any[]).map((v) => {
                        if (typeof v === 'string') {
                            return v;
                        }
                        return (v as any)?._id;
                    });
                    newValue = [...new Set(newValue as string[])];
                }

                // Construct payload using processed value
                const currentItemsFields = boardItems.map((item) => item.fields || {});
                const updatedData = currentItemsFields.map((itemFields, index) => {
                    const currentItem = boardItems[index];
                    const currentItemId = currentItem._id || currentItem.id || `row-${index}`;
                    if (currentItemId === id) {
                        return { ...itemFields, [columnId]: newValue };
                    }
                    return itemFields;
                });

                const payloadUpdate = {
                    board_id: parentBoardId,
                    record_id: parentRecordId,
                    data: [
                        {
                            key: field._id,
                            value: updatedData,
                        },
                    ],
                };
                console.log('Payload Update:', payloadUpdate);

                if (!parentBoardId || !parentRecordId) return;

                try {
                    const result = await updateRecord.mutateAsync({
                        boardId: parentBoardId,
                        recordId: parentRecordId,
                        data: payloadUpdate.data,
                    });

                    // Update local state instead of refetching
                    setBoardItems((prev) =>
                        prev.map((item, index) => {
                            const itemId = item._id || item.id || `row-${index}`;
                            if (itemId === id) {
                                return {
                                    ...item,
                                    fields: {
                                        ...item.fields,
                                        [columnId]: newValue as any,
                                    },
                                };
                            }
                            return item;
                        }),
                    );

                    // await fetchData();
                    return result;
                } catch (error) {
                    console.error('Update error:', error);
                }
            }
        },
        [childBoard, createRecord, updateRecord, fetchData, boardItems, field, parentRecordId, parentBoardId],
    );

    // Build columns matching main Databoard table
    const columns: Columns<API.BoardItem> = useMemo(() => {
        if (!childBoard) return [];

        return childBoard.fields
            .filter((f) => !f.hidden)
            .map((f) => {
                const valueEnum = f.data?.reduce((prev, current) => {
                    return {
                        ...prev,
                        [current._id]: current.value,
                    };
                }, {});

                return {
                    accessorKey: f._id || f.id,
                    id: f._id || f.id,
                    header: () => f.name,
                    tooltip: f.description,
                    type: f.type,
                    bordered: !f.is_identifier,
                    enableColumnFilter: false,
                    enableSorting: false, // Disabled as per requirement
                    minSize: (() => {
                        switch (f.type) {
                            case 'Number':
                                return 100;
                            case 'Assignee':
                            case 'SingleSelection':
                            case 'Date':
                            case 'Link':
                                return 200;
                            case 'MultipleAssignee':
                            case 'MultipleSelection':
                            case 'Email':
                                return 250;
                            case 'Phone':
                                return 180;
                            case 'LongText':
                                return 300;
                            case 'Priority':
                            case 'Country':
                            case 'Time':
                                return 150;
                            case 'RichText':
                                return 350;
                            case 'TableInTable':
                                return 600;
                            default:
                                return 200;
                        }
                    })(),
                    ...(f.type === 'Assignee' && {
                        cell: ({ cell }) => {
                            let displayName = (cell.getValue() as Record<string, string>)?.display_name;
                            if (typeof cell.getValue() === 'string') {
                                const users = queryClient.getQueryData<API.User[]>(['FlexibleTable', { type: 'Assignee', fieldId: f._id }]);
                                const targetUser = users?.find((user: API.User) => user.id === cell.getValue());
                                displayName = targetUser?.display_name ?? '—';
                            }
                            return (
                                <EllipsisText
                                    text={`${displayName ?? '—'}`}
                                    element={
                                        <Typography
                                            style={{
                                                color: !displayName ? 'var(--color-light-4)' : 'inherit',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                wordBreak: 'break-word',
                                            }}
                                        />
                                    }
                                />
                            );
                        },
                        request: async () => {
                            const { data } = await apiFetch<API.User[]>(getMembers.api, getMembers.method, {
                                status: 'active',
                            });
                            return data;
                        },
                    }),
                    ...(f.type === 'MultipleAssignee' && {
                        cell: ({ cell }) => {
                            const users = queryClient.getQueryData<API.User[]>([
                                'FlexibleTable',
                                { type: 'MultipleAssignee', fieldId: f._id },
                            ]);
                            const value = cell.getValue() as any[];
                            let valueToDisplay: string[] = [];
                            if (Array.isArray(value)) {
                                valueToDisplay = value.map((v: any) => {
                                    if (typeof v === 'object' && v?.display_name) {
                                        return v.display_name;
                                    } else {
                                        const targetUser = users?.find((user: API.User) => user.id === v);
                                        return targetUser?.display_name ?? v;
                                    }
                                });
                            }
                            valueToDisplay = [...new Set(valueToDisplay)];
                            if (valueToDisplay.length > 0) {
                                return (
                                    <Space size={8}>
                                        {valueToDisplay
                                            .filter((enumValue) => enumValue !== undefined && enumValue !== null)
                                            .map((enumValue, optionIndex) => {
                                                return (
                                                    <Chip
                                                        key={`${optionIndex}`}
                                                        sx={{
                                                            height: 24,
                                                            background: 'rgba(250, 153, 23, 0.2)',
                                                            maxWidth: 'none',
                                                        }}
                                                        label={enumValue}
                                                    />
                                                );
                                            })}
                                    </Space>
                                );
                            }
                            return <Typography style={{ color: 'var(--color-light-4)' }}>—</Typography>;
                        },
                        request: async () => {
                            const { data } = await apiFetch<API.User[]>(getMembers.api, getMembers.method, {
                                status: 'active',
                            });
                            return data;
                        },
                    }),
                    ...(f.type === 'Country' && {
                        cell: ({ cell }) => {
                            const countryName = (cell.getValue() as Record<string, string>)?.country_name;
                            return (
                                <EllipsisText
                                    text={`${countryName ?? '—'}`}
                                    element={
                                        <Typography
                                            style={{
                                                color: !countryName ? 'var(--color-light-4)' : 'inherit',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                wordBreak: 'break-word',
                                            }}
                                        />
                                    }
                                />
                            );
                        },
                    }),
                    ...(f.type === 'Phone' && {
                        cell: ({ cell }) => {
                            const phoneData = cell.getValue() as Record<string, string>;
                            if (phoneData && typeof phoneData === 'object' && 'phone' in phoneData) {
                                return (
                                    <EllipsisText
                                        text={`${phoneData.country_calling_code ?? ''} ${phoneData.national_number}`}
                                        element={
                                            <Typography
                                                style={{
                                                    color: 'inherit',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    wordBreak: 'break-word',
                                                }}
                                            />
                                        }
                                    />
                                );
                            }
                            return (
                                <EllipsisText
                                    text={`${cell.getValue() || '—'}`}
                                    element={
                                        <Typography
                                            style={{
                                                color: !cell.getValue() ? 'var(--color-light-4)' : 'inherit',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                wordBreak: 'break-word',
                                            }}
                                        />
                                    }
                                />
                            );
                        },
                    }),
                    ...(f.type === 'RichText' && {
                        enableEditing: false,
                        cell: ({ cell, column, row, table }) => {
                            const richContent = cell.getValue() as unknown as {
                                subject: string;
                                content: { content: string; files: [] };
                            };
                            const senderEmailField = table
                                ._getColumnDefs()
                                .find((columnDef) => columnDef.meta?.fieldData?.name === 'Outbound Source');

                            return (
                                <EmailContentPreview
                                    {...richContent}
                                    email={
                                        senderEmailField && senderEmailField.id
                                            ? (row.original[senderEmailField.id as keyof API.BoardItem] as string) || ''
                                            : ''
                                    }
                                />
                            );
                        },
                    }),
                    ...((f.type === 'SingleSelection' ||
                        f.type === 'MultipleSelection' ||
                        f.type === 'Priority' ||
                        f.type === 'MultipleAssignee') && {
                        enum: valueEnum,
                    }),
                    ...(f.type === 'SingleSelection' && {
                        minSize: 200,
                        request: () =>
                            f.data?.map((field) => ({
                                text: field.value,
                                value: field._id,
                            })),
                    }),
                    ...(f.type === 'MultipleSelection' && {
                        minSize: 250,
                        enableSorting: false,
                        request: () =>
                            f.data?.map((field) => ({
                                text: field.value,
                                value: field._id,
                            })),
                    }),
                    ...(f.type === 'TableInTable' && {
                        minSize: 600,
                        enableEditing: false,
                        cell: ({ cell, row }: any) => {
                            if (knowledgeHub) {
                                return (
                                    <TableInTableCell
                                        key={`${f._id}-${row.original._id}`}
                                        field={f}
                                        parentRecordId={row.original._id || row.original.id}
                                        parentRecord={row.original}
                                        parentBoardId={childBoard._id}
                                        initialData={(row.original[f._id as keyof API.BoardItem] as any)?.data}
                                        knowledgeHub={knowledgeHub}
                                    />
                                );
                            }
                            return <Typography style={{ color: 'var(--color-light-4)' }}>Nested tables not supported</Typography>;
                        },
                    }),
                    ...(f.type === 'Origin' && {
                        enum: valueEnum,
                        cell: ({ getValue }) => {
                            const originValue = getValue() as API.OriginValue;
                            if (!originValue || typeof originValue !== 'object') {
                                return <Typography style={{ color: 'var(--color-light-4)' }}>—</Typography>;
                            }
                            const {
                                type,
                                data: { name, type: dataType },
                            } = originValue;

                            const iconType: Partial<Record<API.ProductType, keyof typeof channelIconMapping>> = {
                                business_contact_collector: 'crm',
                                email_campaign: 'email',
                                facebook_leads_management: 'facebook',
                                facebook_social_media_management: 'facebook',
                                'ai-assistant_management': 'imbraceai',
                                form_management: 'formManagement',
                                whatsapp_outbound: 'whatsapp',
                                email_outbound: 'email',
                            };

                            if (type === 'customized') {
                                return (
                                    <EllipsisText
                                        text={`${name ?? '—'}`}
                                        element={
                                            <Typography
                                                style={{
                                                    color: !name ? 'var(--color-light-4)' : 'inherit',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    wordBreak: 'break-word',
                                                }}
                                            />
                                        }
                                    />
                                );
                            }
                            return (
                                <Space size={12} align="center" justify="start" style={{ width: '100%' }}>
                                    <Space>
                                        <Icon
                                            namespace="channel"
                                            name={
                                                type === 'channel'
                                                    ? (dataType as keyof typeof channelIconMapping)
                                                    : iconType[dataType as API.ProductType] || 'crm'
                                            }
                                            style={{ fontSize: 24 }}
                                        />
                                    </Space>

                                    <EllipsisText
                                        text={`${name ?? '—'}`}
                                        element={
                                            <Typography
                                                style={{
                                                    color: !name ? 'var(--color-light-4)' : 'inherit',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    wordBreak: 'break-word',
                                                }}
                                            />
                                        }
                                    />
                                </Space>
                            );
                        },
                    }),
                    ...(f.type === 'ShortText' && {
                        validate: (value?: string) => {
                            if (value && value.length > 150) {
                                return t('crm_field_short_text_length_limit');
                            }
                            return true;
                        },
                    }),
                    ...(f.is_identifier && {
                        validate: (value?: string) => {
                            if (!value) {
                                return t('crm_identifier_can_not_delete');
                            }
                            if (value && value.length > 150) {
                                return t('crm_field_short_text_length_limit');
                            }
                            return true;
                        },
                    }),
                    fieldProps: {
                        ...(f?.default_field_name === 'birthday' && { minDate: dayjs(new Date(0)) }),
                        ...(f?.default_field_name === 'stage' && {
                            disabled: (record: API.BoardItem) => {
                                return record[f._id as keyof API.BoardItem] === 'Unidentified Lead';
                            },
                            disabledTooltip: t('crm_field_stage_disabled_desc'),
                        }),
                        ...(f?.default_field_name === 'created_at' && {
                            disabled: (record: API.BoardItem) => {
                                return record.created_type === 'system';
                            },
                            disabledTooltip: t('crm_system_data_disabled_edit_desc'),
                        }),
                        ...(f.type === 'Origin' && {
                            disabled: (record: API.BoardItem) => {
                                return record.created_type === 'system';
                            },
                            disabledTooltip: t('origin_system_filled_tooltip'),
                        }),
                        ...(f.type === 'Assignee' && {
                            querySelect: (users: API.User[]) => {
                                return users.map((user) => ({
                                    value: user.id,
                                    text: user.display_name,
                                }));
                            },
                        }),
                        ...(f.type === 'MultipleAssignee' && {
                            querySelect: (users: API.User[]) => {
                                return users.map((user) => ({
                                    value: user.id,
                                    text: user.display_name,
                                }));
                            },
                        }),
                    },
                    meta: {
                        identifier: f.is_identifier,
                        defaultFieldName: f.default_field_name,
                        disableOrdering: f.is_identifier,
                        boardType: childBoard.type,
                        onExpand: (e, { rowId, target, value, onClose, extraProps }) => {
                            if (
                                (f.type === 'MultipleSelection' ||
                                    f.type === 'LongText' ||
                                    f.type === 'Attachment' ||
                                    f.type === 'Notes') &&
                                target
                            ) {
                                openFieldPopover({
                                    anchorEl: target,
                                    title: f.name,
                                    type: f.type,
                                    valueEnum,
                                    initialValue: value,
                                    onClose,
                                    boardType: childBoard.type,
                                    extraProps,
                                    updateData: async (updatedValue) => {
                                        if (childBoard?._id) {
                                            const updateData = { columnId: f._id, value: updatedValue, id: rowId };
                                            tableRef.current?.handleDataUpdate(updateData);
                                        }
                                    },
                                });
                                return;
                            }
                        },
                        ...(f.type === 'MultipleSelection' && {
                            cellStyle: {
                                padding: '7px 12px',
                            },
                        }),
                        ...(f.type === 'RichText' && {
                            cellStyle: {
                                padding: '0',
                                paddingLeft: '11px',
                            },
                        }),
                        ...(f.type === 'Phone' && {
                            defaultCountryCode: f.settings?.default_country_code,
                        }),
                        ...(f.type === 'Link' && {
                            cellStyle: {
                                padding: 0,
                                paddingLeft:
                                    f.default_field_name === 'contact_record' || f.default_field_name === 'opportunity_record'
                                        ? '8.5px'
                                        : 0,
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                            },
                        }),
                        ...(f.type === 'Origin' && {
                            cellStyle: {
                                padding: '4px 11px',
                            },
                        }),
                        fieldData: f,
                        ...(f.type === 'Notes' && {
                            cellStyle: {
                                padding: '0 12px',
                            },
                        }),
                        ...(f.type === 'Currency' && {
                            defaultCurrencyCode: f.settings?.default_currency_code,
                        }),
                    },
                };
            }) as Columns<API.BoardItem>;
    }, [childBoard, t, openFieldPopover]);

    const calculatedHeight = useMemo(() => {
        const rowHeight = 64; // More generous height to prevent clipping
        const headerHeight = 60;
        const count = boardItems.length || 0;
        const total = count * rowHeight + headerHeight;
        // Cap at ~270px which fits exactly 4 records comfortably
        return total > 270 ? 270 : total;
    }, [boardItems.length]);

    // Transform board items to have required 'id' property and flatten fields
    const dataSource: any[] = useMemo(() => {
        if (!boardItems || !Array.isArray(boardItems)) return [];
        return boardItems.map((item, index) => ({
            ...item,
            ...item.fields,
            id: item._id || item.id || `row-${index}`,
            _id: item._id,
            created_type: item.created_type,
        }));
    }, [boardItems]);

    if (!boardChildId) {
        return <Typography style={{ color: 'var(--color-light-4)' }}>—</Typography>;
    }

    return (
        <div style={{ width: '100%' }}>
            {fieldPopoverHolder}
            <Space direction="vertical" align="start" style={{ width: '100%' }}>
                <span
                    onClick={handleToggle}
                    style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    <ArrowRightIcon
                        style={{
                            color: 'var(--color-primary-1)',
                            fontSize: 24,
                            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                        }}
                    />
                    {summaryData.count} {summaryData.count <= 1 ? 'item' : 'items'}
                </span>
                <Collapse in={open} style={{ width: '100%', zIndex: 0 }}>
                    {isLoading ? (
                        <div style={{ padding: '8px' }}>
                            <CircularProgress size={20} />
                        </div>
                    ) : childBoardError ? (
                        <Typography style={{ color: 'var(--color-light-5)', padding: '8px' }}>{childBoardError}</Typography>
                    ) : boardItems.length === 0 ? (
                        <Typography style={{ color: 'var(--color-light-4)', padding: '8px' }}>No items</Typography>
                    ) : (
                        childBoard &&
                        columns.length > 0 && (
                            <div
                                style={{
                                    marginTop: '8px',
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                                className="map-to-board-nested-table"
                            >
                                <style>
                                    {`
                                        .map-to-board-nested-table [class*="container"] {
                                            overflow: visible !important;
                                        }
                                        .map-to-board-nested-table [class*="tableContainer"] {
                                            padding-bottom: 0 !important;
                                        }
                                        .map-to-board-nested-table [class*="tableContainer"],
                                        .map-to-board-nested-table [class*="row"],
                                        .map-to-board-nested-table [class*="cell"],
                                        .map-to-board-nested-table [class*="inner"],
                                        .map-to-board-nested-table [class*="thead"] {
                                            background: none !important;
                                            background-color: transparent !important;
                                            border: none !important;
                                            border-color: transparent !important;
                                            box-shadow: none !important;
                                        }
                                        .map-to-board-nested-table [class*="emptyContainer"] {
                                            display: none !important;
                                        }
                                        .map-to-board-nested-table [class*="pagination"] {
                                            display: none !important;
                                        }
                                    `}
                                </style>
                                <FlexibleTable
                                    ref={tableRef}
                                    queryKey={['table-in-table', childBoard._id, parentRecordId]}
                                    columns={columns}
                                    dataSource={dataSource}
                                    onDataUpdate={onDataUpdate}
                                    enableRowSelection={false}
                                    enableMultiRowSelection={false}
                                    columnResizable={false}
                                    columnSortable={false}
                                    columnFilterable={false}
                                    showFilter={false}
                                    fullWidth
                                    disableHoverEffect
                                    containerStyle={{
                                        background: 'none',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        boxShadow: 'none',
                                        height: `${calculatedHeight}px`,
                                        maxHeight: '270px',
                                        overflowY: 'auto',
                                    }}
                                    transparentRow
                                    pagination={{
                                        pageIndex: 0,
                                        pageSize: 100,
                                    }}
                                />
                            </div>
                        )
                    )}
                </Collapse>
            </Space>
        </div>
    );
};

export default TableInTableCell;
