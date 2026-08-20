import { FieldSelect, FieldText, FieldUpload, Space, Spin } from '@imbrace/ui';
import type { QueryFunction } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { TFunction } from 'i18next';
import i18next from 'i18next';
import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import { deleteAiFile, getAiAssistantById, getAiFile, postAiFile } from '@/services/api/marketplace';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

const handleGetAssistantById: (apiKey: string) => QueryFunction<API.OpenAIAssistant, ['assistant', string | undefined]> =
    (apiKey) =>
    async ({ queryKey }) => {
        if (!queryKey[1]) {
            throw new Error('assistant id is missing');
        }
        const { data } = await apiFetch<API.OpenAIAssistant>(
            getAiAssistantById.api(queryKey[1]),
            getAiAssistantById.method,
            {},
            ImbraceClient,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem(IMBRACE_ACCESS_TOKEN)}`,
                    'api-key': apiKey,
                },
            },
        );
        return data;
    };

const handleUploadFile = (apiKey: string) => async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'assistants');
    const { data } = await apiFetch<{ id: string; filename: string }>(postAiFile.api(), postAiFile.method, form, ImbraceClient, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem(IMBRACE_ACCESS_TOKEN)}`,
            'api-key': apiKey,
        },
    });

    return {
        url: getAiFile.api(data.id),
        id: data.id,
        name: data.filename,
    };
};

const handleDeleteFile = (payload: { apiKey: string; assistantId?: string }) => async (fileId: string) => {
    await apiFetch<{ id: string; filename: string }>(
        deleteAiFile.api(fileId),
        deleteAiFile.method,
        {
            assistant_id: payload.assistantId,
        },
        ImbraceClient,
        {
            headers: {
                Authorization: `Bearer ${localStorage.getItem(IMBRACE_ACCESS_TOKEN)}`,
                'api-key': payload.apiKey,
            },
        },
    );
};

