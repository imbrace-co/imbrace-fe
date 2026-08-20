import type { DropdownOption } from '@imbrace/ui';
import { Button, DropdownMenu, DropdownMenuItem, Icon, Select, Space, Tooltip, Typography, useDialog } from '@imbrace/ui';
import type { DividerOptionType } from '@imbrace/ui/dist/components/Dropdown';
import { DividerOption } from '@imbrace/ui/dist/components/Dropdown';
import { Badge, Box, CircularProgress } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MutableRefObject, RefObject } from 'react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type NavigateFunction, useNavigate } from 'react-router';

import TargetPersonIcon from '@/assets/icons/icon_target_person.svg?react';
import ThreeDotsIcon from '@/assets/icons/icon_three_dots.svg?react';
import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import { useNotify } from '@/contexts/SnackbarContext';
import useAccess from '@/hooks/useAccess';
import useNotification from '@/hooks/useNotification';
import { deleteBoardAutomationWithBoardId } from '@/services/api/boardAutomation';
import {
    attachChildBoard,
    deleteBoard as deleteBoardApi,
    detachChildBoard,
    exportCsvViaMail,
    getBoardConnections,
    getBoardRecords,
    getExportCsv,
    getOntology,
    postBoardRecord,
} from '@/services/api/crm';
import type { AxiosError } from 'axios';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { boardsQueryFn, boardsQueryKey } from '@/services/queries/board';
import { getIsAllowModify } from '@/utils/CookiesHelper';

import type { ExportCsvFormType } from '../Databoards/components/exportCsvForm';
import ExportCsvForm, { exportCsvFormSchema } from '../Databoards/components/exportCsvForm';
import type { ContainsRow, OntologyGraph } from './components/RelationForm/RelationsGraph';
import RelationsGraph from './components/RelationForm/RelationsGraph';
import type { AttachChildFormType } from './components/RelationForm/AttachChildForm';
import AttachChildForm, { attachChildFormSchema } from './components/RelationForm/AttachChildForm';
import { BoardSetting } from './components/BoardSetting';
import ImportDataboardFile from './components/ImportDataboardFile';
import MappingData from './components/ImportDataboardFile/Mapping';
import { SelectBoard } from './components/ImportDataboardFile/SelectBoard';
import type { SearchBarRef } from './searchBar';
import SearchBar from './searchBar';
import { showDateText } from '@/utils/DateTimeUtils';

interface ExtraProps {
    currentTab: string;
    currentBoard: API.Board;
    selectedSegmentation: API.Segmentation | undefined;
    setSelectedSegmentation: (segmentation: API.Segmentation | undefined) => void;
    tableRef: RefObject<FlexibleTableRef<API.BoardItem>>;
    navigateRef: MutableRefObject<NavigateFunction>;
    searchBarRef: RefObject<SearchBarRef>;
    setGlobalSearch: (search?: string) => void;
    setCurrentTab: (tab: string) => void;
    onFilterChange: () => void;
    filterCount?: number;
    crm?: boolean;
    knowledgeHub?: boolean;
    commsiq?: boolean;
    documentAi?: boolean;
    selectSegmentationDialog: () => void;
    createUpdateSegmentationDialog: (defaultValues: Partial<API.Segmentation>, isEdit?: boolean) => Promise<void>;
    onCreateNewRecord: () => void;
    isFilterVisible: boolean;
    isImportingData: boolean;
    boardMenuAnchorEl?: HTMLElement | null;
    onBoardMenuClose?: () => void;
    onEditBoard?: () => void;
}

interface Option extends DropdownOption<string> {
    index: string;
    handler?: () => void;
}

const handleCreateRecord = async (params: { boardId: string; fieldId?: string; boardName?: string }) => {
    // Reason: /data-board/boards/<id>/items requires board_field_id (Zod 400).
    // The caller is supposed to pass the identifier field's _id; if it's
    // missing the only safe move is to abort instead of firing a doomed POST.
    if (!params.fieldId) {
        console.warn('handleCreateRecord: missing fieldId, abort', params);
        return;
    }
    try {
        const { data } = await apiFetch<API.PaginatedResponse<API.BoardItem[]>>(
            getBoardRecords.api(params.boardId),
            getBoardRecords.method,
            {
                limit: 1,
                skip: 0,
            },
        );
        const value = `${params.boardName} ${data.count + 1}`;
        const { data: rawRecord } = await apiFetch<{ data: API.BoardItem } | API.BoardItem>(postBoardRecord.api(params.boardId), postBoardRecord.method, {
            fields: [{ board_field_id: params.fieldId, value }],
        });

        const record = (rawRecord as { data: API.BoardItem }).data ?? (rawRecord as API.BoardItem);
        return record;
    } catch (error) {
        console.log(error);
    }
};

