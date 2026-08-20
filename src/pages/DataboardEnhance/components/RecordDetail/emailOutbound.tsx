import type { Attachment } from '@imbrace/ui';
import { EllipsisText, FieldSelect, FieldText, FieldTextEditor, Icon, Space, Typography, useModal } from '@imbrace/ui';
import type { AxiosError } from 'axios';
import type { TFunction } from 'i18next';
import i18next from 'i18next';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { env } from '@/env';
import { TouchpointOperationModal } from '@/pages/Campaign/components/TouchpointOperation';
import { getTouchpointList } from '@/services/api/campaign';
import { getBoardById, getBoards } from '@/services/api/crm';
import { deleteMarketPlaceFile, downloadMarketPlaceFile, getMarketPlaceFile, postMarketPlaceFile } from '@/services/api/marketplace';
import { getMemberList } from '@/services/api/member';
import { ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { relatedRecordsQueryFn, relatedRecordsQueryKey } from '@/services/queries/board';
import { AttachmentSchema, RequiredStringSchema } from '@/utils/schema';

export const EmailOutboundSchema = (t: TFunction) =>
    z.object({
        to: RequiredStringSchema(t),
        sender_email: RequiredStringSchema(t),
        subject: RequiredStringSchema(t),
        content: z
            .object(
                {
                    content: RequiredStringSchema(t),
                    files: AttachmentSchema.optional(),
                },
                {
                    required_error: t('validation_field_required'),
                },
            )
            .superRefine((val, ctx) => {
                if (!val.content) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('validation_field_required'),
                        fatal: true,
                    });
                    return z.NEVER;
                }
                if (val?.files?.some((attachment) => attachment?.file && attachment?.file?.size > 10 * 1000 * 1000)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('error_individual_file_size', { size: '10 MB' }),
                        fatal: true,
                    });
                    return z.NEVER;
                }
                if (val?.files?.some((attachment) => attachment.error)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: val.files?.filter((attachment) => attachment.error)[0].error,
                        fatal: true,
                    });
                    return z.NEVER;
                }
            }),
    });

export type EmailOutboundFormType = z.infer<ReturnType<typeof EmailOutboundSchema>>;

