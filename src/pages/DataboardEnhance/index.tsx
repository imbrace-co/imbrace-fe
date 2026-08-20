import type { channelIconMapping, ModalHOCProps } from '@imbrace/ui';
import { Button, Checkbox, EllipsisText, FieldSelect, Icon, IconButton, Select, Space, Typography, useDialog, useModal } from '@imbrace/ui';
import { Box, Chip, Divider, Portal } from '@mui/material';

import { useMutation, useQuery } from '@tanstack/react-query';
import type { ColumnOrderState, ColumnSizingState, Row, Table, TableState } from '@tanstack/react-table';
import type { AxiosError } from 'axios';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
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
import { FieldSchema } from './components/BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';
import OperationFieldForm, { FieldType } from './components/BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';
import { BoardSetting } from './components/BoardSetting';
import { FilterContent } from './components/FilterContent';
import type { SearchBarRef } from '../Databoards/searchBar';
import RecordDetailsIcon from '@/assets/icons/icon_record_details.svg?react';
import RemoveIcon from '@/assets/icons/general/removeIcon.svg?react';

import DownloadIcon from '@/assets/icons/general/download.svg?react';

import Extra from './extra';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch, useAppSelector } from '@/redux/store';
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
import { getFilterQuery } from '../Databoards/utils';
import useSegmentation from './hooks/useSegmentation';
import { useFilter } from './hooks/useFilter';
import { useNotify } from '@/contexts/SnackbarContext';
import { FormProvider } from 'react-hook-form';
import { queryClient } from '@/App';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import FileHeaderComponent from './components/FileHeaderComponent/index';
import FileImport from './components/FileImport';
import {
    deleteKnowledgeHubFiles,
    deleteKnowledgeHubFolder,
    downloadFile,
    getKnowledgeHubFiles,
    getKnowledgeHubFoldersContentById,
    getKnowledgeHubFoldersSearch,
    postKnowledgeHubFolder,
    putKnowledgeHubFileById,
    putKnowledgeHubFolderById,
} from '@/services/api/knowledgeHub';
import { Folder, SOURCE_TYPE } from '../KnowledgeHub';
import { slugifySegment } from '@/utils/commonHelper';
import { getCookie } from 'typescript-cookie';
import ClockIcon from '@/assets/icons/general/clock.svg?react';
import { format } from 'date-fns';
import { useDebounce } from '@uidotdev/usehooks';
import { FilePreview } from './components/FilePreview';
import ArrowLeftIcon from '@/assets/icons/arrow_left.svg?react';
import ArrowRightIcon from '@/assets/icons/right_arrow_icon.svg?react';
import DocxIcon from '@/assets/icons/knowledge/docx_icon.svg?react';
import PptIcon from '@/assets/icons/knowledge/ppt_icon.svg?react';
import XlsIcon from '@/assets/icons/knowledge/xls_icon.svg?react';

import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import Attachment from '@/components/FlexibleTable/attachment';
import UploadForm, { UploadFormType } from '@/components/Upload/uploadForm';
import PreviewItem from '@/components/Upload/previewItem';
import CsvViewer from '@/components/Upload/csvViewer';
import { setTags } from '@/redux/slices/knowledge';

export const FileMIME = {
    PDF: 'application/pdf',
    PPT: 'application/vnd.ms-powerpoint',
    PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    DOC: 'application/msword',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    XLS: 'application/vnd.ms-excel',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    CSV: 'text/csv',
    // VIDEO_MP4: 'video/mp4',
    // VIDEO_QUICKTIME: 'video/quicktime',
    JPEG: 'image/jpeg',
    PNG: 'image/png',
};
interface FolderContent {
    files: Array<API.DataBoardFile>;
    folder: Folder;
    subfolders: Array<Folder>;
}