const BoardMenu = ({
    menuOptions,
    anchorEl,
    onClose,
}: {
    menuOptions: (Option | DividerOptionType)[];
    // Controlled mode: when `anchorEl` is provided (non-undefined), the menu is anchored to an
    // external element (e.g. the board title's settings icon) and no trigger button is rendered.
    anchorEl?: HTMLElement | null;
    onClose?: () => void;
}) => {
    const iconButtonRef = useRef<HTMLButtonElement>(null);
    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const { showViewOnlyToast } = useNotification();
    const isAllowModifyBoardAuto = getIsAllowModify();
    const isControlled = anchorEl !== undefined;

    const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setMenuOpen(true);
    }, []);

    const handleMenuClose = useCallback(() => {
        setMenuOpen(false);
        onClose?.();
    }, [onClose]);

    return (
        <div style={{ position: 'relative' }}>
            {!isControlled && (
                <Button
                    size="xxs"
                    sx={{ width: '40px', height: '40px', borderRadius: '8px' }}
                    ref={iconButtonRef}
                    startIcon={<ThreeDotsIcon />}
                    onClick={handleMenuOpen}
                />
            )}
            <DropdownMenu
                open={isControlled ? Boolean(anchorEl) : menuOpen}
                onClose={handleMenuClose}
                disableAutoFocusItem
                anchorEl={isControlled ? anchorEl : iconButtonRef.current}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                disableEnforceFocus
                sx={{
                    '& .MuiPaper-root': {
                        marginTop: '4px',
                        minWidth: '160px',
                    },
                }}
            >
                {menuOptions?.map((option, index) => {
                    if ('type' in option) {
                        return (
                            <div key={`divider-${index}`} style={{ padding: '8px 12px' }}>
                                <DividerOption fullWidth={option.fullWidth} key={`divider-${index}`} />
                            </div>
                        );
                    }
                    return (
                        <Tooltip
                            key={`menu-${index}`}
                            placement="bottom"
                            disableFocusListener
                            disableTouchListener
                            arrow
                            title={option.tooltip || ''}
                        >
                            <div>
                                <DropdownMenuItem
                                    className={!isAllowModifyBoardAuto && option.index === 'board-automation' ? 'view-only' : ''}
                                    sx={{
                                        ...option.sx,
                                        padding: '8px 16px',
                                        '&:hover': {
                                            backgroundColor: 'var(--color-grey-3)',
                                        },
                                    }}
                                    color={option.textColor}
                                    disabled={option.disabled || option.loading}
                                    onClick={() => {
                                        if (!isAllowModifyBoardAuto && option.index === 'board-automation') {
                                            showViewOnlyToast();
                                            return;
                                        }
                                        option.handler?.();
                                        handleMenuClose();
                                    }}
                                >
                                    {option.loading && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <CircularProgress size={16} />
                                        </div>
                                    )}
                                    {option.text && <Typography {...option.typographyProps}>{option.text}</Typography>}
                                </DropdownMenuItem>
                            </div>
                        </Tooltip>
                    );
                })}
            </DropdownMenu>
        </div>
    );
};

