import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Space, useDialog } from '@imbrace/ui';
import { Divider } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import SimpleBar from 'simplebar-react';
import { z } from 'zod';

import DropboxSVG from '@/assets/icons/knowledge/external_drop_box.svg?react';
import GoogleDriveSVG from '@/assets/icons/knowledge/external_google_drive.svg?react';
import OneDriveSVG from '@/assets/icons/knowledge/external_one_drive.svg?react';
import { useNotify } from '@/contexts/SnackbarContext';
import { getDriveProviders } from '@/services/api/knowledgeHub';
import apiFetch from '@/services/axios/handler';
import { urlRegex } from '@/utils';
import { AttachmentSchema, URLStringSchema } from '@/utils/schema';

import styles from './index.module.scss';
import { FolderSync } from '../CloudSync';
import { useState } from 'react';
import FolderList from './FolderList';
import { DRIVE_PROVIDER, DriveProvider, type DriveProvidersResponse } from '../..';

const UploadFormSchema = (t: TFunction<'translation', undefined>) =>
    z.object({
        files: AttachmentSchema.optional(),
        url: URLStringSchema(t).optional(),
    });

export type UploadFormType = z.infer<ReturnType<typeof UploadFormSchema>>;

export const supportedFileExtensions = ['csv', 'xlsx', 'xls'];
export const supportedFileMIME = [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
];

const SyncExternalFolder = ({
    onClose,
    onSuccess,
    onImportSuccess,
    // openExternalProcessModal,
    onInitDrive,
}: // isFetchFolderDone,
{
    onClose?: () => void;
    onSuccess: (file: string | File) => void;
    onImportSuccess?: () => void;
    // openExternalProcessModal: (data: Array<FolderItem | FileItem>, modalType: ModalType, folderName?: string) => void;
    onInitDrive: (driveType: DriveProvider) => void;
    // isFetchFolderDone: boolean;
}) => {
    const { t } = useTranslation();
    const {
        control,
        trigger,
        formState: { errors },
        getValues,
        watch,
    } = useForm<UploadFormType>({
        resolver: zodResolver(UploadFormSchema(t)),
    });

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [folderSyncs, setFolderSyncs] = useState<FolderSync[]>([]);

    const watchedUrl = useWatch({ control, name: 'url' });
    const watchedFiles = useWatch({ control, name: 'files' });
    const [{ dialogForm, dialog }, dialogsHolder] = useDialog();

    const { notify } = useNotify();

    const isFileUploadDisabled = !!watchedUrl;
    const isUrlInputDisabled = !!watchedFiles?.length;

    const { data: driveProviders } = useQuery({
        queryKey: ['drive-providers'],
        queryFn: async () => {
            const { data } = await apiFetch<DriveProvidersResponse>(getDriveProviders.api(), getDriveProviders.method);
            return data.data;
        },
    });

    const driveOptions = [
        { provider: DRIVE_PROVIDER.DROPBOX, apiProvider: 'dropbox', Svg: DropboxSVG, label: 'Dropbox' },
        { provider: DRIVE_PROVIDER.GOOGLE_DRIVE, apiProvider: 'google_drive', Svg: GoogleDriveSVG, label: 'Google Drive' },
        { provider: DRIVE_PROVIDER.ONE_DRIVE, apiProvider: 'onedrive', Svg: OneDriveSVG, label: 'OneDrive' },
    ] satisfies { provider: DriveProvider; apiProvider: string; Svg: typeof DropboxSVG; label: string }[];

    const fileValidation = async (file: File) => {
        const { size, name, type: fileType } = file;
        const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase();

        if ((!extension || !supportedFileExtensions.includes(extension)) && !supportedFileMIME.includes(fileType)) {
            return t('error_only_accept_file', { file: 'CSV, XLSX, XLS' });
        }

        if (size > 20 * 1024 * 1024) {
            return t('error_file_size', { size: '20 MB' });
        }

        return true;
    };

    const syncFolders = (folders: Array<FolderSync>) => {
        const folderSync = [...folders];
        setFolderSyncs(folderSync);
    };

    const showFolders = (folders: Array<FolderSync>) => {
        console.log('folders ', folders);
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
                return <FolderList folders={folders} syncFolders={syncFolders} />;
            },
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            actionsAlign: 'flex-start',
        });
    };

    return (
        <SimpleBar style={{ width: 'calc(100% + 64px)', margin: '0 -32px', padding: '0 32px', maxHeight: 500, overflow: 'auto' }} autoHide>
            {dialogsHolder}
            <Space size={16} align="start" direction="vertical" style={{ width: '100%' }} className={styles.uploadLink}>
                <span style={{ fontSize: 16, textTransform: 'uppercase', marginBottom: '10px', fontWeight: 800 }}>
                    {t('knowledge_folder_from_other_source')}
                </span>
                <Space
                    size={8}
                    justify="between"
                    direction="horizontal"
                    style={{ width: '100%', padding: '2vh 2vw' }}
                    className={styles.driveItem}
                >
                    {dialogsHolder}
                    {driveOptions.map(({ provider, apiProvider, Svg, label }) => {
                        const disabled = !driveProviders?.find((p) => p.provider === apiProvider)?.configured;
                        return (
                            <Space
                                key={provider}
                                direction="vertical"
                                style={{
                                    opacity: disabled ? 0.4 : 1,
                                    pointerEvents: disabled ? 'none' : 'auto',
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                }}
                                onClick={() => {
                                    if (disabled) return;
                                    onInitDrive(provider);
                                    onClose?.();
                                }}
                            >
                                <Svg width={48} height={48} />
                                <span style={{ fontSize: 14, color: 'var(--color-light-7)' }}>{label}</span>
                            </Space>
                        );
                    })}
                </Space>
                <Divider flexItem />
                {/* <Controller
                    control={control}
                    name="url"
                    rules={{
                        pattern: {
                            value: urlRegex,
                            message: t('validation_url_pattern'),
                        },
                    }}
                    render={({ field, fieldState: { error } }) => {
                        return (
                            <FieldText
                                label={t('knowledge_import_from_url')}
                                description={t('knowledge_import_from_url_desc')}
                                placeholder="https://"
                                fullWidth
                                disabled={isUrlInputDisabled}
                                {...field}
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                    if (errors.files) {
                                        setTimeout(() => {
                                            trigger('files');
                                        }, 10);
                                    }
                                }}
                                error={!!error}
                                helperText={error?.message}
                            />
                        );
                    }}
                /> */}
            </Space>
            <Space size={12} style={{ marginTop: '32px' }} align="center" justify="end">
                <Button
                    sx={{
                        border: '1px solid var(--color-danger-1)',
                        color: 'var(--color-danger-1)',
                        background: 'var(--color-light-1)!important',
                        borderRadius: '4px',
                        minWidth: 140,
                    }}
                    variant="contained"
                    text={t('cancel')}
                    onClick={() => onClose?.()}
                />
            </Space>
        </SimpleBar>
    );
};

export default SyncExternalFolder;
