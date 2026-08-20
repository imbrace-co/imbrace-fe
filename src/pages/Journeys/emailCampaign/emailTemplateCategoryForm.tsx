import { FieldText, Space } from '@imbrace/ui';
import { debounce } from 'lodash';
import { useCallback, useMemo } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { getEmailTemplateCategories } from '@/services/api/app';
import apiFetch from '@/services/axios/handler';

const EmailTemplateCategoryForm = ({
    methods,
    appId,
    categoryId,
}: {
    methods: UseFormReturn<{ name: string; description: string }>;
    appId: string;
    categoryId?: string;
}) => {
    const { control, setError, clearErrors, getValues } = methods;
    const { t } = useTranslation();

    const validateName = useCallback(
        async (val: string) => {
            try {
                const searchParams = new URLSearchParams();
                searchParams.append('limit', '0');

                searchParams.append('search', `${val}`);

                const { data } = await apiFetch<{ data: API.EmailTemplateCategory[] }>(
                    getEmailTemplateCategories.api(appId),
                    getEmailTemplateCategories.method,
                );

                return (
                    data.data.filter((category) => {
                        if (categoryId && category._id === categoryId && category.name === val) {
                            return false;
                        }
                        return category.name === val;
                    }).length <= 0
                );
            } catch (error) {
                return false;
            }
        },
        [appId, categoryId],
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
                            message: t('journey_email_template_category_name_exists'),
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
        <Space direction="vertical" align="start">
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
                        fullWidth
                        label={`${t('journey_email_template_category_name')}*`}
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
                name="description"
                render={({ field, fieldState: { error } }) => (
                    <FieldText
                        fullWidth
                        label={`${t('journey_email_template_category_description')}`}
                        {...field}
                        error={!!error}
                        helperText={error?.message}
                    />
                )}
            />
        </Space>
    );
};

export default EmailTemplateCategoryForm;
