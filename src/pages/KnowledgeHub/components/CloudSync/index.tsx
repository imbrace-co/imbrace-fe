import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Folder } from '../..';
import apiFetch from '@/services/axios/handler';
import { getFilesFromDrive, getFoldersFromDrive, postKnowledgeHubFolder, uploadFile } from '@/services/api/knowledgeHub';
import { getCookie } from 'typescript-cookie';
import { ImbraceFileUpload } from '@/services/axios';
import { Button, Checkbox, EllipsisText, FieldText, Space, Typography, useDialog } from '@imbrace/ui';
import DropboxSVG from '@/assets/icons/knowledge/external_drop_box.svg?react';
import GoogleDriveSVG from '@/assets/icons/knowledge/external_google_drive.svg?react';
import OneDriveSVG from '@/assets/icons/knowledge/external_one_drive.svg?react';
import { useTranslation } from 'react-i18next';
import KnowledgeFileIcon from '@/assets/icons/knowledge/file_icon.svg?react';
import styles from './index.module.scss';
import FileCloseIcon from '@/assets/icons/knowledge/file_close_icon.svg?react';
import { Box } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import FolderList from './Components/folderList';
import ExternalFileList from './Components/fileList';
import SystemFolderModal from './Components/systemFolderSelect';

export interface FolderSync {
    id: string; name: string;
}

