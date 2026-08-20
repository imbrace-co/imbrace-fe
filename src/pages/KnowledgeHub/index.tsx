import type { DropdownRef } from '@imbrace/ui';
import { Button, Dropdown, EllipsisText, FieldText, Icon, Space, Typography, useDialog, useModal } from '@imbrace/ui';
import type { AxiosError } from 'axios';
import type { ReactElement } from 'react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CircularProgress } from '@mui/material';

import useDebounce from '@/hooks/useDebounce';
import {
    deleteKnowledgeHubFolder,
    downloadFile,
    downloadFileFromDrive,
    getFilesFromDrive,
    getFoldersFromDrive,
    getKnowledgeHubFoldersSearch,
    initDrive,
    postKnowledgeHubFolder,
    uploadFile,
} from '@/services/api/knowledgeHub';
import apiFetch from '@/services/axios/handler';

import { FolderSetting } from './components/FolderSetting';
import SyncExternalFolder from './components/SyncExternalFolder';
import styles from './index.module.scss';
import { slugifySegment } from '@/utils/commonHelper';
import { ImbraceClient, ImbraceFileUpload, getAuthHeaders } from '@/services/axios';
import { getCookie } from 'typescript-cookie';
import NoDataFound from '@/assets/icons/knowledge/no_data_found.svg?react';
import ExternalFileList from './components/SyncExternalFolder/Components/fileList';
import ExternalFolderList from './components/SyncExternalFolder/Components/folderList';
import SystemFolderModal from './components/SyncExternalFolder/Components/systemFolderSelect';
import { Box } from '@mui/material';
import { Controller } from 'react-hook-form';
import KnowledgeFileIcon from '@/assets/icons/knowledge/file_icon.svg?react';
import FileCloseIcon from '@/assets/icons/knowledge/file_close_icon.svg?react';
import LoadingIcon from '@/assets/icons/knowledge/loading_icon.gif';
import { useNotify } from '@/contexts/SnackbarContext';
import axios from 'axios';
import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import { KnowledgeSupportFileTypeText } from '../DataboardEnhance/utils';

// export interface Folder {
//     _id?: string;
//     name: string;
//     description: string;
//     tags: string[];
//     auto_tagging: boolean;
//     parent_folder_id?: string;
//     source_type?: string;
//     sync_timestamp?: Date;
//     file_count?: number;
//     path?: string;
// }

export interface Folder {
    _id?: string;
    name: string;
    description: string;
    tags: string[];
    auto_tagging: boolean;
    parent_folder_id?: string;
    source_type?: string;
    sync_timestamp?: Date;
    file_count?: number;
    path?: string;
    external_id: string;
    external_source: string;
    session_id?: string;
    synced: boolean;
    last_sync_at: Date;
    is_sync_enabled?: boolean;
}
interface ParentReference {
    id: string;
    path: string;
    name: string;
}

export interface FolderItem {
    id: string;
    name: string;
    webUrl: string;
    size: number;
    createdDateTime: string;
    lastModifiedDateTime: string;
    parentReference: ParentReference;
    childCount: number;
    source: string;
}
export interface FileItem {
    id: string;
    name: string;
    webUrl: string;
    size: number;
    mimeType: string;
    createdDateTime: string;
    lastModifiedDateTime: string;
    parentReference: ParentReference;
    downloadUrl: string;
    source: string;
}

export const MODAL_TYPE = {
    FOLDER: 'folder',
    FILE: 'file',
};

export const SOURCE_TYPE = {
    EXTERNAL: 'external',
    UPLOAD: 'upload',
    ASSISTANT: 'assistant',
};

export const DRIVE_PROVIDER = {
    ONE_DRIVE: 'onedrive-login',
    GOOGLE_DRIVE: 'googledrive-login',
    DROPBOX: 'dropbox-login',
};

export type ModalType = (typeof MODAL_TYPE)[keyof typeof MODAL_TYPE];
export type DriveProvider = (typeof DRIVE_PROVIDER)[keyof typeof DRIVE_PROVIDER];
export type SourceType = (typeof SOURCE_TYPE)[keyof typeof SOURCE_TYPE];

export type KnowledgeHubDriveRef = {
    setSearch: (value: string) => void;
    openAddFolder: () => void;
};

export type DriveProviderItem = {
    provider: string;
    configured: boolean;
};

export type DriveProvidersResponse = {
    success: boolean;
    data: DriveProviderItem[];
};

const driveProviderApiMap: Record<DriveProvider, string> = {
    'onedrive-login': 'onedrive',
    'googledrive-login': 'google-drive',
    'dropbox-login': 'dropbox',
};

