import type { channelIconMapping } from '@imbrace/ui';
import { Breadcrumb, Button, Checkbox, DropdownMenuItem, EllipsisText, Icon, Space, Spin, Tooltip, Typography } from '@imbrace/ui';
import { useMutation } from '@tanstack/react-query';
import type { ColumnOrderState, ColumnSizingState, TableState } from '@tanstack/react-table';
import type { AxiosError } from 'axios';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';

import FlexibleTable from '@/components/FlexibleTable';
import type {
    AttachmentValue,
    Columns,
    FlexibleTableBaseProps,
    FlexibleTableRef,
    RequestParameters,
} from '@/components/FlexibleTable/types';
import LinkButton from '@/components/LinkButton';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import { getBoardRecords, getRelatedRecords, postBoardUpload, putBoardRecord, putUnLinkRecords } from '@/services/api/crm';
import { getMembers } from '@/services/api/user';
import { ImbraceClient, ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import Overview from '../../overview';
import type { InvalidErrorResObject, MismatchErrorResObject } from '../BoardDetailedModal/DetailModal';
import EmailContentPreview from '../emailContentPreview';
import { useFieldPopover } from '../FieldPopover';

const AssociatedRecords = ({
    currentBoard,
    currentRecord,
    relatedBoard,
    changeTitle,
    title,
    onClose: onModalClose,
    refresh,
}: {
    currentBoard: API.Board;
    currentRecord: API.BoardItem;
    relatedBoard: API.Board;
    onClose: () => void;
    changeTitle: (title: ReactNode) => void;
    title: string;
    refresh: () => void;
}) => {
    const { tab, recId } = useParams<{ tab?: string; recId?: string }>();
    const { closeModal } = (useLocation().state as { closeModal?: boolean }) || {};
    const prevTab = useRef(tab);
    const prevRecId = useRef(recId);
    const tableRef = useRef<FlexibleTableRef<API.BoardItem>>(null);
    const [step, setStep] = useState<'list' | 'detail'>('list');
    const [recordId, setRecordId] = useState<string>();
    const navigateRef = useRef(useNavigate());
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [savedColumnState, setSavedColumnState] = useState<{
        columnSizing: ColumnSizingState;
        columnOrder: ColumnOrderState;
    }>({
        columnSizing: {},
        columnOrder: [],
    });
    const [{ openFieldPopover }, fieldPopoverHolder] = useFieldPopover();

    useEffect(() => {
        if (prevTab.current !== tab || prevRecId.current !== recId) {
            onModalClose();
        }
    }, [tab, recId, onModalClose]);

    useEffect(() => {
        if (closeModal) {
            onModalClose();
        }
    }, [closeModal, onModalClose]);

    const unlinkRecord = useMutation({
        mutationFn: async (targetRecordIds: string[]) => {
            await apiFetch(putUnLinkRecords.api(currentBoard.id, currentRecord.id, relatedBoard.id), putUnLinkRecords.method, {
                ids: targetRecordIds,
            });
        },
        onSuccess: () => {
            refresh();
            tableRef.current?.refresh();
        },
        onError: () => {
            const notificationPayload = {
                message: t('error_something_went_wrong'),
                messageType: 'noti_failed',
                variant: 'error',
            };
            dispatch(pushNotification({ notification: notificationPayload }));
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
            console.log(err);
            const error = err as AxiosError<API.ErrorResponse | { data: InvalidErrorResObject[] | MismatchErrorResObject[] }>;
            if (error && error.response && error.response.data) {
                if ('message' in error.response?.data) {
                    if (error.response?.data.message.indexOf('Invalid field') !== -1) {
                        const notificationPayload = {
                            message: t('fields_management_field_not_found'),
                            messageType: 'noti_failed',
                            variant: 'error',
                        };
                        dispatch(pushNotification({ notification: notificationPayload }));

                        return;
                    }
                    if (error.response?.data.message.indexOf('Not found') !== -1) {
                        const notificationPayload = {
                            message: t('crm_record_not_found'),
                            messageType: 'noti_failed',
                            variant: 'error',
                        };
                        dispatch(pushNotification({ notification: notificationPayload }));

                        return;
                    }
                    if (error.response?.data.message.indexOf('Invalid phone number') !== -1) {
                        const notificationPayload = {
                            message: t('validation_phone_field_pattern'),
                            messageType: 'noti_failed',
                            variant: 'error',
                        };
                        dispatch(pushNotification({ notification: notificationPayload }));

                        return;
                    }
                    const notificationPayload = {
                        message: t('error_something_went_wrong'),
                        messageType: 'noti_failed',
                        variant: 'error',
                    };
                    dispatch(pushNotification({ notification: notificationPayload }));
                }
            }

            console.log(error);
        },
        onSuccess: () => {
            tableRef.current?.refresh();
            refresh();
        },
    });

    const onDataUpdate: FlexibleTableBaseProps<API.BoardItem>['onDataUpdate'] = useCallback(
        async ({ columnId, value, id }: { columnId: string; value: unknown; id: string }) => {
            if (relatedBoard?._id) {
                if (id === 'new') {
                } else {
                    let newValue = value;
                    const currentField = relatedBoard.fields.find((field) => field._id === columnId);

                    if (currentField?.type === 'Attachment' && Array.isArray(newValue)) {
                        const formData = new FormData();
                        (newValue as AttachmentValue[]).forEach((item) => {
                            if (item.extra?.file) {
                                formData.append('', item.extra.file);
                            }
                        });

                        if ([...formData.entries()].length > 0) {
                            const { data } = await apiFetch<{ name: string; extension: string; url: string; key: string }[]>(
                                postBoardUpload.api,
                                postBoardUpload.method,
                                formData,
                                ImbraceFileUpload,
                            );
                            newValue = (newValue as AttachmentValue[]).map((item) => {
                                const targetData = data.find((d) => d.name === item.data.name.split('.')[0]);
                                return {
                                    type: item.type,
                                    data: {
                                        name: item.data.name,
                                        url: targetData?.url || item.data.url,
                                        key: targetData?.key || item.data.key,
                                        extension: targetData?.extension || item.data.extension,
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
                    try {
                        const result = await updateRecord.mutateAsync({
                            boardId: relatedBoard?._id,
                            recordId: id,
                            data: [
                                {
                                    key: columnId,
                                    value: newValue,
                                },
                            ],
                        });

                        return result;
                    } catch (error) {
                        console.log(error);
                    }
                }
            }
        },
        [relatedBoard, updateRecord],
    );

    const columns: Columns<API.BoardItem> = useMemo(() => {
        if (relatedBoard) {
            return [
                {
                    accessorKey: 'rowIndex',
                    id: 'rowIndex',
                    header: ({ table }) => (
                        <div>
                            <Checkbox
                                checked={table.getIsAllPageRowsSelected()}
                                indeterminate={table.getIsSomeRowsSelected()}
                                onChange={(checked) => table.toggleAllRowsSelected(checked)}
                            />
                        </div>
                    ),
                    enableColumnFilter: false,
                    enablePinning: true,
                    enableEditing: false,
                    enableResizing: false,
                    minSize: 56,
                    cell: ({ row, table, isHover }) => {
                        if (isHover) {
                            if (!row.getCanSelect()) {
                                return (
                                    <Tooltip placement="top" arrow title={t('databoard_disabled_checkbox_tooltip')}>
                                        <div>
                                            <Checkbox
                                                disabled={!row.getCanSelect()}
                                                checked={row.getIsSelected()}
                                                onChange={row.getToggleSelectedHandler()}
                                            />
                                        </div>
                                    </Tooltip>
                                );
                            }
                            if (row.getCanSelect()) {
                                return (
                                    <Checkbox
                                        disabled={!row.getCanSelect()}
                                        checked={row.getIsSelected()}
                                        onChange={row.getToggleSelectedHandler()}
                                    />
                                );
                            }
                        }
                        if (row.getIsSelected()) {
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
                ...(relatedBoard.fields
                    .filter((field) => !field.hidden)
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
                            enableColumnFilter: false,
                            enableSorting: true,
                            ...(field.type === 'Assignee' && {
                                cell: ({ cell }) => {
                                    const displayName = (cell.getValue() as Record<string, string>)?.display_name;
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
                            ...((field.type === 'SingleSelection' || field.type === 'MultipleSelection' || field.type === 'Priority') && {
                                enum: valueEnum,
                            }),
                            ...(field.type === 'MultipleSelection' && {
                                enableSorting: false,
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
                            },

                            meta: {
                                identifier: field.is_identifier,
                                defaultFieldName: field.default_field_name,
                                disableOrdering: field.is_identifier,
                                onExpand: (e, { rowId, target, value, onClose, extraProps }) => {
                                    e.stopPropagation();
                                    if (
                                        (field.type === 'MultipleSelection' ||
                                            field.type === 'LongText' ||
                                            field.type === 'Attachment' ||
                                            field.type === 'Notes') &&
                                        target
                                    ) {
                                        openFieldPopover({
                                            anchorEl: target,
                                            title: field.name,
                                            type: field.type,
                                            valueEnum,
                                            initialValue: value,
                                            onClose,
                                            extraProps,
                                            updateData: async (updatedValue) => {
                                                if (relatedBoard?._id) {
                                                    const updateData = { columnId: field._id, value: updatedValue, id: rowId };
                                                    const result = await onDataUpdate(updateData);

                                                    if (result) {
                                                        tableRef.current?.cacheMutation({
                                                            operation: 'Update',
                                                            record: result,
                                                        });
                                                    }
                                                }
                                            },
                                        });
                                        return;
                                    }
                                    setStep('detail');
                                    setRecordId(rowId);
                                    changeTitle(
                                        <Space size={12} onClick={(event) => event.stopPropagation()}>
                                            <Typography style={{ fontWeight: 700, color: 'var(--color-light-5)' }}>{title}</Typography>
                                            <Breadcrumb
                                                items={[
                                                    {
                                                        title: t('associated_records'),
                                                        path: 'list',
                                                        onClick: (event) => {
                                                            event.stopPropagation();
                                                            changeTitle(
                                                                <Typography style={{ fontWeight: 700, color: 'var(--color-light-5)' }}>
                                                                    {title}
                                                                </Typography>,
                                                            );
                                                            setStep('list');
                                                        },
                                                    },
                                                    {
                                                        title: t('detailed_records'),
                                                        path: 'detail',
                                                    },
                                                ]}
                                                isActive={(path) => path === 'detail'}
                                                separator={<Icon name="forwardIos" />}
                                            />
                                            <Button
                                                variant="link"
                                                text={t('open_in_fullscreen')}
                                                size="xs"
                                                endIcon={<Icon name="openInFull" />}
                                                onClick={() => {
                                                    navigateRef.current(`/crm/${relatedBoard.id}/${rowId}`);
                                                }}
                                                sx={{
                                                    padding: 0,
                                                    fontWeight: 400,
                                                    fontSize: 12,
                                                    lineHeight: '16px',
                                                    gap: '4px',
                                                }}
                                            />
                                        </Space>,
                                    );

                                    return;
                                },
                                ...(field.type === 'MultipleSelection' && {
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
                            },
                        };
                    }) as Columns<API.BoardItem>),
            ];
        }
        return [];
    }, [relatedBoard, onDataUpdate, t, openFieldPopover, changeTitle, title]);

    const fetchRecords = useCallback(
        async (params: RequestParameters, signal?: AbortSignal) => {
            const { pagination, sorters } = params;
            const searchParams = new URLSearchParams();
            const api = getRelatedRecords.api(currentBoard._id, currentRecord._id, relatedBoard._id);
            const method: 'GET' | 'POST' = getBoardRecords.method;
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
                    data: data.data.map((boardItem) => ({ ...boardItem, id: boardItem._id, ...boardItem.fields })),
                    meta: {
                        total: data.count,
                        skip: (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? 0),
                        limit: pagination?.pageSize ?? 20,
                    },
                };
            } catch (error) {
                return {
                    data: [],
                    meta: {
                        total: 0,
                        skip: 0,
                        limit: 20,
                    },
                };
            }
        },
        [currentBoard, currentRecord, relatedBoard],
    );

    const emptyMessage = (tableState: Partial<TableState>) => {
        return (
            <Typography variant="SubHeading2">
                <Trans i18nKey="crm_list_empty">
                    <LinkButton
                        onClick={() => {
                            tableRef.current?.addNewRecord();
                        }}
                    >
                        Create your first record now
                    </LinkButton>{' '}
                    \n and start to scale the business!
                </Trans>
            </Typography>
        );
    };

    const columnSizing = useMemo(() => {
        const sizing = localStorage.getItem(`${relatedBoard?._id}-Sizing`);
        return sizing ? JSON.parse(sizing) : savedColumnState.columnSizing || {};
    }, [relatedBoard?._id, savedColumnState]);

    const columnOrder = useMemo(() => {
        const order = localStorage.getItem(`${relatedBoard?._id}-Order`);
        return order ? JSON.parse(order) : savedColumnState.columnOrder || [];
    }, [relatedBoard?._id, savedColumnState]);

    return (
        <div style={{ height: '100%', width: '100%' }}>
            {fieldPopoverHolder}
            {step === 'list' && (
                <FlexibleTable<API.BoardItem>
                    ref={tableRef}
                    queryKey={['associatedRecords', relatedBoard?._id]}
                    columns={columns}
                    request={fetchRecords}
                    // globalFilter={globalSearch}
                    columnResizable
                    columnOrderChangeable
                    columnOrder={columnOrder}
                    columnSizing={columnSizing}
                    onColumnOrderChange={(order) => {
                        if (relatedBoard) {
                            localStorage.setItem(`${relatedBoard?._id}-Order`, JSON.stringify(order));
                            setSavedColumnState((prev) => ({
                                ...prev,
                                columnOrder: order,
                            }));
                        }
                    }}
                    onColumnSizingChange={(sizing) => {
                        if (relatedBoard) {
                            localStorage.setItem(`${relatedBoard?._id}-Sizing`, JSON.stringify(sizing));
                            setSavedColumnState((prev) => ({
                                ...prev,
                                columnSizing: sizing,
                            }));
                        }
                    }}
                    enableRowSelection={(row) => row.original.created_type === 'manual'}
                    isDataDeletable={(row) => {
                        return row.created_type === 'manual';
                    }}
                    deleteTooltip={(row) => {
                        if (row.created_type !== 'manual') {
                            return t('crm_record_not_deletable');
                        }
                    }}
                    // onDataDelete={onDataDelete}
                    onDataUpdate={onDataUpdate}
                    emptyImage={(tableState) =>
                        tableState.globalFilter || (tableState.columnFilters && tableState.columnFilters?.length > 0)
                            ? 'fileSearch'
                            : undefined
                    }
                    emptyMessage={emptyMessage}
                    showFilter={false}
                    paginationStyle={{
                        padding: '0 32px',
                        marginBottom: '32px',
                    }}
                    customContextMenu={(row, rowSelection) => {
                        const isMultipleSelection = rowSelection ? Object.keys(rowSelection).length > 1 : false;
                        const text = isMultipleSelection && row.getIsSelected() ? t('remove_associations') : t('remove_association');

                        return (
                            <DropdownMenuItem
                                onClick={() => {
                                    unlinkRecord.mutate(
                                        isMultipleSelection && row.getIsSelected() && rowSelection
                                            ? Object.keys(rowSelection)
                                            : [row.original.id],
                                    );
                                }}
                                sx={{
                                    position: 'relative',
                                    color: 'var(--color-danger-1)',
                                }}
                                disabled={unlinkRecord.isPending}
                            >
                                <Spin isSpinning={unlinkRecord.isPending}>
                                    <Typography>{text}</Typography>
                                </Spin>
                            </DropdownMenuItem>
                        );
                    }}
                />
            )}
            {step === 'detail' && recordId && <Overview inModal boardId={relatedBoard._id} recordId={recordId} disableRelation />}
        </div>
    );
};

export default AssociatedRecords;
