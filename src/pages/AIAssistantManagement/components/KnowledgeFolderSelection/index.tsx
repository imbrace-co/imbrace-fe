import { Button, Checkbox, EllipsisText, FieldSelect, Icon, Space, Typography } from '@imbrace/ui';
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
import DataboardEnhance, { FileMIME } from '@/pages/DataboardEnhance';
import DataboardSelection from '@/pages/AIAssistantManagement/components/DataboardSelection';
import { format } from 'date-fns';
import ClockIcon from '@/assets/icons/general/clock.svg?react';
import { Folder, SOURCE_TYPE } from '@/pages/KnowledgeHub';
import DocxIcon from '@/assets/icons/knowledge/docx_icon.svg?react';
import PptIcon from '@/assets/icons/knowledge/ppt_icon.svg?react';
import XlsIcon from '@/assets/icons/knowledge/xls_icon.svg?react';
import { getKnowledgeHubFoldersContentById, getKnowledgeHubFoldersSearch } from '@/services/api/knowledgeHub';
import { getCookie } from 'typescript-cookie';
import { useFormContext } from 'react-hook-form';
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

export interface FolderContent {
    files: Array<API.DataBoardFile>;
    folder: Folder;
    subfolders: Array<Folder>;
}

type KnowledgeTab = 'knowledge_drive' | 'knowledge_board';