const KnowledgeHub = forwardRef<KnowledgeHubDriveRef>(({}, ref) => {
    const { t } = useTranslation();
    const [{ modal }, modalHolder] = useModal();

    const [globalSearch, setGlobalSearch] = useState<string>('');
    const [cloudSessionId, setCloudSessionId] = useState<string>('');

    const [driveSessionId, setDriveSessionId] = useState<string>('');
    const [isReadyForFetchFolder, setIsReadyForFetchFolder] = useState<boolean>(false);
    const [syncFolderInprogress, setSyncFolderInprogress] = useState<boolean>(false);

    const [currentDrive, setCurrentDrive] = useState<DriveProvider>('onedrive-login');
    const debouncedSearchInput = useDebounce(globalSearch, 300);
    const [currentDriveFolderSelected, setCurrentDriveFolderSelected] = useState<string>('');

    const [folderSelected, setFolderSelected] = useState<number | string>('');
    const [isCopied, setIsCopied] = useState<boolean>(false);
    const [isFirstLoaded, setIsFirstLoaded] = useState(false);
    const [isFolderFileUpdated, setIsFolderFileUpdated] = useState(false);
    const [isImportingFileDone, setIsImportingFileDone] = useState(false);
    const [isFetchingFolders, setIsFetchingFolders] = useState(false);

    const [folders, setFolders] = useState<Array<Folder>>([]);
    const isLoginSuccessRef = useRef(false);

    const [currentModalType, setCurrentModalType] = useState(MODAL_TYPE.FILE);

    const [selectedFileFromDrive, setSelectedFileFromDrive] = useState<Array<FileItem>>([]);

    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    // const [systemFolderSelected, setSystemFolderSelected] = useState<string>('');

    const navigate = useNavigate();
    const { notify } = useNotify();

    const [{ dialogForm, dialog }, dialogsHolder] = useDialog();
    const menuRef = useRef<DropdownRef>(null);
    const syncFolderInprogressRef = useRef(false);
    const syncFolderProcessDoneRef = useRef(false);

    const currentDriveFolderSelectedRef = useRef('');
    const currentDriveFoldersRef = useRef<Array<FolderItem>>([]);
    const folderCacheRef = useRef<{ data: FolderItem[]; total: number; params: string } | null>(null);
    const fileCacheRef = useRef<{ data: FileItem[]; total: number; params: string } | null>(null);

    const externalModalCloseRef = useRef<((dontAskAgain?: boolean) => void) | null>(null);
    const accessToken = window.localStorage.getItem(IMBRACE_ACCESS_TOKEN);

    const fetchKnowledge = useCallback(async () => {
        setIsFetchingFolders(true);
        try {
            const searchParams = new URLSearchParams();
            searchParams.append('q', debouncedSearchInput || '');
            const folderURL = getKnowledgeHubFoldersSearch.api(debouncedSearchInput);
            const { data } = await apiFetch<{ data: Array<Folder> }>(folderURL, getKnowledgeHubFoldersSearch.method);

            const rootFolders = data?.data?.filter((item) => item.parent_folder_id === 'root') || [];
            setFolders(rootFolders);
            setIsFirstLoaded(true);
        } catch (error) {
            console.error('fetch folder error: ', error);
        } finally {
            setIsFetchingFolders(false);
        }
    }, [debouncedSearchInput]);

    useEffect(() => {
        fetchKnowledge();
    }, [fetchKnowledge, isFolderFileUpdated, syncFolderInprogressRef.current, isImportingFileDone]);

    const onCreateNewBoard = useCallback(() => {
        dialog({
            title: t(''),
            paperSx: {
                width: '80%',
                maxWidth: '800px',
                '>div': {
                    padding: '0 2.5vw 2.5vw 2.5vw!important',
                },
                '>div:first-child': {
                    padding: '15px 15px 0!important',
                },
            },
            content: ({ onClose }) => {
                return <FolderSetting onClose={onClose} refetchKnowledgeList={fetchKnowledge} />;
            },
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            actionsAlign: 'flex-start',
        });
    }, [t, dialog]);

    const folderMenuOptions = useCallback(() => {
        return [
            {
                text: t('settings'),
                index: 'setting',
                textColor: '#333',
            },
            {
                text: t('Automation'),
                index: 'automation',
                textColor: '#333',
            },
            { type: 'divider', index: 'divider' },
            {
                text: t('crm_share_link'),
                index: 'share_link',
                textColor: '#333',
            },
            { type: 'divider', index: 'divider' },
            {
                text: t('delete'),
                index: 'remove',
                textColor: 'var(--color-danger-1)',
            },
        ];
    }, [t]);

    const removeFolderConfirmed = useCallback(
        async (folderId: string) => {
            try {
                await apiFetch(deleteKnowledgeHubFolder.api(), deleteKnowledgeHubFolder.method, { ids: [folderId] }, ImbraceClient);
                await fetchKnowledge();
            } catch (error) {
                const err = error as AxiosError;
                console.error('Delete Folder Error: ', err.response);
            }
        },
        [fetchKnowledge],
    );

    const openFolderSettingModify = useCallback(
        (folderId: string) => {
            dialog({
                title: t(''),
                paperSx: {
                    width: '80%',
                    maxWidth: '800px',
                    '>div': {
                        padding: '0 2.5vw 2.5vw 2.5vw!important',
                    },
                    '>div:first-child': {
                        padding: '15px 15px 0!important',
                    },
                },
                content: ({ onClose }) => {
                    return <FolderSetting onClose={onClose} isEditMode={true} folderId={folderId} refetchKnowledgeList={fetchKnowledge} />;
                },
                hideCancelButton: true,
                hideConfirmButton: true,
                showCloseButton: true,
                actionsAlign: 'flex-start',
            });
        },
        [dialog, t],
    );

    const onMenuSelect = useCallback(
        async (selectedIndex: string, folderId: string, folderName: string) => {
            // await setFolderSelected(folderId);
            const onConfirmRemoveFolder = () => {
                dialog({
                    title: `${t('knowledge_are_you_sure_you_want_to_delete_this_folder')} "${folderName}"`,
                    content: t('noti_warning_delete_item'),
                    confirmButtonProps: {
                        type: 'danger',
                    },
                    actionsAlign: 'flex-end',
                    onConfirm: () => {
                        removeFolderConfirmed(folderId);
                    },
                    onClose: () => {},
                });
            };

            switch (selectedIndex) {
                case 'setting':
                    try {
                        openFolderSettingModify(folderId);
                    } catch (error) {
                        console.log(error);
                    }
                    menuRef.current?.close();
                    break;
                case 'share_link':
                    try {
                        const domain = window.location.origin;
                        const currentPath = window.location.pathname;
                        const shareUrl = `${domain}${currentPath}/drive/${folderId}`;
                        await navigator.clipboard.writeText(shareUrl);
                        menuRef.current?.close();
                        // wait for dropdown close animation to finish before showing tooltip
                        setTimeout(() => {
                            setFolderSelected(folderId);
                            setIsCopied(true);
                        }, 250);
                        setTimeout(() => {
                            setIsCopied(false);
                            setFolderSelected('');
                        }, 1750);
                    } catch (error) {
                        console.log(error);
                    }
                    break;
                case 'remove':
                    await menuRef.current?.close();
                    try {
                        onConfirmRemoveFolder();
                    } catch (error) {
                        console.log(error);
                    }
                    menuRef.current?.close();
                    break;
                case 'automation':
                    navigate(`/knowledge-hub-all/drive/${folderId}/automations`, {
                        state: {
                            board: {
                                _id: folderId,
                                id: folderId,
                                name: folderName,
                                type: 'KnowledgeHub',
                                fields: [],
                            },
                        },
                    });
                    menuRef.current?.close();
                    break;
                default:
                    break;
            }
        },
        [dialog, openFolderSettingModify, navigate],
    );

    const fetchExternalFilesForSync = async (externalFolderId: string) => {
        try {
            const { data } = await apiFetch<{ data: Array<FileItem> }>(
                getFilesFromDrive.api(driveSessionId, externalFolderId, driveProviderApiMap[currentDrive]),
                getFilesFromDrive.method,
            );
            const filesData = data?.data || [];
            // const filesId = filesData?.map((item) => item.id);
            return filesData;
        } catch (error: any) {
            console.log('Fetch Files error');
            if (error?.response?.data?.auth_url && error?.response?.data?.session_id) {
                setDriveSessionId(error.response.data.session_id);
                handleSessionExpired(error.response.data.auth_url);
            }
        }
    };

    const updateStatusSyncDone = (isSuccess: boolean) => {
        syncFolderInprogressRef.current = false;
        syncFolderProcessDoneRef.current = true;
        setSyncFolderInprogress(false);
        setCurrentDriveFolderSelected('');
        setIsFolderFileUpdated(true);
        isSuccess &&
            notify({
                type: 'success',
                message: t('Sync folder successfully'),
            });
    };

    const onSyncFolderDrive = async (fileListUpload: Array<FileItem>, systemFolderId: string) => {
        try {
            console.log('Starting import for files:', fileListUpload);
            if (!fileListUpload?.length) {
                updateStatusSyncDone(true);
                return;
            }

            const formData = new FormData();
            formData.append('tags', JSON.stringify([]));
            formData.append('remarks', '');
            formData.append('source_type', SOURCE_TYPE.EXTERNAL);

            // Use for...of instead of forEach to properly handle async/await
            for (const fileItem of fileListUpload) {
                const isOneDrive = currentDrive === DRIVE_PROVIDER.ONE_DRIVE;
                const downloadUrl = downloadFileFromDrive.api(driveSessionId, fileItem.id, driveProviderApiMap[currentDrive]);

                const driveResponse = await ImbraceClient.get(downloadUrl, {
                    headers: {
                        ...getAuthHeaders(),
                    },
                    responseType: 'blob',
                });
                const fileBlob = driveResponse.data;
                const file = new File([fileBlob], `${fileItem.name}`, { type: fileBlob.type });
                formData.append('files', file);
            }

            formData.append('folder_id', systemFolderId || '');

            const user = { display_name: getCookie('user_name'), email: getCookie('user_email') };
            formData.append('last_updated_by', JSON.stringify(user));
            const { data } = await apiFetch<{ success: boolean }>(uploadFile.api(), uploadFile.method, formData, ImbraceFileUpload);
            if (data?.success || (data as any)?.data?.length) {
                updateStatusSyncDone(true);
            }
        } catch (err) {
            updateStatusSyncDone(false);
            const error = err as AxiosError;
            if ((error?.response?.data as any)?.auth_url && (error?.response?.data as any)?.session_id) {
                setDriveSessionId((error.response?.data as any).session_id);
                handleSessionExpired((error.response?.data as any).auth_url);
                return;
            }
            if (error?.response?.status === 400) {
                notify({
                    type: 'error',
                    message: t('error_only_accept_file', {
                        file: KnowledgeSupportFileTypeText,
                    }),
                });
            }
        }
    };
    const fetchFileBlobFromDrive = async (externalFolderId: string, systemFolderId: string) => {
        try {
            const { data } = await apiFetch<{ data: Array<FileItem> }>(
                getFilesFromDrive.api(driveSessionId, externalFolderId, driveProviderApiMap[currentDrive]),
                getFilesFromDrive.method,
            );
            const filesData = (data as any)?.data || [];
            onSyncFolderDrive(filesData, systemFolderId);
        } catch (error: any) {
            console.log('Fetch Files error');
            if (error?.response?.data?.auth_url && error?.response?.data?.session_id) {
                setDriveSessionId(error.response.data.session_id);
                handleSessionExpired(error.response.data.auth_url);
            }
        }
    };

    //     const importFileIntoFolder = async (acceptedFiles) => {
    //         try {
    //             const formData = new FormData();
    //             formData.append('tags', []);
    //             formData.append('remarks', '');
    //             formData.append('source_type', 'manual');
    //             acceptedFiles.forEach((file) => {
    //                 formData.append('files', file); // append multiple times under the same 'files' key
    //             });

    //             formData.append('folder_id', folderId || '');

    //             const user = { display_name: getCookie('user_name'), email: getCookie('user_email') };
    //             formData.append('last_updated_by', JSON.stringify(user));
    //             const { data } = await apiFetch<{ success: boolean }>(uploadFile.api(), uploadFile.method, formData, ImbraceFileUpload);
    //             data?.success && onImportSuccess?.();
    //         } catch (err) {
    //             const error = err as AxiosError;
    //             if (error.response.status === 400) {
    //                 notify({
    //                     type: 'error',
    //                     message: t('error_only_accept_file', {
    //                         file: `pdf, ppt, pptx, doc, docx, xls, xlsx, csv, mp4, mov,
    // jpg, jpeg or png`,
    //                     }),
    //                 });
    //             }
    //         }
    //     };

    const openFileListModal = async (folderId: string, folderName: string) => {
        try {
            setCurrentModalType(MODAL_TYPE.FILE);
            // Close existing modal before opening new one
            if (externalModalCloseRef.current) {
                externalModalCloseRef.current();
                externalModalCloseRef.current = null;
                // Small delay to ensure modal is fully closed before reopening
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            openExternalProcessModal([], MODAL_TYPE.FILE, folderName, folderId);
        } catch {
            console.log('Fetch Files error');
        }
    };

    const onGetFolderListFromOneDrive = useCallback(async () => {
        setCurrentModalType(MODAL_TYPE.FOLDER);
        try {
            if (!driveSessionId) return;
            setIsReadyForFetchFolder(false);
            // Close existing modal before opening new one
            if (externalModalCloseRef.current) {
                externalModalCloseRef.current();
                externalModalCloseRef.current = null;
                // Small delay to ensure modal is fully closed before reopening
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            currentDriveFoldersRef.current = [];
            openExternalProcessModal([], MODAL_TYPE.FOLDER);
            // onClose?.();
        } catch (error) {
            console.log(error);
        }
    }, [driveSessionId]);

    useEffect(() => {
        console.log({ isReadyForFetchFolder, driveSessionId });
        if (isReadyForFetchFolder && driveSessionId) {
            onGetFolderListFromOneDrive();
        }
    }, [isReadyForFetchFolder, driveSessionId, onGetFolderListFromOneDrive]);

    // Reopen folder list after sync completes
    useEffect(() => {
        const shouldReopenFolderList = !syncFolderInprogress && isFolderFileUpdated && driveSessionId;
        if (shouldReopenFolderList) {
            // Reset the flag first to prevent infinite loop
            setIsFolderFileUpdated(false);
            // Reopen the folder list modal
            onGetFolderListFromOneDrive();
        }
    }, [syncFolderInprogress, isFolderFileUpdated, driveSessionId, onGetFolderListFromOneDrive]);

    const clearSyncStatus = () => {
        syncFolderInprogressRef.current = false;
        syncFolderProcessDoneRef.current = false;
        currentDriveFolderSelectedRef.current = '';
    };
    const handleSessionExpired = useCallback(
        (authUrl: string, driveType?: string) => {
            isLoginSuccessRef.current = false;
            const popup = window.open(authUrl, driveType || currentDrive, 'width=600,height=600');
            const timer = setInterval(() => {
                if ((!popup || popup.closed) && isLoginSuccessRef.current) {
                    clearSyncStatus();
                    setIsReadyForFetchFolder(true);
                    clearInterval(timer);
                }
            }, 500);
        },
        [currentDrive],
    );

    const onInitDrive = async (driveType: DriveProvider) => {
        isLoginSuccessRef.current = false;

        setCurrentDrive(driveType);

        try {
            const { data } = await apiFetch<{ data: { session_id: string; auth_url: string } }>(
                initDrive.api(driveProviderApiMap[driveType]),
                initDrive.method,
            );
            if (data?.data) {
                const oneDriveSession = data?.data?.session_id || '';
                setDriveSessionId(oneDriveSession);
            }

            const popup = window.open(data?.data?.auth_url, driveType, 'width=600,height=600');
            const timer = setInterval(() => {
                if ((!popup || popup.closed) && isLoginSuccessRef.current) {
                    clearSyncStatus();
                    setIsReadyForFetchFolder(true);
                    clearInterval(timer);
                }
            }, 500);
        } catch (error: any) {
            console.log(error);
            if (error?.response?.data?.auth_url && error?.response?.data?.session_id) {
                setDriveSessionId(error.response.data.session_id);
                handleSessionExpired(error.response.data.auth_url, driveType);
            }
        }
    };

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // if (event.origin !== 'https://webapp.*.imbrace.co') return;

            if (event.data.type === 'AUTH_SUCCESS' && !isLoginSuccessRef.current) {
                console.log('AUTH_SUCCESS:', event.data);
                console.log('origin:', event.origin);
                isLoginSuccessRef.current = true;
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    const onSyncFolderFromExternal = async (folderId: string, folderName: string, isSynced: boolean) => {
        setSyncFolderInprogress(true);
        syncFolderInprogressRef.current = true;
        syncFolderProcessDoneRef.current = false;
        if (isSynced) {
            updateStatusSyncDone(false);
            return;
        }
        try {
            const payload = {
                name: folderName,
                organization_id: getCookie('org_id'),
                description: '',
                tags: [],
                auto_tagging: false,
                parent_folder_id: 'root',
                source_type: 'external',
                external_id: folderId,
                external_source: driveProviderApiMap[currentDrive],
                session_id: driveSessionId,
                // synced: true,
                is_sync_enabled: true,
                // last_sync_at: { type: Date },
                // sync_timestamp: { type: Date, default: Date.now },
                // file_count: { type: Number, default: 0 },
                // path: { type: String, required: true },
            };
            const { data } = await apiFetch<{ data: Folder }>(postKnowledgeHubFolder.api(), postKnowledgeHubFolder.method, payload);
            // setFolderIdForImport(data?.data?._id || '');
            if (data?.data) {
                fetchFileBlobFromDrive(folderId, data?.data?._id || '');
            }
            // return data.data;
        } catch (error: any) {
            console.log(error);
            if (error?.response?.data?.auth_url && error?.response?.data?.session_id) {
                setDriveSessionId(error.response.data.session_id);
                handleSessionExpired(error.response.data.auth_url);
            }
        }
    };

    const renderExternalOption = useCallback(
        (onClose: () => void, folderId: string, folderName: string, isSynced: boolean) => {
            return (
                <Space direction="vertical" size={12} align="start">
                    <span style={{ fontSize: 16, textTransform: 'uppercase', margin: '0 14px 16px', fontWeight: 800 }}>
                        {t('knowledge_external_what_would_you_like_to_do_with', {
                            folder: `“${folderName}”`,
                        })}
                    </span>
                    <Space size={16} style={{ padding: '2.5vh 1vh 4vh' }}>
                        <Space
                            direction="vertical"
                            size={12}
                            className={styles.folderType}
                            style={{ flex: 1 }}
                            onClick={() => {
                                openFileListModal(folderId, folderName);
                                onClose();
                            }}
                        >
                            <EllipsisText
                                element={<Typography variant="SubHeading2" style={{ color: 'var(--color-primary-1)' }} />}
                                text={t('knowledge_external_import_selected_files')}
                            />
                            <div style={{ marginTop: 10 }}>
                                <Typography
                                    variant="Body"
                                    style={{
                                        color: 'var(--color-secondary-3)',
                                        height: 60,
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    {t('knowledge_external_import_selected_files_desc')}
                                </Typography>
                            </div>
                        </Space>
                        <Space
                            direction="vertical"
                            size={12}
                            className={styles.folderType}
                            style={{ flex: 1 }}
                            onClick={() => {
                                onSyncFolderFromExternal(folderId, folderName, isSynced);
                                onClose?.();
                            }}
                        >
                            <EllipsisText
                                element={<Typography variant="SubHeading2" style={{ color: 'var(--color-primary-1)' }} />}
                                text={t('knowledge_external_sync_one_way')}
                            />
                            <div style={{ marginTop: 10 }}>
                                <Typography
                                    variant="Body"
                                    style={{
                                        color: 'var(--color-secondary-3)',
                                        height: 60,
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    {t('knowledge_external_sync_one_way_desc')}
                                </Typography>
                            </div>
                        </Space>
                    </Space>
                </Space>
            );
        },
        [t, driveSessionId],
    );

    const openFolderExternalOption = (folderId: string, folderName: string, isSynced: boolean) => {
        currentDriveFolderSelectedRef.current = folderId;
        dialog({
            title: '',
            content: ({ onClose }) => {
                return renderExternalOption(() => onClose?.(), folderId, folderName, isSynced);
            },
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            paperSx: {
                maxWidth: 735,
                width: 735,
                '>div:first-child': {
                    padding: '12px 12px 0!important',
                },
            },
            paperOnClick: (e) => {
                e.stopPropagation();
            },
        });
    };

    const addNewFolderForImport = () => {
        dialog({
            title: 'Folder - Marketing Materials',
            paperSx: {
                width: '80%',
                maxWidth: '550px',
                '>div': {
                    padding: '0 2.5vw 2.5vw 2.5vw!important',
                },
                '>div:first-child': {
                    padding: '15px 15px 0!important',
                },
            },
            content: ({ onClose }) => {
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <span style={{ fontSize: 16, textTransform: 'uppercase', marginBottom: '10px', fontWeight: 800 }}>
                            {t('knowledge_folder_settings')}
                        </span>
                        {/* <Controller
                            name="name"
                            control={control}
                            rules={{
                                required: t('validation_board_setting_name_required'),
                                validate: {
                                    checkSpace: (val: string) => val.trim().length > 0 || t('validation_board_setting_name_required'),
                                },
                                maxLength: {
                                    value: 150,
                                    message: t('validation_board_setting_name_maxlength'),
                                },
                                minLength: {
                                    value: 4,
                                    message: t('validation_board_setting_name_minlength'),
                                },
                            }}
                            render={({ field, fieldState: { error } }) => (
                                <FieldText
                                    label={`${t('knowledge_folder_name')}  *`}
                                    fullWidth
                                    error={!!error}
                                    helperText={error?.message}
                                    {...field}
                                />
                            )}
                        /> */}
                        {/* <Button
                        sx={{
                            width: '160px',
                            borderRadius: '4px',
                        }}
                        variant="contained"
                        text={t('create')}
                        onClick={() => handleSubmit(onSubmit)()}
                    /> */}
                    </Box>
                );
            },
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            actionsAlign: 'flex-start',
        });
    };

    const FileListImporting = ({
        fileListUpload,
        folderId,
        onClose,
    }: {
        fileListUpload: Array<FileItem>;
        folderId: string;
        onClose: () => void;
    }) => {
        const [isImporting, setIsImporting] = useState(true);
        const [importDone, setImportDone] = useState(false);
        const hasImportedRef = useRef(false);
        setIsImportingFileDone(false);
        useEffect(() => {
            // Prevent duplicate calls in React Strict Mode
            if (hasImportedRef.current) return;
            hasImportedRef.current = true;

            const performImport = async () => {
                try {
                    console.log('Starting import for files:', fileListUpload);
                    if (!fileListUpload?.length) return;

                    const formData = new FormData();
                    formData.append('tags', JSON.stringify([]));
                    formData.append('remarks', '');
                    formData.append('source_type', SOURCE_TYPE.EXTERNAL);

                    // Use for...of instead of forEach to properly handle async/await
                    for (const fileItem of fileListUpload) {
                        const isOneDrive = currentDrive === DRIVE_PROVIDER.ONE_DRIVE;

                        const downloadUrl = downloadFileFromDrive.api(driveSessionId, fileItem.id, driveProviderApiMap[currentDrive]);

                        const driveResponse = await ImbraceClient.get(downloadUrl, {
                            headers: {
                                ...getAuthHeaders(),
                            },
                            responseType: 'blob',
                        });

                        const fileBlob = driveResponse.data;
                        const file = new File([fileBlob], `${fileItem.name}`, { type: fileBlob.type });
                        formData.append('files', file);
                    }

                    formData.append('folder_id', folderId || '');

                    const user = { display_name: getCookie('user_name'), email: getCookie('user_email') };
                    formData.append('last_updated_by', JSON.stringify(user));
                    const { data } = await apiFetch<{ success: boolean }>(uploadFile.api(), uploadFile.method, formData, ImbraceFileUpload);

                    if (data) {
                        //
                        setIsImportingFileDone(true);
                        setImportDone(true);
                        setIsImporting(false);
                    }
                } catch (err) {
                    const error = err as AxiosError;
                    setIsImporting(false);
                    if ((error?.response?.data as any)?.auth_url && (error?.response?.data as any)?.session_id) {
                        setDriveSessionId((error.response?.data as any).session_id);
                        handleSessionExpired((error.response?.data as any).auth_url);
                        return;
                    }
                    if (error?.response?.status === 400) {
                        notify({
                            type: 'error',
                            message: t('error_only_accept_file', {
                                file: KnowledgeSupportFileTypeText,
                            }),
                        });
                    }
                }
            };

            performImport();
        }, [fileListUpload, folderId]);

        return (
            <Space direction="vertical" align="start" justify="start">
                {isImporting && (
                    <span style={{ fontSize: 14, color: 'var(--color-danger-1)', marginBottom: '10px' }}>
                        Please don’t close it until all files have finished uploading.
                    </span>
                )}
                {importDone ? (
                    <span style={{ fontSize: 16, color: 'var(--color-green-1)' }}>
                        {fileListUpload.length} {fileListUpload.length > 1 ? 'Files are' : 'File is'} imported successfully
                    </span>
                ) : (
                    <span style={{ fontSize: 16, fontWeight: 600 }}>
                        {fileListUpload.length} {fileListUpload.length > 1 ? 'Files are' : 'File is'} selected
                    </span>
                )}
                <Space
                    direction="vertical"
                    align="start"
                    justify="start"
                    style={{ width: '100%', marginTop: 10, maxHeight: '60vh', height: '500px', overflow: 'auto' }}
                    className={styles.fileUpload}
                >
                    {(fileListUpload || []).map((file, index) => {
                        return (
                            <Space
                                key={`${file.id}-${index}`}
                                direction="horizontal"
                                align="start"
                                justify="between"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: '#F2F2F2',
                                    fontSize: 14,
                                    border: importDone ? '1px solid #14AC4E' : '1px solid transparent',
                                    borderRadius: '4px',
                                }}
                            >
                                <Space className={styles.fileIcon}>
                                    <KnowledgeFileIcon />
                                    {file.name}
                                </Space>
                                <span className={styles.removeIcon}>
                                    {isImporting ? (
                                        <img src={LoadingIcon} height={16} width={16} />
                                    ) : importDone ? (
                                        <Icon name="checkCircle" />
                                    ) : (
                                        <FileCloseIcon />
                                    )}
                                </span>
                            </Space>
                        );
                    })}
                </Space>
                <Space size={12} style={{ position: 'absolute', right: '2.5vw', bottom: '2.5vw' }}>
                    <Button
                        sx={{
                            padding: '0px',
                            borderRadius: '4px',
                            width: '140px',
                        }}
                        onClick={() => {
                            onClose?.();
                        }}
                        type="primary"
                        variant="outlined"
                        text={t('back')}
                    />
                    <Button
                        sx={{
                            padding: '0px',
                            borderRadius: '4px',
                            width: '140px',
                        }}
                        onClick={() => {
                            onClose?.();
                        }}
                        type="primary"
                        variant="contained"
                        text={t('done')}
                        disabled={isImporting}
                    />
                </Space>
            </Space>
        );
    };

    const getFileFromUrl = async (url: string): Promise<{ file: Blob }> => {
        try {
            const response = await fetch(url);
            // const contentType = response.headers.get('content-type');
            const blob = await response.blob();

            // // Determine file type from content-type header or URL extension
            // let type = 'csv'; // default
            // if (contentType?.includes('spreadsheet') || contentType?.includes('excel') || url.match(/\.(xlsx|xls)$/i)) {
            //     type = 'excel';
            //     refCurrentFileType.current = 'excel';
            // } else if (contentType?.includes('csv') || url.match(/\.csv$/i)) {
            //     type = 'csv';
            //     refCurrentFileType.current = 'csv';
            // }

            return { file: blob };
        } catch (error) {
            console.error('Error fetching file from URL:', error);
            throw new Error('Failed to fetch file from URL');
        }
    };

    const importFileIntoFolder = async (folderId: string, selectedFiles: Array<FileItem>) => {
        try {
            console.log('selectedFileFromDrive', selectedFiles);
            if (!selectedFiles?.length) return;
            const formData = new FormData();
            formData.append('tags', JSON.stringify([]));
            formData.append('remarks', '');
            formData.append('source_type', SOURCE_TYPE.EXTERNAL);

            // Use for...of instead of forEach to properly handle async/await
            for (const fileItem of selectedFiles) {
                const isOneDrive = currentDrive === DRIVE_PROVIDER.ONE_DRIVE;
                const downloadUrl = downloadFileFromDrive.api(driveSessionId, fileItem.id, driveProviderApiMap[currentDrive]);

                const driveResponse = await axios.get(downloadUrl, {
                    headers: {
                        ...getAuthHeaders(),
                    },
                    responseType: 'blob', // Use 'blob' instead of 'stream' for browser
                });
                console.log('driveResponse ', driveResponse);
                const fileBlob = driveResponse.data;
                const file = new File([fileBlob], `${fileItem.name}`, { type: fileBlob.type });
                formData.append('files', file);
            }

            formData.append('folder_id', folderId || '');

            const user = { display_name: getCookie('user_name'), email: getCookie('user_email') };
            formData.append('last_updated_by', JSON.stringify(user));
            const { data } = await apiFetch<{ success: boolean }>(uploadFile.api(), uploadFile.method, formData, ImbraceFileUpload);
            return data;
        } catch (err) {
            const error = err as AxiosError;
            if (error?.response?.data?.auth_url && error?.response?.data?.session_id) {
                setDriveSessionId(error.response.data.session_id);
                handleSessionExpired(error.response.data.auth_url);
                return;
            }

            if (error?.response?.status === 400) {
                notify({
                    type: 'error',
                    message: t('error_only_accept_file', {
                        file: KnowledgeSupportFileTypeText,
                    }),
                });
            }
            throw err;
        }
    };

    const openImportFilesProcess = async (folderId: string, selectedFiles: Array<FileItem>) => {
        dialog({
            title: '',
            paperSx: {
                width: '80%',
                maxWidth: '550px',
                height: '700px',
                maxHeight: '90vh',
                // '>div': {
                //     padding: '0 2.5vw 2.5vw 2.5vw!important',
                // },
                // '>div:first-child': {
                //     padding: '15px 15px 0!important',
                // },
                '>div': {
                    padding: '0 1.5vw 2.5vw 1.5vw!important',
                },
                '>div:first-child': {
                    padding: '12px 12px 0!important',
                    marginBottom: '0!important',
                },
            },
            content: ({ onClose }) => {
                return <FileListImporting fileListUpload={selectedFiles} folderId={folderId} onClose={() => onClose?.()} />;
            },
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            actionsAlign: 'flex-start',
        });
    };

    const openSystemFolderForImport = (selectedFiles: Array<FileItem>) => {
        console.log('selectedFiles', selectedFiles);
        setSelectedFileFromDrive(selectedFiles);
        dialog({
            title: '',
            paperSx: {
                width: '80%',
                maxWidth: '550px',
                height: '700px',
                maxHeight: '90vh',
                '>div': {
                    padding: '0 2.5vw 2.5vw 2.5vw!important',
                },
                '>div:first-child': {
                    fontSize: '16px',
                    padding: '15px 15px 0!important',
                },
            },
            content: ({ onClose }) => {
                return (
                    <SystemFolderModal
                        selectedFiles={selectedFiles}
                        onClose={() => onClose?.()}
                        // folderSelected={systemFolderSelected}
                        // setFolderSelected={setSystemFolderSelected}
                        addNewFolderForImport={addNewFolderForImport}
                        openImportFilesProcess={openImportFilesProcess}
                    />
                );
            },
            hideCancelButton: true,
            hideConfirmButton: true,
            actionsAlign: 'flex-start',
        });
    };

    const resetFolderStatus = () => {
        syncFolderInprogressRef.current = false;
        setSyncFolderInprogress(false);
        currentDriveFolderSelectedRef.current = '';
        setIsFolderFileUpdated(false);
    };

    // const backToFolderList = useCallback(() => {
    //     openExternalProcessModal(currentDriveFoldersRef.current, MODAL_TYPE.FOLDER);
    // }, [currentDriveFoldersRef.current]);

    const backToFolderList = () => {
        openExternalProcessModal(currentDriveFoldersRef.current, MODAL_TYPE.FOLDER);
    };

    const openExternalProcessModal = useCallback(
        (data: Array<FolderItem | FileItem>, modalType: ModalType, folderName?: string, folderId?: string) => {
            dialog({
                title: '',
                paperSx: {
                    width: '80%',
                    maxWidth: '550px',
                    height: '700px',
                    maxHeight: '90vh',
                    '>div': {
                        padding: '0 1.5vw 2.5vw 1.5vw!important',
                    },
                    '>div:first-child': {
                        padding: '12px 12px 0!important',
                        marginBottom: '0!important',
                    },
                },
                content: ({ onClose }) => {
                    // Store the close function in ref
                    if (onClose) {
                        externalModalCloseRef.current = onClose;
                    }

                    const uniqueKey = `${modalType}-${Date.now()}`;

                    switch (modalType) {
                        case MODAL_TYPE.FOLDER:
                            return (
                                <ExternalFolderList
                                    currentDriveFolderSelected={currentDriveFolderSelectedRef.current}
                                    syncFolderInprogress={syncFolderInprogressRef.current}
                                    syncFolderProcessDone={syncFolderProcessDoneRef.current}
                                    currentDrive={driveProviderApiMap[currentDrive]}
                                    key={uniqueKey}
                                    folderCache={folderCacheRef}
                                    folders={data as Array<FolderItem>}
                                    foldersSystem={folders}
                                    openFolderExternalOption={openFolderExternalOption}
                                    onClose={() => onClose?.()}
                                    driveSessionId={driveSessionId}
                                    onSessionExpired={handleSessionExpired}
                                />
                            );
                        case MODAL_TYPE.FILE:
                            return (
                                <ExternalFileList
                                    key={uniqueKey}
                                    files={data as Array<FileItem>}
                                    openSystemFolderForImport={openSystemFolderForImport}
                                    onClose={() => onClose?.()}
                                    folderName={folderName || ''}
                                    backToFolderList={backToFolderList}
                                    driveSessionId={driveSessionId}
                                    currentDrive={driveProviderApiMap[currentDrive]}
                                    folderId={folderId || ''}
                                    fileCache={fileCacheRef}
                                    onSessionExpired={handleSessionExpired}
                                />
                            );
                        default:
                            console.log('Unknown modal type');
                    }
                },
                hideCancelButton: true,
                hideConfirmButton: true,
                showCloseButton: true,
                // actionsAlign: 'flex-start',
            });
        },
        [driveSessionId, currentDriveFolderSelected],
    );

    const onOpenExternalDrive = useCallback(() => {
        const onMappingData = (file: string | File) => {};

        dialog({
            title: t(''),
            content: ({ onClose }) => (
                <SyncExternalFolder
                    onImportSuccess={() => {
                        fetchKnowledge();
                        onClose?.();
                    }}
                    onClose={onClose}
                    onSuccess={onMappingData}
                    // openExternalProcessModal={openExternalProcessModal}
                    // setSessionId={(sessionId ) => {
                    //     console.log("sessionId", sessionId);
                    //     setCloudSessionId(sessionId);
                    // }}
                    // isFetchFolderDone={isFetchFolderDone}
                    onInitDrive={onInitDrive}
                />
            ),
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
            paperSx: {
                '>div': {
                    padding: '0 2.5vw 2.5vw 2.5vw!important',
                },
                '>div:first-child': {
                    padding: '12px 12px 0!important',
                },
            },
        });
    }, [t, dialog]);

    const renderAddNewOption = useCallback(
        (onClose: () => void) => {
            return (
                <Space direction="vertical" size={12} align="start">
                    <span style={{ fontSize: 16, textTransform: 'uppercase', margin: '0 14px 16px', fontWeight: 800 }}>
                        {t('knowledge_create_a_new_folder')}
                    </span>
                    <Space size={16} style={{ padding: '2.5vh 1vh 4vh' }}>
                        <Space
                            direction="vertical"
                            size={12}
                            className={styles.folderType}
                            style={{ flex: 1 }}
                            onClick={() => {
                                onCreateNewBoard();
                                onClose();
                            }}
                        >
                            <EllipsisText
                                element={<Typography variant="SubHeading2" style={{ color: 'var(--color-primary-1)' }} />}
                                text={t('knowledge_create_a_folder')}
                            />
                            <div style={{ marginTop: 10 }}>
                                <Typography
                                    variant="Body"
                                    style={{
                                        color: 'var(--color-secondary-3)',
                                        height: 60,
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    {t('knowledge_create_a_folder_desc')}
                                </Typography>
                            </div>
                        </Space>
                        <Space
                            direction="vertical"
                            size={12}
                            className={styles.folderType}
                            style={{ flex: 1 }}
                            onClick={() => {
                                onOpenExternalDrive();
                                onClose?.();
                            }}
                        >
                            <EllipsisText
                                element={<Typography variant="SubHeading2" style={{ color: 'var(--color-primary-1)' }} />}
                                text={t('knowledge_connect_an_external_folder')}
                            />
                            <div style={{ marginTop: 10 }}>
                                <Typography
                                    variant="Body"
                                    style={{
                                        color: 'var(--color-secondary-3)',
                                        height: 60,
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    {t('knowledge_connect_an_external_folder_desc')}
                                </Typography>
                            </div>
                        </Space>
                    </Space>
                </Space>
            );
        },
        [onOpenExternalDrive, onCreateNewBoard, t],
    );

    const showAddNewOptions = useCallback(() => {
        dialog({
            title: '',
            content: ({ onClose }) => {
                return renderAddNewOption(() => onClose?.());
            },
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            paperSx: {
                maxWidth: 735,
                width: 735,
                '>div:first-child': {
                    padding: '12px 12px 0!important',
                },
            },
            paperOnClick: (e) => {
                e.stopPropagation();
            },
        });
    }, [dialog, renderAddNewOption]);

    useImperativeHandle(
        ref,
        () => ({
            setSearch: (value: string) => setGlobalSearch(value),
            openAddFolder: () => showAddNewOptions(),
        }),
        [showAddNewOptions],
    );

    const renderFolderItem = (folder: Folder, index: number): ReactElement => {
        const isSyncedFolder = folder.source_type === SOURCE_TYPE.EXTERNAL && folder.is_sync_enabled;
        const hasDescription = !!folder.description?.trim();
        const isHovered = hoveredIndex === index;
        const shouldExpand = isHovered;
        return (
            <Space
                key={index}
                className={styles.cardWrapperRelative}
                style={{
                    zIndex: isHovered ? 10 : 1,
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => {
                    const folderPath = folder?.path ? folder.path.split('/').map(slugifySegment).join('/') : '';
                    navigate(`/knowledge-hub-all/drive${folderPath}`, {
                        replace: true,
                        state: { folderId: folder._id as string, folderName: folder.name },
                    });
                }}
            >
                {isSyncedFolder && (
                    <div className={styles.syncedTag}>
                        {/* <LoadingIcon /> */}
                        <span>{t('knowledge_external_synced')}</span>
                    </div>
                )}
                <Space
                    className={`${styles.cardWrapper} ${shouldExpand ? styles.cardWrapperExpanded : ''}`}
                    justify="between"
                    align="start"
                >
                    <Space
                        size={8}
                        direction="vertical"
                        align="start"
                        justify="between"
                        style={{ overflow: 'hidden', width: '100%', marginTop: 5 }}
                    >
                        <Space
                            size={5}
                            direction="vertical"
                            align="start"
                            justify="start"
                            style={{
                                overflow: 'hidden',
                                width: '100%',
                                marginTop: 5,
                            }}
                        >
                            <div style={{ maxHeight: '38px', display: 'flex', alignItems: 'flex-end', maxWidth: '100%' }}>
                                <EllipsisText
                                    element={
                                        <Typography
                                            variant="SubHeading2Tight"
                                            style={{
                                                color: 'var(--color-light-8)',
                                                fontSize: 14,
                                                fontWeight: 400,
                                            }}
                                        />
                                    }
                                    text={folder.name}
                                    whiteSpace="nowrap"
                                />
                            </div>
                            {hasDescription && (
                                <div className={`${styles.descriptionWrapper} ${isHovered ? styles.descriptionVisible : ''}`}>
                                    <Typography
                                        variant="BodyTight"
                                        title={folder.description}
                                        style={{
                                            color: 'var(--color-secondary-3)',
                                            fontSize: 14,
                                            lineHeight: '145%',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {folder.description}
                                    </Typography>
                                </div>
                            )}
                        </Space>
                        <div>
                            <EllipsisText
                                element={
                                    <Typography
                                        variant="BodyTight"
                                        style={{
                                            color: 'var(--color-secondary-3)',
                                            fontSize: 12,
                                        }}
                                    />
                                }
                                text={`${folder.file_count} ${t('files')}`}
                                whiteSpace="pre-wrap"
                            />
                        </div>
                    </Space>
                    <Space size={12} align="start" style={{ position: 'relative' }}>
                        {folderSelected === folder._id && isCopied && (
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: 'calc(100% + 6px)',
                                    right: 0,
                                    backgroundColor: '#333',
                                    color: '#fff',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    whiteSpace: 'nowrap',
                                    zIndex: 1500,
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                                }}
                            >
                                {t('copied')}
                            </div>
                        )}
                        <Dropdown
                            className={styles.cardDropdown}
                            icon={<Icon style={{ color: 'var(--color-light-5)' }} name="more" />}
                            variant="text"
                            hideArrow
                            options={folderMenuOptions()}
                            onSelect={(e, selectedIndex) => {
                                e.stopPropagation();
                                onMenuSelect(selectedIndex as string, folder._id as string, folder.name);
                            }}
                            ref={menuRef}
                        />
                    </Space>
                </Space>
            </Space>
        );
    };

    const content = (
        <>
            {folders && folders.length > 0 && (
                <div className={`${styles.gridContainer} ${folders.length < 4 ? styles.gridContainerSmall : ''}`}>
                    {folders.map((folder, index) => renderFolderItem(folder, index))}
                </div>
            )}

            {isFirstLoaded && (!folders || folders.length === 0) && (
                <Space style={{ margin: '4vh auto 0', width: '80%' }} direction="vertical" align="center" className={styles.noDataFound}>
                    <div
                        style={{
                            marginBottom: '4vh',
                            textAlign: 'center',
                            fontSize: '14px',
                            color: '#000',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <span>
                            <strong>The Knowledge Hub</strong> {t('knowledge_base_instruction_title')}
                        </span>
                        <span>{t('knowledge_base_instruction_create')}</span>
                    </div>
                    <NoDataFound />
                    <span>{t('knowledge_base_no_folder')}</span>
                </Space>
            )}
        </>
    );

    return (
        <>
            {modalHolder}
            {dialogsHolder}
            <div style={{ paddingBottom: 12, fontSize: 14, fontWeight: 'bold' }}>
                {t('knowledge_total_folder')}{' '}
                <span style={{ marginLeft: 6 }}>
                    <span style={{ fontWeight: 'normal' }}>{folders.length}</span>
                </span>
            </div>
            <div className={styles.contentArea}>
                {isFetchingFolders && (
                    <div className={styles.loadingOverlay}>
                        <CircularProgress size={56} />
                        <span className={styles.loadingText}>{t('loading')}</span>
                    </div>
                )}
                {content}
            </div>
        </>
    );
});

export default KnowledgeHub;