const Extra = (props: ExtraProps) => {
    const {
        currentTab,
        setGlobalSearch,
        setCurrentTab,
        selectedSegmentation,
        setSelectedSegmentation,
        navigateRef,
        tableRef,
        searchBarRef,
        onFilterChange,
        filterCount,
        crm,
        knowledgeHub,
        commsiq,
        documentAi,
        currentBoard,
        selectSegmentationDialog,
        createUpdateSegmentationDialog,
        onCreateNewRecord,
        isFilterVisible,
        isImportingData,
        boardMenuAnchorEl,
        onBoardMenuClose,
        onEditBoard,
    } = props;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { isAdmin } = useAccess();
    const [{ dialog, dialogForm }, dialogHolder] = useDialog();
    const { notify } = useNotify();

    const resolvedBasePath = knowledgeHub
        ? '/knowledge-hub-all'
        : commsiq
          ? '/commsiq'
          : crm
            ? '/crm'
            : documentAi
              ? '/document-ai'
              : '/databoards';
    const variant: 'default' | 'knowledgeHubAll' = knowledgeHub ? 'knowledgeHubAll' : 'default';
    const isDocumentAiRoute = !!documentAi;
    const isDataboardsRoute = !crm && !knowledgeHub && !commsiq && !documentAi;
    const isDocumentAIRoute = isDocumentAiRoute;
    const boardsListQueryKey = boardsQueryKey({
        isDefault: knowledgeHub || documentAi ? undefined : !!crm,
        types: knowledgeHub
            ? 'KnowledgeHub'
            : documentAi
              ? 'DocumentAI'
              : !crm && !commsiq
                ? 'General'
                : undefined,
    });

    const createRecord = useMutation({
        mutationFn: handleCreateRecord,
        onSuccess: (record) => {
            if (record) {
                navigateRef.current?.(`/crm/${currentTab}/${record._id}`);
            }
        },
    });

    const exportCsv = useMutation({
        mutationFn: async (formData: ExportCsvFormType) => {
            const { range, start_date, end_date, by, members } = formData;
            const queryKey = {
                tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
                quick_range: range,
                start_date: start_date,
                end_date: end_date,
                all: range === 'all',
                by: by,
                sort: `-${by === 'creation' ? 'created_at' : 'updated_at'}`,
            };
            const res = await apiFetch<Blob>(getExportCsv.api(currentBoard?._id || ''), getExportCsv.method, queryKey, ImbraceClient, {
                responseType: 'blob',
            });
            await apiFetch<{ sent_emails: string[] }>(exportCsvViaMail.api(currentBoard?._id, queryKey), exportCsvViaMail.method, {
                sendEmail: true,
                email: members,
            });

            return { response: res, formData };
        },
        onSuccess: ({ response, formData }) => {
            const notiRangeText = {
                week: 'in the last week',
                month: 'in the last month',
                '3months': 'in the last 3 months',
                '6months': 'in the last 6 months',
                '12months': 'in the last 12 months',
                specific_date_range: `on ${showDateText(formData.start_date) || 'begin'} - ${showDateText(formData.end_date)}`,
                all: 'all',
            };
            const membersLength = formData.members.length;
            const link = document.createElement('a');
            const href = URL.createObjectURL(new Blob(['\ufeff', '\ufeff', response.data]));
            const header = response.headers['content-disposition'];
            let filename = '';
            if (header.includes("filename*=UTF-8''")) {
                const encodedFilename = header.split("filename*=UTF-8''")[1];
                filename = decodeURIComponent(encodedFilename);
            } else if (header.includes('filename=')) {
                // Standard
                filename = header.split('filename=')[1];
            }
            link.setAttribute('target', '_blank');
            link.setAttribute('href', href);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(href);
            notify({
                type: 'success',
                message:
                    formData.range === 'all'
                        ? t('exported_all_records_csv_success')
                        : t('exported_csv_success', {
                              by: formData.by === 'creation' ? 'created' : 'updated',
                              duration: notiRangeText[formData.range],
                          }),
            });
            notify({
                type: 'success',
                message: t('send_exported_csv_to_success', {
                    who:
                        membersLength === 1
                            ? formData.members[0]
                            : `${formData.members[0]} and ${membersLength - 1} ${membersLength - 1 > 1 ? 'others' : 'other'}`,
                }),
            });
        },
    });

    const onClickOntologyMenuRef = useRef<null | (() => Promise<void> | void)>(null);

    const openAttachForm = useCallback(
        (editing?: { fieldName: string; childBoardId: string }) => {
            if (!currentBoard?._id) return;
            const currentBoardId = currentBoard._id;
            const currentBoardType = currentBoard.type;
            const isEdit = !!editing;
            dialogForm<AttachChildFormType>({
                title: t(isEdit ? 'databoard_edit_relation_dialog_title' : 'databoard_attach_dialog_title'),
                content: (methods) => (
                    <AttachChildForm
                        methods={methods}
                        currentBoardId={currentBoardId}
                        currentBoardType={currentBoardType}
                        excludeBoardIds={[currentBoardId]}
                    />
                ),
                defaultValues: {
                    field_name: editing?.fieldName ?? '',
                    child_board_id: editing?.childBoardId ?? '',
                },
                confirmText: t(isEdit ? 'update' : 'create'),
                showCloseButton: true,
                hideCancelButton: true,
                actionsAlign: 'flex-start',
                onClose: () => {},
                onConfirm: async (formData, methods) => {
                    try {
                        // Re-check items count to enforce the v1 block.
                        const { data: itemsResp } = await apiFetch<API.PaginatedResponse<API.BoardItem[]>>(
                            `/data-board/boards/${formData.child_board_id}/items?limit=1&skip=0`,
                            'GET',
                        );
                        if ((itemsResp?.count ?? 0) > 0) {
                            methods?.setError('child_board_id', {
                                type: 'custom',
                                message: t('databoard_attach_blocked_items', { count: itemsResp.count }),
                            });
                            return false;
                        }
                        if (isEdit) {
                            // Detach-then-attach; keep child independent on detach so it can be re-attached.
                            try {
                                await apiFetch(
                                    detachChildBoard.api(currentBoardId, editing!.childBoardId),
                                    detachChildBoard.method,
                                    { restore_as_independent: true },
                                );
                            } catch (err) {
                                console.error('detach failed', err);
                                notify({ type: 'error', message: t('databoard_detach_error') });
                                return false;
                            }
                            try {
                                await apiFetch<API.Board>(
                                    attachChildBoard.api(currentBoardId),
                                    attachChildBoard.method,
                                    {
                                        child_board_id: formData.child_board_id,
                                        field_name: formData.field_name.trim(),
                                        item_mapping: [],
                                    },
                                );
                            } catch (err) {
                                console.error('attach failed after detach', err);
                                notify({ type: 'error', message: t('databoard_edit_relation_partial_fail') });
                                setTimeout(() => onClickOntologyMenuRef.current?.(), 0);
                                return true; // close dialog so user can start over
                            }
                        } else {
                            await apiFetch<API.Board>(
                                attachChildBoard.api(currentBoardId),
                                attachChildBoard.method,
                                {
                                    child_board_id: formData.child_board_id,
                                    field_name: formData.field_name.trim(),
                                    item_mapping: [],
                                },
                            );
                        }
                        notify({ type: 'success', message: t('databoard_attach_success') });
                        await queryClient.refetchQueries({ queryKey: boardsListQueryKey });
                        setTimeout(() => onClickOntologyMenuRef.current?.(), 0);
                        return true;
                    } catch (error) {
                        const err = error as AxiosError<{ code?: string; message?: string }>;
                        const code = err.response?.data?.code;
                        if (code === 'FIELD_NAME_TAKEN') {
                            methods?.setError('field_name', {
                                type: 'custom',
                                message: t('fields_management_form_duplicate_name'),
                            });
                            return false;
                        }
                        notify({
                            type: 'error',
                            message: err.response?.data?.message || t('databoard_attach_error'),
                        });
                        return false;
                    }
                },
                schema: attachChildFormSchema(t, currentBoardId),
            });
        },
        [currentBoard?._id, dialogForm, t, notify, queryClient, boardsListQueryKey],
    );

    const openDetachConfirm = useCallback(
        (row: ContainsRow) => {
            if (!currentBoard?._id) return;
            const currentBoardId = currentBoard._id;
            dialog({
                title: t('databoard_detach_confirm_title'),
                content: t('databoard_detach_confirm_body', { name: row.targetLabel }),
                confirmText: t('delete'),
                cancelText: t('cancel'),
                confirmButtonProps: { type: 'danger' },
                onClose: () => {},
                onConfirm: async () => {
                    try {
                        await apiFetch(
                            detachChildBoard.api(currentBoardId, row.targetBoardId),
                            detachChildBoard.method,
                            { restore_as_independent: true },
                        );
                        notify({ type: 'success', message: t('databoard_detach_success') });
                        await queryClient.refetchQueries({ queryKey: boardsListQueryKey });
                        setTimeout(() => onClickOntologyMenuRef.current?.(), 0);
                        return true;
                    } catch (error) {
                        console.error(error);
                        notify({ type: 'error', message: t('databoard_detach_error') });
                        return false;
                    }
                },
            });
        },
        [currentBoard?._id, dialog, t, notify, queryClient, boardsListQueryKey],
    );

    const onClickOntologyMenu = useCallback(async () => {
        if (!currentBoard?._id) return;
        const currentBoardId = currentBoard._id;
        try {
            const [graphResp, connectionsResp] = await Promise.all([
                apiFetch<OntologyGraph>(
                    getOntology.api({
                        seedBoardId: currentBoardId,
                        includeHidden: true,
                        includeChildTables: true,
                    }),
                    getOntology.method,
                ),
                apiFetch<API.BoardConnectionsResponse>(
                    getBoardConnections.api(currentBoardId),
                    getBoardConnections.method,
                ).catch((err) => {
                    // Connections is a best-effort side-panel; fall back to edge-derived list.
                    console.warn('Failed to load board connections', err);
                    return { data: undefined };
                }),
            ]);
            const data = graphResp.data;
            const connections = connectionsResp?.data;
            dialog({
                title: t('databoard_relations_dialog_title'),
                paperSx: { width: '90vw', maxWidth: '1200px' },
                showCloseButton: true,
                hideCancelButton: true,
                hideConfirmButton: true,
                actionsAlign: 'flex-start',
                content: ({ onClose }) => (
                    <RelationsGraph
                        currentBoardId={currentBoardId}
                        graph={data}
                        connections={connections}
                        onAddRelation={() => {
                            onClose?.();
                            openAttachForm();
                        }}
                        onEditRelation={(row) => {
                            onClose?.();
                            openAttachForm({
                                fieldName: row.viaFieldName ?? '',
                                childBoardId: row.targetBoardId,
                            });
                        }}
                        onDeleteRelation={(row) => {
                            onClose?.();
                            openDetachConfirm(row);
                        }}
                    />
                ),
            });
        } catch (error) {
            console.error('Failed to load ontology', error);
            notify({
                type: 'error',
                message: t('databoard_relations_load_error'),
            });
        }
    }, [currentBoard?._id, dialog, t, notify, openAttachForm, openDetachConfirm]);

    onClickOntologyMenuRef.current = onClickOntologyMenu;

    const onExportCsv = useCallback(async () => {
        dialogForm<ExportCsvFormType>({
            title: t('export_data_range'),
            content: (methods) => <ExportCsvForm methods={methods} knowledgeHub={knowledgeHub} />,
            confirmText: t('export_csv'),
            hideCancelButton: true,
            showCloseButton: true,
            onClose: () => {},
            onConfirm: async (formData) => {
                try {
                    await exportCsv.mutateAsync(formData);
                    return true;
                } catch (error) {
                    console.log(error);
                    return false;
                }
            },
            actionsAlign: 'flex-start',
            confirmButtonProps: {
                size: 'default',
            },
            schema: exportCsvFormSchema(t),
        });
    }, [exportCsv, t, dialogForm, knowledgeHub]);

    const onMappingData = useCallback(
        (file: string | File, selectedBoardId: string, selectedBoardType: string, isCurrentBoardTypeChanged: boolean) => {
            if (!currentBoard?._id) return;
            dialog({
                title: t('crm_import_map_file_into_field_title'),
                paperSx: {
                    width: '80%',
                    maxWidth: '800px',
                },
                content: ({ onClose }) => (
                    <MappingData
                        file={file}
                        id={selectedBoardId}
                        onBack={() => {
                            onImportCsv();
                            onClose?.();
                        }}
                        onClose={async () => {
                            if (isCurrentBoardTypeChanged) {
                                navigate(`/${selectedBoardType}/${selectedBoardId}`);
                            } else {
                                navigateRef.current?.(`${resolvedBasePath}/${selectedBoardId}`, { replace: true });
                                await queryClient.refetchQueries({
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
                                setCurrentTab(selectedBoardId);
                            }
                            onClose?.();
                        }}
                        tableRef={tableRef}
                    />
                ),
                confirmText: t('save'),
                hideCancelButton: true,
                hideConfirmButton: true,
                showCloseButton: true,
            });
        },
        [currentBoard, navigate],
    );

    const onSelectBoardToImport = useCallback(
        (file: string | File) => {
            dialog({
                title: t('crm_import_select_board_title', { defaultValue: 'Import data into the board' }),
                content: ({ onClose }) => (
                    <SelectBoard
                        onNext={(selectedBoardId, selectedBoardType, isCurrentBoardTypeChanged) => {
                            onMappingData(file, selectedBoardId, selectedBoardType, isCurrentBoardTypeChanged);
                            onClose?.();
                        }}
                        knowledgeHub={knowledgeHub}
                        crm={crm}
                        currentBoard={currentBoard}
                    />
                ),
                hideCancelButton: true,
                hideConfirmButton: true,
            });
        },
        [currentBoard, knowledgeHub, crm, onMappingData, t],
    );

    const onImportCsv = useCallback(() => {
        dialog({
            title: t('crm_import_upload_file_title'),
            content: ({ onClose }) => <ImportDataboardFile onClose={onClose} onSuccess={onSelectBoardToImport} />,
            confirmText: t('upload'),
            hideConfirmButton: true,
            hideCancelButton: true,
            showCloseButton: true,
            onClose: () => {},
            onConfirm: () => {},
            actionsAlign: 'flex-start',
            confirmButtonProps: {
                size: 'default',
            },
        });
    }, [onMappingData]);

    const deleteBoard = useMutation({
        mutationFn: async ({ boardId }: { boardId: string }) => {
            const deleteRes = await apiFetch(deleteBoardApi.api(boardId), deleteBoardApi.method);
            if (deleteRes.status === 200) {
                try {
                    await apiFetch(deleteBoardAutomationWithBoardId.api(boardId), deleteBoardAutomationWithBoardId.method, {}, ImbraceClient);
                } catch (error) {
                    console.log('Error on removing board associated automations: ', error);
                }
            }
        },
        onSuccess: async (data, { boardId }) => {
            await queryClient.refetchQueries({ queryKey: boardsListQueryKey });
            if (currentTab === boardId) {
                const remainingBoards = (queryClient.getQueryData(boardsListQueryKey) as API.Board[] | undefined) ?? [];
                const nextBoardId = remainingBoards[0]?._id;
                if (nextBoardId) {
                    navigateRef.current?.(`${resolvedBasePath}/${nextBoardId}`, { replace: true });
                    setCurrentTab(nextBoardId);
                    return;
                }
                // No boards left: keep user on Knowledge Board tab (empty state) instead of switching back to Drive.
                navigateRef.current?.(`${resolvedBasePath}`, { replace: true, state: { preferTab: 'board' } });
            }
        },
    });

    const onDeleteBoard = useCallback(() => {
        const isDocumentAIBoard = currentBoard?.type === 'DocumentAI';
        dialog({
            title: isDocumentAIBoard ? t('board_document_ai_delete_header') : t('board_delete_header'),
            content: isDocumentAIBoard ? t('board_document_ai_delete_desc') : t('board_delete_header_desc'),
            confirmText: t('delete'),
            confirmButtonProps: {
                type: 'danger',
            },
            cancelText: t('cancel'),
            onClose: () => {},
            onConfirm: async () => {
                try {
                    await deleteBoard.mutateAsync({ boardId: currentBoard.id || currentBoard._id });
                    return true;
                } catch (error) {
                    console.error(error);
                    return false;
                }
            },
        });
    }, [deleteBoard, currentBoard, t]);

    const boardMenu = useMemo(() => {
        if (!currentBoard) return [];

        const defaultOptions = [
            {
                text: t(
                    isDocumentAiRoute
                        ? 'databoard_edit_model'
                        : isDataboardsRoute
                          ? 'databoards_edit_board'
                          : 'crm_edit_board',
                ),
                index: 'edit-board',
                handler: () => {
                    // The databoards route owns its own settings dialog (simpleMode/fillLayout),
                    // so let the parent override the default edit dialog.
                    if (onEditBoard) {
                        onEditBoard();
                        return;
                    }
                    dialog({
                        title: '',
                        paperSx: {
                            width: '90vw',
                            maxWidth: '1200px',
                        },
                        content: ({ onClose }) => {
                            return (
                                <BoardSetting
                                    crm={crm}
                                    knowledgeHub={knowledgeHub}
                                    commsiq={commsiq}
                                    documentAi={documentAi}
                                    board={currentBoard}
                                    onDeleteBoard={onDeleteBoard}
                                    onClose={onClose}
                                    navigateRef={navigateRef}
                                    setCurrentTab={setCurrentTab}
                                    tableRef={tableRef}
                                />
                            );
                        },
                        confirmText: t('save'),
                        hideCancelButton: true,
                        hideConfirmButton: true,
                        showCloseButton: true,
                        actionsAlign: 'flex-start',
                    });
                },
            },
            { type: 'divider', index: 'divider' },
            {
                text: `${t(isDocumentAiRoute ? 'databoard_model_automation' : 'board_automation')}`,
                index: 'board-automation',
                handler: () => {
                    navigateRef.current(`${resolvedBasePath}/${currentBoard.id || currentBoard._id}/automations`, {
                        state: { board: currentBoard },
                    });
                },
            },
        ];

        const exportOption = {
            text: `${t('export')}`,
            index: 'export_as_csv',
            handler: () => {
                onExportCsv();
            },
        };

        const importOption = {
            text: isImportingData ? 'Importing...' : t('import', { defaultValue: 'Import' }),
            index: 'import_as_csv',
            ...(isImportingData && {
                typographyProps: {
                    style: {
                        color: 'var(--color-light-4)',
                    },
                },
            }),
            disabled: isImportingData,
            handler: () => {
                if (isImportingData) return;
                onImportCsv();
            },
        };

        if (!isAdmin()) {
            return [...defaultOptions, exportOption, importOption]; // Only return manage fields option for non-admins
        }

        if (currentBoard.type === 'System') {
            return [...defaultOptions, { type: 'divider', index: 'divider' }, importOption, exportOption];
        }

        const isDeleteBoardAllowed =
            currentBoard.type === 'General' ||
            currentBoard.type === 'KnowledgeHub' ||
            currentBoard.type === 'DocumentAI';

        return [
            ...defaultOptions,
            { type: 'divider', index: 'divider' },
            exportOption,
            importOption,
            {
                text: `${t('delete')}`,
                index: 'delete-board',
                ...(isDeleteBoardAllowed && {
                    typographyProps: {
                        style: {
                            color: 'var(--color-danger-1)',
                        },
                    },
                }),
                ...(!isDeleteBoardAllowed && {
                    tooltip: t('board_default_cannot_delete'),
                }),
                disabled: !isDeleteBoardAllowed,
                handler: () => {
                    onDeleteBoard();
                },
            },
        ];
    }, [dialog, t, navigateRef, crm, knowledgeHub, isAdmin, onExportCsv, onClickOntologyMenu, setCurrentTab, isDocumentAIRoute, onEditBoard]);

    const ButtonNewBoard = () => {
        if (isDataboardsRoute) return null;
        if (isAdmin() && !crm) {
            const onClick = () => {
                dialog({
                    title: '',
                    paperSx: {
                        width: '90vw',
                        maxWidth: '1200px',
                    },
                    content: ({ onClose }) => {
                        return (
                            <BoardSetting
                                board={undefined}
                                onClose={onClose}
                                navigateRef={navigateRef}
                                knowledgeHub={knowledgeHub}
                                commsiq={commsiq}
                                documentAi={documentAi}
                                setCurrentTab={setCurrentTab}
                                tableRef={tableRef}
                            />
                        );
                    },
                    confirmText: t('save'),
                    hideCancelButton: true,
                    hideConfirmButton: true,
                    showCloseButton: true,
                    actionsAlign: 'flex-start',
                });
            };
            return (
                <Button
                    onClick={onClick}
                    size="default"
                    variant="outlined"
                    text={t(isDataboardsRoute ? 'databoards_new_board' : 'crm_add_new_board')}
                />
            );
        }
        return null;
    };

    const SegmentationButton = () => {
        return (
            <Space>
                <Button
                    onClick={() => {
                        selectSegmentationDialog();
                    }}
                    sx={{
                        width: '100%',
                        textDecoration: 'underline',
                        ...(isDataboardsRoute ? { fontWeight: 400 } : {}),
                    }}
                    size="l"
                    {...(!isDataboardsRoute && { startIcon: <TargetPersonIcon /> })}
                    variant="link"
                    text={t('crm_segmentation_title')}
                />
                {selectedSegmentation && (
                    <Space style={{ padding: '4px 8px', backgroundColor: '#85EFAE', cursor: 'pointer', display: 'inline-flex' }}>
                        <Typography
                            style={{
                                whiteSpace: 'nowrap',
                                flex: '0 0 auto',
                            }}
                            onClick={() => {
                                const defaultFilters = selectedSegmentation.filters.map((filter) => {
                                    const currentField = currentBoard?.fields.find((field) => field._id === filter.field_id);
                                    const { field_id, operator, condition, value } = filter;
                                    if (currentField?.type === 'Date' && typeof filter.value === 'string') {
                                        return {
                                            field_id,
                                            operator,
                                            condition,
                                            value: ['exactly', filter.value],
                                        };
                                    }
                                    return {
                                        field_id,
                                        operator,
                                        condition,
                                        value,
                                    };
                                });

                                createUpdateSegmentationDialog(
                                    {
                                        _id: selectedSegmentation._id,
                                        name: selectedSegmentation.name,
                                        description: selectedSegmentation.description,
                                        filters: defaultFilters,
                                    },
                                    true,
                                );
                            }}
                        >
                            {selectedSegmentation.name}
                        </Typography>
                        <Icon
                            onClick={() => {
                                setSelectedSegmentation(undefined);
                                tableRef.current?.setColumnFilters([]);
                            }}
                            name="close"
                        />
                    </Space>
                )}
            </Space>
        );
    };

    return (
        <Space size={0} style={{ width: '100%' }}>
            {dialogHolder}
            {/* Databoards route: the menu is anchored to the settings icon next to the board title (rendered by the parent page) */}
            {isDataboardsRoute && <BoardMenu menuOptions={boardMenu} anchorEl={boardMenuAnchorEl ?? null} onClose={onBoardMenuClose} />}
            <Space direction="vertical" align="start" style={{ width: '100%' }}>
                {variant !== 'knowledgeHubAll' ? (
                    <>
                        <Space direction="horizontal" align="start" justify="between" style={{ width: '100%' }}>
                            <Space>
                                {/* Select board */}
                                {!isDataboardsRoute && (
                                    <Space size={0} style={{ width: '100%' }}>
                                        <Select
                                            searchable
                                            fullWidth
                                            value={currentTab}
                                            onChange={(value) => {
                                                setGlobalSearch('');
                                                searchBarRef.current?.reset();
                                                tableRef.current?.reset();
                                                navigateRef.current?.(`${resolvedBasePath}/${value}`, { replace: true });
                                                if (value) {
                                                    setCurrentTab(value);
                                                }
                                            }}
                                            queryKey={boardsQueryKey({
                                                isDefault: knowledgeHub || documentAi ? undefined : !!crm,
                                                types: knowledgeHub
                                                    ? 'KnowledgeHub'
                                                    : documentAi
                                                      ? 'DocumentAI'
                                                      : !crm && !commsiq
                                                        ? 'General'
                                                        : undefined,
                                            })}
                                            request={boardsQueryFn({
                                                isDefault: knowledgeHub || documentAi ? undefined : !!crm,
                                                types: knowledgeHub
                                                    ? 'KnowledgeHub'
                                                    : documentAi
                                                      ? 'DocumentAI'
                                                      : !crm && !commsiq
                                                        ? 'General'
                                                        : undefined,
                                            })}
                                            querySelect={(boards: API.Board[]) => {
                                                // The /crm route lists CRM boards only. General / KnowledgeHub /
                                                // DocumentAI boards have their own dedicated routes, so exclude them.
                                                return boards
                                                    .filter((option) => !crm || !['General', 'KnowledgeHub', 'DocumentAI'].includes(option.type))
                                                    .map((option) => ({
                                                        value: option.id || option._id,
                                                        text: option.name,
                                                    }));
                                            }}
                                            containerStyle={{
                                                width: '492px',
                                            }}
                                        />
                                    </Space>
                                )}
                                {!isDataboardsRoute && <BoardMenu menuOptions={boardMenu} />}
                            </Space>
                            <Space align="end" justify="end" style={{ flex: 1 }}>
                                <ButtonNewBoard />
                            </Space>
                        </Space>
                        <Space direction="horizontal" align="center" justify={isDataboardsRoute ? 'end' : 'between'} style={{ width: '100%', marginTop: isDataboardsRoute ? '0' : '20px' }}>
                            {/* Segmentation (non-databoards routes keep it inline here) */}
                            {!isDataboardsRoute && <SegmentationButton />}
                            <Space direction="horizontal" align="center">
                                {/* Ontology / Add Relation cut from OSS edition */}
                                {/* New Record */}
                                {!isDataboardsRoute && (
                                    <Button
                                        onClick={() => {
                                            if (currentBoard) {
                                                if (crm) {
                                                    createRecord.mutate({
                                                        boardId: currentTab,
                                                        // Migrated boards carry snake_case (is_identifier); fresh PG boards
                                                        // emit camelCase (isIdentifier). Fall back to the first non-deprecated
                                                        // field so boards without any flagged identifier still get a record
                                                        // (legacy Mongo always seeded a "Name" field as identifier on create —
                                                        // the new PG create flow doesn't, so unconfigured boards have none).
                                                        fieldId:
                                                            currentBoard.fields.find((field) => field.is_identifier || (field as any).isIdentifier)?._id ??
                                                            currentBoard.fields.find((field) => !field.is_deprecated && !(field as any).isDeprecated)?._id,
                                                        boardName: currentBoard.name,
                                                    });
                                                } else {
                                                    onCreateNewRecord();
                                                }
                                            }
                                        }}
                                        size={isDocumentAIRoute ? 'default' : 'xxs'}
                                        startIcon={<Icon name="add" />}
                                        variant="contained"
                                        text={isDocumentAIRoute ? t('databoard_add_record') : undefined}
                                        sx={
                                            isDocumentAIRoute
                                                ? { height: '40px', borderRadius: '8px' }
                                                : { width: '40px', height: '40px', borderRadius: '8px' }
                                        }
                                    />
                                )}
                            </Space>
                        </Space>
                    </>
                ) : (
                    <Space direction="horizontal" align="center" justify="between" style={{ width: '100%' }}>
                        <Typography
                            style={{
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                color: 'var(--color-light-7)',
                                fontSize: '16px',
                            }}
                        >
                            {currentBoard?.name || ''}
                        </Typography>
                        <Space align="center">
                            <BoardMenu menuOptions={boardMenu} />
                            <Button
                                variant="contained"
                                text={t('knowledge_new_record')}
                                onClick={() => {
                                    onCreateNewRecord();
                                }}
                            />
                        </Space>
                    </Space>
                )}
                {!isFilterVisible && (
                    <Space style={{ width: '100%', border: '1px solid #135DD5', borderBottom: 'none' }} size={0}>
                        {/* Filter */}
                        <Space
                            direction="horizontal"
                            align="center"
                            justify="between"
                            style={{ width: '128px', height: '40px', padding: '0 8px', borderRight: '1px solid #135DD5' }}
                        >
                            <Badge
                                badgeContent={filterCount}
                                sx={{
                                    '& .MuiBadge-badge': {
                                        background: '#FFE8D3',
                                        color: 'var(--color-primary-1)',
                                        width: '16px',
                                        height: '16px',
                                        minWidth: '16px',
                                        fontSize: '12px',
                                        borderRadius: '8px',
                                        padding: 0,
                                        top: '12px',
                                        right: '-14px',
                                    },
                                }}
                            >
                                <Button
                                    onClick={(e) => {
                                        onFilterChange();
                                        e.currentTarget.blur();
                                    }}
                                    variant="link"
                                    text={t('filter')}
                                    sx={{
                                        fontWeight: 400,
                                        textDecoration: 'underline',
                                    }}
                                />
                            </Badge>
                            {isDataboardsRoute ? (
                                <Box sx={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', flexShrink: 0 }}>
                                    <Icon style={{ color: '#135DD5', fontSize: 24 }} type="secondary" name="filter" />
                                </Box>
                            ) : (
                                <Icon style={{ color: '#135DD5' }} width={32} height={32} type="secondary" name="filter" />
                            )}
                        </Space>
                        {/* Segmentation — databoards route only (other routes keep it in the top row) */}
                        {isDataboardsRoute && (
                            <Space
                                direction="horizontal"
                                align="center"
                                justify="between"
                                style={{ height: '40px', padding: '0 8px', borderRight: '1px solid #135DD5', flexShrink: 0, minWidth: '220px' }}
                            >
                                <SegmentationButton />
                                <Box sx={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', flexShrink: 0 }}>
                                    <TargetPersonIcon width={22} height={22} />
                                </Box>
                            </Space>
                        )}
                        {/* Search */}
                        <div style={{ width: '100%' }}>
                            <SearchBar
                                ref={searchBarRef}
                                onSearch={(searchText) => {
                                    setGlobalSearch(searchText);
                                }}
                            />
                        </div>
                        {/* Create Records - databoards only */}
                        {isDataboardsRoute && (
                            <Space
                                direction="horizontal"
                                align="center"
                                style={{ height: '40px', padding: '0 24px', borderLeft: '1px solid #135DD5', flexShrink: 0 }}
                            >
                                <Button
                                    onClick={() => {
                                        if (currentBoard) {
                                            onCreateNewRecord();
                                        }
                                    }}
                                    size="default"
                                    startIcon={
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <g clipPath="url(#clip0_4971_45539)">
                                                <path d="M17 19.22H5V7H12V5H5C3.9 5 3 5.9 3 7V19C3 20.1 3.9 21 5 21H17C18.1 21 19 20.1 19 19V12H17V19.22Z" fill="#156DF2"/>
                                                <path d="M19 2H17V5H14C14.01 5.01 14 7 14 7H17V9.99C17.01 10 19 9.99 19 9.99V7H22V5H19V2Z" fill="#156DF2"/>
                                                <path d="M15 9H7V11H15V9Z" fill="#156DF2"/>
                                                <path d="M7 12V14H15V12H12H7Z" fill="#156DF2"/>
                                                <path d="M15 15H7V17H15V15Z" fill="#156DF2"/>
                                            </g>
                                            <defs>
                                                <clipPath id="clip0_4971_45539">
                                                    <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                            </defs>
                                        </svg>
                                    }
                                    variant="link"
                                    text="Create Record"
                                    sx={{ height: '32px', fontWeight: 800, fontSize: '16px', lineHeight: '150%', letterSpacing: '0.02em', textTransform: 'uppercase', fontFamily: 'Roboto' }}
                                />
                            </Space>
                        )}
                    </Space>
                )}
            </Space>
        </Space>
    );
};

export default memo(Extra);
