import { Space } from '@imbrace/ui';
import DriveFolderUploadIcon from '@/assets/icons/icon_upload.svg?react';
import IconClose from '@/assets/icons/icon_close.svg?react';

import { useLocation, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useCallback, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';
import styles from './index.module.scss';
import { ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { uploadFile } from '@/services/api/knowledgeHub';
import { getCookie } from 'typescript-cookie';
import { FileMIME } from '../..';
import { useNotify } from '@/contexts/SnackbarContext';
import { KnowledgeSupportFileTypeText } from '../../utils';
import { CircularProgress } from '@mui/material';

interface FileImport {
    onCloseImport?: () => void;
    onImportSuccess?: () => void;
    fileImportHeight?: number;
    isHideCloseIcon?: boolean;
    folderId?: string;
}

const FileImport = ({ onCloseImport, onImportSuccess, isHideCloseIcon, fileImportHeight, folderId }: FileImport) => {
    const { t } = useTranslation();
    const { notify } = useNotify();
    const [isLoading, setIsLoading] = useState(false);

    const importFileIntoFolder = useCallback(
        async (acceptedFiles) => {
            setIsLoading(true);
            try {
                const formData = new FormData();
                formData.append('tags', []);
                formData.append('remarks', '');
                formData.append('source_type', 'manual');
                acceptedFiles.forEach((file) => {
                    formData.append('files', file); // append multiple times under the same 'files' key
                });

                const orgId = getCookie('org_id');
                formData.append('organization_id', orgId || '');
                formData.append('folder_id', folderId || '');

                const user = { display_name: getCookie('user_name'), email: getCookie('user_email') };
                formData.append('last_updated_by', JSON.stringify(user));
                const { data } = await apiFetch<{ success: boolean }>(uploadFile.api(), uploadFile.method, formData, ImbraceFileUpload);
                data?.success && onImportSuccess?.();
            } catch (err) {
                const error = err as AxiosError;
                if (error.response?.status === 400) {
                    notify({
                        type: 'error',
                        message: t('error_only_accept_file', {
                            file: KnowledgeSupportFileTypeText,
                        }),
                    });
                }
            } finally {
                setIsLoading(false);
            }
        },
        [folderId, onImportSuccess, notify, t],
    );

    const onDrop = useCallback(
        (acceptedFiles) => {
            importFileIntoFolder(acceptedFiles);
        },
        [importFileIntoFolder],
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
        disabled: isLoading,
    });

    const style = useMemo(
        () => [styles.dragndrop, isDragActive ? styles.active : '', isDragReject ? styles.rejected : ''].join(' '),
        [isDragActive, isDragReject],
    );

    return (
        <Space size={12} direction="vertical" style={{ width: '100%' }}>
            <div className={styles.container} style={{ position: 'relative' }}>
                {!isHideCloseIcon && (
                    <label onClick={() => onCloseImport?.()}>
                        <IconClose />
                    </label>
                )}
                <div
                    {...getRootProps({ className: style })}
                    style={{
                        height: fileImportHeight || 'unset',
                        maxHeight: fileImportHeight ? '40vh' : 'unset',
                        opacity: isLoading ? 0.6 : 1,
                        pointerEvents: isLoading ? 'none' : 'auto',
                    }}
                >
                    <input {...getInputProps()} />
                    {isLoading ? (
                        <>
                            <CircularProgress size={20} />
                            <p>{t('Importing files…')}</p>
                            <span>{KnowledgeSupportFileTypeText}</span>
                        </>
                    ) : (
                        <>
                            <DriveFolderUploadIcon sx={{ width: 50, height: 50, color: 'var(--color-primary-1)' }} />
                            <p>{t('knowledge_click_to_update_or_drag_and_drop')}</p>
                            <span>{KnowledgeSupportFileTypeText}</span>
                        </>
                    )}
                </div>
            </div>
        </Space>
    );
};

export default FileImport;
