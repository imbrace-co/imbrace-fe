import { URLStringSchema } from '@/utils/schema';
import { AttachmentSchema } from '@/utils/schema';
import { Space, Typography, FieldText, FieldUpload, Button } from '@imbrace/ui';
import { Divider } from '@mui/material';
import { TFunction } from 'i18next';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import SimpleBar from 'simplebar-react';
import { z } from 'zod';
import { urlRegex } from '@/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNotify } from '@/contexts/SnackbarContext';

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

const ImportDataboardFile = ({ onClose, onSuccess }: { onClose?: () => void; onSuccess: (file: string | File) => void }) => {
    const { t} = useTranslation();
    const {
        control,
        trigger,
        formState: { errors },
        getValues,
        watch,
    } = useForm<UploadFormType>({
        resolver: zodResolver(UploadFormSchema(t)),
    });

    const watchedUrl = useWatch({ control, name: 'url' });
    const watchedFiles = useWatch({ control, name: 'files' });

    const { notify } = useNotify();

    const isFileUploadDisabled = !!watchedUrl;
    const isUrlInputDisabled = !!watchedFiles?.length;
    // Upload button — enabled only when at least one of: a selected file OR a URL is filled.
    const hasFile = !!watchedFiles?.[0]?.file && !watchedFiles[0].error;
    const hasUrl = !!watchedUrl?.trim();
    const isUploadDisabled = !hasFile && !hasUrl;

    const fileValidation = async (file: File) => {
        const { size, name, type: fileType } = file;
        const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
    
        if ((!extension || !supportedFileExtensions.includes(extension)) && !supportedFileMIME.includes(fileType)) {
            return t('error_only_accept_file', { file: 'CSV, XLSX, XLS' });
        }
        
        // if (size > 20 * 1024 * 1024) {
        //     return t('error_file_size', { size: '20 MB' });
        // }
    
        return true;
    };

    const onConfirm = async () => {
        try {
            const firstFile = getValues('files')?.[0];
            let fileToProcess = null;
            if (firstFile?.file && !firstFile.error) {
                fileToProcess = firstFile.file;
            } else if (watchedUrl && urlRegex.test(watchedUrl)) {
                fileToProcess = watchedUrl;
            }
            if (!fileToProcess) {
                notify({
                    type: 'error',
                    message: t('invalid_file_or_url'),
                });
                return false;
            }
            onSuccess(fileToProcess);
            onClose?.();
        } catch (error) {
            console.error('Import error:', error);
            notify({
                type: 'error',
                message: t('import_failed'),
            });
            return false;
        }
    };

    return (
        <SimpleBar style={{ width: 'calc(100% + 64px)', margin: '0 -32px', padding: '0 32px', maxHeight: 500, overflow: 'auto' }} autoHide>
            <Space size={16} align="start" direction="vertical" style={{ width: '100%' }}>
                <Space size={8} align="start" direction="vertical" style={{ width: '100%' }}>
                    <Typography style={{ color: 'var(--color-light-5)' }}>{t('crm_import_select_file_to_upload')}</Typography>
                    {/* <Typography variant="BodyBold">{t('crm_import_file_size_limit', { size: '20 MB' })}</Typography> */}
                    <Controller
                        control={control}
                        name="files"
                        rules={{
                            validate: {
                                fileError: (val) => {
                                    if (val?.[0]?.error) {
                                        return val[0].error;
                                    }
                                    return true;
                                },
                                singleFile: (val) => {
                                    return !val || val.length <= 1 || t('validation_single_file');
                                },
                                fileValidation: async (val) => {
                                    if (!val?.[0]?.file) return true;
                                    const result = await fileValidation(val[0].file);
                                    return result === true ? true : result;
                                },
                            },
                        }}
                        render={({ field, fieldState: { error } }) => {
                            return (
                                <FieldUpload
                                    disabled={isFileUploadDisabled}
                                    direction={'vertical-reverse'}
                                    fullWidth
                                    {...field}
                                    onChange={async (eFiles) => {
                                        if (eFiles?.[0]?.file) {
                                            const validationResult = await fileValidation(eFiles[0].file);
                                            if (validationResult !== true) {
                                                eFiles[0].error = validationResult;
                                            }
                                        }
                                        field.onChange(eFiles?.slice(0, 1));
                                    }}
                                    error={!!error}
                                    helperText={error?.message}
                                    accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                                />
                            );
                        }}
                    />
                </Space>
                <Divider flexItem>
                    <Typography style={{ color: 'var(--color-light-5)', textTransform: 'lowercase' }}>{t('or')}</Typography>
                </Divider>
                <Controller
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
                                label={t('crm_import_upload_from_url')}
                                placeholder="http://"
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
                />
            </Space>
            <Space size={8} style={{ marginTop: '32px' }} align="start">
                <Button onClick={onConfirm} variant="contained" text={t('upload')} disabled={isUploadDisabled} />
            </Space>
        </SimpleBar>
    );
};

export default ImportDataboardFile;
