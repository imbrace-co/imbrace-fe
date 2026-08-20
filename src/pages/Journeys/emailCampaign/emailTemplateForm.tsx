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
import type { RefObject } from 'react';
import { useCallback, useMemo, useRef } from 'react';
import type { UseFormReturn, UseFormSetValue } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import TooltipWithHelpIcon from '@/components/TooltipWithHelpIcon';
import { env } from '@/env';
import {
    deleteEmailTemplateCategory,
    getEmailTemplateCategories,
    getEmailTemplates,
    postEmailTemplateCategory,
    putEmailTemplateCategory,
} from '@/services/api/app';
import { getTouchpointList } from '@/services/api/campaign';
import { getBoardById, getBoards } from '@/services/api/crm';
import { deleteMarketPlaceFile, downloadMarketPlaceFile, getMarketPlaceFile, postMarketPlaceFile } from '@/services/api/marketplace';
import { ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import { TouchpointOperationModal } from '../../Campaign/components/TouchpointOperation';
import EmailTemplateCategoryForm from './emailTemplateCategoryForm';
import type { EmailTemplatePayload } from './emailTemplates';

export interface CategoryResp {
    doc_name: string;
    name: string;
    apply_to: string;
    app_id: string;
    is_default: boolean;
    organization_id: string;
    reference_id?: string;
    _id: string;
    public_id: string;
    created_at: string;
}

const fetchBoardFields = async (boardId: string) => {
    const { data } = await apiFetch<API.Board>(getBoardById.api(boardId || ''), getBoardById.method);
    return data.fields;
};

const handleCreateCategory = async (params: { formData: { name: string; description: string }; appId: string }) => {
    const { data } = await apiFetch<{ data: CategoryResp }>(postEmailTemplateCategory.api(), postEmailTemplateCategory.method, {
        ...params.formData,
        app_id: params.appId,
        apply_to: 'email-template',
    });
    return data;
};
const handleUpdateCategory = async (params: { categoryId: string; formData: { name: string; description: string }; appId: string }) => {
    const { data } = await apiFetch<{ data: CategoryResp }>(
        putEmailTemplateCategory.api(params.categoryId),
        putEmailTemplateCategory.method,
        {
            ...params.formData,
            app_id: params.appId,
            apply_to: 'email-template',
        },
    );
    return data;
};
const handleDeleteCategory = async (categoryId: string) => {
    const { data } = await apiFetch(deleteEmailTemplateCategory.api(categoryId), deleteEmailTemplateCategory.method);
    return data;
};

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

const CategoryActions = ({
    category,
    categorySelectRef,
    appId,
    onDelete,
    setValue,
}: {
    category: API.EmailTemplateCategory;
    categorySelectRef: RefObject<SelectRef>;
    appId: string;
    onDelete: () => void;
    setValue: UseFormSetValue<EmailTemplatePayload>;
}) => {
    const { t } = useTranslation();
    const [{ dialogForm }, dialogHolder] = useDialog();
    const updateCategory = useMutation({
        mutationFn: handleUpdateCategory,
    });

    const deleteCategory = useMutation({
        mutationFn: handleDeleteCategory,
    });

    const openUpdateCategory = useCallback(() => {
        dialogForm<{ name: string; description: string }>({
            title: t('journey_email_template_category'),
            content: (categoryMethods) => <EmailTemplateCategoryForm methods={categoryMethods} appId={appId} categoryId={category._id} />,
            defaultValues: {
                name: category.name,
                description: category.description,
            },
            onConfirm: async (formData) => {
                const { data } = await updateCategory.mutateAsync({ categoryId: category._id, formData, appId });

                categorySelectRef.current?.refresh();

                if (data.reference_id) {
                    setValue('category', data._id, { shouldDirty: true });
                }
                return true;
            },
            onClose: () => {},
            hideCancelButton: true,
            confirmText: t('update'),
            actionsAlign: 'flex-start',
            confirmButtonProps: {
                size: 'default',
            },
            showCloseButton: true,
        });
    }, [dialogForm, t, appId, category, categorySelectRef, setValue, updateCategory]);

    return (
        <Space size={8}>
            {dialogHolder}
            <IconButton
                size={'xs'}
                variant="text"
                type="secondary"
                sx={{ padding: 0 }}
                onClick={() => {
                    openUpdateCategory();
                }}
            >
                <Icon name="edit" />
            </IconButton>
            <IconButton
                size={'xs'}
                variant="text"
                type="secondary"
                loading={deleteCategory.isPending}
                sx={{ padding: 0 }}
                onClick={async () => {
                    try {
                        await deleteCategory.mutateAsync(category._id);
                        onDelete();
                    } catch (error) {
                        console.log(error);
                    }
                }}
            >
                <Icon name="delete" />
            </IconButton>
        </Space>
    );
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
const EmailTemplateForm = ({
    methods,
    appId,
    dataBoards,
    disabledAudience,
    templateId,
}: {
    methods: UseFormReturn<EmailTemplatePayload>;
    appId: string;
    dataBoards?: Record<
        string,
        {
            board_name: string;
        }
    >;
    disabledAudience?: boolean;
    templateId?: string;
}) => {
    const { control, setValue, setError, clearErrors, getValues } = methods;
    const categorySelectRef = useRef<SelectRef>(null);
    const { t } = useTranslation();
    const boardId = useWatch({ name: 'board_id', control });
    const categoryId = useWatch({ name: 'category', control });
    const [{ dialogForm }, dialogHolder] = useDialog();
    const [{ modal }, modalHolder] = useModal();

    const createCategory = useMutation({
        mutationFn: handleCreateCategory,
    });

    const openAddNewCategory = useCallback(() => {
        dialogForm<{ name: string; description: string }>({
            title: t('journey_email_template_category_add_new_title'),
            content: (categoryMethods) => <EmailTemplateCategoryForm methods={categoryMethods} appId={appId} />,
            onConfirm: async (formData) => {
                await createCategory.mutateAsync({ formData, appId });
                categorySelectRef.current?.refresh();
                return true;
            },
            onClose: () => {},
            hideCancelButton: true,
            confirmText: t('create'),
            actionsAlign: 'flex-start',
            confirmButtonProps: {
                size: 'default',
            },
            showCloseButton: true,
        });
    }, [dialogForm, t, appId, createCategory]);

    const validateName = useCallback(
        async (val: string) => {
            try {
                const searchParams = new URLSearchParams();
                searchParams.append('limit', '0');

                searchParams.append('search', `${val}`);

                searchParams.append('app_id', appId);

                const { data } = await apiFetch<API.PaginatedMetaResponse<API.EmailTemplate[]>>(
                    getEmailTemplates.api(),
                    getEmailTemplates.method,
                    searchParams,
                );

                return (
                    data.data.filter((emailTemplate) => {
                        if (templateId && emailTemplate._id === templateId && emailTemplate.name === val) {
                            return false;
                        }
                        return emailTemplate.name === val;
                    }).length <= 0
                );
            } catch (error) {
                return false;
            }
        },
        [appId, templateId],
    );

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
                        label={`${t('journey_email_template_name')}*`}
                        {...field}
                        onChange={(e) => {
                            field.onChange(e);

                            if (e.target.value === getValues('name') && e.target.value) {
                                debounceValidateName(e.target.value);
                            }
                        }}
                        error={!!error || !!errors?.root?.duplicatedName}
                        helperText={error?.message || errors?.root?.duplicatedName?.message}
                    />
                )}
            />
            <Controller
                control={control}
                name="category"
                render={({ field, fieldState: { error } }) => (
                    <FieldSelect
                        fullWidth
                        queryKey={['emailTemplateCategory', appId]}
                        placeholder={t('click_to_select')}
                        formControlSx={{ width: 436 }}
                        description={t('journey_email_template_category_desc')}
                        label={`${t('category')}`}
                        {...(field.value && {
                            onReset: () => {
                                setValue('category', '', { shouldDirty: true });
                            },
                        })}
                        {...field}
                        ref={categorySelectRef}
                        request={async () => {
                            const { data } = await apiFetch<{ data: API.EmailTemplateCategory[] }>(
                                getEmailTemplateCategories.api(appId),
                                getEmailTemplateCategories.method,
                            );
                            return data.data.map((category) => {
                                const onCategoryDelete = () => {
                                    if (category._id === categoryId) {
                                        categorySelectRef.current?.clear();
                                    }
                                    categorySelectRef.current?.refresh();
                                };
                                return {
                                    text: (
                                        <Space size={8} style={{ color: 'var(--color-secondary-1)' }}>
                                            <Typography style={{ color: 'var(--color-light-7)', lineHeight: '20px' }}>
                                                {category.name}
                                            </Typography>
                                            {category.description && (
                                                <TooltipWithHelpIcon placement="bottom" title={category.description} />
                                            )}
                                        </Space>
                                    ),
                                    value: category._id,
                                    extra: () => (
                                        <CategoryActions
                                            category={category}
                                            categorySelectRef={categorySelectRef}
                                            appId={appId}
                                            onDelete={onCategoryDelete}
                                            setValue={setValue}
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
                                    openAddNewCategory();
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
                )}
            />
            <Controller
                control={control}
                name="board_id"
                render={({ field, fieldState: { error } }) => (
                    <FieldSelect
                        fullWidth
                        queryKey={['emailTemplate', 'audience']}
                        placeholder={t('click_to_select')}
                        formControlSx={{ width: 436 }}
                        description={t('journey_email_template_audience_desc')}
                        label={`${t('journey_email_template_audience_title')}`}
                        {...field}
                        request={async () => {
                            const boardsParams = {
                                limit: 0,
                                skip: 0,
                                sort: '-created_at',
                            };
                            const { data } = await apiFetch<{
                                data: API.Board[];
                            }>(getBoards.api(boardsParams), getBoards.method);
                            return data.data
                                .sort((board) => (board.name === 'Email Campaign' ? -1 : 0))
                                .map((board) => ({
                                    text: (
                                        <Typography style={{ lineHeight: '20px' }}>
                                            {board.name === 'Email Campaign' ? t('all_subscribers') : board.name}
                                        </Typography>
                                    ),
                                    value: board._id,
                                }));
                        }}
                        error={!!error}
                        helperText={error?.message}
                        disabled={disabledAudience}
                        onChange={(e, isValid) => {
                            field.onChange(e);
                            if (e && isValid === 'out_of_range') {
                                setError('board_id', {
                                    type: 'outOfRange',
                                    message: t('journey_email_template_audience_out_of_range'),
                                });
                            }
                        }}
                        {...(field.value && {
                            onReset: () => {
                                setValue('board_id', '', { shouldDirty: true });
                            },
                        })}
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
                                    hideSource: false,
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

export default EmailTemplateForm;
