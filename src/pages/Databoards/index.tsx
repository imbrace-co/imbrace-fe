import type { channelIconMapping } from '@imbrace/ui';
import { Button, Checkbox, EllipsisText, Icon, IconButton, Space, Typography, useDialog } from '@imbrace/ui';
import { Box, Chip, Collapse, Divider } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ColumnOrderState, ColumnSizingState, Row, Table, TableState } from '@tanstack/react-table';
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
import type { InvalidErrorResObject, MismatchErrorResObject } from '../Databoards/components/BoardDetailedModal/DetailModal';
import EmailContentPreview from '../Databoards/components/emailContentPreview';
import { useFieldPopover } from '../Databoards/components/FieldPopover';
import { useRecordDetail } from '../Databoards/components/RecordDetail/modal';
import type { ParentRecordPickerFormType } from './components/ParentRecordPicker';
import ParentRecordPicker, { parentRecordPickerSchema } from './components/ParentRecordPicker';
import { FieldSchema } from './components/BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';
import OperationFieldForm, { FieldType } from './components/BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';
import { BoardSetting } from './components/BoardSetting';
import { FilterContent } from './components/FilterContent';
import type { SearchBarRef } from '../Databoards/searchBar';
import RecordDetailsIcon from '@/assets/icons/icon_record_details.svg?react';
import Extra from './extra';
import TableInTableCell from './components/TableInTableCell';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import {
    deleteBoardRecord,
    deleteBoardRecords,
    getBoardRecords,
    getBoardImportProgress,
    postBoardRecord,
    postBoardUpload,
    putBoardField,
    putBoardRecord,
    searchBoardRecord,
} from '@/services/api/crm';
import { getMembers } from '@/services/api/user';
import { ImbraceClient, ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { boardsQueryKey, useBoardById, useBoards } from '@/services/queries/board';
import { databoardCategoryQueries } from '@/services/queries/databoardCategory';
import { useSchemas } from '@/services/queries/schema';
import { getFilterQuery } from '../Databoards/utils';
import useSegmentation from './hooks/useSegmentation';
import { useFilter } from './hooks/useFilter';
import { useNotify } from '@/contexts/SnackbarContext';
import { FormProvider } from 'react-hook-form';
import { queryClient } from '@/App';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import ImportProgressNotice from './components/ImportProgressNotice';
import type { ImportProgressProcessing, ImportProgressResponse } from './components/ImportProgressNotice';

export const DefaultFilterField: Record<API.BoardType, string[]> = {
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

// Board types shown on the /crm route. Whitelist (not blacklist) so unknown/new
// types never leak into CRM.
export const CRM_BOARD_TYPES: API.BoardType[] = ['Contacts', 'Companies', 'Opportunities', 'Tasks', 'Products', 'OptOut'];

const Databoards = ({ crm, knowledgeHub, commsiq, documentAi }: { crm?: boolean; knowledgeHub?: boolean; commsiq?: boolean; documentAi?: boolean }) => {
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
    const [isGroupedView, setIsGroupedView] = useState(false);

    const [{ openFieldPopover }, fieldPopoverHolder] = useFieldPopover();
    const [{ openRecordDetail }, recordDetailHolder] = useRecordDetail({
        isDocumentAIRoute: !!documentAi,
    });
    const { data: rawBoards = [], refetch } = useBoards({
        isDefault: knowledgeHub || documentAi ? undefined : !!crm,
        types: knowledgeHub
            ? 'KnowledgeHub'
            : documentAi
              ? 'DocumentAI'
              : !crm && !commsiq
                ? 'General'
                : undefined,
    });

    // The /crm route shows CRM boards only. Whitelist the CRM entity types so boards
    // with other/unknown types (General, KnowledgeHub, DocumentAI, System, null, ...)
    // never leak in — they have their own dedicated routes.
    const boards = useMemo(
        () => (crm ? rawBoards.filter((board) => CRM_BOARD_TYPES.includes(board.type)) : rawBoards),
        [crm, rawBoards],
    );

    const resolvedBasePath = knowledgeHub
        ? '/knowledge-hub-all'
        : commsiq
          ? '/commsiq'
          : crm
            ? '/crm'
            : documentAi
              ? '/document-ai'
              : '/databoards';

    const isDataboardsRoute = !crm && !knowledgeHub && !commsiq && !documentAi;

    // Anchor for the board menu opened from the settings icon next to the board title.
    // The menu itself (options + handlers) lives in Extra, which owns export/import/delete logic.
    const [boardMenuAnchorEl, setBoardMenuAnchorEl] = useState<HTMLElement | null>(null);

    const onNewBoard = () => {
        dialog({
            title: t(
                documentAi
                    ? 'databoard_create_new_model_header'
                    : isDataboardsRoute
                      ? 'databoards_new_board'
                      : 'board_create_new_header',
            ),
            paperSx: {
                width: { xs: '100%', sm: '80vw' },
                maxWidth: '80vw',
            },
            content: ({ onClose }) => {
                return (
                    <BoardSetting
                        board={undefined}
                        onClose={onClose}
                        navigateRef={navigateRef}
                        crm={crm}
                        commsiq={commsiq}
                        setCurrentTab={setCurrentTab}
                        tableRef={tableRef}
                        knowledgeHub={knowledgeHub}
                        documentAi={documentAi}
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

    const handleBoardSettings = () => {
        if (!currentBoard) return;
        dialog({
            title: '',
            paperSx: {
                width: { xs: '100%', sm: '80vw' },
                maxWidth: '80vw',
                height: { xs: '100%', sm: '90vh', md: '672px' },
                maxHeight: '672px',
            },
            content: ({ onClose }) => (
                <BoardSetting
                    board={currentBoard}
                    simpleMode={!!connectedSchema}
                    fillLayout
                    onClose={onClose}
                    navigateRef={navigateRef}
                    setCurrentTab={setCurrentTab}
                    tableRef={tableRef}
                />
            ),
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: false,
            actionsAlign: 'flex-start',
        });
    };

    const { notify, closeSnackbar } = useNotify();

    const createRecord = useMutation({
        mutationFn: async (params: { boardId: string; fields: { board_field_id: string; value: unknown }[] }) => {
            // Reason: /data-board/boards/<id>/items rejects with 400 when any
            // entry is missing board_field_id (Zod). Drop those entries so an
            // accidental undefined columnId can't poison the whole request.
            const validFields = (params.fields || []).filter((f) => !!f?.board_field_id);
            if (validFields.length === 0) {
                throw new Error('createRecord: all fields are missing board_field_id');
            }
            const { data: record } = await apiFetch<API.BoardItem>(postBoardRecord.api(params.boardId), postBoardRecord.method, {
                fields: validFields,
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
                        refresh();
                        return;
                    }
                    if (error.response?.data.message.indexOf('Not found') !== -1) {
                        const notificationPayload = {
                            message: t('crm_record_not_found'),
                            messageType: 'noti_failed',
                            variant: 'error',
                        };
                        dispatch(pushNotification({ notification: notificationPayload }));
                        refresh();
                        return;
                    }
                    if (error.response?.data.message.indexOf('Invalid phone number') !== -1) {
                        const notificationPayload = {
                            message: t('validation_phone_field_pattern'),
                            messageType: 'noti_failed',
                            variant: 'error',
                        };
                        dispatch(pushNotification({ notification: notificationPayload }));
                        refresh();
                        return;
                    }
                    const notificationPayload = {
                        message: t('error_something_went_wrong'),
                        messageType: 'noti_failed',
                        variant: 'error',
                    };
                    dispatch(pushNotification({ notification: notificationPayload }));
                    refresh();
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

    const boardFromList = useMemo(() => {
        if (currentTab && boards) {
            return boards.filter((board) => board.id === currentTab)[0];
        }
        return undefined;
    }, [currentTab, boards]);

    const { data: boardById } = useBoardById(!boardFromList && currentTab ? currentTab : undefined);

    const currentBoard = useMemo(() => {
        if (boardFromList) {
            currentBoardRef.current = boardFromList;
            return boardFromList;
        }
        if (boardById) {
            currentBoardRef.current = boardById;
            return boardById;
        }
        return undefined;
    }, [boardFromList, boardById]);

    const { data: allSchemas = [] } = useSchemas({});

    // Pre-fetch Data Board categories so the BoardSetting dropdown has data ready when the modal
    // opens. Databoards route only — other routes (crm/knowledgeHub/commsiq/documentAi) don't use it.
    useQuery({
        ...databoardCategoryQueries.list(),
        enabled: isDataboardsRoute,
    });
    const connectedSchema = useMemo(() => {
        const fromId = currentBoard?.from_schema_id;
        if (!fromId) return undefined;
        return allSchemas.find((s) => s.id === fromId || s._id === fromId);
    }, [allSchemas, currentBoard?.from_schema_id]);

    const [importProgress, setImportProgress] = useState<ImportProgressResponse | undefined>(undefined);

    const isImportInProgress = useCallback((data: unknown) => {
        if (!data || typeof data !== 'object') return false;
        const d = data as Record<string, unknown>;
        if (d.status === 'not_found') return false;
        const statusRaw = (d.status ?? '') as string;
        return ['in_progress', 'processing', 'running', 'queued', 'pending'].includes(statusRaw.toLowerCase());
    }, []);

    const isImportingData = useMemo(() => {
        return !!importProgress && isImportInProgress(importProgress);
    }, [importProgress, isImportInProgress]);

    // Simple polling: every 5s check import progress and (if importing) show/update a single notify.
    useEffect(() => {
        if (!currentTab) {
            setImportProgress(undefined);
            return;
        }

        let cancelled = false;
        let timerId: number | null = null;
        let lastProgressSignature: string | null = null;
        const progressSnackKey = `import-progress-${currentTab}`;
        const importStartedEventName = 'databoard-import-started';

        const canRenderProgress = (data: ImportProgressResponse): data is ImportProgressProcessing => {
            if (!data || typeof data !== 'object') return false;
            const d = data as any;
            return (
                typeof d.total === 'number' &&
                typeof d.processed === 'number' &&
                typeof d.success === 'number' &&
                typeof d.failed === 'number'
            );
        };

        const stopPolling = () => {
            if (timerId) {
                window.clearInterval(timerId);
                timerId = null;
            }
        };

        const startPolling = () => {
            if (timerId) return;
            timerId = window.setInterval(checkProgress, 5000);
        };

        const checkProgress = async () => {
            if (cancelled) return;
            try {
                const { data } = await apiFetch<ImportProgressResponse>(
                    getBoardImportProgress.api(currentTab),
                    getBoardImportProgress.method,
                );
                if (cancelled) return;
                setImportProgress(data);

                // Stop polling when backend reports import is completed or there is no active import.
                if (data && typeof data === 'object' && ((data as any).status === 'completed' || (data as any).status === 'not_found')) {
                    stopPolling();
                    closeSnackbar(progressSnackKey);
                    lastProgressSignature = null;
                    return;
                }

                // Show/update notify if importing
                if (isImportInProgress(data) && canRenderProgress(data)) {
                    const signature = `${(data as any).status ?? ''}-${data.processed}-${(data as any).percentage ?? ''}`;
                    if (signature === lastProgressSignature) return;
                    lastProgressSignature = signature;
                    notify({
                        key: progressSnackKey,
                        type: 'warning',
                        persist: false,
                        message: <ImportProgressNotice progress={data} />,
                    });
                    return;
                }

                // Not importing: close progress snackbar (if any) but keep polling to detect new imports.
                closeSnackbar(progressSnackKey);
                lastProgressSignature = null;
            } catch (error) {
                console.warn('Failed to fetch import_progress:', error);
            }
        };

        const onImportStarted = (evt: Event) => {
            const detail = (evt as CustomEvent<{ boardId?: string }>).detail;
            if (!detail?.boardId) return;
            if (detail.boardId !== currentTab) return;

            // If we previously stopped polling due to "not_found/completed", this wakes it up again.
            startPolling();
            checkProgress();
        };

        window.addEventListener(importStartedEventName, onImportStarted);

        // Start polling first so a fast "not_found/completed" response can immediately stop it.
        startPolling();
        // Initial check (runs immediately)
        checkProgress();

        return () => {
            cancelled = true;
            stopPolling();
            closeSnackbar(progressSnackKey);
            window.removeEventListener(importStartedEventName, onImportStarted);
        };
    }, [currentTab, closeSnackbar, isImportInProgress, notify]);

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

    const refresh = useCallback(async () => {
        refetch();
    }, [refetch]);

    const replaceUrl = useCallback(async () => {
        if (boards.length >= 1) {
            const boardId = boards[0]?.id || boards[0]?._id;
            navigate(`${resolvedBasePath}/${boardId}`, { replace: true });
            setCurrentTab(boardId);
        }
    }, [navigate, boards, resolvedBasePath]);

    const onDataUpdate: FlexibleTableBaseProps<API.BoardItem>['onDataUpdate'] = useCallback(
        async ({ columnId, value, id }: { columnId: string; value: unknown; id: string }) => {
            const currentBoardId = currentBoard?._id || (currentBoard as any)?.id;
            if (currentBoardId) {
                // Reason: a column without an id (e.g. board fields with neither
                // `_id` nor `id`) would send `board_field_id: undefined`, which
                // /data-board/boards/<id>/items rejects with a Zod 400.
                if (!columnId) {
                    console.warn('Databoards.onDataUpdate: missing columnId, skip', { value, id });
                    return;
                }

                if (id === 'new') {
                    try {
                        const result = await createRecord.mutateAsync({
                            boardId: currentBoardId,
                            fields: [
                                {
                                    board_field_id: columnId,
                                    value,
                                },
                            ],
                        });
                        return result;
                    } catch (error) {
                        console.log(error);
                    }
                } else {
                    let newValue = value;
                    const currentField = currentBoard?.fields.find((field) => (field._id || (field as any).id) === columnId);

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
                    if (currentField?.type === 'MultipleAssignee' && Array.isArray(newValue)) {
                        const ids = (newValue as Array<string | { _id: string }>).map((v) => (typeof v === 'string' ? v : v._id));
                        newValue = Array.from(new Set(ids));
                    }
                    try {
                        const result = await updateRecord.mutateAsync({
                            boardId: currentBoardId,
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
                                            closeSnackbar();
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
                                        closeSnackbar();
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
                                        closeSnackbar();
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
            refetch();
            queryClient.refetchQueries({
                queryKey: boardsQueryKey({
                    isDefault: knowledgeHub || documentAi ? undefined : !!crm,
                    types: knowledgeHub
                        ? 'KnowledgeHub'
                        : documentAi
                          ? 'DocumentAI'
                          : !crm && !commsiq
                            ? 'General'
                            : undefined,
                }),
            });
        },
    });

    const openFieldForm = useCallback(
        (field: API.BoardField) => {
            if (currentBoard) {
                dialogForm<FieldType>({
                    title: t('fields_management_form_header_edit'),
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
                                boardId: currentBoard._id || (currentBoard as any).id,
                                fieldId: field._id || (field as any).id,
                                data: {
                                    name,
                                    description,
                                    type,
                                    hidden: false,
                                    data,
                                    settings,
                                },
                            });
                            await refresh();
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
                                await refetch();
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

    const RowActions = ({ row, rows, currentBoard }: { row: Row<API.BoardItem>; rows?: Row<API.BoardItem>[]; currentBoard: API.Board }) => {
        if (crm) {
            return (
                <Space size={12} style={{ marginLeft: 13 }}>
                    <Icon
                        onClick={(e) => {
                            navigateRef.current(`/crm/${currentBoard.id}/${row.id}`);
                        }}
                        style={{ fontSize: 24, cursor: 'pointer' }}
                        color="#FA9917"
                        name="edit"
                    />
                </Space>
            );
        }
        return (
            <Space size={12} style={{ marginLeft: 6 }} align="center" justify="start">
                <RecordDetailsIcon
                    onClick={() => {
                        openRecordDetail({
                            board: currentBoard,
                            recordId: row.original._id,
                            isEdit: false,
                            boardData: rows?.map((row) => row.original),
                            tableRef,
                            onClose: () => {
                                navigate(`${resolvedBasePath}/${currentBoard?.id}`, { replace: true });
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
                                navigate(`${resolvedBasePath}/${currentBoard?.id}`, { replace: true });
                            },
                        });
                    }}
                    style={{ fontSize: 24, cursor: 'pointer' }}
                    color="#FA9917"
                    name="edit"
                />
            </Space>
        );
    };

    // const boardColumns: Columns<API.BoardItem> = useMemo(() => {
    //     if (currentBoard) {
    //         return [
    //             {
    //                 accessorKey: 'rowIndex',
    //                 id: 'rowIndex',
    //                 header: 'No.',
    //                 enableColumnFilter: false,
    //                 enablePinning: true,
    //                 enableEditing: false,
    //                 enableResizing: false,
    //                 enableSorting: true,
    //                 minSize: 130, // Increased to accommodate both checkbox and icons
    //                 cell: ({ row, table, isHover }: { row: Row<API.BoardItem>; table: Table<API.BoardItem>; isHover?: boolean }) => {
    //                     const rows = tableRef.current?.getRowModel().rows;
    //                     return (
    //                         <Space size={12} align="center" justify="start" onClick={(e) => e.stopPropagation()}>
    //                             <Checkbox
    //                                 disabled={!row.getCanSelect()}
    //                                 checked={row.getIsSelected()}
    //                                 onChange={(e) => {
    //                                     row.getToggleSelectedHandler()(e);
    //                                     handleToggleRowCheckbox();
    //                                 }}
    //                                 {...(!row.getCanSelect() && {
    //                                     tooltip: t('databoard_disabled_checkbox_tooltip'),
    //                                     tooltipProps: { placement: 'top', arrow: true },
    //                                 })}
    //                             />

    //                             {isHover ? (
    //                                 <RowActions row={row} rows={rows} currentBoard={currentBoard} />
    //                             ) : (
    //                                 <Typography style={{ marginLeft: 23 }}>
    //                                     {row.index + 1 + table.getState().pagination.pageSize * table.getState().pagination.pageIndex}
    //                                 </Typography>
    //                             )}
    //                         </Space>
    //                     );
    //                 },
    //                 meta: {
    //                     cellStyle: {
    //                         padding: 0,
    //                     },
    //                     headerStyle: {
    //                         width: '100%',
    //                         display: 'flex',
    //                         justifyContent: 'end',
    //                     },
    //                 },
    //             },
    //             ...(currentBoardRef?.current?.show_id
    //                 ? [
    //                     {
    //                         accessorKey: 'recordId',
    //                         id: 'recordId',
    //                         header: 'Record ID',
    //                         enableColumnFilter: false,
    //                         enablePinning: true,
    //                         enableEditing: false,
    //                         enableResizing: false,
    //                         enableSorting: false,
    //                         minSize: 350,
    //                         cell: ({ row }: { row: Row<API.BoardItem> }) => {
    //                             return <Typography>{row.original._id}</Typography>;
    //                         },
    //                         meta: {
    //                             cellStyle: {
    //                                 paddingLeft: '11px',
    //                             },
    //                             headerStyle: {
    //                                 width: '100%',
    //                                 display: 'flex',
    //                                 justifyContent: 'start',
    //                             },
    //                         },
    //                     },
    //                 ]
    //                 : []),
    //             // {
    //             //     accessorKey: 'board_item_id',
    //             //     id: 'board_item_id',
    //             //     header: 'Linked ID',
    //             //     enableColumnFilter: false,
    //             //     enablePinning: true,
    //             //     enableEditing: false,
    //             //     enableResizing: false,
    //             //     enableSorting: false,
    //             //     minSize: 350,
    //             //     cell: ({ row }: { row: Row<API.BoardItem> }) => {
    //             //         return <Typography>{row.original.board_item_id}</Typography>;
    //             //     },
    //             //     meta: {
    //             //         cellStyle: {
    //             //             paddingLeft: '11px',
    //             //         },
    //             //         headerStyle: {
    //             //             width: '100%',
    //             //             display: 'flex',
    //             //             justifyContent: 'start',
    //             //         },
    //             //     },
    //             // },
    //             ...(currentBoard.fields
    //                 .filter((field) => !field.hidden || globalSearch || isFilterVisible)
    //                 .map((field) => {
    //                     const valueEnum = field.data?.reduce((prev, current) => {
    //                         return {
    //                             ...prev,
    //                             [current._id]: current.value,
    //                         };
    //                     }, {});

    //                     return {
    //                         accessorKey: field._id,
    //                         id: field._id,
    //                         header: () => field.name,
    //                         tooltip: field.description,
    //                         type: field.type,
    //                         bordered: !field.is_identifier,
    //                         enableColumnFilter: DefaultFilterField[currentBoard.type]
    //                             ? DefaultFilterField[currentBoard.type].indexOf(field?.default_field_name as string) !== -1
    //                             : false,
    //                         enableSorting: true,
    //                         ...(field.type === 'Assignee' && {
    //                             cell: ({ cell }) => {
    //                                 let displayName = (cell.getValue() as Record<string, string>)?.display_name;
    //                                 if (typeof cell.getValue() === 'string') {
    //                                     const users = queryClient.getQueryData<API.User[]>([
    //                                         'FlexibleTable',
    //                                         { type: 'Assignee', fieldId: field._id },
    //                                     ]);
    //                                     const targetUser = users?.find((user: API.User) => user.id === cell.getValue());
    //                                     displayName = targetUser?.display_name ?? '—';
    //                                 }
    //                                 return (
    //                                     <EllipsisText
    //                                         text={`${displayName ?? '—'}`}
    //                                         element={
    //                                             <Typography
    //                                                 style={{
    //                                                     color: !displayName ? 'var(--color-light-4)' : 'inherit',
    //                                                     overflow: 'hidden',
    //                                                     textOverflow: 'ellipsis',
    //                                                     whiteSpace: 'nowrap',
    //                                                     wordBreak: 'break-word',
    //                                                 }}
    //                                             />
    //                                         }
    //                                     />
    //                                 );
    //                             },
    //                             request: async () => {
    //                                 const { data } = await apiFetch<API.User[]>(getMembers.api, getMembers.method, {
    //                                     status: 'active',
    //                                 });
    //                                 return data;
    //                             },
    //                         }),

    //                         ...(field.type === 'TableInTable' && {
    //                             minSize: 600,
    //                             enableEditing: false,
    //                             cell: ({ cell, row }) => {
    //                                 return <TableInTableCell key={`${field._id}-${row.original._id}`} field={field} parentRecordId={row.original._id} parentRecord={row.original} />;
    //                             },
    //                             // request: async () => {
    //                             //     const { data } = await apiFetch<API.User[]>(getMembers.api, getMembers.method, {
    //                             //         status: 'active',
    //                             //     });
    //                             //     return data;
    //                             // },
    //                         }),

    //                         ...(field.type === 'MultipleAssignee' && {
    //                             cell: ({ cell }) => {
    //                                 const users = queryClient.getQueryData<API.User[]>([
    //                                     'FlexibleTable',
    //                                     { type: 'MultipleAssignee', fieldId: field._id },
    //                                 ]);
    //                                 const value = cell.getValue() as Record<string, string>[];
    //                                 let valueToDisplay: string[] = [];
    //                                 if (Array.isArray(value)) {
    //                                     valueToDisplay = value.map((v) => {
    //                                         if (typeof v === 'object' && v.display_name) {
    //                                             return v.display_name;
    //                                         } else {
    //                                             const targetUser = users?.find((user: API.User) => user.id === v);
    //                                             return targetUser?.display_name ?? v;
    //                                         }
    //                                     });
    //                                 }
    //                                 valueToDisplay = [...new Set(valueToDisplay)];
    //                                 if (valueToDisplay.length > 0) {
    //                                     return (
    //                                         <Space size={8}>
    //                                             {valueToDisplay
    //                                                 .filter((enumValue) => enumValue !== undefined && enumValue !== null)
    //                                                 .map((enumValue, optionIndex) => {
    //                                                     return (
    //                                                         <Chip
    //                                                             key={`${optionIndex}`}
    //                                                             sx={{
    //                                                                 height: 24,
    //                                                                 background: 'rgba(250, 153, 23, 0.2)',
    //                                                                 maxWidth: 'none',
    //                                                             }}
    //                                                             label={enumValue}
    //                                                         />
    //                                                     );
    //                                                 })}
    //                                         </Space>
    //                                     );
    //                                 }
    //                                 return <Typography style={{ color: 'var(--color-light-4)' }}>—</Typography>;
    //                             },
    //                             request: async () => {
    //                                 const { data } = await apiFetch<API.User[]>(getMembers.api, getMembers.method, {
    //                                     status: 'active',
    //                                 });
    //                                 return data;
    //                             },
    //                         }),
    //                         ...(field.type === 'Country' && {
    //                             cell: ({ cell }) => {
    //                                 const countryName = (cell.getValue() as Record<string, string>)?.country_name;
    //                                 return (
    //                                     <EllipsisText
    //                                         text={`${countryName ?? '—'}`}
    //                                         element={
    //                                             <Typography
    //                                                 style={{
    //                                                     color: !countryName ? 'var(--color-light-4)' : 'inherit',
    //                                                     overflow: 'hidden',
    //                                                     textOverflow: 'ellipsis',
    //                                                     whiteSpace: 'nowrap',
    //                                                     wordBreak: 'break-word',
    //                                                 }}
    //                                             />
    //                                         }
    //                                     />
    //                                 );
    //                             },
    //                         }),
    //                         ...(field.type === 'Phone' && {
    //                             cell: ({ cell }) => {
    //                                 const phoneData = cell.getValue() as Record<string, string>;
    //                                 if (phoneData && typeof phoneData === 'object' && 'phone' in phoneData) {
    //                                     return (
    //                                         <EllipsisText
    //                                             text={`${phoneData.country_calling_code ?? ''} ${phoneData.national_number}`}
    //                                             element={
    //                                                 <Typography
    //                                                     style={{
    //                                                         color: 'inherit',
    //                                                         overflow: 'hidden',
    //                                                         textOverflow: 'ellipsis',
    //                                                         whiteSpace: 'nowrap',
    //                                                         wordBreak: 'break-word',
    //                                                     }}
    //                                                 />
    //                                             }
    //                                         />
    //                                     );
    //                                 }
    //                                 return (
    //                                     <EllipsisText
    //                                         text={`${cell.getValue() || '—'}`}
    //                                         element={
    //                                             <Typography
    //                                                 style={{
    //                                                     color: !cell.getValue() ? 'var(--color-light-4)' : 'inherit',
    //                                                     overflow: 'hidden',
    //                                                     textOverflow: 'ellipsis',
    //                                                     whiteSpace: 'nowrap',
    //                                                     wordBreak: 'break-word',
    //                                                 }}
    //                                             />
    //                                         }
    //                                     />
    //                                 );
    //                             },
    //                         }),
    //                         ...(field.type === 'RichText' && {
    //                             enableEditing: false,
    //                             cell: ({ cell, column, row, table }) => {
    //                                 const richContent = cell.getValue() as unknown as {
    //                                     subject: string;
    //                                     content: { content: string; files: [] };
    //                                 };
    //                                 const senderEmailField = table
    //                                     ._getColumnDefs()
    //                                     .find((columnDef) => columnDef.meta?.fieldData?.name === 'Outbound Source');

    //                                 return (
    //                                     <EmailContentPreview
    //                                         {...richContent}
    //                                         email={
    //                                             senderEmailField && senderEmailField.id
    //                                                 ? (row.original[senderEmailField.id as keyof API.BoardItem] as string) || ''
    //                                                 : ''
    //                                         }
    //                                     />
    //                                 );
    //                             },
    //                         }),
    //                         ...((field.type === 'SingleSelection' ||
    //                             field.type === 'MultipleSelection' ||
    //                             field.type === 'Priority' ||
    //                             field.type === 'MultipleAssignee') && {
    //                             enum: valueEnum,
    //                         }),
    //                         ...(field.type === 'MultipleSelection' && {
    //                             enableSorting: false,
    //                             request: () =>
    //                                 field.data?.map((field) => ({
    //                                     text: field.value,
    //                                     value: field._id,
    //                                 })),
    //                         }),
    //                         ...(field.type === 'Origin' && {
    //                             enum: valueEnum,
    //                             cell: ({ getValue }) => {
    //                                 const originValue = getValue() as API.OriginValue;
    //                                 if (!originValue || typeof originValue !== 'object') {
    //                                     return <Typography style={{ color: 'var(--color-light-4)' }}>—</Typography>;
    //                                 }
    //                                 const {
    //                                     type,
    //                                     data: { name, type: dataType },
    //                                 } = originValue;

    //                                 const iconType: Record<API.ProductType, keyof typeof channelIconMapping> = {
    //                                     business_contact_collector: 'crm',
    //                                     email_campaign: 'email',
    //                                     facebook_leads_management: 'facebook',
    //                                     facebook_social_media_management: 'facebook',
    //                                     'ai-assistant_management': 'imbraceai',
    //                                     form_management: 'formManagement',
    //                                     whatsapp_outbound: 'whatsapp',
    //                                     email_outbound: 'email',
    //                                 };

    //                                 if (type === 'customized') {
    //                                     return (
    //                                         <EllipsisText
    //                                             text={`${name ?? '—'}`}
    //                                             element={
    //                                                 <Typography
    //                                                     style={{
    //                                                         color: !name ? 'var(--color-light-4)' : 'inherit',
    //                                                         overflow: 'hidden',
    //                                                         textOverflow: 'ellipsis',
    //                                                         whiteSpace: 'nowrap',
    //                                                         wordBreak: 'break-word',
    //                                                     }}
    //                                                 />
    //                                             }
    //                                         />
    //                                     );
    //                                 }
    //                                 return (
    //                                     <Space size={12} align="center" justify="start" style={{ width: '100%' }}>
    //                                         <Space>
    //                                             <Icon
    //                                                 namespace="channel"
    //                                                 name={
    //                                                     type === 'channel'
    //                                                         ? (dataType as keyof typeof channelIconMapping)
    //                                                         : iconType[dataType as API.ProductType]
    //                                                 }
    //                                                 style={{ fontSize: 24 }}
    //                                             />
    //                                         </Space>

    //                                         <EllipsisText
    //                                             text={`${name ?? '—'}`}
    //                                             element={
    //                                                 <Typography
    //                                                     style={{
    //                                                         color: !name ? 'var(--color-light-4)' : 'inherit',
    //                                                         overflow: 'hidden',
    //                                                         textOverflow: 'ellipsis',
    //                                                         whiteSpace: 'nowrap',
    //                                                         wordBreak: 'break-word',
    //                                                     }}
    //                                                 />
    //                                             }
    //                                         />
    //                                     </Space>
    //                                 );
    //                             },
    //                         }),
    //                         ...(field.type === 'ShortText' && {
    //                             validate: (value?: string) => {
    //                                 if (value && value.length > 150) {
    //                                     return t('crm_field_short_text_length_limit');
    //                                 }
    //                                 return true;
    //                             },
    //                         }),
    //                         ...(field.is_identifier && {
    //                             validate: (value?: string) => {
    //                                 if (!value) {
    //                                     return t('crm_identifier_can_not_delete');
    //                                 }
    //                                 if (value && value.length > 150) {
    //                                     return t('crm_field_short_text_length_limit');
    //                                 }
    //                                 return true;
    //                             },
    //                         }),
    //                         fieldProps: {
    //                             ...(field?.default_field_name === 'birthday' && { minDate: dayjs(new Date(0)) }),
    //                             ...(field?.default_field_name === 'stage' && {
    //                                 disabled: (record: API.BoardItem) => {
    //                                     return record[field._id as keyof API.BoardItem] === 'Unidentified Lead';
    //                                 },
    //                                 disabledTooltip: t('crm_field_stage_disabled_desc'),
    //                             }),
    //                             ...(field?.default_field_name === 'created_at' && {
    //                                 disabled: (record: API.BoardItem) => {
    //                                     return record.created_type === 'system';
    //                                 },
    //                                 disabledTooltip: t('crm_system_data_disabled_edit_desc'),
    //                             }),
    //                             ...(field.type === 'Origin' && {
    //                                 disabled: (record: API.BoardItem) => {
    //                                     return record.created_type === 'system';
    //                                 },
    //                                 disabledTooltip: t('origin_system_filled_tooltip'),
    //                             }),
    //                             ...(field.type === 'Assignee' && {
    //                                 querySelect: (users: API.User[]) => {
    //                                     return users.map((user) => ({
    //                                         value: user.id,
    //                                         text: user.display_name,
    //                                     }));
    //                                 },
    //                             }),
    //                             ...(field.type === 'MultipleAssignee' && {
    //                                 querySelect: (users: API.User[]) => {
    //                                     return users.map((user) => ({
    //                                         value: user.id,
    //                                         text: user.display_name,
    //                                     }));
    //                                 },
    //                             }),
    //                         },
    //                         meta: {
    //                             identifier: field.is_identifier,
    //                             defaultFieldName: field.default_field_name,
    //                             disableOrdering: field.is_identifier,
    //                             boardType: currentBoard.type,
    //                             onExpand: (e, { rowId, target, value, onClose, extraProps }) => {
    //                                 if (
    //                                     (field.type === 'MultipleSelection' ||
    //                                         field.type === 'LongText' ||
    //                                         field.type === 'Attachment' ||
    //                                         field.type === 'Notes') &&
    //                                     target
    //                                 ) {
    //                                     openFieldPopover({
    //                                         anchorEl: target,
    //                                         title: field.name,
    //                                         type: field.type,
    //                                         valueEnum,
    //                                         initialValue: value,
    //                                         onClose,
    //                                         boardType: currentBoard.type,
    //                                         extraProps,
    //                                         updateData: async (updatedValue) => {
    //                                             if (currentBoard?._id) {
    //                                                 const updateData = { columnId: field._id, value: updatedValue, id: rowId };
    //                                                 tableRef.current?.handleDataUpdate(updateData);
    //                                             }
    //                                         },
    //                                     });
    //                                     return;
    //                                 }
    //                                 if (!currentBoard) return;
    //                             },
    //                             ...(field.type === ('MultipleSelection' || 'MultipleAssignee') && {
    //                                 cellStyle: {
    //                                     padding: '7px 12px',
    //                                 },
    //                             }),
    //                             ...(field.type === 'RichText' && {
    //                                 cellStyle: {
    //                                     padding: '0',
    //                                     paddingLeft: '11px',
    //                                 },
    //                             }),
    //                             ...(field.type === 'Phone' && {
    //                                 defaultCountryCode: field.settings?.default_country_code,
    //                             }),
    //                             ...(field.type === 'Link' && {
    //                                 cellStyle: {
    //                                     padding: 0,
    //                                     paddingLeft:
    //                                         field.default_field_name === 'contact_record' ||
    //                                             field.default_field_name === 'opportunity_record'
    //                                             ? '8.5px'
    //                                             : 0,
    //                                     height: '100%',
    //                                     display: 'flex',
    //                                     alignItems: 'center',
    //                                 },
    //                             }),
    //                             ...(field.type === 'Origin' && {
    //                                 cellStyle: {
    //                                     padding: '4px 11px',
    //                                 },
    //                             }),
    //                             fieldData: field,
    //                             ...(field.type === 'Notes' && {
    //                                 cellStyle: {
    //                                     padding: '0 12px',
    //                                 },
    //                             }),
    //                             ...(field.type === 'Currency' && {
    //                                 defaultCurrencyCode: field.settings?.default_currency_code,
    //                             }),
    //                             ...(field.type === 'MultipleSelection' && {
    //                                 footer: (
    //                                     <Space style={{ paddingTop: '8px', paddingRight: '6px', paddingLeft: '6px' }}>
    //                                         <Button
    //                                             onClick={() => {
    //                                                 openFieldForm(field);
    //                                             }}
    //                                             variant="link"
    //                                             size="s"
    //                                             text={t('fields_management_row_add_option')}
    //                                             startIcon={<Icon name="add" />}
    //                                         />
    //                                     </Space>
    //                                 ),
    //                             }),
    //                         },
    //                     };
    //                 }) as Columns<API.BoardItem>),
    //         ];
    //     }
    //     return [];
    // }, [currentBoard, onDataUpdate, t, globalSearch, isFilterVisible, openFieldPopover, crm, openRecordDetail]);

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
                    cell: ({ row, table, isHover }: { row: Row<API.BoardItem>; table: Table<API.BoardItem>; isHover?: boolean }) => {
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
                                    <RowActions row={row} rows={rows} currentBoard={currentBoard} />
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
                ...(currentBoardRef?.current?.show_id
                    ? [
                          {
                              accessorKey: 'recordId',
                              id: 'recordId',
                              header: 'Record ID',
                              enableColumnFilter: false,
                              enablePinning: true,
                              enableEditing: false,
                              enableResizing: false,
                              enableSorting: false,
                              minSize: 350,
                              cell: ({ row }: { row: Row<API.BoardItem> }) => {
                                  return <Typography>{row.original._id}</Typography>;
                              },
                              meta: {
                                  cellStyle: {
                                      paddingLeft: '11px',
                                  },
                                  headerStyle: {
                                      width: '100%',
                                      display: 'flex',
                                      justifyContent: 'start',
                                  },
                              },
                          },
                      ]
                    : []),
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
                            accessorKey: field._id || field.id,
                            id: field._id || field.id,
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
                                    ]);
                                    const rawValue = cell.getValue() as unknown;
                                    const value = (Array.isArray(rawValue) ? rawValue : []) as Array<string | { display_name?: string }>;
                                    let valueToDisplay: string[] = [];
                                    if (Array.isArray(value)) {
                                        valueToDisplay = value.map((v) => {
                                            if (typeof v === 'string') {
                                                const targetUser = users?.find((user: API.User) => user.id === v);
                                                return targetUser?.display_name ?? v;
                                            }
                                            return v?.display_name ?? '';
                                        });
                                    }
                                    valueToDisplay = Array.from(new Set(valueToDisplay.filter(Boolean)));
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
                            ...(field.type === 'TableInTable' && {
                                minSize: 600,
                                enableEditing: false,
                                cell: ({ cell, row }) => {
                                    return (
                                        <TableInTableCell
                                            key={`${field._id}-${row.original._id}`}
                                            field={field}
                                            parentRecordId={row.original._id || row.original.id}
                                            parentRecord={row.original}
                                            parentBoardId={currentBoard?._id}
                                            initialData={(row.original[field._id as keyof API.BoardItem] as any)?.data}
                                            knowledgeHub={knowledgeHub}
                                        />
                                    );
                                },
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
                                                        (type === 'channel'
                                                            ? (dataType as keyof typeof channelIconMapping)
                                                            : iconType[dataType as API.ProductType]) ?? 'web'
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
                                            boardType: currentBoard.type,
                                            extraProps,
                                            updateData: async (updatedValue) => {
                                                if (currentBoard?._id || (currentBoard as any)?.id) {
                                                    const updateData = { columnId: field._id || (field as any).id, value: updatedValue, id: rowId };
                                                    tableRef.current?.handleDataUpdate(updateData);
                                                }
                                            },
                                        });
                                        return;
                                    }
                                    if (!currentBoard) return;
                                },
                                ...((field.type === 'MultipleSelection' || field.type === 'MultipleAssignee') && {
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
            } else {
                if (currentBoardRef.current.type === 'Contacts') {
                    const nameField = currentBoardRef.current.fields.find((field) => field.default_field_name === 'name');
                    const fieldNameId = nameField?._id || (nameField as any)?.id;
                    if (fieldNameId) {
                        searchParams.append('sort', `fields.${fieldNameId}`);
                    }
                }
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
                            const flattenedFields = boardItem.fields || {};
                            const recordId = boardItem._id ?? boardItem.id;
                            return {
                                ...flattenedFields,
                                ...boardItem,
                                id: recordId,
                                board_item_id: recordId,
                                created_type: boardItem.created_type,
                                ...Object.keys(flattenedFields).reduce((acc, key) => {
                                    const fieldData = boardItem[key as keyof API.BoardItem];

                                    if (fieldData && typeof fieldData === 'object' && Array.isArray((fieldData as any).data)) {
                                        return {
                                            ...acc,
                                            [key]: fieldData as any,
                                        };
                                    }
                                    return acc;
                                }, {}),
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
                        data: data.data.map((boardItem) => {
                            if (boardItem.fields) {
                                Object.keys(boardItem).forEach((key) => {
                                    if (key in boardItem.fields) {
                                        (boardItem.fields as any)[key] = (boardItem as any)[key];
                                    }
                                });
                            }
                            return {
                                ...boardItem,
                                ...(boardItem.fields || {}),
                                id: boardItem.board_item_id || boardItem._id || '',
                            };
                        }),
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
                            await deleteRecord.mutateAsync({ boardId: currentBoard._id || (currentBoard as any).id, recordId: rowId });
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
        [currentBoard, t, dialog, deleteRecord, knowledgeHub],
    );

    useEffect(() => {
        if (!tab) {
            replaceUrl();
        } else {
            setCurrentTab(tab);
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
                    navigate(`${resolvedBasePath}/${currentBoard.id}`, { replace: true });
                },
            });
        }
    }, [currentBoard, recId, navigate, crm, openRecordDetail, resolvedBasePath]);

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
        if (!currentBoard) return;
        const isChildTableFlow =
            currentBoard.type === 'General' &&
            !!currentBoard.is_child_table &&
            !!currentBoard.attached_from;
        if (isChildTableFlow) {
            const attachedFrom = currentBoard.attached_from!;
            dialogForm<ParentRecordPickerFormType>({
                title: t('databoard_pick_parent_title'),
                paperSx: { width: '70vw', maxWidth: '960px' },
                content: (methods) => (
                    <ParentRecordPicker methods={methods} parentBoardId={attachedFrom.parent_board_id} />
                ),
                defaultValues: { parent_record_id: '' },
                confirmText: t('continue'),
                showCloseButton: true,
                hideCancelButton: true,
                actionsAlign: 'flex-start',
                onClose: () => {},
                onConfirm: async (formData) => {
                    openRecordDetail({
                        board: currentBoard,
                        recordId: 'new',
                        tableRef,
                        onClose: () => {
                            navigate(`${resolvedBasePath}/${currentBoard.id}`, { replace: true });
                        },
                        parentContext: {
                            parentBoardId: attachedFrom.parent_board_id,
                            parentItemId: formData.parent_record_id,
                            parentFieldId: attachedFrom.parent_board_field_id,
                        },
                    });
                    return true;
                },
                schema: parentRecordPickerSchema(t),
            });
            return;
        }
        openRecordDetail({
            board: currentBoard,
            recordId: 'new',
            tableRef,
            closeAfterCreate: isDataboardsRoute,
            onClose: () => {
                navigate(`${resolvedBasePath}/${currentBoard.id}`, { replace: true });
            },
        });
    }, [currentBoard, crm, navigate, openRecordDetail, resolvedBasePath, dialogForm, t, isDataboardsRoute]);

    const renderExtra = useCallback(() => {
        if (boards.length === 0 && !knowledgeHub) {
            if (documentAi) return null;
            return (
                <Space size={4} direction="vertical" align="start" style={{ width: '100%' }}>
                    <Button
                        size="s"
                        variant="text"
                        startIcon={<Icon name="add" />}
                        onClick={onNewBoard}
                        text={t(isDataboardsRoute ? 'databoards_new_board' : 'crm_add_new_board')}
                    />
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
                commsiq={commsiq}
                documentAi={documentAi}
                onCreateNewRecord={handleCreateNewRecord}
                isFilterVisible={isFilterVisible}
                isImportingData={isImportingData}
                boardMenuAnchorEl={boardMenuAnchorEl}
                onBoardMenuClose={() => setBoardMenuAnchorEl(null)}
                onEditBoard={isDataboardsRoute ? handleBoardSettings : undefined}
            />
        );
    }, [
        currentTab,
        filterCount,
        onFilterChange,
        selectedSegmentation,
        isFilterVisible,
        crm,
        commsiq,
        currentBoard,
        isImportingData,
        boards,
        onNewBoard,
        t,
        knowledgeHub,
        handleCreateNewRecord,
        resolvedBasePath,
        boardMenuAnchorEl,
    ]);

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
                    updateContainerRect={tableRef.current?.updateContainerRect ?? (() => {})}
                />
            </Space>
        );
    }, [currentBoard, t, getMemberOptionRequest, selectedSegmentation]);

    const emptyMessage = (tableState: Partial<TableState>) => {
        if (boards.length === 0) {
            if (documentAi) {
                return (
                    <Typography variant="SubHeading2">
                        <Trans
                            i18nKey="databoard_model_empty_via_agent"
                            components={[<Link to="/ai-agent" />]}
                        />
                    </Typography>
                );
            }
            return (
                <Typography variant="SubHeading2">
                    <Trans i18nKey={knowledgeHub ? 'knowledge_board_empty' : 'crm_board_empty'}>
                        <LinkButton
                            onClick={() => {
                                onNewBoard();
                            }}
                        >
                            {knowledgeHub ? 'Create your first board' : 'Create your first data board'}
                        </LinkButton>{' '}
                        {knowledgeHub ? 'to begin building your hub.' : 'and start to scale the business!'}
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
                <Trans i18nKey={documentAi ? 'databoard_create_model_description' : 'automation_create_description'}>
                    <LinkButton
                        onClick={() => {
                            tableRef.current?.addNewRecord();
                        }}
                    >
                        Create your first record now
                    </LinkButton>{' '}
                    and start to scale the business!
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
        // Re-read from `currentBoard` (object) so that after reordering fields via settings,
        // board refetch -> memo recompute -> if localStorage was cleared, the table follows the new field order.
        return order ? JSON.parse(order) : [];
    }, [currentBoard]);

    const getTitle = useCallback(() => {
        if (knowledgeHub) {
            return `${t('menu_knowledgeHub')} (V1)`;
        }
        if (crm) return t('menu_crm');
        if (documentAi) return t('menu_document_ai');
        return t('menu_databoards');
    }, [knowledgeHub, crm, documentAi, t]);

    return (
        <div style={{ height: '100%' }}>
            {!knowledgeHub && (
                <div className={`${styles.menuTitleContainer} ${isDataboardsRoute ? styles.databoardsRoute : ''}`}>
                    {isDataboardsRoute ? (
                        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" flexWrap="wrap" gap={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Link to="/databoards" style={{ textDecoration: 'none' }}>
                                    <Typography variant="Heading2" style={{ color: 'var(--color-light-7)', fontFamily: 'Roboto', fontWeight: 800, fontSize: '20px', lineHeight: '120%', letterSpacing: '0%' }}>
                                        Data Boards
                                    </Typography>
                                </Link>
                                {currentBoard && (
                                    <Box display="flex" alignItems="center" gap={0.75}>
                                        <Link to="/databoards" style={{ textDecoration: 'none' }}>
                                            <Typography variant="Caption" style={{ color: 'var(--color-light-5)', fontFamily: 'Roboto', fontWeight: 400, fontSize: '14px', lineHeight: '115%', letterSpacing: '0%', textDecoration: 'underline', textDecorationStyle: 'solid', cursor: 'pointer' }}>
                                                Board Index
                                            </Typography>
                                        </Link>
                                        <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                                            <path d="M0 9.015L0.885 9.9L5.835 4.95L0.885 0L0 0.885L4.065 4.95L0 9.015V9.015Z" fill="#BDBDBD"/>
                                        </svg>
                                        <Typography variant="Caption" style={{ color: 'var(--color-primary-1)', fontFamily: 'Roboto', fontWeight: 400, fontSize: '14px', lineHeight: '115%', letterSpacing: '0%', textDecoration: 'underline', textDecorationStyle: 'solid' }}>
                                            {currentBoard.name}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    ) : (
                        <Typography variant="Heading2">{getTitle()}</Typography>
                    )}
                </div>
            )}
            <Space
                size={0}
                direction="vertical"
                align="start"
                className={`${styles.boardContainer} ${knowledgeHub ? styles.knowledgeHub : ''} ${isDataboardsRoute ? styles.databoardsRoute : ''}`}
            >
                {isDataboardsRoute && currentBoard && (
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" sx={{ pb: 0.5 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="Heading2" style={{ fontFamily: 'Roboto', fontWeight: 600, fontSize: '16px', lineHeight: '150%', letterSpacing: '0%' }}>{currentBoard.name}</Typography>
                            <IconButton
                                size="s"
                                variant="text"
                                type="secondary"
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => setBoardMenuAnchorEl(e.currentTarget)}
                            >
                                <Icon name="settings" />
                            </IconButton>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            {connectedSchema && (
                                <Box
                                    display="flex"
                                    alignItems="center"
                                    gap={0.75}
                                    onClick={() => navigate(`/document-models/${connectedSchema.id}`)}
                                    sx={{
                                        px: 1.5,
                                        py: 0.75,
                                        bgcolor: '#fff8f0',
                                        border: '1px solid #f0d0a0',
                                        borderRadius: 1,
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: '#ffeedd' },
                                        transition: 'background-color 0.15s',
                                    }}
                                >
                                    <Icon name="list" style={{ fontSize: 18, color: 'var(--color-light-8)', flexShrink: 0 }} />
                                    <Typography variant="Caption" style={{ color: 'var(--color-light-7)', fontWeight: 500 }}>
                                        Linked Schema - {connectedSchema.name}
                                    </Typography>
                                </Box>
                            )}
                            <Button
                                onClick={() => handleCreateNewRecord()}
                                size="xxs"
                                startIcon={<Icon name="add" />}
                                variant="contained"
                                sx={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: '#156DF2' }}
                            />
                        </Box>
                    </Box>
                )}
                {renderExtra()}
                {fieldPopoverHolder}
                {dialogHolder}
                {recordDetailHolder}
                {isFilterVisible && renderFilter()}
                <FlexibleTable<API.BoardItem>
                    outlined
                    showFilter={false}
                    // Each route has different chrome above the table, so the viewport offset
                    // must be tuned per route — too small and the table overflows, pushing the
                    // pagination below the viewport. databoards has a breadcrumb + board-title
                    // header; crm needs a larger offset than the default 270px too.
                    // The table lives inside .app (height 100vh - --message-bar-height), but this
                    // calc uses raw 100vh — so subtract the var too. Otherwise the announcement bar
                    // is baked into the constant: flush while it shows, then a 54px gap once it's
                    // dismissed (.app grows back but the table doesn't). Both were tuned with the
                    // bar showing, so the 54px is pulled out of each base (databoards 250 → 196,
                    // crm 330 → 276) and replaced by the live var.
                    containerStyle={
                        isDataboardsRoute
                            ? { height: 'calc(100vh - 196px - var(--message-bar-height, 0px))' }
                            : crm
                              ? { height: 'calc(100vh - 276px - var(--message-bar-height, 0px))' }
                              : undefined
                    }
                    ref={tableRef}
                    queryKey={['databoard', currentBoard?._id || (currentBoard as any)?.id]}
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
