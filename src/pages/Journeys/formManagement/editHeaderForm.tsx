import { FieldText, FieldUpload, Icon, Space, Typography } from '@imbrace/ui';
import type { TFunction } from 'i18next';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { env } from '@/env';
import { deleteMarketPlaceFile, downloadMarketPlaceFile, postMarketPlaceFile } from '@/services/api/marketplace';
import { ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

const FileStatusSchema = z.enum(['ok', 'pending', 'uploading', 'deleted', 'deleting', 'validationError', 'uploadError', 'missingFile']);

const AttachmentSchema = z
    .object({
        file: z.instanceof(File).optional(),
        id: z.string(),
        fileId: z.string().optional(),
        url: z.string().optional(),
        status: FileStatusSchema.optional(),
        isValid: z.boolean().optional(),
        error: z.string().optional(),
        name: z.string().optional(),
        size: z.number().optional(),
    })
    .array();

const supportedFileExtensions = ['jpg', 'png', 'svg', 'jpeg'];
const supportedFileMIME = ['image/png', 'image/jpeg', 'image/svg+xml'];
export const HeaderFormSchema = (t: TFunction<'translation', undefined>) =>
    z.object({
        header: z.string({ required_error: t('validation_field_required') }).superRefine((val, ctx) => {
            if (!val || val.length < 1 || val.trim().length <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('validation_field_required'),
                    fatal: true,
                });

                return z.NEVER;
            }
        }),
        sub_header: z.string().optional(),
        banner_image: AttachmentSchema.optional().superRefine((val, ctx) => {
            if (val?.some((attachment) => attachment.error)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: val.filter((attachment) => attachment.error)[0].error,
                    fatal: true,
                });
                return z.NEVER;
            }
        }),
    });

export type HeaderFormType = z.infer<ReturnType<typeof HeaderFormSchema>>;

const onUpload = async (file: File) => {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    const { data } = await apiFetch<API.MarketPlaceFileResp>(
        postMarketPlaceFile.api(),
        postMarketPlaceFile.method,
        uploadFormData,
        ImbraceFileUpload,
    );
    return {
        url: `${env.VITE_APP_HOST}/api${downloadMarketPlaceFile.api(data.data.short_path)}`,
        id: data.data.id,
        name: data.data.name,
        size: data.data.size,
    };
};
const onDelete = async (fileId: string) => {
    const { data } = await apiFetch<{ message: string }>(deleteMarketPlaceFile.api(fileId), deleteMarketPlaceFile.method);
    return data.message;
};

const EditHeaderForm = ({ methods }: { methods: UseFormReturn<HeaderFormType, any> }) => {
    const { control, setError, clearErrors } = methods;
    const { t } = useTranslation();
    return (
        <Space size={16} direction="vertical" align="stretch" style={{ width: '100%' }}>
            <Controller
                control={control}
                name="banner_image"
                render={({ field, fieldState: { error } }) => {
                    return (
                        <FieldUpload
                            type="avatar"
                            {...field}
                            fullWidth
                            label={t('upload_a_banner_image')}
                            defaultIcon={<Icon name="image" fontSize={30} />}
                            error={!!error}
                            helperText={error?.message}
                            onUpload={onUpload}
                            onDelete={onDelete}
                            fileValidation={async (file: File) => {
                                const { size, name, type } = file;
                                const extension = name.split('.')[1];
                                if (
                                    (!extension || supportedFileExtensions.indexOf(extension) === -1) &&
                                    supportedFileMIME.indexOf(type) === -1
                                ) {
                                    return t('error_only_accept_file', { file: 'JPG, PNG, SVG' });
                                }
                                if (size > 5 * 1000 * 1000) {
                                    return t('error_file_size', { size: '5 MB' });
                                }
                                return true;
                            }}
                            description={
                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                    {t('web_widget_file_upload_tips')}
                                    <br />
                                    {t('web_widget_file_upload_tips2')}
                                </Typography>
                            }
                            onChange={(files) => {
                                field.onChange(files);

                                if (
                                    files?.some(
                                        (file) =>
                                            file.status === 'uploading' || file.status === 'deleting' || file.status === 'missingFile',
                                    )
                                ) {
                                    setError('root.hasProcessingFiles', { type: 'custom', message: 'hasProcessingFiles' });
                                } else {
                                    clearErrors('root.hasProcessingFiles');
                                }
                            }}
                            accept="image/png, image/jpeg, .svg"
                        />
                    );
                }}
            />
            <Controller
                control={control}
                name="header"
                render={({ field, fieldState: { error } }) => {
                    return <FieldText {...field} fullWidth label={`${t('form_header')}*`} error={!!error} helperText={error?.message} />;
                }}
            />
            <Controller
                control={control}
                name="sub_header"
                render={({ field, fieldState: { error } }) => {
                    return (
                        <FieldText
                            {...field}
                            fullWidth
                            label={t('sub_header_description')}
                            multiline
                            minRows={7}
                            maxRows={7}
                            error={!!error}
                            helperText={error?.message}
                        />
                    );
                }}
            />
        </Space>
    );
};

export default EditHeaderForm;