const handleGetFileInfo = (apiKey: string) => async (fileId: string) => {
    try {
        const { data } = await apiFetch<{
            url: string;
            id: string;
            filename: string;
            message?: string;
        }>(getAiFile.api(fileId), getAiFile.method, undefined, ImbraceClient, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem(IMBRACE_ACCESS_TOKEN)}`,
                'api-key': apiKey,
            },
        });

        return {
            url: getAiFile.api(fileId),
            id: data.id,
            name: data.filename,
        };
    } catch (err) {
        const error = err as AxiosError<{ message?: string }>;
        const message = error.response?.data.message;

        if (message && message.indexOf('No such File object') !== -1) {
            throw new Error(i18next.t('error_file_is_deleted'));
        }

        throw err;
    }
};

const supportedFileTypes = [
    'text/x-c',
    'text/x-c++',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/html',
    'text/x-java',
    'application/json',
    'text/markdown',
    'application/pdf',
    'text/x-php',
    'text/php',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/x-python',
    'text/x-script.python',
    'text/x-ruby',
    'text/x-tex',
    'text/plain',
    '.tex',
    '.md',
];

const supportedFileExtensions = ['c', 'cpp', 'docx', 'html', 'java', 'json', 'md', 'pdf', 'php', 'pptx', 'py', 'rb', 'tex', 'txt'];

// export type AiAssistantFormData = {
//     name: string;
//     instructions: string;
//     files: Attachment[];
// };

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

const NameSchema = (t: TFunction<'translation', undefined>) =>
    z.object({
        name: z.string({ required_error: t('validation_field_required') }).superRefine((val, ctx) => {
            if (!val || val.length < 1 || val.trim().length <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('validation_field_required'),
                    fatal: true,
                });

                return z.NEVER;
            }
        }),
    });
const RestSchema = (t: TFunction<'translation', undefined>) =>
    z.object({
        mode: z.enum(['standard', 'advanced'], { required_error: t('validation_field_required') }),
        instructions: z
            .string({
                required_error: t('validation_field_required'),
            })
            .min(1, { message: t('validation_field_required') }),
        files: AttachmentSchema.optional().superRefine((val, ctx) => {
            if (
                val?.some((attachment) => {
                    if (!attachment.file) {
                        return false;
                    }
                    const name = attachment.file.name
                    const extension = name.slice((name.lastIndexOf('.') + 1)).toLowerCase();
                    return supportedFileExtensions.indexOf(extension) === -1 || !extension;
                })
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('journey_ai_upload_supporting_materials_file_type'),
                    fatal: true,
                });
                return z.NEVER;
            }
            if (val?.some((attachment) => attachment?.file && attachment?.file?.size > 512 * 1000 * 1000)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('journey_ai_upload_supporting_materials_file_size'),
                    fatal: true,
                });
                return z.NEVER;
            }
        }),
    });
export const AiAssistantFormDataSchema = (t: TFunction<'translation', undefined>) => z.intersection(NameSchema(t), RestSchema(t));

// type Attachments = z.infer<typeof AttachmentSchema>;
export type AiAssistantFormData = z.infer<ReturnType<typeof AiAssistantFormDataSchema>>;

// const validateName = async (val: string) => {
//     try {
//         const {
//             data: { exist },
//         } = await apiFetch<{ exist: boolean }>(
//             getCheckAiAssistantName.api(),
//             getCheckAiAssistantName.method,
//             {
//                 name: val,
//             },
//             ImbraceClient,
//             {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem(IMBRACE_ACCESS_TOKEN)}`,
//                 },
//             },
//         );
//         return !exist;
//     } catch (error) {
//         return false;
//     }
// };

const AiAssistantForm = ({
    methods,
    apiKey,
    assistantId,
}: {
    methods: UseFormReturn<AiAssistantFormData>;
    apiKey: string;
    assistantId?: string;
}) => {
    const { control, setError, clearErrors, reset } = methods;
    const { data, isFetching } = useQuery({
        queryKey: ['assistant', assistantId],
        queryFn: handleGetAssistantById(apiKey),
        enabled: !!assistantId,
    });
    const { t } = useTranslation();
    useEffect(() => {
        if (data) {
            reset({
                name: data.name,
                instructions: data.instructions,
                files:
                    data.file_ids.map((fileId) => ({
                        id: fileId,
                        url: getAiFile.api(fileId),
                    })) || [],
            });
        }
    }, [reset, data]);

    // const debounceValidateName = useMemo(
    //     () =>
    //         debounce(async (val: string) => {
    //             setError('root.validatingName', {
    //                 type: 'custom',
    //                 message: 'validatingName',
    //             });
    //             const isValid = await validateName(val);
    //             if (val === getValues('name')) {
    //                 if (!isValid) {
    //                     clearErrors('root.validatingName');
    //                     setError('root.duplicatedName', {
    //                         type: 'custom',
    //                         message: t('journey_ai-assistant_management_name_exists'),
    //                     });
    //                 } else {
    //                     clearErrors('root.validatingName');
    //                     clearErrors('root.duplicatedName');
    //                 }
    //             }
    //         }, 300),
    //     [clearErrors, setError, t, getValues],
    // );

    return (
        <Spin isSpinning={isFetching}>
            <Space direction="vertical" size={24}>
                <Controller
                    control={control}
                    name="name"
                    render={({ field, fieldState: { error }, formState: { errors } }) => (
                        <FieldText
                            description={t('journey_ai-assistant_management_name_desc')}
                            label={`${t('journey_ai-assistant_management_name')}*`}
                            fullWidth
                            {...field}
                            // onChange={(e) => {
                            //     field.onChange(e);

                            //     if (e.target.value === getValues('name') && e.target.value) {
                            //         debounceValidateName(e.target.value);
                            //     }
                            // }}
                            error={!!error || !!errors?.root?.duplicatedName}
                            helperText={error?.message || errors?.root?.duplicatedName?.message}
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="mode"
                    defaultValue="standard"
                    render={({ field, fieldState: { error } }) => (
                        <FieldSelect
                            label={`${t('journey_ai-assistant_management_mode')}*`}
                            description={t('journey_ai-assistant_management_mode_desc')}
                            fullWidth
                            request={async () => {
                                return [
                                    {
                                        text: t('journey_ai-assistant_management_mode_standard'),
                                        description: t('journey_ai-assistant_management_mode_standard_desc'),
                                        value: 'standard',
                                    },
                                    {
                                        text: t('journey_ai-assistant_management_mode_advanced'),
                                        description: t('journey_ai-assistant_management_mode_advanced_desc'),
                                        value: 'advanced',
                                    },
                                ];
                            }}
                            {...field}
                            error={!!error}
                            helperText={error?.message}
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="instructions"
                    render={({ field, fieldState: { error } }) => (
                        <FieldText
                            label={`${t('journey_ai-assistant_management_instructions')}*`}
                            fullWidth
                            multiline
                            minRows={7}
                            maxRows={7}
                            {...field}
                            error={!!error}
                            helperText={error?.message}
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="files"
                    render={({ field, fieldState: { error } }) => {
                        return (
                            <FieldUpload
                                multiple
                                label={t('journey_ai_upload_supporting_materials')}
                                description={t('journey_ai_upload_supporting_materials_desc')}
                                {...field}
                                onUpload={handleUploadFile(apiKey)}
                                onDelete={handleDeleteFile({ apiKey, assistantId })}
                                onGetInfo={handleGetFileInfo(apiKey)}
                                fileValidation={async (file) => {
                                    const { size, name } = file;
                                    const extension = name.slice((name.lastIndexOf('.') + 1)).toLowerCase();
                                    if (!extension || supportedFileExtensions.indexOf(extension) === -1) {
                                        // supportedFileTypes.indexOf(type) === -1
                                        // known bug: file type could be empty
                                        return t('journey_ai_upload_supporting_materials_file_type');
                                    }
                                    if (size > 512 * 1000 * 1000) {
                                        return t('journey_ai_upload_supporting_materials_file_size');
                                    }
                                    return true;
                                }}
                                accept={supportedFileTypes.join(',')}
                                error={!!error}
                                helperText={error?.message}
                                onChange={(files) => {
                                    field.onChange(files);
                                    if (files) {
                                        if (
                                            files.some(
                                                (file) =>
                                                    file.status === 'uploading' ||
                                                    file.status === 'deleting' ||
                                                    file.status === 'missingFile',
                                            )
                                        ) {
                                            setError('root.hasProcessingFiles', { type: 'custom', message: 'hasProcessingFiles' });
                                        } else {
                                            clearErrors('root.hasProcessingFiles');
                                        }
                                    }
                                }}
                            />
                        );
                    }}
                />
            </Space>
        </Spin>
    );
};

export default AiAssistantForm;
