import type { SelectRef } from '@imbrace/ui';
import { Button, FieldSelect, FieldText, Icon, IconButton, Space, Typography, useDialog } from '@imbrace/ui';
import { InputAdornment } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { debounce } from 'lodash';
import { useCallback, useMemo, useRef } from 'react';
import type { UseFormReturn, UseFormSetValue } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import TooltipWithHelpIcon from '@/components/TooltipWithHelpIcon';
import type { MessageTemplatePayload } from '@/pages/Templates';
import { useAppSelector } from '@/redux/store';
import {
    deleteMessagesById,
    getMessageTemplatesListV2,
    getTemplateCategories,
    postMessages,
    postTemplateCategory,
    putMessagesById,
} from '@/services/api/messageTemplates';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import CategoryActions from './components/categoryActions';
import CategoryForm from './components/categoryForm';

export interface CategoryPayload {
    _id?: string;
    name: string;
    description: string;
}

export interface CreateTemplateCategoryResponse {
    id: string;
    name: string;
    description: string;
    doc_name: string;
    apply_to: string[];
    created_at: string;
    is_default: boolean;
    is_deleted: boolean;
    organization_id: string;
    public_id: string;
}

export const handleCreateMessageTemplate = async (params: { formData: MessageTemplatePayload; businessId: string }) => {
    const { data } = await apiFetch<{ data: API.MessageTemplate }>(postMessages.api, postMessages.method, {
        ...params.formData,
        business_unit_id: params.businessId,
    });
    return data.data;
};

export const handleUpdateMessageTemplate = async (params: { templateId: string; formData: MessageTemplatePayload }) => {
    const { data } = await apiFetch(putMessagesById.api(params.templateId), putMessagesById.method, {
        ...params.formData,
    });
    return data;
};

export const handleDeleteMessageTemplate = async (params: { templateId: string }) => {
    const { data } = await apiFetch(deleteMessagesById.api(params.templateId), deleteMessagesById.method);
    return data;
};

export const handleCreateTemplateCategory = async (params: { formData: CategoryPayload }) => {
    const { data } = await apiFetch(postTemplateCategory.api, postTemplateCategory.method, {
        ...params.formData,
    });
    return data;
};

