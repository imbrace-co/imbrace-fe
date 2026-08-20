import type { Attachment, SelectRef } from '@imbrace/ui';
import {
    EllipsisText,
    FieldSelect,
    FieldText,
    FieldTextEditor,
    Icon,
    IconButton,
    Space,
    Typography,
    useDialog,
    useModal,
} from '@imbrace/ui';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import i18next from 'i18next';
import { debounce } from 'lodash';
import { useCallback, useMemo, useRef } from 'react';
import type { UseFormReturn, UseFormSetValue } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import TooltipWithHelpIcon from '@/components/TooltipWithHelpIcon';
import { env } from '@/env';
import { TouchpointOperationModal } from '@/pages/Campaign/components/TouchpointOperation';
import type { EmailTemplatePayload } from '@/pages/Templates/emailTemplates';
import { getEmailTemplates } from '@/services/api/app';
import { getTouchpointList } from '@/services/api/campaign';
import { getBoardById } from '@/services/api/crm';
import { deleteMarketPlaceFile, downloadMarketPlaceFile, getMarketPlaceFile, postMarketPlaceFile } from '@/services/api/marketplace';
import { getTemplateCategories } from '@/services/api/messageTemplates';
import { ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import CategoryActions from './components/categoryActions';
import CategoryForm from './components/categoryForm';
import type { CategoryPayload, CreateTemplateCategoryResponse } from './messageTemplateForm';
import { handleCreateTemplateCategory } from './messageTemplateForm';

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

const EmailTemplateFormV2 = ({
    methods,
    disabledAudience,
    templateId,
}: {
    methods: UseFormReturn<EmailTemplatePayload>;
    disabledAudience?: boolean;
    templateId?: string;
}) => {
    const { control, setValue, setError, clearErrors, getValues, trigger } = methods;
    const categorySelectRef = useRef<SelectRef>(null);
    const [{ dialogForm }, dialogHolder] = useDialog();
    const { t } = useTranslation();
    const [{ modal }, modalHolder] = useModal();
    const boardId = useWatch({ control, name: 'board_id' });
    const categoryId = useWatch({ control, name: 'category' });

    const createTemplateCategory = useMutation<CreateTemplateCategoryResponse, AxiosError, { formData: CategoryPayload }>({
        mutationFn: async ({ formData }) => {
            const result = await handleCreateTemplateCategory({ formData });
            return result as CreateTemplateCategoryResponse;
        },
        onSuccess: () => {
            categorySelectRef.current?.refresh();
        },
    });

    const validateName = useCallback(async (val: string) => {
        try {
            const searchParams = new URLSearchParams();
            searchParams.append('limit', '0');
            searchParams.append('q', `${val}`);
            searchParams.append('field', 'title');

            const { data } = await apiFetch<API.PaginatedMetaResponse<API.EmailTemplate[]>>(
                getEmailTemplates.api(),
                getEmailTemplates.method,
                searchParams,
            );

            return (
                data.data.filter((emailTemplate) => {
                    return emailTemplate.name.toLowerCase() === val.toLowerCase();
                }).length <= 0
            );
        } catch (error) {
            return false;
        }
    }, []);

    const debounceValidateName = useMemo(
        () =>
            debounce(async (val: string) => {
                setError('root.validatingName', {
                    type: 'custom',
                    message: 'validatingName',
                });
                const isValid = await validateName(val);
                if (val === getValues('name')) {
                    if (!isValid) {
                        clearErrors('root.validatingName');
                        setError('root.duplicatedName', {
                            type: 'custom',
                            message: t('journey_email_template_name_exists'),
                        });
                    } else {
                        clearErrors('root.validatingName');
                        clearErrors('root.duplicatedName');
                    }
                }
            }, 300),
        [clearErrors, setError, t, getValues, validateName],
    );

    return (
        <Space direction="vertical" align="start" size={16}>
            {dialogHolder}
            {modalHolder}
            <Controller
                control={control}
                name="name"
                rules={{
                    required: {
                        value: true,
                        message: t('validation_field_required'),
                    },
                }}
                render={({ field, fieldState: { error }, formState: { errors } }) => (
                    <FieldText
                        formControlSx={{ width: 436 }}
                        label={`${t('email_template_name')}*`}
                        {...field}
                        onChange={(e) => {
                            field.onChange(e);

                            if (e.target.value === getValues('name') && e.target.value) {
                                debounceValidateName(e.target.value);
                            }
                            trigger('name');
                        }}
                        error={!!error || !!errors?.root?.duplicatedName}
                        helperText={error?.message || errors?.root?.duplicatedName?.message}
                    />
                )}
            />
            <Controller
                control={control}
                name="category"
                render={({ field, fieldState: { error } }) => {
                    return (
                        <FieldSelect
                            fullWidth
                            queryKey={['templateCategory']}
                            placeholder={t('click_to_select')}
                            formControlSx={{ width: 436 }}
                            description={t('journey_email_template_category_desc')}
                            label={`${t('category')}`}
                            {...(field.value && {
                                onReset: () => {
                                    setValue('category', '');
                                },
                            })}
                            {...field}
                            ref={categorySelectRef}
                            request={async () => {
                                const { data } = await apiFetch<{ data: API.TemplateCategory[] }>(
                                    getTemplateCategories.api,
                                    getTemplateCategories.method,
                                );
                                return data.data.map((item: API.TemplateCategory) => {
                                    const onCategoryDelete = () => {
                                        if (item._id === categoryId) {
                                            categorySelectRef.current?.clear();
                                        }
                                        categorySelectRef.current?.refresh();
                                    };

                                    return {
                                        text: (
                                            <Space size={8} style={{ color: 'var(--color-secondary-1)' }}>
                                                <Typography style={{ color: 'var(--color-light-7)', lineHeight: '20px' }}>
                                                    {item.name}
                                                </Typography>
                                                {item.description && <TooltipWithHelpIcon placement="bottom" title={item.description} />}
                                            </Space>
                                        ),
                                        value: item._id,
                                        extra: () => (
                                            <CategoryActions<EmailTemplatePayload>
                                                category={item}
                                                categorySelectRef={categorySelectRef}
                                                onDelete={onCategoryDelete}
                                                setValue={setValue as UseFormSetValue<EmailTemplatePayload>}
                                            />
                                        ),
                                    };
                                });
                            }}
                            footer={() => (
                                <IconButton
                                    size="default"
                                    variant="text"
                                    type="secondary"
                                    sx={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        gap: '12px',
                                        justifyContent: 'flex-start',
                                        textTransform: 'capitalize',
                                        borderRadius: 0,
                                    }}
                                    onClick={() => {
                                        dialogForm<CategoryPayload>({
                                            title: t('templates_new_category'),
                                            content: (formMethods) => <CategoryForm methods={formMethods} />,
                                            onConfirm: async (formData, { setError: setFormError }) => {
                                                try {
                                                    const res = await createTemplateCategory.mutateAsync({ formData });
                                                    setValue('category', res.id);
                                                    return true;
                                                } catch (err) {
                                                    const errorRes = err as AxiosError;
                                                    if (errorRes.response?.data?.error_code === 'category_already_exists') {
                                                        setFormError('name', {
                                                            type: 'custom',
                                                            message: t('template_category_name_duplicated'),
                                                        });
                                                    }
                                                    return false;
                                                }
                                            },
                                            onClose: () => {},
                                            defaultValues: {
                                                name: '',
                                                description: '',
                                            },
                                            hideCancelButton: true,
                                            confirmText: t('create'),
                                            actionsAlign: 'flex-start',
                                            confirmButtonProps: {
                                                size: 'default',
                                            },
                                            showCloseButton: true,
                                        });
                                    }}
                                >
                                    <Icon name="add" fontSize={24} style={{ color: 'var(--color-primary-1)' }} />
                                    <Space size={4}>
                                        <Typography style={{ color: 'var(--color-primary-1)' }}>{t('add_new')}</Typography>
                                    </Space>
                                </IconButton>
                            )}
                            onChange={(e, isValid) => {
                                field.onChange(e);
                                if (e && isValid === 'out_of_range') {
                                    setError('category', {
                                        type: 'outOfRange',
                                        message: t('error_option_out_of_range'),
                                    });
                                }
                            }}
                            error={!!error}
                            helperText={error?.message}
                        />
                    );
                }}
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
                            label={`${t('journey_email_template_content')}*`}
                            placeholder={t('journey_email_template_subject_placeholder')}
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
                            formControlSx={{
                                minHeight: '465px',
                            }}
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
                                                    } else if (fields && !isExist) {
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
                                    hideSource: true,
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
                                        setError('root.hasProcessingFiles', {
                                            type: 'custom',
                                            message: 'hasProcessingFiles',
                                        });
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

export default EmailTemplateFormV2;
