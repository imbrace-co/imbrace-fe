import { FieldText, Space } from '@imbrace/ui';
import { debounce } from 'lodash';
import { useCallback, useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { getTemplateCategories } from '@/services/api/messageTemplates';
import apiFetch from '@/services/axios/handler';

import type { CategoryPayload, CreateTemplateCategoryResponse } from '../messageTemplateForm';

interface CategoryFormProps {
    methods: UseFormReturn<CategoryPayload>;
    categoryId?: string;
}

const CategoryForm = ({ methods, categoryId }: CategoryFormProps) => {
    const { control, setError, clearErrors, getValues, trigger } = methods;
    const { t } = useTranslation();
    const [isValidating, setIsValidating] = useState(false);

    const validateName = useCallback(
        async (val: string) => {
            try {
                const searchParams = new URLSearchParams();
                searchParams.append('limit', '0');
                searchParams.append('search', `${val}`);

                const { data } = await apiFetch<{ data: CreateTemplateCategoryResponse[] }>(
                    getTemplateCategories.api,
                    getTemplateCategories.method,
                );

                return (
                    data.data.filter((category: CreateTemplateCategoryResponse) => {
                        if (categoryId && category.id === categoryId && category.name === val) {
                            return false;
                        }
                        return category.name.toLowerCase() === val.toLowerCase();
                    }).length <= 0
                );
            } catch (error) {
                return false;
            }
        },
        [categoryId],
    );

    const debounceValidateName = useMemo(
        () =>
            debounce(async (val: string) => {
                setIsValidating(true);
                const isValid = await validateName(val);
                if (val === getValues('name')) {
                    if (!isValid) {
                        clearErrors('root.validatingName');
                        setError('root.duplicatedName', {
                            type: 'custom',
                            message: t('journey_email_template_category_name_exists'),
                        });
                    } else {
                        clearErrors('root.validatingName');
                        clearErrors('root.duplicatedName');
                    }
                    trigger('name');
                }
                setIsValidating(false);
            }, 300),
        [clearErrors, setError, t, getValues, validateName, trigger],
    );

    return (
        <Space direction="vertical" align="start" size={16}>
            <Controller
                control={control}
                name="name"
                rules={{
                    required: {
                        value: true,
                        message: t('validation_field_required'),
                    },
                    validate: async (value) => {
                        if (isValidating) return true;
                        const isValid = await validateName(value);
                        return isValid || t('journey_email_template_category_name_exists');
                    },
                }}
                render={({ field, fieldState: { error }, formState: { errors } }) => (
                    <FieldText
                        formControlSx={{ width: '100%' }}
                        label={`${t('templates_category_name')}*`}
                        {...field}
                        onChange={(e) => {
                            field.onChange(e);
                            if (e.target.value) {
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
                name="description"
                render={({ field, fieldState: { error }, formState: { errors } }) => (
                    <FieldText
                        formControlSx={{ width: '100%' }}
                        label={t('templates_category_description')}
                        {...field}
                        onChange={(e) => {
                            field.onChange(e);
                        }}
                        error={!!error}
                        helperText={error?.message}
                    />
                )}
            />
        </Space>
    );
};

export default CategoryForm;