const DataboardEnhance = ({ crm, knowledgeHub }: { crm?: boolean; knowledgeHub?: boolean }) => {
    const { t } = useTranslation();
    const { tab, recId } = useParams<{ tab?: string; recId?: string }>();
    const [{ dialog, dialogForm }, dialogHolder] = useDialog();
    const tableRef = useRef<FlexibleTableRef<API.DataBoardFile>>(null);
    const navigate = useNavigate();
    const navigateRef = useRef(navigate);
    const searchBarRef = useRef<SearchBarRef>(null);
    const dispatch = useAppDispatch();
    const [globalSearch, setGlobalSearch] = useState<string>();
    const [isSyncedDriveFolder, setIsSyncedDriveFolder] = useState<boolean>(true);

    const debouncedSearch = useDebounce(globalSearch, 300);
    const [tagOptions, setTagOptions] = useState([]);
    const [folderContent, setFolderContent] = useState<FolderContent | null>();
    const tagOptionsRef = useRef<Array<string>>(tagOptions);
    const [subFolder, setSubFolder] = useState<Array<Folder>>([]);
    const [subFolderSelected, setSubFolderSelected] = useState<number | null>(null);
    const tagInputRef = useRef();
    const [filesCount, setFilesCount] = useState(0);
    const [tagsUpdating, setTagUpdating] = useState([]);
    const tempTagsRef = useRef<Record<number, string[]>>({});

    const [openImportArea, setOpenImportArea] = useState<boolean>(false);

    const [currentTab, setCurrentTab] = useState<string>(tab ?? '');
    const [savedColumnState, setSavedColumnState] = useState<{
        columnSizing: ColumnSizingState;
        columnOrder: ColumnOrderState;
    }>({
        columnSizing: {},
        columnOrder: [],
    });
    const location = useLocation();
    const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const fIdParam = searchParams.get('fId');
    const folderIdState = location.state?.folderId;
    const folderId = fIdParam || folderIdState || location.pathname.replace(/^\/knowledge-hub-all\/drive\//, '');
    const folderIdRef = useRef(folderId);
    const [{ modal }, modalsHolder] = useModal();
    const [tempTags, setTempTags] = useState<Record<number, string[]>>({});

    const [{ openFieldPopover }, fieldPopoverHolder] = useFieldPopover();
    const [{ openRecordDetail }, recordDetailHolder] = useRecordDetail({ isDocumentAIRoute: false });
    const { data: boards, refetch } = useBoards({
        isDefault: knowledgeHub ? undefined : !!crm,
        types: knowledgeHub ? 'KnowledgeHub' : undefined,
    });
    const knowledgeTagsInitialization = useAppSelector((state) => state.Knowledge.tags);
    const [knowledgeTags, setKnowledgeTags] = useState(knowledgeTagsInitialization);

    // Fetch the full folder list once. Build a slug-path → folderId map for instant
    // breadcrumb resolution and URL consistency — no sessionStorage needed.
    const { data: allFoldersData } = useQuery({
        queryKey: ['kh-all-folders'],
        queryFn: async () => {
            const { data } = await apiFetch<{ data: Array<Folder> }>(
                getKnowledgeHubFoldersSearch.api(''),
                getKnowledgeHubFoldersSearch.method,
            );
            return data?.data || [];
        },
        enabled: !!knowledgeHub,
    });

    // Map: slugified-path → folderId  e.g. "/folder-a/sub-1" → "678abc..."
    const folderSlugMap = useMemo<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        for (const f of allFoldersData || []) {
            if (f.path && f._id) {
                const slug = f.path.split('/').filter(Boolean).map(slugifySegment).join('/');
                map[slug] = f._id;
            }
        }
        return map;
    }, [allFoldersData]);

    useEffect(() => {
        tagOptionsRef.current = tagOptions;
    }, [tagOptions]);

    useEffect(() => {
        folderIdRef.current = folderId;
        tableRef.current?.reset();
        tableRef.current?.refresh();
    }, [folderId, location.pathname]);

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
                        knowledgeHub={knowledgeHub}
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
            const { data: record } = await apiFetch<API.DataBoardFile>(postBoardRecord.api(params.boardId), postBoardRecord.method, {
                fields: params.fields,
            });
            return { ...record, ...record.fields } as unknown as API.DataBoardFile;
        },
        onSuccess: () => {
            tableRef.current?.resetPagination();
        },
    });

    const updateRecord = useMutation({
        mutationFn: async (params: { recordId: string; data: any }) => {
            const { data: record } = await apiFetch<API.DataBoardFile>(
                putKnowledgeHubFileById.api(params.recordId),
                putKnowledgeHubFileById.method,
                params.data,
            );

            return { id: (record as any)._id, ...record, ...record.fields } as unknown as API.DataBoardFile;
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
        mutationFn: async (params: { recordId: string | string[] }) => {
            const recordIdsForRemove = Array.isArray(params.recordId) ? params.recordId : [params.recordId];
            await apiFetch(deleteKnowledgeHubFiles.api(), deleteKnowledgeHubFiles.method, { ids: recordIdsForRemove }, ImbraceClient);
            return true;
        },
        onSuccess: (data, variables) => {
            tableRef.current?.refresh();
            tableRef.current?.resetRowSelection();
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

    // const replaceUrl = useCallback(async () => {
    //     if (boards.length >= 1) {
    //         if (knowledgeHub) {
    //             navigate(`/knowledge-hub/${boards[0]?._id}`, { replace: true });
    //         } else {
    //             navigate(`/${crm ? 'crm' : 'databoards'}/${boards[0]?._id}`, { replace: true });
    //         }
    //         setCurrentTab(boards[0]?._id);
    //     }
    // }, [navigate, boards, crm]);

    const onDataUpdate: FlexibleTableBaseProps<API.DataBoardFile>['onDataUpdate'] = useCallback(
        async ({ columnId, value, id, item }: { columnId: string; value: unknown; id: string; item: API.DataBoardFile }) => {
            const newValue = value;
            try {
                const result = await updateRecord.mutateAsync({
                    recordId: id,
                    data: {
                        // ...item,
                        // tags: ['Silver'],
                        [columnId]: newValue,
                    },
                });
                return result;
            } catch (error) {
                console.log(error);
            }
        },
        [currentBoard, createRecord, updateRecord],
    );

    const downloadFileItem = async (fileId: string) => {
        const response = await apiFetch<Blob>(downloadFile.api(fileId), downloadFile.method, {}, ImbraceClient, {
            responseType: 'blob',
        });
        return URL.createObjectURL(response.data);
    };

    const renderFilePreview = (file: API.DataBoardFile, fileUrlShow: string) => {
        switch (file.file_type) {
            case FileMIME.PDF:
                return <embed src={file.presigned_url} type="application/pdf" style={{ width: '100%', height: '98%' }} />;

            case FileMIME.PPT:
            case FileMIME.PPTX:
            case FileMIME.DOC:
            case FileMIME.DOCX:
                return (
                    <iframe
                        src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(file.presigned_url)}`}
                        allow="clipboard-read; clipboard-write"
                        width="100%"
                        height="98%"
                    ></iframe>
                );

            case FileMIME.XLS:
            case FileMIME.XLSX:
            case FileMIME.CSV:
                return <CsvViewer url={fileUrlShow} fileType={file.file_type} />;
            default:
                return (
                    <div className={styles.brokenContainer}>
                        <Icon name="attachmentBroken" fontSize={20} />
                    </div>
                );
        }
    };

    const downloadFileHeader = async (file: API.DataBoardFile) => {
        const response = await apiFetch<Blob>(downloadFile.api(file._id), downloadFile.method, {}, ImbraceClient, {
            responseType: 'blob',
        });

        const url = URL.createObjectURL(response.data);

        const a = document.createElement('a');
        a.href = url;
        a.download = file.name || 'downloaded_file';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    };

    const previewFile = async (file: API.DataBoardFile) => {
        const blobEnableType = [FileMIME.XLS, FileMIME.CSV, FileMIME.XLSX];
        const fileUrlShow = blobEnableType.includes(file.file_type) ? await downloadFileItem(file._id) : '';

        dialog({
            title: (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: 'calc(90vw - 80px)', position: 'relative' }}>
                    <span style={{ color: 'var(--color-secondary-3);', fontSize: 14 }}>{file.name}</span>{' '}
                    <div style={{ position: 'absolute', right: '10px', display: 'flex' }} className={styles.previewIcon}>
                        {' '}
                        <div onClick={() => downloadFileHeader(file)}>
                            <DownloadIcon />
                        </div>{' '}
                        <div onClick={() => onDataDelete(file._id, true)}>
                            <RemoveIcon />
                        </div>
                    </div>
                </div>
            ),
            paperSx: {
                maxWidth: '90vw!important',
                width: '90vw!important',
                position: 'relative',
                height: '95vh!important',
                '>div': {
                    padding: '2vw 5vw 2vw !important',
                },
                '>div:last-child': {
                    background: '#363737',
                },
                '>div:first-child': {
                    padding: '8px 8px 8px 24px!important',
                    marginBottom: '0!important',
                },
            },
            content: () => renderFilePreview(file, fileUrlShow),
            hideCancelButton: true,
            showCloseButton: true,
            hideConfirmButton: true,
            actionsAlign: 'flex-end',
        });
    };

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
                            <Typography>{t('knowledge_do_you_want_to_delete_this_file')}</Typography>
                            <Space style={{ marginLeft: '80px' }}>
                                <Button
                                    size="xs"
                                    sx={{
                                        width: '80px',
                                    }}
                                    variant="outlined"
                                    text={t('cancel')}
                                    onClick={() => {
                                        closeSnackbar();
                                    }}
                                />
                                <Button
                                    size="xs"
                                    sx={{
                                        width: '80px',
                                    }}
                                    type="danger"
                                    variant="contained"
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
                            <Typography>{t('knowledge_do_you_want_to_delete_these_files')}</Typography>
                            <Space style={{ marginLeft: '140px' }}>
                                <Button
                                    size="xs"
                                    sx={{
                                        width: '80px',
                                    }}
                                    variant="outlined"
                                    text={t('cancel')}
                                    onClick={() => {
                                        // if (currentBoard) {
                                        //     openRecordDetail({
                                        //         board: currentBoard,
                                        //         recordId: selectedRows[0].original._id,
                                        //         isEdit: true,
                                        //         tableRef,
                                        //     });
                                        //     closeSnackbar();
                                        // }
                                    }}
                                />
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
                queryKey: boardsQueryKey({ isDefault: knowledgeHub ? undefined : !!crm, types: knowledgeHub ? 'KnowledgeHub' : undefined }),
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

    const RowActions = ({
        row,
        rows,
        currentBoard,
    }: {
        row: Row<API.DataBoardFile>;
        rows?: Row<API.DataBoardFile>[];
        currentBoard: API.DataBoardFile;
    }) => {
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
        );
    };

    const openFilePreview = useCallback(
        (files: Array<API.DataBoardFile>, currentIndex: number) => {
            const FilePreviewContent = ({ onClose }: { onClose: () => void }) => {
                const [index, setIndex] = useState(currentIndex);
                const currentFile = files[index];

                const goPrev = () => {
                    if (index > 0) setIndex(index - 1);
                };

                const goNext = () => {
                    if (index < files.length - 1) setIndex(index + 1);
                };

                return (
                    <Box sx={{ position: 'relative' }}>
                        <FilePreview file={currentFile} onClose={onClose} openFileInside={previewFile} />

                        <div
                            className={`${index !== 0 && styles.IconArrow}`}
                            onClick={goPrev}
                            style={{
                                width: '50px',
                                position: 'fixed',
                                top: '50%',
                                left: 'calc(50% - 400px - 50px)',
                                transform: 'translateY(-50%)',
                                zIndex: 1300,
                                ...(index === 0 && { opacity: 0.5 }),
                            }}
                        >
                            <ArrowLeftIcon />
                        </div>

                        <div
                            className={`${index !== files.length - 1 && styles.IconArrow}`}
                            onClick={goNext}
                            style={{
                                width: '50px',
                                display: 'flex',
                                justifyContent: 'end',
                                position: 'fixed',
                                top: '50%',
                                left: 'calc(50% + 400px)',
                                transform: 'translateY(-50%)',
                                zIndex: 1300,
                                ...(index === files.length - 1 && { opacity: 0.5 }),
                            }}
                        >
                            <ArrowRightIcon />
                        </div>
                    </Box>
                );
            };

            // Determine width based on the first file type
            const firstFile = files[currentIndex];
            const isImage = firstFile.file_type?.startsWith('image'); // adjust based on your type field
            const dialogWidth = isImage ? '80%' : '70%';

            dialog({
                title: '',
                paperSx: {
                    width: dialogWidth,
                    maxWidth: '800px',
                    position: 'relative',
                    '>div': {
                        padding: '0 1.5vw 2vw 1.5vw!important',
                    },
                    '>div:first-child': {
                        padding: '15px 15px 0!important',
                        marginBottom: '0!important',
                    },
                },
                content: (props) => <FilePreviewContent {...props} />,
                hideCancelButton: true,
                showCloseButton: true,
                hideConfirmButton: true,
                actionsAlign: 'flex-end',
            });
        },
        [dialog],
    );

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

    const RowTagSelect = ({ id, initialTags, disabled }: { id: string; initialTags: string[]; disabled?: boolean }) => {
        const [value, setValue] = useState<string[]>(() => {
            const val = tempTagsRef.current[id] ?? initialTags;
            return Array.isArray(val) ? val : [];
        });
        const [openTagList, setOpenTagList] = useState(false);
        const [tagListIsOpen, setTagListIsOpen] = useState(false);

        const tagListIsOpenRef = useRef(tagListIsOpen);
        const openTagListRef = useRef(openTagList);
        const updateTagsRef = useRef<(isReset: boolean) => void>(() => {});

        const TagListRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            tagListIsOpenRef.current = tagListIsOpen;
        }, [tagListIsOpen]);

        useEffect(() => {
            openTagListRef.current = openTagList;
        }, [openTagList]);

        const isSameArray = (a: any, b: any) => {
            if (!Array.isArray(a) || !Array.isArray(b)) return false;
            if (a.length !== b.length) return false;
            const setA = new Set(a);
            if (setA.size !== new Set(b).size) return false;
            for (const val of b) if (!setA.has(val)) return false;
            return true;
        };

        const handleChange = (vals?: string[]) => {
            if (!vals) return;
            setValue(vals);
            tempTagsRef.current[id as any] = vals;
        };

        const updateTags = (isReset: boolean) => {
            const currentTagValue = isReset ? [] : tempTagsRef.current[id as any] ?? initialTags;
            setOpenTagList(false);
            if (isSameArray(initialTags || [], currentTagValue || [])) return;
            onDataUpdate?.({ columnId: 'tags', value: currentTagValue, id });
        };

        useEffect(() => {
            updateTagsRef.current = updateTags;
        });

        useEffect(() => {
            function handleClickOutside(event: MouseEvent) {
                if (!openTagListRef.current) return;

                const target = event.target as Node;
                const isInsidePopover = (target as Element).closest?.('.MuiPopover-root') || (target as Element).closest?.('.MuiMenu-root');

                if (TagListRef.current && !TagListRef.current.contains(target) && !isInsidePopover) {
                    if (!tagListIsOpenRef.current) {
                        updateTagsRef.current(false);
                    }
                }
            }

            document.addEventListener('mousedown', handleClickOutside);

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [TagListRef]);

        const handleRemoveTag = (removedTag: string) => {
            const current = Array.isArray(value) ? value : [];
            const next = current.filter((t) => t !== removedTag);
            handleChange(next);
        };

        const tagsToRender = Array.isArray(value) ? value : [];

        return (
            <div ref={TagListRef}>
                {!openTagList ? (
                    <div
                        className={styles.tagArea}
                        onClick={() => {
                            if (disabled) return;
                            setOpenTagList(true);
                        }}
                        style={disabled ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
                    >
                        {tagsToRender.map((tag, index) => (
                            <Chip className={styles.tagItem} key={index} label={tag} />
                        ))}
                    </div>
                ) : (
                    <Select
                        queryKey={[]}
                        fullWidth
                        displayType="chip"
                        request={() =>
                            knowledgeTags?.map((item) => ({
                                text: item,
                                value: item,
                            }))
                        }
                        multiple
                        chipWrap
                        value={tagsToRender}
                        onChange={handleChange}
                        closeOnSelect={false}
                        renderValue={() => (
                            <Space size={8} style={{ width: '100%', overflow: 'hidden', lineHeight: '20px' }}>
                                <Space size={8} wrap className={styles.tagModify}>
                                    {tagsToRender.map((tag, index) => (
                                        <Chip
                                            key={index}
                                            label={tag}
                                            className={styles.tagItemModify}
                                            onDelete={(e) => {
                                                e?.stopPropagation?.();
                                                handleRemoveTag(tag);
                                            }}
                                            sx={{
                                                '& .MuiChip-label': {
                                                    paddingRight: '24px',
                                                },
                                            }}
                                            deleteIcon={
                                                <Icon
                                                    name="close"
                                                    onMouseDown={(event) => event.stopPropagation()}
                                                    style={{
                                                        margin: 0,
                                                        fontSize: 12,
                                                        color: '#FA9917CC',
                                                        position: 'absolute',
                                                        right: '8px',
                                                    }}
                                                />
                                            }
                                        />
                                    ))}
                                </Space>
                            </Space>
                        )}
                        popoverProps={{
                            disablePortal: false,
                        }}
                        placeholder={t('knowledge_select_tags')}
                        onReset={() => {
                            handleChange([]);
                            updateTags(true);
                        }}
                        onClose={() => {
                            updateTags(false);
                            setTagListIsOpen(false);
                        }}
                        onOpen={() => {
                            setTagListIsOpen(true);
                        }}
                    />
                )}
            </div>
        );
    };

    const columns = useMemo(() => {
        const columnDefinitions: Columns<API.DataBoardFile> = [
            {
                accessorKey: 'rowIndex',
                id: 'rowIndex',
                header: ({ table }) => (
                    <div>
                        <Checkbox
                            disabled={isSyncedDriveFolder}
                            checked={table.getIsAllPageRowsSelected()}
                            indeterminate={table.getIsSomeRowsSelected()}
                            onChange={(checked) => {
                                table.toggleAllRowsSelected(checked);
                                handleToggleRowCheckbox();
                            }}
                        />
                    </div>
                ),
                maxSize: 42,
                enableColumnFilter: false,
                enablePinning: true,
                enableEditing: false,
                enableResizing: false,
                enableSorting: false,
                cell: ({ row }) => {
                    return (
                        <Checkbox
                            onChange={(e) => {
                                row.getToggleSelectedHandler()(e);
                                handleToggleRowCheckbox();
                            }}
                            {...(!row.getCanSelect() && {
                                tooltip: t('databoard_disabled_checkbox_tooltip'),
                                tooltipProps: { placement: 'top', arrow: true },
                            })}
                            disabled={!row.getCanSelect() || isSyncedDriveFolder}
                            checked={row.getIsSelected()}
                        />
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
                enableEditing: !isSyncedDriveFolder,
                enableSorting: true,
                enablePinning: true,
                meta: {
                    cellStyle: {
                        padding: '4px 11px',
                    },
                    disableOrdering: true,
                    width: '25%',
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
                maxSize: 110,
                meta: {
                    disableOrdering: true,
                },
                header: () => t('preview'),
                cell: ({ row, table }) => {
                    const files = table.getRowModel().rows.map((r) => r.original);
                    const currentIndex = table.getRowModel().rows.findIndex((r) => r.id === row.id);
                    return row.original?.file_type?.includes('image') ? (
                        <Space
                            style={{ height: 60, width: 60, padding: '10px 0', borderRadius: 4, border: '1px solid #828282' }}
                            className={styles.fileImage}
                            onClick={() => openFilePreview(files, currentIndex)}
                        >
                            <img style={{ height: 'auto', width: '100%', maxHeight: '100%' }} src={row.original.presigned_url} />
                        </Space>
                    ) : (
                        <Space
                            style={{ height: 60, width: 60, padding: '10px 0', borderRadius: 4, border: '1px solid #828282' }}
                            justify="center"
                            className={styles.fileImage}
                            onClick={() => openFilePreview(files, currentIndex)}
                        >
                            {renderFileIcon(row.original.file_type)}
                        </Space>
                    );
                },
            },
            {
                type: 'ShortText',
                accessorKey: 'tags',
                id: 'tags',
                header: () => t('knowledge_tag'),
                enableColumnFilter: false,
                enableEditing: false,
                enableSorting: true,
                enableResizing: false,
                enablePinning: true,
                cell: ({ row }) => {
                    const item = row.original;
                    return <RowTagSelect id={item._id} initialTags={item.tags} disabled={isSyncedDriveFolder} />;
                },

                meta: {
                    identifier: false,
                    defaultFieldName: 'tag',
                    disableOrdering: true,
                    cellStyle: {
                        padding: '7px 12px',
                    },
                    width: '20%',
                },
            },
            {
                type: 'ShortText',
                accessorKey: 'remarks',
                id: 'remarks',
                enableColumnFilter: false,
                enableEditing: !isSyncedDriveFolder,
                enableSorting: true,
                meta: {
                    disableOrdering: true,
                    width: '19%',
                },
                header: () => t('remarks'),
                cell: ({ row }) => {
                    return (
                        <EllipsisText
                            text={row.original.remarks}
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
                    width: '15%',
                },
                header: () => t('last_updated'),
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
                                <Trans
                                    i18nKey="knowledge_by"
                                    values={{ who: displayName }}
                                    components={[
                                        <span
                                            style={{
                                                color: 'var(--color-primary-1)',
                                                textDecoration: 'underline',
                                            }}
                                        />,
                                    ]}
                                />
                            </span>
                        </Space>
                    );
                },
            },
        ];
        return columnDefinitions;
    }, [t, tableRef, tagOptions, isSyncedDriveFolder]);

    const onDataDelete: (rowId: string | string[], isFromPreview?: boolean) => Promise<boolean> = useCallback(
        async (rowId: string | string[], isFromPreview?: boolean) => {
            return new Promise(async (resolve) => {
                const selectedRows = tableRef.current?.getSelectedRows || [];

                const deleteRequest = async () => {
                    try {
                        await deleteRecord.mutateAsync({ recordId: rowId });
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
                dialog({
                    title:
                        selectedRows.length === 1 || isFromPreview
                            ? t('knowledge_are_you_sure_you_want_to_delete_this_file')
                            : t('knowledge_are_you_sure_you_want_to_delete_these_files'),
                    content: t('noti_warning_delete_item'),
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
                    onConfirm: async () => {
                        resolve(await deleteRequest());
                    },
                });
                return;
            });
        },
        [t, dialog, notify, deleteRecord],
    );

    // useEffect(() => {
    //     if (!tab) {
    //         replaceUrl();
    //     } else {
    //         setCurrentTab(tab);
    //     }
    // }, [tab, replaceUrl]);

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
                    updateContainerRect={tableRef.current?.updateContainerRect ?? (() => {})}
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

    const updateSubFolderName = async (folder: Folder) => {
        try {
            const { data } = await apiFetch<{ success: boolean }>(
                putKnowledgeHubFolderById.api(folder._id || ''),
                putKnowledgeHubFolderById.method,
                folder,
            );
            if (data.success) {
                // setSubFolder((prev) => prev.map((item) => (item._id === folder._id ? { ...item, name: folder.name } : item)));
                tableRef.current?.refresh();
            }
        } catch (err) {}
    };

    const addNewSubFolder = async (folderName: string) => {
        try {
            const payload = {
                name: folderName,
                description: 'sub folder',
                organization_id: getCookie('org_id'),
                parent_folder_id: folderIdRef.current,
                source_type: SOURCE_TYPE.UPLOAD,
                tags: [],
                auto_tagging: false,
            };
            const { data } = await apiFetch<{ data: Folder }>(postKnowledgeHubFolder.api(), postKnowledgeHubFolder.method, payload);
            if (data.data) {
                await tableRef.current?.refresh();
            }
        } catch (error) {
            console.error('fetch create sub folder error: ', error);
        }
    };

    const removeSubFolderConfirmed = useCallback(async (folderToRemove: string) => {
        try {
            const { data } = await apiFetch<{ success: boolean }>(
                deleteKnowledgeHubFolder.api(),
                deleteKnowledgeHubFolder.method,
                { ids: [folderToRemove] },
                ImbraceClient,
            );
            if (data?.success) {
                setSubFolder((prev) => prev.filter((item) => item._id !== folderToRemove));
            }
        } catch (error) {
            const err = error as AxiosError;
            console.error('Delete Folder Error: ', err.response);
        }
    }, []);

    const fetchImages = async (files: Array<API.DataBoardFile>) => {
        const results = await Promise.all(
            files.map(async (item) => {
                try {
                    if (item.file_type.includes('image')) {
                        const fileImage = new URL(item.presigned_url || '').pathname.replace(/^\/+/, '') || '';
                        const res = await apiFetch<Blob>(fileImage, 'GET', {}, ImbraceClient, {
                            responseType: 'blob',
                        });
                        return { ...item, blob: URL.createObjectURL(res.data) };
                    } else {
                        return { ...item };
                    }
                } catch (e) {
                    console.error('Failed to load image for item', item.id, e);
                    return { ...item, blob: null };
                }
            }),
        );
        return results;
    };

    const fetchFolderFiles = async (params: RequestParameters) => {
        try {
            const { pagination, sorters } = params;
            const isSortDefault = !sorters || sorters?.length === 0;
            const sortBy = isSortDefault ? 'last_updated_time' : sorters[0]?.id;
            const sortOrder = isSortDefault ? 'desc' : sorters?.[0]?.desc ? 'desc' : 'asc';

            const searchParams = new URLSearchParams();

            if (pagination) {
                searchParams.append('q', debouncedSearch || '');
                searchParams.append('limit', `${pagination.pageSize}`);
                searchParams.append('skip', `${pagination.pageIndex * pagination.pageSize}`);
                searchParams.append('sortBy', sortBy);
                searchParams.append('sortOrder', sortOrder);
            }

            // Resolve folderId: use param/state directly, or look up in the pre-fetched map.
            const slugTarget = folderId.split('/').filter(Boolean).map(slugifySegment).join('/');
            const targetFolderId = fIdParam || folderIdState || folderSlugMap[slugTarget] || folderId;

            const { data } = await apiFetch<{ data: FolderContent }>(
                getKnowledgeHubFoldersContentById.api(targetFolderId),
                getKnowledgeHubFoldersContentById.method,
                searchParams,
            );

            if (data?.data) {
                const folderData = data?.data?.folder;
                setIsSyncedDriveFolder(!!(folderData?.source_type === SOURCE_TYPE.EXTERNAL && folderData?.is_sync_enabled));
                setFolderContent(data?.data || null);
                setSubFolder(data.data.subfolders);

                if (data?.data?.folder?.parent_folder_id === 'root') {
                    setKnowledgeTags(data.data.folder.tags);
                    dispatch(setTags(data.data.folder.tags));
                }

                const uniqueTags = [...new Set(data.data.files.flatMap((item) => item.tags))];
                setTagOptions(uniqueTags);
                setFilesCount(data.data.pagination.file_count);
                // Ensure URL always has ?fId so reloads and shares work consistently.
                if (!fIdParam && data.data.folder?._id) {
                    const realId = data.data.folder._id;
                    const folderPath = data.data.folder?.path?.split('/').map(slugifySegment).join('/');
                    navigate(`/knowledge-hub-all/drive${folderPath}?fId=${realId}`, {
                        replace: true,
                        state: { folderId: realId },
                    });
                }
            }

            // const fileConvert = await fetchImages(data.data.files);

            return {
                data: (data.data.files || []).map((f) => ({ id: (f as any)._id, ...f })),
                meta: {
                    total: data?.data.pagination.file_count || 0,
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

    return (
        <div>
            <FileHeaderComponent
                globalSearch={globalSearch}
                setGlobalSearch={setGlobalSearch}
                onOpenImportArea={() => setOpenImportArea(!openImportArea)}
                subFolders={subFolder || []}
                addNewSubFolder={addNewSubFolder}
                subFolderSelected={subFolderSelected}
                setFolderSelected={setSubFolderSelected}
                removeSubFolderConfirmed={removeSubFolderConfirmed}
                updateSubFolderName={updateSubFolderName}
                folderSlugMap={folderSlugMap}
                currentFolder={folderContent?.folder}
                isSyncedDriveFolder={isSyncedDriveFolder}
            />

            {openImportArea && (
                <div style={{ marginTop: '12px', marginBottom: '3vh' }}>
                    <FileImport
                        folderId={folderId}
                        onCloseImport={() => setOpenImportArea(false)}
                        onImportSuccess={() => {
                            notify({
                                type: 'success',
                                message: t('Import file successfully'),
                            });
                            tableRef.current?.refresh();
                        }}
                    />
                </div>
            )}

            <Space size={0} direction="vertical" align="start" className={styles.boardContainer}>
                <div style={{ color: 'var(--color-secondary-3)', fontSize: 14, marginBottom: 8 }}>
                    {filesCount} {t('files')}
                </div>
                {fieldPopoverHolder}
                {dialogHolder}
                <FlexibleTable<API.DataBoardFile>
                    columns={columns}
                    ref={tableRef}
                    request={(params) => fetchFolderFiles(params)}
                    globalFilter={debouncedSearch}
                    isDataDeletable={() => {
                        return !!tableRef.current?.isSomeSelected();
                    }}
                    columnOrderChangeable
                    onDataDelete={onDataDelete}
                    onDataUpdate={onDataUpdate}
                    enableRowSelection={() => true}
                    deleteButtonText={t('scheduled_events_remove_selected_event')}
                    headerPaddingModify={true}
                    containerStyle={{ height: 'calc(100vh - 450px)' }}
                />
            </Space>
        </div>
    );
};

export default DataboardEnhance;
