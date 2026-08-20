import { Button, channelIconMapping, Checkbox, EllipsisText, FieldSelect, Icon, Space, Typography } from '@imbrace/ui';
import type { ColumnOrderState, ColumnSizingState, Row, Table, TableState } from '@tanstack/react-table';
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
import EmailContentPreview from '@/pages/Databoards/components/emailContentPreview';
import { DefaultFilterField } from '@/pages/Databoards';
import { useFormContext } from 'react-hook-form';
import { queryClient } from '@/App';
import { getMembers } from '@/services/api/user';
import { Chip } from '@mui/material';
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

const CRM_BOARD_TYPES: API.BoardType[] = ['Contacts', 'Companies', 'Opportunities', 'Tasks', 'Products', 'OptOut'];
const KNOWLEDGE_HUB_BOARD_TYPE: API.BoardType = 'KnowledgeHub';

type BoardCategoryTab = 'databoards' | 'knowledge_hub';

const DataboardSelection = ({
    onClose,
    onModify,
    initialBoardId,
    hideInternalTabs,
    hideBackButton,
    forceCategory,
    formFieldName,
}: {
    onClose: () => void;
    onModify: (boardId: string) => void;
    initialBoardId?: string;
    hideInternalTabs?: boolean;
    hideBackButton?: boolean;
    forceCategory?: BoardCategoryTab;
    formFieldName?: string;
}) => {
    const { t } = useTranslation();
    const tableRef = useRef<FlexibleTableRef<API.BoardItem>>(null);
    const [globalSearch, setGlobalSearch] = useState<string>();
    const [isEnableModifyButton, setIsEnableModifyButton] = useState<boolean>(false);
    const [currentTab, setCurrentTab] = useState<string>(initialBoardId || '');
    const [highlighItem, setHighlighItem] = useState<boolean>(false);
    const [categoryTab, setCategoryTab] = useState<BoardCategoryTab>(forceCategory || 'databoards');
    const [savedColumnState, setSavedColumnState] = useState<{
        columnSizing: ColumnSizingState;
        columnOrder: ColumnOrderState;
    }>({
        columnSizing: {},
        columnOrder: [],
    });
    const [boardStatusNoti, setBoardStatusNoti] = useState<string>('');

    const { watch } = useFormContext();
    const currentBoardSelected = (watch(formFieldName || 'board_ids') as string[] | undefined) || [];

    const { data: boards, refetch } = useBoards({
        types: '',
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
        if (forceCategory) return;
        if (initialBoardId && boards && boards.length > 0) {
            const initialBoard = boards.find((b) => b.id === initialBoardId);
            if (initialBoard?.type === KNOWLEDGE_HUB_BOARD_TYPE) {
                setCategoryTab('knowledge_hub');
            } else {
                setCategoryTab('databoards');
            }
        }
    }, [initialBoardId, boards, forceCategory]);

    const filteredBoards = useMemo(() => {
        if (!boards) return [] as API.Board[];
        if (categoryTab === 'knowledge_hub') {
            return boards.filter((b) => b.type === KNOWLEDGE_HUB_BOARD_TYPE);
        }
        return boards.filter(
            (b) =>
                !b.type ||
                (!CRM_BOARD_TYPES.includes(b.type) && b.type !== KNOWLEDGE_HUB_BOARD_TYPE),
        );
    }, [boards, categoryTab]);

    useEffect(() => {
        if (filteredBoards.length > 0) {
            setIsEnableModifyButton(true);
            const tabExistsInFiltered = filteredBoards.some((b) => b.id === currentTab);
            if (!currentTab || !tabExistsInFiltered) {
                setCurrentTab(filteredBoards[0].id);
                tableRef.current?.reset();
            }
        } else {
            setIsEnableModifyButton(false);
            setCurrentTab('');
        }
    }, [filteredBoards]);

    useEffect(() => {
        if (boards && boards.length > 0 && currentBoardSelected.includes(boards[0].id)) {
            setBoardStatusNoti(t('ai_assistant_management_knowledge_support_folder_be_selected', {
                type: 'board',
            }));
        }
    }, [boards, currentBoardSelected]);

    useEffect(() => {
        setHighlighItem(currentBoardSelected.includes(currentTab));
    }, [currentTab, currentBoardSelected]);


    const columns: Columns<API.BoardItem> = useMemo(() => {
        if (currentBoard) {
            return [
                {
                    accessorKey: 'rowIndex',
                    id: 'rowIndex',
                    header: 'No.',
                    enableColumnFilter: false,
                    enablePinning: true,
                    enableEditing: false,
                    enableResizing: false,
                    enableSorting: true,
                    minSize: 130,
                    cell: ({ row, table, isHover }: { row: Row<API.BoardItem>; table: Table<API.BoardItem>; isHover: boolean }) => {
                        return (
                            <Space size={12} align="center" justify="start" onClick={(e) => e.stopPropagation()}>
                                <Typography style={{ marginLeft: 23 }}>
                                    {row.index + 1 + table.getState().pagination.pageSize * table.getState().pagination.pageIndex}
                                </Typography>
                            </Space>
                        );
                    },
                    meta: {
                        cellStyle: {
                            padding: 0,
                        },
                        headerStyle: {
                            display: 'flex',
                            justifyContent: 'end',
                        },
                    },
                },
                // ...(currentBoardRef?.current?.show_id ? [{
                //     accessorKey: 'recordId',
                //     id: 'recordId',
                //     header: 'Record ID',
                //     enableColumnFilter: false,
                //     enablePinning: true,
                //     enableEditing: false,
                //     enableResizing: false,
                //     enableSorting: false,
                //     minSize: 350,
                //     cell: ({ row }: { row: Row<API.BoardItem> }) => {
                //         return (
                //             <Typography >
                //                 {row.original._id}
                //             </Typography>
                //         );
                //     },
                //     meta: {
                //         cellStyle: {
                //             paddingLeft: '11px',
                //         },
                //         headerStyle: {
                //             width: '100%',
                //             display: 'flex',
                //             justifyContent: 'start',
                //         },
                //     },
                // }] : []),
                ...(currentBoard.fields
                    .filter((field) => !field.hidden || globalSearch)
                    .map((field) => {
                        const valueEnum = field.data?.reduce((prev, current) => {
                            return {
                                ...prev,
                                [current._id]: current.value,
                            };
                        }, {});

                        return {
                            accessorKey: field._id,
                            id: field._id,
                            header: () => field.name,
                            tooltip: field.description,
                            type: field.type,
                            bordered: !field.is_identifier,
                            enableColumnFilter: DefaultFilterField[currentBoard.type]
                                ? DefaultFilterField[currentBoard.type].indexOf(field?.default_field_name as string) !== -1
                                : false,
                            enableSorting: true,
                            ...(field.type === 'Assignee' && {
                                cell: ({ cell }) => {
                                    let displayName = (cell.getValue() as Record<string, string>)?.display_name;
                                    if (typeof cell.getValue() === 'string') {
                                        const users = queryClient.getQueryData<API.User[]>([
                                            'FlexibleTable',
                                            { type: 'Assignee', fieldId: field._id },
                                        ]);
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
                            ...(field.type === 'MultipleAssignee' && {
                                cell: ({ cell }) => {
                                    const users = queryClient.getQueryData<API.User[]>([
                                        'FlexibleTable',
                                        { type: 'MultipleAssignee', fieldId: field._id },
                                    ])
                                    const value = cell.getValue() as Record<string, string>[];
                                    let valueToDisplay: string[] = [];
                                    if (Array.isArray(value)) {
                                        valueToDisplay = value.map((v) => {
                                            if (typeof v === 'object' && v.display_name) {
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
                            ...(field.type === 'Country' && {
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
                            ...(field.type === 'Phone' && {
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
                            ...(field.type === 'RichText' && {
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
                            ...((field.type === 'SingleSelection' ||
                                field.type === 'MultipleSelection' ||
                                field.type === 'Priority' ||
                                field.type === 'MultipleAssignee') && {
                                enum: valueEnum,
                            }),
                            ...(field.type === 'MultipleSelection' && {
                                enableSorting: false,
                                request: () =>
                                    field.data?.map((field) => ({
                                        text: field.value,
                                        value: field._id,
                                    })),
                            }),
                            ...(field.type === 'Origin' && {
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

                                    const iconType: Record<API.ProductType, keyof typeof channelIconMapping> = {
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
                                                            : iconType[dataType as API.ProductType]
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
                            ...(field.type === 'ShortText' && {
                                validate: (value?: string) => {
                                    if (value && value.length > 150) {
                                        return t('crm_field_short_text_length_limit');
                                    }
                                    return true;
                                },
                            }),
                            ...(field.is_identifier && {
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
                                ...(field?.default_field_name === 'birthday' && { minDate: dayjs(new Date(0)) }),
                                ...(field?.default_field_name === 'stage' && {
                                    disabled: (record: API.BoardItem) => {
                                        return record[field._id as keyof API.BoardItem] === 'Unidentified Lead';
                                    },
                                    disabledTooltip: t('crm_field_stage_disabled_desc'),
                                }),
                                ...(field?.default_field_name === 'created_at' && {
                                    disabled: (record: API.BoardItem) => {
                                        return record.created_type === 'system';
                                    },
                                    disabledTooltip: t('crm_system_data_disabled_edit_desc'),
                                }),
                                ...(field.type === 'Origin' && {
                                    disabled: (record: API.BoardItem) => {
                                        return record.created_type === 'system';
                                    },
                                    disabledTooltip: t('origin_system_filled_tooltip'),
                                }),
                                ...(field.type === 'Assignee' && {
                                    querySelect: (users: API.User[]) => {
                                        return users.map((user) => ({
                                            value: user.id,
                                            text: user.display_name,
                                        }));
                                    },
                                }),
                                ...(field.type === 'MultipleAssignee' && {
                                    querySelect: (users: API.User[]) => {
                                        return users.map((user) => ({
                                            value: user.id,
                                            text: user.display_name,
                                        }));
                                    },
                                }),
                            },
                            meta: {
                                identifier: field.is_identifier,
                                defaultFieldName: field.default_field_name,
                                disableOrdering: field.is_identifier,
                                boardType: currentBoard.type,
                                // onExpand: (e, { rowId, target, value, onClose, extraProps }) => {
                                //     if (
                                //         (field.type === 'MultipleSelection' ||
                                //             field.type === 'LongText' ||
                                //             field.type === 'Attachment' ||
                                //             field.type === 'Notes') &&
                                //         target
                                //     ) {
                                //         openFieldPopover({
                                //             anchorEl: target,
                                //             title: field.name,
                                //             type: field.type,
                                //             valueEnum,
                                //             initialValue: value,
                                //             onClose,
                                //             boardType: currentBoard.type,
                                //             extraProps,
                                //             updateData: async (updatedValue) => {
                                //                 if (currentBoard?._id) {
                                //                     const updateData = { columnId: field._id, value: updatedValue, id: rowId };
                                //                     tableRef.current?.handleDataUpdate(updateData);
                                //                 }
                                //             },
                                //         });
                                //         return;
                                //     }
                                //     if (!currentBoard) return;
                                // },
                                ...(field.type === ('MultipleSelection' || 'MultipleAssignee') && {
                                    cellStyle: {
                                        padding: '7px 12px',
                                    },
                                }),
                                ...(field.type === 'RichText' && {
                                    cellStyle: {
                                        padding: '0',
                                        paddingLeft: '11px',
                                    },
                                }),
                                ...(field.type === 'Phone' && {
                                    defaultCountryCode: field.settings?.default_country_code,
                                }),
                                ...(field.type === 'Link' && {
                                    cellStyle: {
                                        padding: 0,
                                        paddingLeft:
                                            field.default_field_name === 'contact_record' ||
                                                field.default_field_name === 'opportunity_record'
                                                ? '8.5px'
                                                : 0,
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                    },
                                }),
                                ...(field.type === 'Origin' && {
                                    cellStyle: {
                                        padding: '4px 11px',
                                    },
                                }),
                                fieldData: field,
                                ...(field.type === 'Notes' && {
                                    cellStyle: {
                                        padding: '0 12px',
                                    },
                                }),
                                ...(field.type === 'Currency' && {
                                    defaultCurrencyCode: field.settings?.default_currency_code,
                                }),
                                // ...(field.type === 'MultipleSelection' && {
                                //     footer: (
                                //         <Space style={{ paddingTop: '8px', paddingRight: '6px', paddingLeft: '6px' }}>
                                //             <Button
                                //                 onClick={() => {
                                //                     openFieldForm(field);
                                //                 }}
                                //                 variant="link"
                                //                 size="s"
                                //                 text={t('fields_management_row_add_option')}
                                //                 startIcon={<Icon name="add" />}
                                //             />
                                //         </Space>
                                //     ),
                                // }),
                            },
                        };
                    }) as Columns<API.BoardItem>),
            ];
        }
        return [];
    }, [currentBoard, t, globalSearch]);

    // const columns: Columns<AttachmentRecord> = useMemo(() => {
    //     if (currentBoard) {
    //         return [
    //             {
    //                 id: 'fileName',
    //                 accessorKey: 'fileName',
    //                 header: t('ai_assistant_management_knowledge_support_board_filename'),
    //                 enableSorting: true,
    //                 enableEditing: false,
    //                 cell: ({ row }) => (
    //                     <Space style={{ marginLeft: '8px' }} justify="start" align="center">
    //                         <Icon name={getIconName(row.original.extension)} style={{ width: '24px', height: '24px', color: '#828282' }} />
    //                         <Space style={{ marginLeft: '8px' }} direction="vertical" justify="start" align="start" size={0}>
    //                             <Typography>{row.original.fileName}</Typography>
    //                             <Typography style={{ color: '#828282' }}>
    //                                 {row.original.sizeInBytes ? `${(row.original.sizeInBytes / 1024).toFixed(1)} KB` : ''}
    //                             </Typography>
    //                         </Space>
    //                     </Space>
    //                 ),
    //                 meta: {
    //                     cellStyle: {
    //                         padding: 0,
    //                     },
    //                     headerStyle: {
    //                         display: 'flex',
    //                         justifyContent: 'start',
    //                     },
    //                 },
    //             },
    //             {
    //                 id: 'uploadedBy',
    //                 accessorKey: 'uploadedBy',
    //                 header: t('ai_assistant_management_knowledge_support_board_upload_by'),
    //                 enableSorting: true,
    //                 enableEditing: false,
    //                 maxSize: 200,
    //                 cell: ({ row }) => <Typography>{row.original.uploadedBy}</Typography>,
    //             },
    //             {
    //                 id: 'updatedAt',
    //                 accessorKey: 'updatedAt',
    //                 header: t('ai_assistant_management_knowledge_support_board_last_updated'),
    //                 enableSorting: true,
    //                 enableEditing: false,
    //                 maxSize: 200,
    //                 cell: ({ row }) => (
    //                     <Typography>
    //                         {dayjs(row.original.updatedAt).isValid() 
    //                             ? dayjs(row.original.updatedAt).format('YYYY-MM-DD HH:mm')
    //                             : ''}
    //                     </Typography>
    //                 ),
    //             },
    //         ];
    //     }
    //     return [];
    // }, [currentBoard, t, globalSearch]);

    const fetchRecords = useCallback(async (params: RequestParameters, signal?: AbortSignal) => {
        if (currentBoardRef.current) {
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

            try {
                const { data } = await apiFetch<API.PaginatedResponse<API.BoardItem[]>>(api, method, searchParams, ImbraceClient, {
                    signal,
                });

                return {
                    data: data.data.map((boardItem) => ({ ...boardItem, id: boardItem.board_item_id || '' })),
                    meta: {
                        total: data.count,
                        skip: (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? 0),
                        limit: pagination?.pageSize ?? 20,
                    },
                };
            } catch (error) {
                console.error('Error fetching records:', error);
                return {
                    data: [],
                    meta: {
                        total: 0,
                        skip: 0,
                        limit: 20,
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
            {!hideInternalTabs && (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: 8 }}>
                    <span
                        onClick={() => setCategoryTab('databoards')}
                        style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: categoryTab === 'databoards' ? '#333333' : '#BDBDBD',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {t('ai_assistant_management_knowledge_support_tab_databoards')}
                    </span>
                </div>
            )}
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
                        onChange={(value) => {
                            if (value) {
                                setCurrentTab(value);
                            }
                            tableRef.current?.reset();
                            if (value && currentBoardSelected.includes(value)) {
                                setBoardStatusNoti(t('ai_assistant_management_knowledge_support_folder_be_selected', {
                                    type: 'board',
                                }));
                            } else {
                                setBoardStatusNoti('');
                            }
                        }}
                        queryKey={[
                            ...boardsQueryKey({
                                isDefault: undefined,
                                types: '',
                            }),
                            categoryTab,
                            ...currentBoardSelected,
                        ] as any}
                        request={boardsQueryFn({
                            isDefault: undefined,
                            types: '',
                        })}
                        querySelect={(allBoards: API.Board[]) => {
                            const filtered =
                                categoryTab === 'knowledge_hub'
                                    ? allBoards.filter((b) => b.type === KNOWLEDGE_HUB_BOARD_TYPE)
                                    : allBoards.filter(
                                          (b) =>
                                              !b.type ||
                                              (!CRM_BOARD_TYPES.includes(b.type) &&
                                                  b.type !== KNOWLEDGE_HUB_BOARD_TYPE),
                                      );
                            return filtered.map((option) => {
                                const isSelected = currentBoardSelected.includes(option._id);
                                if (isSelected) {
                                    return {
                                        text: (
                                            <span style={{ fontWeight: 800 }}>
                                                <span style={{ color: 'var(--color-green-1)' }}>({t('added')}) </span>
                                                <span style={{ color: 'var(--color-light-7)' }}>{option.name}</span>
                                            </span>
                                        ),
                                        value: option._id,
                                    };
                                }
                                return {
                                    value: option._id,
                                    text: option.name,
                                };
                            });
                        }}
                        containerStyle={{ flex: 1, minWidth: 0 }}
                    />
                    {currentBoardSelected.includes(currentTab) ? <Button
                        onClick={() => {
                            onModify(currentTab);
                            setBoardStatusNoti(t('ai_assistant_management_knowledge_support_folder_be_removed', {
                                type: 'board',
                            }));
                        }}
                        text={t('ai_assistant_management_knowledge_support_remove_from_the_list')}
                        sx={{ width: '200px', flexShrink: 0, padding: 0 }}
                        variant="outlined"
                        type='danger'
                        disabled={!isEnableModifyButton}
                    /> :
                        <Button
                            onClick={() => {
                                onModify(currentTab);
                                setBoardStatusNoti(t('ai_assistant_management_knowledge_support_folder_be_selected', {
                                    type: 'board',
                                }));
                                onClose?.();
                            }}
                            text={t('ai_assistant_management_knowledge_support_add_to_the_list')}
                            sx={{ width: '200px', flexShrink: 0, padding: 0 }}
                            variant="contained"
                            disabled={!isEnableModifyButton}
                        />
                    }
                </Space>

            </Space>
            <Space size={0} direction="vertical" align="start" className={styles.boardContainer}>
                <FlexibleTable<API.BoardItem>
                    outlined
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
            {!hideBackButton && (
                <Space>
                    <Button
                        text={t('back_to_setting')}
                        sx={{ width: '213px', padding: '0px', marginTop: '25px' }}
                        variant="outlined"
                        onClick={onClose}
                    />
                </Space>
            )}
        </div>
    );
};

export default DataboardSelection;