const KnowledgeFolderSelection = ({
    onModify,
    onModifyBoard,
    onClose,
    initialFolderId,
    initialBoardId,
    initialKnowledgeTab,
}: {
    onModify: (folderId: string) => void;
    onModifyBoard?: (boardId: string) => void;
    onClose: () => void;
    initialFolderId?: string;
    initialBoardId?: string;
    initialKnowledgeTab?: KnowledgeTab;
}) => {
    const { t } = useTranslation();
    const tableRef = useRef<FlexibleTableRef<AttachmentRecord>>(null);
    const [currentTab, setCurrentTab] = useState<string>(initialFolderId || '');
    const [folderStatusNoti, setFolderStatusNoti] = useState<string>('');
    const [isEnableModiyButton, setIsEnableModiyButton] = useState<boolean>(false);
    const [highlighItem, setHighlighItem] = useState<boolean>(false);
    const [knowledgeTab, setKnowledgeTab] = useState<KnowledgeTab>(
        initialKnowledgeTab || (initialBoardId ? 'knowledge_board' : 'knowledge_drive'),
    );

    const { watch, getValues, setValue } = useFormContext();
    const currentFolderSelected = watch('folder_ids');
    const folderDefault = watch('default_folder_id') || '';
    console.log('folderDefault ', folderDefault);
    useEffect(() => {
        setHighlighItem(currentFolderSelected.includes(currentTab));
    }, [currentTab, currentFolderSelected]);

    const renderFileIcon = (fileType: string) => {
        switch (fileType) {
            case FileMIME.PDF:
                return <Icon namespace="file" name="pdfFat" fontSize={24} />;

            case FileMIME.PPT:
                return <PptIcon />;

            case FileMIME.PPTX:
                return <Icon namespace="file" name="pptxFat" fontSize={24} />;

            case FileMIME.DOC:
                return <Icon namespace="file" name="docFat" fontSize={24} />;

            case FileMIME.DOCX:
                return <DocxIcon />;

            case FileMIME.XLS:
                return <XlsIcon />;

            case FileMIME.XLSX:
                return <Icon namespace="file" name="xlsxFat" fontSize={24} />;
            case FileMIME.CSV:
                return <Icon namespace="file" name="csvFat" fontSize={24} />;
            // case FileMIME.VIDEO_MP4:
            //     return <Icon namespace="file" name="mp4Fat" />;
            // case FileMIME.VIDEO_QUICKTIME:
            //     break;
            default:
                return <Icon namespace="file" name="generalFat" fontSize={24} />;
        }
    };

    const columns = useMemo(() => {
        const columnDefinitions: Columns<API.DataBoardFile> = [
            // {
            //     accessorKey: 'rowIndex',
            //     id: 'rowIndex',
            //     header: ({ table }) => (
            //         <div>
            //             <Checkbox
            //                 checked={table.getIsAllPageRowsSelected()}
            //                 indeterminate={table.getIsSomeRowsSelected()}
            //                 onChange={(checked) => {
            //                     table.toggleAllRowsSelected(checked);
            //                     // handleToggleRowCheckbox();
            //                 }}
            //             />
            //         </div>
            //     ),
            //     maxSize: 42,
            //     enableColumnFilter: false,
            //     enablePinning: true,
            //     enableEditing: false,
            //     enableResizing: false,
            //     enableSorting: false,
            //     cell: ({ row }) => {
            //         return (
            //             <Checkbox
            //                 onChange={(e) => {
            //                     row.getToggleSelectedHandler()(e);
            //                     // handleToggleRowCheckbox();
            //                 }}
            //                 {...(!row.getCanSelect() && {
            //                     tooltip: t('databoard_disabled_checkbox_tooltip'),
            //                     tooltipProps: { placement: 'top', arrow: true },
            //                 })}
            //                 disabled={!row.getCanSelect()}
            //                 checked={row.getIsSelected()}
            //             />
            //         );
            //     },
            //     meta: {
            //         cellStyle: {
            //             padding: 0,
            //             textAlign: 'center',
            //         },
            //         headerStyle: {
            //             width: '100%',
            //             display: 'flex',
            //             justifyContent: 'center',
            //         },
            //     },
            // },
            {
                type: 'ShortText',
                accessorKey: 'no',
                id: 'no',
                enableColumnFilter: false,
                enableEditing: false,
                enableSorting: true,
                meta: { disableOrdering: true },
                enablePinning: true,
                header: () => t('No.'),
                maxSize: 90,
                cell: ({ row, table, isHover }) => {
                    return (
                        <Typography>
                            {row.index + 1 + table.getState().pagination.pageSize * table.getState().pagination.pageIndex}
                        </Typography>
                    );
                },
            },
            {
                type: 'ShortText',
                accessorKey: 'name',
                id: 'name',
                enableColumnFilter: false,
                enableEditing: true,
                enableSorting: true,
                enablePinning: true,
                meta: {
                    cellStyle: {
                        padding: '4px 11px',
                    },
                    disableOrdering: true,
                    width: '30%',
                },
                header: () => t('knowledge_file_name'),
                cell: ({ row, getValue }) => {
                    const value = getValue();
                    return (
                        <EllipsisText
                            text={value}
                            element={
                                <Typography
                                    style={{
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
            },
            {
                type: 'Attachment',
                accessorKey: 'presigned_url',
                id: 'presigned_url',
                enableColumnFilter: false,
                enableEditing: false,
                enableSorting: false,
                enablePinning: true,
                meta: {
                    disableOrdering: true,
                    width: '35%',
                },
                header: () => t('preview'),
                cell: ({ row, table }) => {
                    const files = table.getRowModel().rows.map((r) => r.original);
                    const currentIndex = table.getRowModel().rows.findIndex((r) => r.id === row.id);
                    return row.original.file_type.includes('image') ? (
                        <Space
                            style={{ height: 60, width: 60, padding: '10px 0', borderRadius: 4, border: '1px solid #828282' }}
                            className={styles.fileImage}
                        >
                            <img style={{ height: 'auto', width: '100%', maxHeight: '100%' }} src={row.original.presigned_url} />
                        </Space>
                    ) : (
                        <Space
                            style={{ height: 60, width: 60, padding: '10px 0', borderRadius: 4, border: '1px solid #828282' }}
                            justify="center"
                            className={styles.fileImage}
                        >
                            {renderFileIcon(row.original.file_type)}
                        </Space>
                    );
                },
            },
            {
                type: 'Assignee',
                accessorKey: 'last_updated_time',
                id: 'last_updated_time',
                enableColumnFilter: false,
                enableEditing: false,
                enableSorting: true,
                minSize: 160,
                meta: {
                    type: 'Assignee',
                    disableOrdering: true,
                    width: '20%',
                    headerStyle: {
                        display: 'flex',
                        justifyContent: 'flex-end',
                        width: '100%',
                    },
                    cellStyle: {
                        paddingRight: '24px',
                    },
                },
                header: () => <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>{t('last_updated')}</div>,
                cell: ({ row }) => {
                    const displayName = row.original?.last_updated_by?.display_name;
                    const updateTime = row.original?.updated_at;
                    const isValidDate = updateTime && !isNaN(new Date(updateTime).getTime());
                    const syncTime = isValidDate ? format(new Date(updateTime), 'MM/dd/yyyy') : '';
                    return (
                        <Space direction="vertical" align="end" className={styles.assign}>
                            <div
                                style={{
                                    display: 'flex',
                                    textAlign: 'center',
                                }}
                            >
                                {' '}
                                <ClockIcon />{' '}
                                <Typography
                                    style={{
                                        marginLeft: 13,
                                    }}
                                >
                                    {syncTime}
                                </Typography>
                            </div>

                            <span
                                style={{
                                    fontSize: 14,
                                }}
                            >
                                By{' '}
                                <span
                                    style={{
                                        color: 'var(--color-primary-1)',
                                        textDecoration: 'underline',
                                    }}
                                >
                                    {displayName}
                                </span>
                            </span>
                        </Space>
                    );
                },
            },
        ];
        return columnDefinitions;
    }, [t, tableRef]);

    const fetchFolderFiles = async (params: RequestParameters) => {
        try {
            if (!currentTab) {
                return;
            }
            // if (isDirectUrlShared && folderContent) {
            //     return;
            // }

            const { pagination, sorters } = params;
            const isSortDefault = !sorters || sorters?.length === 0;
            const sortBy = isSortDefault ? 'last_updated_time' : sorters[0]?.id;
            const sortOrder = isSortDefault ? 'desc' : sorters?.[0]?.desc ? 'desc' : 'asc';

            const searchParams = new URLSearchParams();

            if (pagination) {
                searchParams.append('q', '');
                searchParams.append('limit', `${pagination.pageSize}`);
                searchParams.append('skip', `${pagination.pageIndex * pagination.pageSize}`);
                searchParams.append('sortBy', sortBy);
                searchParams.append('sortOrder', sortOrder);
                searchParams.append('recursive', 'true');
            }

            const { data } = await apiFetch<{ data: FolderContent }>(
                getKnowledgeHubFoldersContentById.api(currentTab),
                getKnowledgeHubFoldersContentById.method,
                searchParams,
            );

            // if (data?.data) {
            //     setFolderContent(data?.data || null);
            //     setSubFolder(data.data.subfolders);
            // }

            // const fileConvert = await fetchImages(data.data.files);

            return {
                data: (data.data.files || []).map((f) => ({ id: (f as any)._id, ...f })),
                meta: {
                    total: data?.data.pagination.total_recursive_file_count || 0,
                    skip: (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? 0),
                    limit: pagination?.pageSize ?? 20,
                },
            };
        } catch (error) {
            console.log('error:', error);
            return {
                data: [],
                meta: {
                    total: 0,
                    skip: 0,
                    limit: 20,
                },
            };
        }
    };

    const fetchKnowledgeFolder = async () => {
        const searchParams = new URLSearchParams();
        searchParams.append('q', '');
        const folderURL = getKnowledgeHubFoldersSearch.api('');
        const { data } = await apiFetch<{ data: Array<Folder> }>(folderURL, getKnowledgeHubFoldersSearch.method);
        const rootFolderOptions = data?.data?.filter((folder) => folder.parent_folder_id === 'root');
        const folderExceptAssistant = rootFolderOptions.filter((item) => item.source_type !== SOURCE_TYPE.ASSISTANT);

        if (!currentTab) {
            setCurrentTab(folderExceptAssistant[0]?._id || '');
        }

        const folderList = folderExceptAssistant?.map((item) => {
            const isSelected = currentFolderSelected.includes(item._id);
            if (isSelected) {
                return {
                    text: (
                        <span style={{ fontWeight: 800 }}>
                            <span style={{ color: 'var(--color-green-1)' }}>({t('added')}) </span>
                            <span style={{ color: 'var(--color-light-7)' }}>{item.name}</span>
                        </span>
                    ),
                    value: item._id,
                };
            }
            return {
                text: item.name,
                value: item._id,
            };
        });

        return folderList;
    };

    useEffect(() => {
        if (currentTab) {
            setIsEnableModiyButton(true);
        }
        if (currentFolderSelected.includes(currentTab)) {
            setFolderStatusNoti(
                t('ai_assistant_management_knowledge_support_folder_be_selected', {
                    type: 'folder',
                }),
            );
        }
        tableRef.current?.refresh();
    }, [currentTab]);

    const isBoardTab = knowledgeTab === 'knowledge_board';

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: 8 }}>
                <span
                    onClick={() => setKnowledgeTab('knowledge_drive')}
                    style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: knowledgeTab === 'knowledge_drive' ? '#333333' : '#BDBDBD',
                        cursor: 'pointer',
                        marginRight: 32,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {t('ai_assistant_management_knowledge_support_tab_knowledge_drive')}
                </span>
                <span
                    onClick={() => setKnowledgeTab('knowledge_board')}
                    style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: knowledgeTab === 'knowledge_board' ? '#333333' : '#BDBDBD',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {t('ai_assistant_management_knowledge_support_tab_knowledge_board')}
                </span>
            </div>
            {!isBoardTab ? (
                <Space direction="vertical" align="start" justify="start" className={styles.menuTitleContainer}>
                    <Space justify="between" size={8} style={{ width: '100%', marginTop: 12 }}>
                        <Typography variant="Body" style={{ color: 'var(--color-light-6)' }}>
                            {t('ai_assistant_management_knowledge_support_select_resources_desc')}
                        </Typography>
                    </Space>
                    <Space justify="between" size={8} style={{ width: '100%' }}>
                        <FieldSelect
                            searchable
                            fullWidth
                            value={currentTab}
                            key="knowledge-folder-select"
                            queryKey={['knowledge_folder_selection', ...currentFolderSelected]}
                            onChange={(value) => {
                                if (value) {
                                    setCurrentTab(value);
                                }
                                tableRef.current?.reset();
                                if (currentFolderSelected.includes(value)) {
                                    setFolderStatusNoti(
                                        t('ai_assistant_management_knowledge_support_folder_be_selected', {
                                            type: 'folder',
                                        }),
                                    );
                                } else {
                                    setFolderStatusNoti('');
                                }
                            }}
                            request={fetchKnowledgeFolder}
                            containerStyle={{ flex: 1, minWidth: 0 }}
                        />
                        {currentFolderSelected.includes(currentTab) ? (
                            <Button
                                onClick={() => {
                                    onModify(currentTab);
                                    setFolderStatusNoti(
                                        t('ai_assistant_management_knowledge_support_folder_be_removed', {
                                            type: 'folder',
                                        }),
                                    );
                                }}
                                text={t('ai_assistant_management_knowledge_support_remove_from_the_list')}
                                sx={{ width: '200px', flexShrink: 0, padding: 0 }}
                                variant="outlined"
                                type="danger"
                                disabled={!isEnableModiyButton}
                            />
                        ) : (
                            <Button
                                onClick={() => {
                                    onModify(currentTab);
                                    setFolderStatusNoti(
                                        t('ai_assistant_management_knowledge_support_folder_be_selected', {
                                            type: 'folder',
                                        }),
                                    );
                                    onClose?.();
                                }}
                                text={t('ai_assistant_management_knowledge_support_add_to_the_list')}
                                sx={{ width: '200px', flexShrink: 0, padding: 0 }}
                                variant="contained"
                                disabled={!isEnableModiyButton}
                            />
                        )}
                    </Space>
                </Space>
            ) : (
                <DataboardSelection
                    hideInternalTabs
                    hideBackButton
                    forceCategory="knowledge_hub"
                    initialBoardId={initialBoardId}
                    onClose={onClose}
                    onModify={(boardId) => onModifyBoard?.(boardId)}
                />
            )}

            {!isBoardTab && (
                <Space size={0} direction="vertical" align="start" className={styles.boardContainer}>
                    <FlexibleTable<API.DataBoardFile>
                        columns={columns}
                        ref={tableRef}
                        containerStyle={{ height: `calc(100vh - 325px)` }}
                        request={(params) => fetchFolderFiles(params)}
                        isDataDeletable={(row) => {
                            return !!tableRef.current?.isSomeSelected();
                        }}
                        columnOrderChangeable
                        enableRowSelection={(row) => true}
                        deleteButtonText={t('scheduled_events_remove_selected_event')}
                        headerPaddingModify={true}
                    />
                </Space>
            )}
            <Space>
                <Button
                    text={t('back_to_setting')}
                    sx={{ width: '213px', padding: '0px', marginTop: '25px' }}
                    variant="outlined"
                    onClick={onClose}
                />
            </Space>
        </div>
    );
};

export default KnowledgeFolderSelection;