interface CloudSyncProps {
    showFolderList?: (folders: Array<FolderSync>) => void;
    folderSyncs: Array<FolderSync>;
    onImportSuccess: () => void;
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

const MODAL_TYPE = {
    FOLDER: 'folder',
    FILE: 'file',
};

type ModalType = typeof MODAL_TYPE[keyof typeof MODAL_TYPE];

function CloudSyncFolder(props: CloudSyncProps) {
    const { showFolderList, folderSyncs, onImportSuccess } = props;
    const [accessTk, setAccessToken] = useState<string>();
    const [{ dialogForm, dialog }, dialogsHolder] = useDialog();
    const [systemFolderSelected, setSystemFolderSelected] = useState<string>('');
    const [isLoginSuccess, setIsLoginSuccess] = useState<boolean>(false);
    const [driveSessionId, setDriveSessionId] = useState<string>('');

    const { t } = useTranslation();
    const {
        control,
        handleSubmit,
        formState: { isDirty, isValid },
        reset,
        watch,
        setValue,
        getValues,
    } = useForm<Folder>({
        defaultValues: {
            name: '',
        },
    });

    const importFiles = async (folderIdFromSystem: string, files: FolderSync) => {
        const driveResponse = await axios.get(
            `https://www.googleapis.com/drive/v3/files/${files.id}?alt=media`,
            {
                headers: {
                    Authorization: `Bearer ${accessTk}`,
                },
                responseType: 'stream',
            }
        );
        const fileBlob = driveResponse.data;

        const fileName = files.name || 'file name';

        const file = new File([fileBlob], fileName, { type: fileBlob.type });

        const formData = new FormData();
        formData.append('tags', []);
        formData.append('remarks', 'remarks');
        formData.append('source_type', 'sync');
        formData.append('file', file);

        formData.append('folder_id', folderIdFromSystem);

        const user = { display_name: getCookie('user_name'), email: getCookie('user_email') };
        formData.append('last_updated_by', JSON.stringify(user));
        await apiFetch<{ success: boolean }>(uploadFile.api(), uploadFile.method, formData, ImbraceFileUpload);
        onImportSuccess();
    };

    const onInitGoogleCloudApp = () => { };

    const FileListImporting = ({ fileListUpload }: { fileListUpload: Array<{ name: string }> }) => {
        return (
            <Space direction="vertical" align="start" justify="start" >
                <Space direction="vertical" align="start" justify="start" style={{ width: '100%', marginTop: 10 }} className={styles.fileUpload}>
                    {(fileListUpload || []).map(file => {
                        return <Space direction="horizontal" align="start" justify="between" style={{
                            width: '100%', padding: '8px 12px', background: '#F2F2F2', fontSize: 14, border: '1px solid #14AC4E', borderRadius: '4px',
                        }}>
                            <Space >
                                <KnowledgeFileIcon />
                                {file.name}
                            </Space>
                            <span className={styles.removeIcon}><FileCloseIcon /></span>
                        </Space>;
                    })}
                </Space>
                <Button
                    sx={{
                        width: '105px',
                        height: '32px',
                        padding: '0px',
                    }}
                    onClick={() => {
                    }}
                    type="primary"
                    variant="contained"
                    text={t('done')}
                />
            </Space>
        );
    };

    const openImportFilesProcess = () => {
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
                return <FileListImporting fileListUpload={[{ name: 'file.png' }, { name: 'test.doc' }]} />;
            },
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            actionsAlign: 'flex-start',
        });
    };

    const createFolder = useMutation({
        mutationFn: async (form: Folder) => {
            const payload = {
                ...form,
                description: '',
                organization_id: getCookie('org_id'),
                parent_folder_id: 'root',
                source_type: 'sync',
                tags: [],
                auto_tagging: true,
            };
            const { data } = await apiFetch<{ data: Folder }>(postKnowledgeHubFolder.api(), postKnowledgeHubFolder.method, payload);
            return data?.data;
        },
        onSuccess: async (data) => {

        },
    });

    const onSubmit = useCallback(
        async (formData: Folder) => {
            try {
                await createFolder.mutateAsync(formData);
                return;
            } catch (error) {
                console.error('Error:', error);
            }
        },
        [],
    );

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
                return <Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <span style={{ fontSize: 16, textTransform: 'uppercase', marginBottom: '10px', fontWeight: 800 }}>
                        {t('knowledge_folder_settings')}
                    </span>
                    <Controller
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
                    />
                    <Button
                        sx={{
                            width: '160px',
                            borderRadius: '4px',
                        }}
                        variant="contained"
                        text={t('create')}
                        onClick={() => handleSubmit(onSubmit)()}
                    />
                </Box>;
            },
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            actionsAlign: 'flex-start',
        });
    };

    const openSystemFolderForImport = () => {
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
                return <SystemFolderModal folderSelected={systemFolderSelected} setFolderSelected={setSystemFolderSelected} addNewFolderForImport={addNewFolderForImport} openImportFilesProcess={openImportFilesProcess} />;
            },
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            actionsAlign: 'flex-start',
        });
    };

    const openFileListModal = async (folderId: string, folderName: string) => {
        try {
            const { data } = await apiFetch<{ data: { data: Array<FileItem> } }>(getFilesFromDrive.api(driveSessionId, folderId), getFilesFromDrive.method);
            if (data?.data) {
                openExternalProcessModal(data.data, MODAL_TYPE.FILE, folderName);
            }
        } catch {
            console.log('Fetch Files error');
        }
    };

    const renderExternalOption = useCallback(
        (onClose: () => void, folderId: string, folderName: string) => {
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
                        // onClick={() => { onSyncFolderFromExternal(); onClose?.() }}
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

    const openFolderExternalOption = (folderId: string, folderName: string) => {
        dialog({
            title: '',
            content: ({ onClose }) => {
                return renderExternalOption(onClose, folderId, folderName);
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

    const openExternalProcessModal = (data: Array<FolderItem | FileItem>, modalType: ModalType, folderName?: string) => {
        dialog({
            title: '',
            paperSx: {
                width: '80%',
                maxWidth: '550px',
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
                const uniqueKey = `${modalType}-${Date.now()}`;
                switch (modalType) {
                    case MODAL_TYPE.FOLDER:
                        return <FolderList key={uniqueKey} folders={data as Array<FolderItem>} openFolderExternalOption={openFolderExternalOption} onClose={onClose} />;
                    case MODAL_TYPE.FILE:
                        return <ExternalFileList key={uniqueKey} files={data as Array<FileItem>} openSystemFolderForImport={openSystemFolderForImport} onClose={onClose} folderName={folderName || ''} />;
                    default:
                        console.log('Unknown modal type');
                }
            },
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            // actionsAlign: 'flex-start',
        });
    };


    const onGetFolderListFromOneDrive = async () => {
        try {
            const { data } = await apiFetch<{ data: { data: Array<FolderItem> } }>(getFoldersFromDrive.api(driveSessionId, ''), getFoldersFromDrive.method);
            if (data?.data) {
                openExternalProcessModal(data.data, MODAL_TYPE.FOLDER);
            }
        } catch (error) {
            console.log(error);
        }
    };

    const onInitOneDrive = async () => {
        try {
            // const { data } = await apiFetch<{ data: { session_id: string, auth_url: string } }>(initOneDrive.api(), initOneDrive.method);
            // console.log('data ', data);
            // window.open(data?.data?.auth_url, 'onedrive-login', 'width=500,height=600');
            // const oneDriveSession = data?.data.session_id || '';
            const oneDriveSession = 'onedrive_session_94c3dc54-9179-4269-adc6-e1fb45745174';
            setDriveSessionId(oneDriveSession);
            //consider save session into localStorage for sync ???
            setTimeout(() => {
                setIsLoginSuccess(true);
            }, 1000);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (isLoginSuccess && driveSessionId) {
            onGetFolderListFromOneDrive();
        }
    }, [isLoginSuccess, driveSessionId]);

    return (
        <Space size={8} justify="between" direction="horizontal" style={{ width: '100%', padding: '2vh 2vw' }} className={styles.driveItem}>
            {dialogsHolder}
            <Space direction="vertical">
                <DropboxSVG width={48} height={48} />
                <span style={{ fontSize: 14, color: 'var(--color-light-7)' }}>Dropbox</span>
            </Space>
            <Space direction="vertical">
                <GoogleDriveSVG width={48} height={48} />
                <span style={{ fontSize: 14, color: 'var(--color-light-7)' }} onClick={() => onInitGoogleCloudApp()}>Google Drive</span>
            </Space>
            <Space direction="vertical" onClick={() => { onInitOneDrive(); }}>
                <OneDriveSVG width={48} height={48} />
                <span style={{ fontSize: 14, color: 'var(--color-light-7)' }}>OneDrive</span>
            </Space>
        </Space>
    );
}

export default function CloudSync(props: CloudSyncProps) {
    const { showFolderList, folderSyncs, onImportSuccess } = props;
    return (
        // <GoogleOAuthProvider clientId={clientId}>
        <CloudSyncFolder showFolderList={showFolderList} folderSyncs={folderSyncs} onImportSuccess={onImportSuccess} />
        // </GoogleOAuthProvider>
    );
}