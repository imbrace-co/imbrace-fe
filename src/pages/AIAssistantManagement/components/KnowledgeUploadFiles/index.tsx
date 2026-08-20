import { Space } from '@imbrace/ui';
import DriveFolderUploadIcon from '@/assets/icons/icon_upload.svg?react';
import IconClose from '@/assets/icons/icon_close.svg?react';

import { useDropzone } from 'react-dropzone';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.scss';
import { ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { postKnowledgeHubFolder, uploadFile } from '@/services/api/knowledgeHub';
import { getCookie } from 'typescript-cookie';
import { useNotify } from '@/contexts/SnackbarContext';
import { FileMIME } from '@/pages/DataboardEnhance';
import plusIcon from '@/assets/icons/ai_plus.svg';
import { Folder, SOURCE_TYPE } from '@/pages/KnowledgeHub';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { KnowledgeSupportFileTypeText } from '@/pages/DataboardEnhance/utils';

interface FileImport {
    onCloseImport?: () => void;
    onImportSuccess?: (folderIdImport: string, isFirstUpload: boolean) => void;
    fileImportHeight?: number;
    isHideCloseIcon?: boolean;
    folderId: string;
    agentName: string;
}


const KnowledgeFileImport = ({ onCloseImport, onImportSuccess, isHideCloseIcon, fileImportHeight, folderId, agentName }: FileImport) => {
    const { t } = useTranslation();
    const { notify } = useNotify();

    const importFileIntoFolder = async (acceptedFiles, folderIdImport, isFirstUpload) => {
        try {
            const formData = new FormData();
            formData.append('tags', []);
            formData.append('remarks', '');
            formData.append('source_type', 'manual');
            acceptedFiles.forEach((file) => {
                formData.append('files', file); 
            });

            const orgId = getCookie('org_id');
            formData.append('organization_id', orgId || '');
            formData.append('folder_id', folderIdImport);
            formData.append('folder_name', `${agentName} Uploaded Files`);

            const user = { display_name: getCookie('user_name'), email: getCookie('user_email') };
            formData.append('last_updated_by', JSON.stringify(user));
            const { data } = await apiFetch<{ success: boolean }>(uploadFile.api(), uploadFile.method, formData, ImbraceFileUpload);
            data?.success && onImportSuccess?.(folderIdImport, isFirstUpload);
        } catch (err) {
            const error = err as AxiosError;
            if (error.response.status === 400) {
                notify({
                    type: 'error',
                    message: t('error_only_accept_file', {
                        file: KnowledgeSupportFileTypeText }),
                });
            }

        }
    };

    const createFolder = useMutation({
        mutationFn: async ({ form, acceptedFiles }: { form: Folder; acceptedFiles }) => {
            const formData = {
                ...form,
            };
            const payload = {
                ...formData,
            };
            const { data } = await apiFetch<{ data: Folder }>(postKnowledgeHubFolder.api(), postKnowledgeHubFolder.method, payload);
            return { data: data.data, acceptedFiles };
        },
        onSuccess: async (data, acceptedFiles) => {
            importFileIntoFolder(data.acceptedFiles, data.data._id, true);
            notify({
                type: 'success',
                message: t('Folder created successfully'),
            });
        },
    });

    const onUploadFiles = async (acceptedFiles) => {

        if (!folderId) {
            try {
                const formData = {
                    name: `${agentName} Uploaded Files`,
                    description: '',
                    organization_id: getCookie('org_id'),
                    parent_folder_id: 'root',
                    source_type: SOURCE_TYPE.ASSISTANT,
                    tags: [],
                    auto_tagging: true,
                };
                await createFolder.mutateAsync({ form: formData, acceptedFiles });
                return;
            } catch (error) {
                console.error('Error:', error);
            }
        } else {
            importFileIntoFolder(acceptedFiles, folderId, false);
        }
    };



    const onDrop = useCallback(
        (acceptedFiles) => {
            onUploadFiles(acceptedFiles);
        },
        [onUploadFiles],
    );

    const acceptedFileTypes = {
        [FileMIME.PDF]: [],
        [FileMIME.PPT]: [],
        [FileMIME.PPTX]: [],
        [FileMIME.DOC]: [],
        [FileMIME.DOCX]: [],
        [FileMIME.XLS]: [],
        [FileMIME.XLSX]: [],
        [FileMIME.CSV]: [],
        [FileMIME.JPEG]: [],
        [FileMIME.PNG]: [],
    };

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        multiple: true,
        onDrop,
        accept: acceptedFileTypes,
    });

    const style = useMemo(
        () => [styles.dragndrop, isDragActive ? styles.active : '', isDragReject ? styles.rejected : ''].join(' '),
        [isDragActive, isDragReject],
    );

    return (
        <Space size={12} direction="vertical" style={{ width: '100%' }}>
            <div className={styles.container}>
                <div
                    {...getRootProps({ className: style })}
                // style={{ height: fileImportHeight || 'unset', maxHeight: fileImportHeight ? '40vh' : 'unset' }}
                >
                    <img src={plusIcon} alt="Plus Icon" />

                    <span style={{ color: 'var(--color-primary-1)', marginLeft: '5px', marginBottom: 0, fontSize: 12 }}>{t('ai_assistant_management_knowledge_support_upload_file')}</span>
                    <input {...getInputProps()} />
                </div>
            </div>
        </Space>
    );
};

export default KnowledgeFileImport;
