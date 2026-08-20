import { Button, FieldSelect, Icon, Space, Typography } from '@imbrace/ui';
import type { ColumnOrderState, ColumnSizingState, TableState } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FlexibleTable from '@/components/FlexibleTable';
import type { AttachmentValue, Columns, FlexibleTableRef, RequestParameters } from '@/components/FlexibleTable/types';
import { getBoardRecords } from '@/services/api/crm';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { boardsQueryFn, boardsQueryKey, useBoards } from '@/services/queries/board';
import dayjs from 'dayjs';
import styles from './index.module.scss';

interface AttachmentRecord {
    id: string;
    fieldName: string;
    fileName: string;
    uploadedBy?: string;
    updatedAt: string;
    url: string;
    key: string;
    extension: string;
    sizeInBytes?: number;
}

const getIconName = (extension: string) => {
    if (!extension) return 'file';
    switch (extension.toLowerCase()) {
        case 'mp4':
            return 'mic';
        case 'jpg':
        case 'png':
        case 'svg':
        case 'jpeg':
        case 'gif':
        case 'tiff':
        case 'tif':
            return 'image';
        default:
            return 'file';
    }
};

const KnowledgeHub = ({
    knowledgeHubId,
    onSelect,
    onClose,
}: {
    knowledgeHubId?: string;
    onSelect: (boardId: string) => void;
    onClose: () => void;
}) => {
    const { t } = useTranslation();
    const tableRef = useRef<FlexibleTableRef<AttachmentRecord>>(null);
    const [globalSearch, setGlobalSearch] = useState<string>();
    const [currentTab, setCurrentTab] = useState<string>(knowledgeHubId ?? '');
    const [savedColumnState, setSavedColumnState] = useState<{
        columnSizing: ColumnSizingState;
        columnOrder: ColumnOrderState;
    }>({
        columnSizing: {},
        columnOrder: [],
    });

    const { data: boards, refetch } = useBoards({
        types: 'KnowledgeHub',
    });

    const currentBoardRef = useRef<API.Board>();

    const currentBoard = useMemo(() => {
        if (currentTab && boards) {
            currentBoardRef.current = boards.filter((board) => board.id === currentTab)[0];
            return boards.filter((board) => board.id === currentTab)[0];
        }
        return undefined;
    }, [currentTab, boards]);

    useEffect(() => {
        if (boards && boards.length > 0) {
            setCurrentTab(boards[0].id);
        }
    }, [boards]);

    const columns: Columns<AttachmentRecord> = useMemo(() => {
        if (currentBoard) {
            return [
                {
                    id: 'fileName',
                    accessorKey: 'fileName',
                    header: t('ai_assistant_management_knowledge_support_board_filename'),
                    enableSorting: true,
                    enableEditing: false,
                    cell: ({ row }) => (
                        <Space style={{ marginLeft: '8px' }} justify="start" align="center">
                            <Icon name={getIconName(row.original.extension)} style={{ width: '24px', height: '24px', color: '#828282' }} />
                            <Space style={{ marginLeft: '8px' }} direction="vertical" justify="start" align="start" size={0}>
                                <Typography>{row.original.fileName}</Typography>
                                <Typography style={{ color: '#828282' }}>
                                    {row.original.sizeInBytes ? `${(row.original.sizeInBytes / 1024).toFixed(1)} KB` : ''}
                                </Typography>
                            </Space>
                        </Space>
                    ),
                    meta: {
                        cellStyle: {
                            padding: 0,
                        },
                        headerStyle: {
                            display: 'flex',
                            justifyContent: 'start',
                        },
                    },
                },
                {
                    id: 'uploadedBy',
                    accessorKey: 'uploadedBy',
                    header: t('ai_assistant_management_knowledge_support_board_upload_by'),
                    enableSorting: true,
                    enableEditing: false,
                    maxSize: 200,
                    cell: ({ row }) => <Typography>{row.original.uploadedBy}</Typography>,
                },
                {
                    id: 'updatedAt',
                    accessorKey: 'updatedAt',
                    header: t('ai_assistant_management_knowledge_support_board_last_updated'),
                    enableSorting: true,
                    enableEditing: false,
                    maxSize: 200,
                    cell: ({ row }) => (
                        <Typography>
                            {dayjs(row.original.updatedAt).isValid() 
                                ? dayjs(row.original.updatedAt).format('YYYY-MM-DD HH:mm')
                                : ''}
                        </Typography>
                    ),
                },
            ];
        }
        return [];
    }, [currentBoard, t, globalSearch]);

    const fetchRecords = useCallback(async (params: RequestParameters, signal?: AbortSignal) => {
        if (currentBoardRef.current) {
            const attachmentFields = currentBoardRef.current.fields.filter((field) => field.type === 'Attachment');
            if (attachmentFields.length > 0) {
                // Fetch regular records
                const { pagination, sorters } = params;
                const searchParams = new URLSearchParams();
                let api = getBoardRecords.api(currentBoardRef.current.id);
                let method: 'GET' | 'POST' = getBoardRecords.method;
                if (pagination) {
                    searchParams.append('limit', `${pagination.pageSize}`);
                    searchParams.append('skip', `${pagination.pageIndex * pagination.pageSize}`);
                }
                if (sorters && sorters.length > 0) {
                    searchParams.append('sort', `${sorters[0].desc ? '-' : ''}fields.${sorters[0].id}`);
                }

                const { data } = await apiFetch<API.PaginatedResponse<API.BoardItem[]>>(api, method, searchParams, ImbraceClient, {
                    signal,
                });

                const attachmentRecords: AttachmentRecord[] = [];

                data.data.forEach((records) => {
                    attachmentFields.forEach((field) => {
                        const attachments = records[field._id] as AttachmentValue[];
                        if (Array.isArray(attachments)) {
                            attachments.forEach((attachment) => {
                                attachmentRecords.push({
                                    id: `${records.id}-${field._id}-${attachment.data.key}`,
                                    fieldName: field.name,
                                    fileName: attachment.data.name,
                                    uploadedBy: attachment.data.uploader || '',
                                    updatedAt: attachment.data.uploadDate || '',
                                    url: attachment.data.url,
                                    key: attachment.data.key || '',
                                    extension: attachment.data.extension || '',
                                    sizeInBytes: attachment.data.sizeInBytes || 0,
                                });
                            });
                        }
                    });
                });
                return {
                    data: attachmentRecords,
                    meta: {
                        total: data.count,
                        skip: (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? 0),
                        limit: pagination?.pageSize ?? 20,
                    },
                };
            }
        }
        return {
            data: [],
            meta: {
                total: 0,
                skip: 0,
                limit: 20,
            },
        };
    }, []);

    const emptyMessage = (tableState: Partial<TableState>) => {
        if (boards.length === 0) {
            return <Typography variant="SubHeading2">{t('ai_assistant_management_knowledge_support_no_board')}</Typography>;
        }
        return <Typography variant="SubHeading2">{t('ai_assistant_management_knowledge_support_no_board_files')}</Typography>;
    };

    const columnSizing = useMemo(() => {
        const sizing = localStorage.getItem(`${currentBoard?._id}-Sizing`);
        return sizing ? JSON.parse(sizing) : savedColumnState.columnSizing || {};
    }, [currentBoard?._id, savedColumnState]);

    const columnOrder = useMemo(() => {
        const order = localStorage.getItem(`${currentBoard?._id}-Order`);
        return order ? JSON.parse(order) : savedColumnState.columnOrder || [];
    }, [currentBoard?._id, savedColumnState]);

    return (
        <div>
            <Space direction="vertical" align="start" justify="start" className={styles.menuTitleContainer}>
                <Space justify="between" size={8} style={{ width: '100%' }}>
                    <FieldSelect
                        searchable
                        fullWidth
                        value={currentTab}
                        onChange={(value) => {
                            if (value) {
                                setCurrentTab(value);
                            }
                        }}
                        queryKey={boardsQueryKey({
                            isDefault: undefined,
                            types: 'KnowledgeHub',
                        })}
                        request={boardsQueryFn({
                            isDefault: undefined,
                            types: 'KnowledgeHub',
                        })}
                        querySelect={(boards: API.Board[]) => {
                            return boards.map((option) => ({
                                value: option._id,
                                text: option.name,
                            }));
                        }}
                        containerStyle={{ flex: 1, minWidth: 0 }}
                    />
                    <Button
                        onClick={() => onSelect(currentTab)}
                        text={t('ai_assistant_management_knowledge_support_select_board_button')}
                        sx={{ width: '203px', padding: '0px', flexShrink: 0 }}
                        variant="contained"
                    />
                </Space>
            </Space>
            <Space size={0} direction="vertical" align="start" className={styles.boardContainer}>
                <FlexibleTable<AttachmentRecord>
                    outlined
                    fullWidth
                    containerStyle={{ height: `calc(100vh - 325px)` }}
                    showFilter={false}
                    ref={tableRef}
                    queryKey={['databoard', currentBoard?._id]}
                    columns={columns}
                    request={fetchRecords}
                    globalFilter={globalSearch}
                    columnResizable
                    columnOrderChangeable
                    columnOrder={columnOrder}
                    columnSizing={columnSizing}
                    onColumnOrderChange={(order) => {
                        if (currentBoard) {
                            localStorage.setItem(`${currentBoard?._id}-Order`, JSON.stringify(order));
                            setSavedColumnState((prev) => ({
                                ...prev,
                                columnOrder: order,
                            }));
                        }
                    }}
                    onColumnSizingChange={(sizing) => {
                        if (currentBoard) {
                            localStorage.setItem(`${currentBoard?._id}-Sizing`, JSON.stringify(sizing));
                            setSavedColumnState((prev) => ({
                                ...prev,
                                columnSizing: sizing,
                            }));
                        }
                    }}
                    emptyImage={(tableState) =>
                        tableState.globalFilter || (tableState.columnFilters && tableState.columnFilters?.length > 0)
                            ? 'fileSearch'
                            : undefined
                    }
                    emptyMessage={emptyMessage}
                />
            </Space>
            <Space>
                <Button
                    text={`< ${t('ai_assistant_management_knowledge_support_board_back_to_editing')}`}
                    sx={{ width: '213px', padding: '0px', marginTop: '12px', marginBottom: '12px', marginLeft: '32px' }}
                    variant="outlined"
                    onClick={onClose}
                />
            </Space>
        </div>
    );
};

export default KnowledgeHub;