const handleGetFileInfo = async (fileId: string) => {
    try {
        const { data } = await apiFetch<API.MarketPlaceFileResp>(getMarketPlaceFile.api(fileId), getMarketPlaceFile.method);

        return {
            id: fileId,
            name: data.data.name,
            size: data.data.size,
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
        url: `${env.VITE_APP_WCS_HOST}/api/imbrace${downloadMarketPlaceFile.api(data.data.short_path)}`,
        id: data.data.id,
        name: data.data.name,
        size: data.data.size,
    };
};
const onDelete = async (fileId: string) => {
    const { data } = await apiFetch<{ message: string }>(deleteMarketPlaceFile.api(fileId), deleteMarketPlaceFile.method);
    return data.message;
};

const fetchBoardFields = async (boardId: string) => {
    const { data } = await apiFetch<API.Board>(getBoardById.api(boardId || ''), getBoardById.method);
    return data.fields;
};

const EmailOutbound = ({
    methods,
    boardId,
    recordId,
    relatedBoardId,
    boardType,
    emailFieldId,
    identifierFieldId,
}: {
    methods: UseFormReturn<EmailOutboundFormType>;
    boardId: string;
    recordId: string;
    relatedBoardId?: string;
    boardType: API.BoardType;
    emailFieldId?: string;
    identifierFieldId?: string;
}) => {
    const { control, setError, clearErrors, getValues, reset } = methods;
    const { t } = useTranslation();
    const [{ modal }, modalsHolder] = useModal();

    return (
        <Space size={24} align="stretch" direction="vertical">
            {modalsHolder}
            {boardType === 'Opportunities' && (
                <Controller
                    control={control}
                    name="to"
                    render={({ field, fieldState: { error } }) => (
                        <FieldSelect
                            fullWidth
                            label={`${t('send_to_associated_contacts')}*`}
                            queryKey={relatedRecordsQueryKey({
                                boardId,
                                recordId,
                                relatedBoardId,
                                params: { skip: 0, limit: 0, link: true },
                            })}
                            request={async (params) => {
                                const data = await relatedRecordsQueryFn({
                                    boardId,
                                    recordId,
                                    relatedBoardId,
                                    params: { skip: 0, limit: 0, link: true },
                                })(params);
                                if (!getValues('to')) {
                                    reset({
                                        ...getValues(),
                                        to: data.data.filter((item) => item.fields[emailFieldId || ''])[0]?._id,
                                    });
                                }
                                return data;
                            }}
                            querySelect={(data) => {
                                return data.data
                                    .filter((item) => item.fields[emailFieldId || ''])
                                    .map((item) => ({
                                        text: item.fields[identifierFieldId || ''],
                                        value: item._id,
                                    }));
                            }}
                            placeholder={t('click_to_select')}
                            error={!!error}
                            helperText={error?.message}
                            {...field}
                        />
                    )}
                />
            )}
            <Controller
                control={control}
                name="sender_email"
                render={({ field, fieldState: { error } }) => (
                    <FieldSelect
                        fullWidth
                        label={`${t('senders_email')}*`}
                        queryKey={['all_active_members_email']}
                        request={async () => {
                            const { data } = await apiFetch<API.PaginatedResponse<API.User[]>>(
                                getMemberList.api(0, 0),
                                getMemberList.method,
                            );
                            return data.data
                                .filter((user) => user.status === 'active')
                                .map((user) => ({
                                    text: user.email,
                                    value: user.email,
                                }));
                        }}
                        tooltip={t('senders_email_tips')}
                        placeholder={t('click_to_select')}
                        searchable
                        error={!!error}
                        helperText={error?.message}
                        {...field}
                    />
                )}
            />
            <Space direction="vertical" align="start" size={8} style={{ width: '100%' }}>
                <Controller
                    control={control}
                    name="subject"
                    rules={{
                        required: {
                            value: true,
                            message: t('validation_field_required'),
                        },
                    }}
                    render={({ field, fieldState: { error } }) => (
                        <FieldText
                            label={`${t('outbound_content')}*`}
                            placeholder={`${t('journey_email_subject_title')}*`}
                            {...field}
                            fullWidth
                            error={!!error}
                            helperText={error?.message}
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="content"
                    rules={{
                        required: {
                            value: true,
                            message: t('validation_field_required'),
                        },
                        validate: {
                            fileSize: (value?: { content?: string; files?: Attachment[] }) => {
                                if (value?.files?.some((attachment) => (attachment?.file?.size ?? 0) > 10 * 1000 * 1000)) {
                                    return t('error_individual_file_size', { size: '10 MB' });
                                }
                                if (
                                    (value?.files?.reduce((prev, attachment) => prev + (attachment?.file?.size ?? 0), 0) ?? 0) >
                                    25 * 1000 * 1000
                                ) {
                                    return t('journey_email_template_all_attachments_file_size_limit');
                                }
                                return true;
                            },
                        },
                    }}
                    render={({ field, fieldState: { error } }) => (
                        <FieldTextEditor
                            {...field}
                            placeholder={t('journey_email_template_content_placeholder')}
                            error={!!error}
                            helperText={error?.message}
                            onUpload={onUpload}
                            onDelete={onDelete}
                            onImageUpload={onUpload}
                            onImageDelete={onDelete}
                            showFileSize
                            blotsProps={{
                                ctaButton: {
                                    newTouchpointOnClick: ({ setValue: setTouchpoint }) => {
                                        modal({
                                            title: t('new_campaign_touchpoint'),
                                            content: ({ onClose }) => (
                                                <TouchpointOperationModal
                                                    touchpointId="new"
                                                    onAfterCreate={(touchpoint) => {
                                                        const url = touchpoint.wechat_config
                                                            ? touchpoint.wechat_config.wechat_url_with_initiation_phase
                                                            : `${env.VITE_APP_CAMPAIGN_DOMAIN}?id=${touchpoint._id}&env=${env.VITE_APP_ENV}`;
                                                        setTouchpoint({ id: touchpoint._id, url });
                                                        onClose();
                                                    }}
                                                />
                                            ),
                                        });
                                    },
                                    request:
                                        (params) =>
                                        async ({ queryKey }) => {
                                            const { type } = queryKey[1];
                                            const { setValue: setTouchpointUrl, setCurrentType } = params;
                                            if (!type) {
                                                return [
                                                    {
                                                        icon: (
                                                            <Icon name="campaign" fontSize={24} style={{ color: 'var(--color-light-5)' }} />
                                                        ),
                                                        text: t('text_editor_cta_button_use_touchpoint'),
                                                        description: t('text_editor_cta_button_use_touchpoint_desc'),
                                                        value: 'touchpoint',
                                                        iconAlignment: 'flex-start',
                                                        onClick: () => {
                                                            setCurrentType('touchpoint');
                                                        },
                                                    },
                                                    {
                                                        icon: <Icon name="link" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
                                                        text: t('text_editor_cta_button_use_url'),
                                                        description: t('text_editor_cta_button_use_url_desc'),
                                                        value: 'url',
                                                        iconAlignment: 'flex-start',
                                                        onClick: () => {
                                                            setCurrentType('url');
                                                        },
                                                    },
                                                ];
                                            }
                                            if (type === 'touchpoint') {
                                                const { data } = await apiFetch<{
                                                    data: API.Touchpoint[];
                                                }>(getTouchpointList.api({}), getTouchpointList.method);

                                                return data.data.map((touchpoint) => {
                                                    const description =
                                                        typeof touchpoint.url === 'string' && touchpoint.url
                                                            ? touchpoint.url
                                                            : touchpoint.channel?.name;
                                                    const disabled =
                                                        touchpoint.is_archived ||
                                                        touchpoint.is_paused ||
                                                        touchpoint.is_outside_range ||
                                                        touchpoint.status === 'update_needed' ||
                                                        touchpoint.status === 'inactive';

                                                    return {
                                                        text: touchpoint.name,
                                                        value: touchpoint._id,
                                                        description: description ? (
                                                            <EllipsisText
                                                                element={
                                                                    <Typography
                                                                        variant="Caption"
                                                                        style={{
                                                                            color: disabled
                                                                                ? 'var(--color-light-3)'
                                                                                : 'var(--color-light-5)',
                                                                        }}
                                                                    />
                                                                }
                                                                text={description}
                                                            />
                                                        ) : undefined,
                                                        icon:
                                                            typeof touchpoint.url === 'string' && touchpoint.url ? (
                                                                <Icon
                                                                    name="link"
                                                                    fontSize={24}
                                                                    style={{
                                                                        color: disabled ? 'var(--color-light-3)' : 'var(--color-light-5)',
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Icon
                                                                    namespace="channel"
                                                                    fontSize={24}
                                                                    name={touchpoint.channel?.config?.type as API.ChannelType}
                                                                />
                                                            ),
                                                        iconAlignment: 'flex-start',
                                                        disabled,
                                                        onClick: () => {
                                                            const url = touchpoint.wechat_config
                                                                ? touchpoint.wechat_config.wechat_url_with_initiation_phase
                                                                : `${env.VITE_APP_CAMPAIGN_DOMAIN}?id=${touchpoint._id}&env=${env.VITE_APP_ENV}`;
                                                            setTouchpointUrl(url);
                                                        },
                                                    };
                                                });
                                            }

                                            return [];
                                        },
                                },
                                dataBoardVariable: {
                                    boardId,
                                    blotsValidation: async (blotInstances) => {
                                        try {
                                            if (boardId) {
                                                const fields = await fetchBoardFields(boardId);

                                                blotInstances.forEach((blotInstance) => {
                                                    // Data board variable blot validation
                                                    const isExist =
                                                        fields?.findIndex(
                                                            (boardField) => boardField._id === blotInstance.getCurrentFieldId(),
                                                        ) !== -1;
                                                    if (blotInstance.getCurrentBoardId() !== boardId) {
                                                        blotInstance.changeCurrentBoardId(boardId || '');
                                                    }
                                                    if (fields && !isExist) {
                                                        blotInstance.toggleInvalid(true);
                                                    } else if (fields && isExist) {
                                                        blotInstance.toggleInvalid(false);
                                                    }
                                                });
                                            }
                                        } catch (err) {
                                            console.log(err);
                                        }
                                    },
                                    boardsRequest: async () => {
                                        const { data } = await apiFetch<API.PaginatedResponse<API.Board[]>>(
                                            getBoards.api({
                                                limit: 0,
                                                skip: 0,
                                                sort: '-created_at',
                                            }),
                                            getBoards.method,
                                        );
                                        return data.data.map((board) => {
                                            return {
                                                value: board._id,
                                                text: board.name,
                                            };
                                        });
                                    },
                                    fieldsRequest: async () => {
                                        if (boardId) {
                                            const { data } = await apiFetch<API.Board>(getBoardById.api(boardId), getBoardById.method);
                                            return data.fields.map((boardField) => {
                                                return {
                                                    text: boardField.name,
                                                    value: boardField._id,
                                                };
                                            });
                                        }
                                        return [];
                                    },
                                },
                                unsubscribe: {
                                    link: `${env.VITE_APP_WCS_HOST}/email-campaign/opt-out`,
                                },
                            }}
                            fileValidation={async (file) => {
                                const { size } = file;
                                if (size > 10 * 1000 * 1000) {
                                    return t('error_individual_file_size', { size: '10 MB' });
                                }
                                return true;
                            }}
                            onGetInfo={handleGetFileInfo}
                            onChange={(content) => {
                                field.onChange(content);
                                if (content?.files) {
                                    if (
                                        content?.files.some(
                                            (file) =>
                                                file.status === 'uploading' || file.status === 'deleting' || file.status === 'missingFile',
                                        )
                                    ) {
                                        setError('root.hasProcessingFiles', { type: 'custom', message: 'hasProcessingFiles' });
                                    } else {
                                        clearErrors('root.hasProcessingFiles');
                                    }
                                }
                            }}
                        />
                    )}
                />
            </Space>
        </Space>
    );
};

export default EmailOutbound;