const MessageTemplateForm = ({ methods }: { methods: UseFormReturn<MessageTemplatePayload> }) => {
    const { control, setValue, setError, getValues, clearErrors, trigger } = methods;
    const businessId = useAppSelector((state) => state.BusinessUnit.businessUnitList)[0]?.id;
    const [{ dialogForm }, dialogHolder] = useDialog();
    const categorySelectRef = useRef<SelectRef>(null);
    const languageSelectRef = useRef<SelectRef>(null);

    const { t } = useTranslation();
    const categoryId = useWatch({ control, name: 'category' });

    const getLastVariableNumber = (text?: string) => {
        const regex = /{{\d+}}/g;
        const variable = text?.match(regex);
        const variableStr = variable?.join('');
        const variableNumber = variableStr?.match(/\d+/g)?.pop();
        return variableNumber ? parseInt(variableNumber, 10) : 0;
    };

    const addVariable = () => {
        let message = getValues('text');
        const variableNumber = getLastVariableNumber(message);
        message += `{{${variableNumber + 1}}}`;
        setValue('text', message);
    };

    const createTemplateCategory = useMutation<
        CreateTemplateCategoryResponse,
        AxiosError,
        {
            formData: CategoryPayload;
        }
    >({
        mutationFn: async ({ formData }) => {
            const result = await handleCreateTemplateCategory({ formData });
            return result as CreateTemplateCategoryResponse;
        },
        onSuccess: () => {
            categorySelectRef.current?.refresh();
        },
    });

    const validateTitle = useCallback(
        async (val: string) => {
            try {
                const searchParams = new URLSearchParams();
                searchParams.append('business_unit_id', businessId);
                // searchParams.append('limit', '0');
                searchParams.append('q', `${val}`);
                searchParams.append('fields', 'title');

                const { data } = await apiFetch<API.PaginatedMetaResponse<API.MessageTemplate[]>>(
                    getMessageTemplatesListV2.api(),
                    getMessageTemplatesListV2.method,
                    searchParams,
                    ImbraceClient,
                );

                return (
                    data.data.filter((messageTemplate) => {
                        return messageTemplate.title.toLowerCase() === val.toLowerCase();
                    }).length <= 0
                );
            } catch (error) {
                return false;
            }
        },
        [businessId],
    );

    const debounceValidateTitle = useMemo(
        () =>
            debounce(async (val: string) => {
                setError('root.validatingTitle', {
                    type: 'custom',
                    message: 'validatingTitle',
                });
                const isValid = await validateTitle(val);
                if (val === getValues('title')) {
                    if (!isValid) {
                        clearErrors('root.validatingTitle');
                        setError('root.duplicatedTitle', {
                            type: 'custom',
                            message: t('message_templates_title_exists'),
                        });
                    } else {
                        clearErrors('root.validatingTitle');
                        clearErrors('root.duplicatedTitle');
                    }
                }
            }, 300),
        [clearErrors, setError, t, getValues, validateTitle],
    );

    return (
        <Space direction="vertical" align="start" size={16}>
            {dialogHolder}
            <Controller
                control={control}
                name="title"
                rules={{
                    required: {
                        value: true,
                        message: t('validation_field_required'),
                    },
                }}
                render={({ field, fieldState: { error }, formState: { errors } }) => (
                    <FieldText
                        formControlSx={{ width: '100%' }}
                        label={`${t('message_templates_table_header_title')}*`}
                        {...field}
                        onChange={(e) => {
                            field.onChange(e);

                            if (e.target.value === getValues('title') && e.target.value) {
                                debounceValidateTitle(e.target.value);
                            }
                            trigger('title');
                        }}
                        error={!!error || !!errors?.root?.duplicatedTitle}
                        helperText={error?.message || errors?.root?.duplicatedTitle?.message}
                    />
                )}
            />
            <Controller
                control={control}
                name="category"
                render={({ field, fieldState: { error } }) => (
                    <FieldSelect
                        fullWidth
                        queryKey={['templateCategory']}
                        placeholder={t('click_to_select')}
                        formControlSx={{ width: '100%' }}
                        description={'What category does this template belongs to'}
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
                                    value: item.id,
                                    extra: () => (
                                        <CategoryActions<MessageTemplatePayload>
                                            category={item}
                                            categorySelectRef={categorySelectRef}
                                            onDelete={onCategoryDelete}
                                            setValue={setValue as UseFormSetValue<MessageTemplatePayload>}
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
                                                setValue('category', res?.id);
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
                )}
            />
            <Controller
                control={control}
                name="template_language"
                render={({ field, fieldState: { error } }) => (
                    <FieldSelect
                        fullWidth
                        queryKey={['templateLanguage']}
                        placeholder={t('click_to_select')}
                        formControlSx={{ width: '100%' }}
                        label={`${t('language')}`}
                        {...(field.value && {
                            onReset: () => {
                                setValue('template_language', '');
                            },
                        })}
                        {...field}
                        ref={languageSelectRef}
                        request={async () => {
                            return [
                                {
                                    text: 'English (US)',
                                    value: 'en',
                                },
                                {
                                    text: '繁體中文',
                                    value: 'zh',
                                },
                                {
                                    text: '简体中文',
                                    value: 'cn',
                                },
                            ];
                        }}
                        onChange={(e, isValid) => {
                            field.onChange(e);
                            if (e && isValid === 'out_of_range') {
                                setError('template_language', {
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
                name="text"
                rules={{
                    required: {
                        value: true,
                        message: t('validation_field_required'),
                    },
                }}
                render={({ field, fieldState: { error } }) => {
                    return (
                        <FieldText
                            formControlSx={{ width: '100%' }}
                            label={`${t('message_templates_table_header_content')}*`}
                            {...field}
                            onChange={(e) => {
                                field.onChange(e);
                            }}
                            error={!!error}
                            helperText={error?.message}
                            multiline
                            rows={8}
                            endAdornment={
                                <InputAdornment position="end" sx={{ marginRight: '10px', marginTop: 'auto', marginBottom: '24px' }}>
                                    <Button
                                        variant="text"
                                        size={'s'}
                                        text={t('message_templates_add_variable')}
                                        startIcon={<Icon name="addVariable" />}
                                        onClick={() => {
                                            addVariable();
                                        }}
                                        sx={{ padding: '0 12px', textTransform: 'none' }}
                                    />
                                </InputAdornment>
                            }
                        />
                    );
                }}
            />
        </Space>
    );
};

export default MessageTemplateForm;
