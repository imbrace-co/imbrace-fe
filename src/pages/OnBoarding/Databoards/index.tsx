import type { channelIconMapping } from '@imbrace/ui';
import { Button, Checkbox, EllipsisText, Icon, Space, Typography, useDialog } from '@imbrace/ui';
import { Divider } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import type { ColumnOrderState, ColumnSizingState, Row, TableState } from '@tanstack/react-table';
import type { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FlexibleTable from '@/components/FlexibleTable';
import type {
    AttachmentValue,
    Columns,
    FlexibleTableBaseProps,
    FlexibleTableRef,
    RequestParameters,
} from '@/components/FlexibleTable/types';
import LinkButton from '@/components/LinkButton';
import type { InvalidErrorResObject, MismatchErrorResObject } from '@/pages/Databoards/components/BoardDetailedModal/DetailModal';
import EmailContentPreview from '@/pages/Databoards/components/emailContentPreview';
import { useFieldPopover } from '@/pages/Databoards/components/FieldPopover';
import { useRecordDetail } from '@/pages/Databoards/components/RecordDetail/modal';
import { FieldSchema } from '@/pages/Databoards/components/BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';
import OperationFieldForm, { FieldType } from '@/pages/Databoards/components/BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';
import { BoardSetting } from '@/pages/Databoards/components/BoardSetting';
import { FilterContent } from '@/pages/Databoards/components/FilterContent';
import type { SearchBarRef } from '@/pages/Databoards/searchBar';
import RecordDetailsIcon from '@/assets/icons/icon_record_details.svg?react';
import Extra from './extra';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import {
    deleteBoardRecord,
    deleteBoardRecords,
    getBoardRecords,
    postBoardRecord,
    postBoardUpload,
    putBoardField,
    putBoardRecord,
    searchBoardRecord,
} from '@/services/api/crm';
import { getMembers } from '@/services/api/user';
import { ImbraceClient, ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { boardsQueryKey, useBoards } from '@/services/queries/board';
import { getFilterQuery } from '@/pages/Databoards/utils';
import useSegmentation from '@/pages/Databoards/hooks/useSegmentation';
import { useFilter } from '@/pages/Databoards/hooks/useFilter';
import { useNotify } from '@/contexts/SnackbarContext';
import { FormProvider } from 'react-hook-form';
import { queryClient } from '@/App';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import { dummyBoardItems, dummyBoards, dummyCRMBoards } from './mock';
import { dummyCRMBoardItems } from './mock';

const DefaultFilterField: Record<API.BoardType, string[]> = {
    Contacts: ['stage', 'gender', 'location', 'last_seen'],
    Companies: ['location', 'size', 'industry', 'tags'],
    Opportunities: ['stage', 'owner', 'priority', 'last_contact'],
    Tasks: ['status', 'assignee', 'priority', 'due_date'],
    Products: ['tags', 'unit_price'],
    General: [],
    OptOut: ['service_id', 'service', 'name'],
    System: [],
    KnowledgeHub: [],
    DocumentAI: [],
};

const Databoards = ({ crm, knowledgeHub }: { crm?: boolean; knowledgeHub?: boolean }) => {
    const { t } = useTranslation();
    const { tab, recId } = useParams<{ tab?: string; recId?: string }>();
    const [{ dialog, dialogForm }, dialogHolder] = useDialog();
    const tableRef = useRef<FlexibleTableRef<API.BoardItem>>(null);
    const navigate = useNavigate();
    const navigateRef = useRef(navigate);
    const searchBarRef = useRef<SearchBarRef>(null);
    const dispatch = useAppDispatch();
    const [globalSearch, setGlobalSearch] = useState<string>();
    const [currentTab, setCurrentTab] = useState<string>(tab ?? '');
    const [savedColumnState, setSavedColumnState] = useState<{
        columnSizing: ColumnSizingState;
        columnOrder: ColumnOrderState;
    }>({
        columnSizing: {},
        columnOrder: [],
    });

    const [{ openFieldPopover }, fieldPopoverHolder] = useFieldPopover();
    const [{ openRecordDetail }, recordDetailHolder] = useRecordDetail({ isDocumentAIRoute: false });
    const boards = crm ? dummyCRMBoards : dummyBoards;

    const onNewBoard = () => {
        dialog({
            title: t('board_create_new_header'),
            paperSx: {
                width: '80%',
                maxWidth: '800px',
            },
            content: ({ onClose }) => {
                return (
                    <BoardSetting
                        board={undefined}
                        onClose={onClose}
                        navigateRef={navigateRef}
                        crm={crm}
                        setCurrentTab={setCurrentTab}
                        tableRef={tableRef}
                    />
                );
            },
            confirmText: t('save'),
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: false,
            actionsAlign: 'flex-start',
        });
    };

    const { notify, closeSnackbar } = useNotify();

    const createRecord = useMutation({
        mutationFn: async (params: { boardId: string; fields: { board_field_id: string; value: unknown }[] }) => {
            const { data: record } = await apiFetch<API.BoardItem>(postBoardRecord.api(params.boardId), postBoardRecord.method, {
                fields: params.fields,
            });
            return { ...record, ...record.fields } as unknown as API.BoardItem;
        },
        onSuccess: () => {
            tableRef.current?.resetPagination();
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
        onError: (err, variables) => {
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
            // tableRef.current?.refresh();
        },
    });

    const deleteRecord = useMutation({
        mutationFn: async (params: { boardId: string; recordId: string | string[] }) => {
            if (Array.isArray(params.recordId)) {
                await apiFetch(deleteBoardRecords.api(params.boardId), deleteBoardRecords.method, { ids: params.recordId }, ImbraceClient);
            } else {
                await apiFetch(deleteBoardRecord.api(params.boardId, params.recordId), deleteBoardRecord.method);
            }
            return true;
        },
        onSuccess: (data, variables) => {
            const { recordId } = variables;
            if (Array.isArray(recordId)) {
                tableRef.current?.removeRowSelection(recordId);
            } else {
                tableRef.current?.removeRowSelection([recordId]);
            }
        },
        onError: () => {
            return false;
        },
    });

    const currentBoardRef = useRef<API.Board>();

    const currentBoard = useMemo(() => {
        if (currentTab && boards) {
            currentBoardRef.current = boards.filter((board) => board.id === currentTab)[0];
            return boards.filter((board) => board.id === currentTab)[0];
        }
        return undefined;
    }, [currentTab, boards]);

    console.log('currentBoard:: ', currentBoard);

    const getMemberOptionRequest = useCallback(async () => {
        const { data } = await apiFetch<API.User[]>(getMembers.api, getMembers.method, {
            status: 'active',
        });
        return data.map((user) => ({
            value: user.id,
            text: user.display_name,
        }));
    }, []);

    const { selectedSegmentation, setSelectedSegmentation, applyFilters, selectSegmentationDialog, createUpdateSegmentationDialog } =
        useSegmentation({
            currentBoard,
            tableRef,
            dialog,
            getMemberOptionRequest,
        });

    const { isFilterVisible, setIsFilterVisible, filterCount, setFilterCount, onFilterChange, resetFilters } = useFilter(tableRef);


    const replaceUrl = useCallback(async () => {
        if (boards.length >= 1) {
            if (knowledgeHub) {
                navigate(`/knowledge-hub-all/${boards[0]?._id}`, { replace: true });
            } else {
                navigate(`/${crm ? 'crm' : 'databoards'}/${boards[0]?._id}`, { replace: true });
            }
            setCurrentTab(boards[0]?._id);
        }
    }, [navigate, boards, crm]);

    const onDataUpdate: FlexibleTableBaseProps<API.BoardItem>['onDataUpdate'] = useCallback(
        async ({ columnId, value, id }: { columnId: string; value: unknown; id: string }) => {
            if (currentBoard?._id) {
                let newValue = value;
                const currentField = currentBoard.fields.find((field) => field._id === columnId);

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
                        boardId: currentBoard?._id,
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
        },
        [currentBoard, createRecord, updateRecord],
    );

    const handleToggleRowCheckbox = useCallback(() => {
        closeSnackbar();
        // Use setTimeout to ensure get the latest selected rows after state update
        setTimeout(() => {
            const selectedRows = tableRef.current?.getSelectedRows || [];
            if (selectedRows.length === 1) {
                notify({
                    icon: <></>,
                    type: 'warning',
                    message: (
                        <Space direction="horizontal">
                            <Typography>{t('crm_delete_or_edit_record_confirm')}</Typography>
                            <Space style={{ marginLeft: '80px' }}>
                                <Button
                                    size="xs"
                                    sx={{
                                        width: '80px',
                                    }}
                                    variant="contained"
                                    text={t('edit')}
                                    onClick={() => {
                                        if (currentBoard) {
                                            openRecordDetail({
                                                board: currentBoard,
                                                recordId: selectedRows[0].original._id,
                                                isEdit: true,
                                                tableRef,
                                            });
                                        }
                                    }}
                                />
                                <Button
                                    size="xs"
                                    sx={{
                                        width: '80px',
                                    }}
                                    type="danger"
                                    variant="outlined"
                                    text={t('delete')}
                                    onClick={() => {
                                        tableRef.current?.handleDataDelete(selectedRows[0].original._id);
                                    }}
                                />
                            </Space>
                        </Space>
                    ),
                    customAnchor: {
                        vertical: 'bottom',
                        horizontal: 'right',
                    },
                    persist: true,
                });
            } else if (selectedRows.length > 1) {
                notify({
                    icon: <></>,
                    type: 'warning',
                    message: (
                        <Space direction="horizontal">
                            <Typography>{t('crm_delete_multiple_records_confirm')}</Typography>
                            <Space style={{ marginLeft: '140px' }}>
                                <Button
                                    size="xs"
                                    sx={{
                                        width: '80px',
                                    }}
                                    type="danger"
                                    variant="contained"
                                    text={t('delete')}
                                    onClick={() => {
                                        tableRef.current?.handleDataDelete(selectedRows.map((row: any) => row.original._id));
                                    }}
                                />
                            </Space>
                        </Space>
                    ),
                    customAnchor: {
                        vertical: 'bottom',
                        horizontal: 'right',
                    },
                    persist: true,
                });
            }
        }, 100);
    }, [notify, currentBoard]);

    const updateField = useMutation({
        mutationFn: async (params: { boardId: string; fieldId: string; data: FieldType & { hidden: boolean } }) => {
            const { data } = await apiFetch<API.Board>(
                putBoardField.api(params.boardId, params.fieldId),
                putBoardField.method,
                params.data,
            );

            return data;
        },
        onSuccess: async () => {
            queryClient.refetchQueries({ queryKey: boardsQueryKey({ isDefault: knowledgeHub ? undefined : !!crm, types: knowledgeHub ? 'KnowledgeHub' : undefined }) });
        },
    });

    const openFieldForm = useCallback(
        (field: API.BoardField) => {
            if (currentBoard) {
                dialogForm<FieldType>({
                    title: t('fields_management_form_header_new'),
                    content: (methods) => (
                        <FormProvider {...methods}>
                            <OperationFieldForm
                                boardType={currentBoard.type}
                                boardField={{ ...field, is_default: true }}
                                boardName={currentBoard.name}
                                methods={methods}
                            />
                        </FormProvider>
                    ),
                    confirmText: t('update'),
                    defaultValues: {
                        ...field,
                        type: 'MultipleSelection',
                        data: field?.data && field?.data.length > 0 ? field?.data : undefined,
                    },
                    actionsAlign: 'flex-start',
                    showUnsavedDialog: true,
                    showCloseButton: true,
                    hideCancelButton: true,
                    onClose: async () => {},
                    onConfirm: async (formData, methods) => {
                        try {
                            const { name, type, description, settings, data } = formData;

                            await updateField.mutateAsync({
                                boardId: currentBoard._id,
                                fieldId: field._id,
                                data: {
                                    name,
                                    description,
                                    type,
                                    hidden: false,
                                    data,
                                    settings,
                                },
                            });
                            return true;
                        } catch (error) {
                            const err = error as AxiosError;
                            if (err.response?.status === 409 && err.response?.data?.message.includes('Field name cannot be duplicated')) {
                                methods?.setError('name', {
                                    type: 'value',
                                    message: t('fields_management_form_duplicate_name'),
                                });
                                return false;
                            }
                            if (err.response?.data.message === 'field not found') {
                                const notificationPayload = {
                                    message: t('fields_management_field_not_found'),
                                    messageType: 'noti_failed',
                                    variant: 'error',
                                };
                                dispatch(pushNotification({ notification: notificationPayload }));
                                return true;
                            }
                            if (err.response?.status === 409 && err.response?.data?.message === 'Value cannot be duplicated') {
                                return false;
                            }
                            return false;
                        }
                    },
                    confirmButtonProps: {
                        sx: {
                            minWidth: '160px',
                            height: '40px',
                        },
                    },
                    schema: FieldSchema({
                        t,
                        existFields: currentBoard?.fields.filter((field) => field._id !== field._id),
                        checkDuplicate: true,
                    }),
                });
            }
        },
        [currentBoard],
    );

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
                    minSize: 130, // Increased to accommodate both checkbox and icons
                    cell: ({ row, table, isHover }) => {
                        const rows = tableRef.current?.getRowModel().rows;
                        return (
                            <Space size={12} align="center" justify="start" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                    disabled={!row.getCanSelect()}
                                    checked={row.getIsSelected()}
                                    onChange={(e) => {
                                        row.getToggleSelectedHandler()(e);
                                        handleToggleRowCheckbox();
                                    }}
                                    {...(!row.getCanSelect() && {
                                        tooltip: t('databoard_disabled_checkbox_tooltip'),
                                        tooltipProps: { placement: 'top', arrow: true },
                                    })}
                                />

                                {isHover ? (
                                    <Space size={12} style={{ marginLeft: 6 }} align="center" justify="start">
                                        <RecordDetailsIcon
                                            onClick={() => {
                                                if (crm) {
                                                    navigateRef.current(`/crm/${currentBoard.id}/${row.id}`);
                                                    return;
                                                }
                                                openRecordDetail({
                                                    board: currentBoard,
                                                    recordId: row.original._id,
                                                    isEdit: false,
                                                    boardData: rows?.map((row) => row.original),
                                                    tableRef,
                                                    onClose: () => {
                                                        navigate(`/${knowledgeHub ? 'knowledge-hub' : crm ? 'crm' : 'databoards'}/${currentBoard?.id}`, {
                                                            replace: true,
                                                        });
                                                    },
                                                });
                                            }}
                                            style={{ fontSize: 24, cursor: 'pointer', marginRight: 13 }}
                                        />
                                        <Icon
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openRecordDetail({
                                                    board: currentBoard,
                                                    recordId: row.original._id,
                                                    boardData: rows?.map((row) => row.original),
                                                    isEdit: true,
                                                    tableRef,
                                                    onClose: () => {
                                                        navigate(`/${knowledgeHub ? 'knowledge-hub' : crm ? 'crm' : 'databoards'}/${currentBoard?.id}`, {
                                                            replace: true,
                                                        });
                                                    },
                                                });
                                            }}
                                            style={{ fontSize: 24, cursor: 'pointer' }}
                                            color="#FA9917"
                                            name="edit"
                                        />
                                    </Space>
                                ) : (
                                    <Typography style={{ marginLeft: 23 }}>
                                        {row.index + 1 + table.getState().pagination.pageSize * table.getState().pagination.pageIndex}
                                    </Typography>
                                )}
                            </Space>
                        );
                    },
                    meta: {
                        cellStyle: {
                            padding: 0,
                        },
                        headerStyle: {
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'end',
                        },
                    },
                },
                ...(currentBoard.fields
                    .filter((field) => !field.hidden || globalSearch || isFilterVisible)
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
                                        email_outbound: 'emailOutbound',
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
                                                if (currentBoard?._id) {
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
                                    if (!currentBoard) return;
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
                                ...(field.type === 'MultipleSelection' && {
                                    footer: (
                                        <Space style={{ paddingTop: '8px', paddingRight: '6px', paddingLeft: '6px' }}>
                                            <Button
                                                onClick={() => {
                                                    openFieldForm(field);
                                                }}
                                                variant="link"
                                                size="s"
                                                text={t('fields_management_row_add_option')}
                                                startIcon={<Icon name="add" />}
                                            />
                                        </Space>
                                    ),
                                }),
                            },
                        };
                    }) as Columns<API.BoardItem>),
            ];
        }
        return [];
    }, [currentBoard, onDataUpdate, t, globalSearch, isFilterVisible, openFieldPopover, crm, openRecordDetail]);

    const fetchRecords = useCallback(async (params: RequestParameters, signal?: AbortSignal) => {
        if (currentBoardRef.current) {
            const { pagination, sorters, globalFilter, filters } = params;
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
                if (globalFilter || (filters && filters.length > 0)) {
                    api = searchBoardRecord.api(currentBoardRef.current.id);
                    method = searchBoardRecord.method;
                    const postData: {
                        limit?: number;
                        offset?: number;
                        q?: string;
                        matchingStrategy: string;
                        filter?: string;
                        sort?: string[];
                    } = {
                        limit: pagination?.pageSize,
                        q: globalFilter,
                        matchingStrategy: 'all',
                    };
                    if (pagination) {
                        postData.offset = pagination.pageIndex * pagination.pageSize;
                    }
                    if (filters && filters.length > 0) {
                        postData.filter = getFilterQuery(filters, currentBoardRef.current);
                    }
                    if (sorters && sorters.length > 0) {
                        postData.sort = sorters.map((sorter) => {
                            // const currentField = currentBoard.fields.find((field) => field._id === sorter.id);
                            // if (currentField?.type === 'Date' || currentField?.type === 'Time') {
                            //     return `fields_timestamp.${sorter.id}:${sorter.desc ? 'desc' : 'asc'}`;
                            // }
                            return `fields.${sorter.id}:${sorter.desc ? 'desc' : 'asc'}`;
                        });
                    }

                    const { data } = await apiFetch<API.MeilisearchResponse<API.BoardItem[]>>(api, method, postData, ImbraceClient, {
                        signal,
                    });

                    return {
                        data: data.message.hits.map((boardItem) => {
                            const recordId = boardItem._id ?? boardItem.id;
                            return {
                                ...boardItem,
                                ...boardItem.fields,
                                id: recordId,
                                board_item_id: recordId,
                                created_type: boardItem.created_type,
                            };
                        }),
                        meta: {
                            total: data.message.estimatedTotalHits,
                            skip: (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? 0),
                            limit: pagination?.pageSize ?? 20,
                        },
                    };
                } else {
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
                }
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

    const onDataDelete: (rowId: string | string[]) => Promise<boolean> = useCallback(
        async (rowId: string | string[]) => {
            return new Promise(async (resolve) => {
                if (currentBoard) {
                    const deleteRequest = async () => {
                        try {
                            await deleteRecord.mutateAsync({ boardId: currentBoard._id, recordId: rowId });
                            notify({
                                type: 'success',
                                message: t('crm_record_deleted_success'),
                            });
                            return true;
                        } catch (error) {
                            console.log(error);
                            return false;
                        }
                    };
                    if (localStorage.getItem('dont_asked_delete_record_again') === 'true') {
                        resolve(await deleteRequest());
                    } else {
                        dialog({
                            showDontAskedAgain: true,
                            title: t('crm_delete_record'),
                            content: t('crm_delete_record_description'),
                            confirmText: t('delete'),
                            cancelText: t('cancel'),
                            actionsAlign: 'flex-end',
                            confirmButtonProps: {
                                type: 'danger',
                            },
                            onClose: () => {
                                resolve(false);
                            },
                            onBackdropClose: () => {
                                resolve(false);
                            },
                            onConfirm: async (dontAskAgain) => {
                                if (dontAskAgain) {
                                    localStorage.setItem('dont_asked_delete_record_again', 'true');
                                }
                                resolve(await deleteRequest());
                            },
                        });
                    }
                    return;
                }
                resolve(false);
            });
        },
        [currentBoard, t, dialog, deleteRecord],
    );

    useEffect(() => {
        if (!tab) {
            replaceUrl();
        }
    }, [tab, replaceUrl]);

    useEffect(() => {
        if (currentBoard && recId && !crm) {
            if (recId === 'automations') return;

            openRecordDetail({
                board: currentBoard,
                recordId: recId,
                tableRef,
                onClose: () => {
                    navigate(`/${knowledgeHub ? 'knowledge-hub' : crm ? 'crm' : 'databoards'}/${currentBoard.id}`, {
                        replace: true,
                    });
                },
            });
        }
    }, [currentBoard, recId, navigate, crm, openRecordDetail]);

    useEffect(() => {
        resetFilters();
        setSelectedSegmentation(undefined);
    }, [currentTab, resetFilters]);

    useEffect(() => {
        if (selectedSegmentation) {
            setFilterCount(0);
        }
    }, [selectedSegmentation]);

    useEffect(() => {
        closeSnackbar();
        return () => {
            closeSnackbar();
        };
    }, [closeSnackbar, currentBoard]);

    const handleCreateNewRecord = useCallback(() => {
        if (currentBoard) {
            openRecordDetail({
                board: currentBoard,
                recordId: 'new',
                tableRef,
                onClose: () => {
                    navigate(`/${knowledgeHub ? 'knowledge-hub' : crm ? 'crm' : 'databoards'}/${currentBoard.id}`, {
                        replace: true,
                    });
                },
            });
        }
    }, [currentBoard, crm, navigate, openRecordDetail]);

    const renderExtra = useCallback(() => {
        if (boards.length === 0) {
            return (
                <Space size={4} direction="vertical" align="start" style={{ width: '100%' }}>
                    <Button size="s" variant="text" startIcon={<Icon name="add" />} onClick={onNewBoard} text={t('crm_add_new_board')} />
                    <Divider flexItem />
                </Space>
            );
        }

        if (!currentBoard) return null;
        return (
            <Extra
                selectedSegmentation={selectedSegmentation}
                setSelectedSegmentation={setSelectedSegmentation}
                selectSegmentationDialog={selectSegmentationDialog}
                createUpdateSegmentationDialog={createUpdateSegmentationDialog}
                currentTab={currentTab}
                currentBoard={currentBoard}
                tableRef={tableRef}
                navigateRef={navigateRef}
                searchBarRef={searchBarRef}
                setCurrentTab={setCurrentTab}
                setGlobalSearch={setGlobalSearch}
                onFilterChange={onFilterChange}
                filterCount={filterCount}
                crm={crm}
                knowledgeHub={knowledgeHub}
                onCreateNewRecord={handleCreateNewRecord}
                isFilterVisible={isFilterVisible}
            />
        );
    }, [currentTab, filterCount, onFilterChange, selectedSegmentation, isFilterVisible, crm, currentBoard, boards, onNewBoard, t]);

    const renderFilter = useCallback(() => {
        if (!currentBoard) return <></>;
        return (
            <Space
                justify="start"
                align="start"
                size={0}
                style={{ width: '100%', border: '1px solid #135DD5', borderBottom: 'none', marginTop: '10px' }}
            >
                <FilterContent
                    request={getMemberOptionRequest}
                    fields={currentBoard?.fields}
                    currentFilterState={selectedSegmentation ? undefined : tableRef.current?.getFilterState()}
                    onFilter={async (filteredValue) => {
                        if (!filteredValue || filteredValue.length === 0) {
                            setIsFilterVisible(false);
                            tableRef.current?.resetFilterState();
                            setFilterCount(0);
                        } else {
                            setFilterCount(filteredValue.length);
                            setSelectedSegmentation(undefined);
                            applyFilters(filteredValue);
                            setIsFilterVisible(false);
                        }
                    }}
                    boardType={currentBoard?.type}
                    onClose={() => setIsFilterVisible(false)}
                />
            </Space>
        );
    }, [currentBoard, t, getMemberOptionRequest, selectedSegmentation]);

    const emptyMessage = (tableState: Partial<TableState>) => {
        if (boards.length === 0) {
            return (
                <Typography variant="SubHeading2">
                    <Trans i18nKey="crm_board_empty">
                        <LinkButton
                            onClick={() => {
                                onNewBoard();
                            }}
                        >
                            Create your first data board now
                        </LinkButton>{' '}
                        \n and start to scale the business!
                    </Trans>
                </Typography>
            );
        }
        if (currentBoard?.name === 'Email Campaign') {
            if (tableState.globalFilter || (tableState.columnFilters && tableState.columnFilters?.length > 0)) {
                return t('crm_list_search_empty_for_user');
            }

            return t('crm_list_empty_email_campaign');
        }

        if (currentBoard?.name === 'Email Outbound Records') {
            if (tableState.globalFilter) {
                return (
                    <Typography variant="SubHeading2">
                        <Trans i18nKey="crm_list_search_empty_email_outbound_record">
                            No matching result has been found.\nCheck the spelling or create your{' '}
                            <Link to="/journeys/org"> first email campaign or outbound</Link>.
                        </Trans>
                    </Typography>
                );
            }

            if (tableState.columnFilters && tableState.columnFilters?.length > 0) {
                return (
                    <Typography variant="SubHeading2">
                        <Trans i18nKey="crm_list_filter_empty_email_outbound_record">
                            No matching result has been found.\nUpdate the filters or create your{' '}
                            <Link to="/journeys/org"> first email campaign or outbound</Link>.
                        </Trans>
                    </Typography>
                );
            }

            return (
                <Typography variant="SubHeading2">
                    <Trans i18nKey="crm_list_empty_email_outbound_record">
                        Currently don't have any email outbound record. Create your{' '}
                        <Link to="/journeys/org">first\nemail campaign or outbound</Link> now.
                    </Trans>
                </Typography>
            );
        }

        if (tableState.globalFilter || (tableState.columnFilters && tableState.columnFilters?.length > 0)) {
            return (
                <Typography variant="SubHeading2">
                    <Trans
                        i18nKey={
                            tableState.columnFilters && tableState.columnFilters?.length > 0
                                ? 'crm_list_filter_empty'
                                : 'crm_list_search_empty'
                        }
                    >
                        No matching result has been found.\nCheck the spelling or create{' '}
                        <LinkButton
                            onClick={() => {
                                tableRef.current?.addNewRecord();
                            }}
                        >
                            a first record
                        </LinkButton>{' '}
                        for it now.
                    </Trans>
                </Typography>
            );
        }

        if (currentBoard?.type === 'OptOut') {
            return (
                <Typography variant="SubHeading2">
                    <Trans i18nKey="crm_list_empty_system">
                        <LinkButton
                            onClick={() => {
                                tableRef.current?.addNewRecord();
                            }}
                        >
                            Create your first record now
                        </LinkButton>
                    </Trans>
                </Typography>
            );
        }
        if (currentBoard?.journey && currentBoard.journey.type === 'form_management') {
            return (
                <Typography variant="SubHeading2">
                    <Trans i18nKey="journey_form_management_data_board_empty">
                        Currently don't have any results. Start\nto share your{' '}
                        <Link to={`/journeys/org?target=${currentBoard?.journey?.id}&action=open`}>collection forms</Link>
                        now!
                    </Trans>
                </Typography>
            );
        }

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
        const sizing = localStorage.getItem(`${currentBoard?._id}-Sizing`);
        return sizing ? JSON.parse(sizing) : savedColumnState.columnSizing || {};
    }, [currentBoard?._id, savedColumnState]);

    const columnOrder = useMemo(() => {
        const order = localStorage.getItem(`${currentBoard?._id}-Order`);
        return order ? JSON.parse(order) : savedColumnState.columnOrder || [];
    }, [currentBoard?._id, savedColumnState]);

    const getTitle = useCallback(() => {
        if (knowledgeHub) {
            return t('menu_knowledgeHub');
        }
        return crm ? t('menu_crm') : t('menu_databoards');
    }, [knowledgeHub, crm, t]);

    console.log(boards);

    return (
        <div style={{ height: '100%', overflow: 'scroll' }}>
            <Space className={styles.menuTitleContainer}>
                <Typography variant="Heading2">{getTitle()}</Typography>
            </Space>
            <Space size={0} direction="vertical" align="start" className={styles.boardContainer}>
                {renderExtra()}
                {fieldPopoverHolder}
                {dialogHolder}
                {recordDetailHolder}
                {isFilterVisible && renderFilter()}
                <FlexibleTable<API.BoardItem>
                    outlined
                    showFilter={false}
                    ref={tableRef}
                    queryKey={['databoard', currentBoard?._id]}
                    columns={columns}
                    dataSource={crm ? dummyCRMBoardItems : dummyBoardItems}
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
                    enableRowSelection={(row) => row.original.created_type === 'manual'}
                    isDataDeletable={(row) => {
                        return row.created_type === 'manual';
                    }}
                    deleteTooltip={(row) => {
                        if (row.created_type !== 'manual') {
                            return t('crm_record_not_deletable');
                        }
                    }}
                    onDataDelete={onDataDelete}
                    onDataUpdate={onDataUpdate}
                    emptyImage={(tableState) =>
                        tableState.globalFilter || (tableState.columnFilters && tableState.columnFilters?.length > 0)
                            ? 'fileSearch'
                            : undefined
                    }
                    emptyMessage={emptyMessage}
                />
            </Space>
        </div>
    );
};

export default Databoards;
