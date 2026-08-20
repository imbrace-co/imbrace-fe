import { Button, FieldSelect, FieldText, Icon, Space, Tooltip } from '@imbrace/ui';
import { Divider } from '@mui/material';
import { getCountryForTimezone } from 'countries-and-timezones';
import type { TFunction } from 'i18next';
import { getParamByISO } from 'iso-country-currency';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, type UseFormReturn, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import SimpleBar from 'simplebar-react';
import { z } from 'zod';

import { FieldTypes, FieldTypesOptions } from '@/pages/Databoards/utils';

import FieldExtraOptions from './fieldExtraOptions';
import styles from './index.module.scss';

export const FieldSchema = ({
    t,
    existFields,
    checkDuplicate = true,
}: {
    t: TFunction<'translation', undefined>;
    existFields?: API.BoardField[];
    checkDuplicate?: boolean;
}) =>
    z.object({
        description: z
            .string()
            .max(
                1000,
                t('validation_input_description_maxlength', {
                    max: 1000,
                }),
            )
            .optional(),
        type: z.enum(FieldTypes, {
            required_error: t('validation_field_required'),
        }),
        name: z.string({ required_error: t('validation_field_required') }).superRefine((val, ctx) => {
            if (!val || val.length < 1 || val.trim().length <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('validation_field_required'),
                    fatal: true,
                });

                return z.NEVER;
            }

            if (checkDuplicate) {
                const uniqueValues = new Map<string, number>();
                existFields?.forEach((field, idx) => {
                    uniqueValues.set(field.name.toLocaleLowerCase(), idx);
                });
                const firstAppearanceIndex = uniqueValues.get(val.toLocaleLowerCase());
                if (firstAppearanceIndex !== undefined) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('error_field_name_exists'),
                        fatal: true,
                    });
                    return z.NEVER;
                }
            }
        }),
        data: z
            .tuple([
                z.object({
                    value: z.string({ required_error: t('validation_field_required') }).superRefine((val, ctx) => {
                        if (!val || val.length < 1 || val.trim().length <= 0) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: t('validation_field_required'),
                                fatal: true,
                            });

                            return z.NEVER;
                        }
                    }),
                }),
            ])
            .rest(
                z.object({
                    value: z.string({ required_error: t('validation_field_required') }).superRefine((val, ctx) => {
                        if (!val || val.length < 1 || val.trim().length <= 0) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: t('validation_field_required'),
                                fatal: true,
                            });

                            return z.NEVER;
                        }
                    }),
                }),
            )
            .optional()
            .superRefine((items, ctx) => {
                const uniqueValues = new Map<string, number>();
                items?.forEach((item, idx) => {
                    const lowerCaseValue = item.value.toLowerCase().trim();
                    const firstAppearanceIndex = uniqueValues.get(lowerCaseValue);
                    if (firstAppearanceIndex !== undefined) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: t('fields_management_form_duplicate_option'),
                            path: [idx, 'value'],
                        });
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: t('fields_management_form_duplicate_option'),
                            path: [firstAppearanceIndex, 'value'],
                        });
                        return;
                    }
                    uniqueValues.set(lowerCaseValue, idx);
                });
            }),
        settings: z.record(z.string(), z.string().or(z.boolean()).or(z.number()).optional()).optional(),
    });

export type FieldType = z.infer<ReturnType<typeof FieldSchema>>;

const OperationFieldForm = ({
    methods,
    boardField,
    boardType,
    boardName,
}: {
    methods: UseFormReturn<FieldType, any>;
    boardField?: API.BoardField;
    boardType?: API.BoardType;
    boardName?: string;
}) => {
    const { control, setValue } = methods;
    const fieldType = useWatch({ control, name: 'type' });

    const { t } = useTranslation();
    const parentRef = useRef<HTMLDivElement>(null);
    const [showDescription, setShowDescription] = useState(false);
    const fieldDescLimit = 1000;
    const [fieldDescLength, setFieldDescLength] = useState(boardField?.description?.length || 0);

    const typeOptions = useMemo(() => {
        if (boardField?.type === 'RichText') {
            return [
                ...FieldTypesOptions(t),
                {
                    value: 'RichText',
                    text: t('field_rich_text'),
                    icon: <Icon name="richText" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
                },
            ];
        }
        return FieldTypesOptions(t);
    }, [t, boardField]);

    useEffect(() => {
        const defaultDataOptions = () => {
            if (fieldType === 'Priority') {
                setValue('data', [{ value: 'Low' }, { value: 'Medium' }, { value: 'High' }, { value: 'Very High' }], {
                    shouldDirty: true,
                    shouldValidate: true,
                });
                return;
            }
            if (fieldType === 'SingleSelection' || fieldType === 'MultipleSelection' || fieldType === 'Origin') {
                setValue('data', [{ value: '' }], {
                    shouldDirty: true,
                    shouldValidate: true,
                });
                return;
            }

            setValue('data', undefined, {
                shouldDirty: true,
                shouldValidate: true,
            });
        };
        if (!boardField) {
            defaultDataOptions();
        } else if (!boardField.data || boardField.data?.length === 0) {
            defaultDataOptions();
        }
    }, [fieldType, setValue, boardField]);

    useEffect(() => {
        const countryCode = getCountryForTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)?.id ?? 'US';
        if (boardField) {
            if (boardField.description) setShowDescription(true);
            if (fieldType === 'Phone' && !boardField.settings?.default_country_code) {
                setValue('settings.default_country_code', countryCode, {
                    shouldDirty: true,
                    shouldValidate: true,
                });
            }
            if (fieldType === 'Currency' && !boardField.settings?.default_currency_code) {
                setValue('settings.default_currency_code', getParamByISO(countryCode, 'currency'), {
                    shouldDirty: true,
                    shouldValidate: true,
                });
            }
        } else if (fieldType === 'Phone') {
            setValue('settings.default_country_code', countryCode, {
                shouldDirty: true,
                shouldValidate: true,
            });
        } else if (fieldType === 'Currency') {
            setValue('settings.default_currency_code', getParamByISO(countryCode, 'currency'), {
                shouldDirty: true,
                shouldValidate: true,
            });
        } else {
            setValue('settings.default_country_code', undefined, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    }, [boardField, setValue, fieldType]);

    return (
        <SimpleBar
            style={{ width: 'calc(100% + 64px)', margin: '0 -32px', padding: '0 32px', maxHeight: 500, overflow: 'auto' }}
            autoHide
            className={styles.container}
            scrollableNodeProps={{ ref: parentRef }}
        >
            <Space size={16} direction="vertical" align="stretch" style={{ width: '100%' }}>
                <Space size={4} direction="vertical" align="start" style={{ width: '100%' }}>
                    <Controller
                        control={control}
                        name="name"
                        render={({ field, fieldState: { error } }) => {
                            return (
                                <>
                                    {!!boardField ? (
                                        <Tooltip
                                            title={t('fields_management_form_name_disabled_tooltip')}
                                            disableHoverListener={!boardField?.is_default}
                                            disableFocusListener
                                            placement="top"
                                            arrow
                                        >
                                            <div style={{ width: '100%' }}>
                                                <FieldText
                                                    fullWidth
                                                    label={`${t('fields_management_form_name')}*`}
                                                    error={!!error}
                                                    helperText={error?.message}
                                                    {...field}
                                                    disabled={boardField?.is_default}
                                                />
                                            </div>
                                        </Tooltip>
                                    ) : (
                                        <FieldText
                                            fullWidth
                                            label={`${t('fields_management_form_name')}*`}
                                            error={!!error}
                                            helperText={error?.message}
                                            {...field}
                                        />
                                    )}
                                </>
                            );
                        }}
                    />
                    {showDescription && (
                        <Controller
                            control={control}
                            name="description"
                            render={({ field, fieldState: { error } }) => {
                                return (
                                    <div className={styles.fieldDesc}>
                                        <FieldText
                                            {...field}
                                            fullWidth
                                            label={`${t('description')}`}
                                            placeholder={t('description')}
                                            error={!!error}
                                            helperText={error?.message}
                                            multiline
                                            rows={4}
                                            {...(field.value && {
                                                onReset: () => {
                                                    setValue('description', '', { shouldValidate: true, shouldDirty: true });
                                                    setShowDescription(false);
                                                    setFieldDescLength(0);
                                                },
                                            })}
                                            onChange={(e) => {
                                                const fieldContent = e.target.value;
                                                field.onChange(
                                                    fieldContent.length > fieldDescLimit
                                                        ? fieldContent.slice(0, fieldDescLimit)
                                                        : fieldContent,
                                                );
                                                setFieldDescLength(
                                                    fieldContent.length > fieldDescLimit ? fieldDescLimit : fieldContent?.length,
                                                );
                                            }}
                                        />
                                        <label
                                            className={`${styles.fieldLimit} ${
                                                fieldDescLength <= fieldDescLimit ? styles.fieldDescIsLimit : styles.fieldDescOverLimit
                                            }`}
                                        >
                                            {fieldDescLength} / {fieldDescLimit}
                                        </label>
                                    </div>
                                );
                            }}
                        />
                    )}
                    {!showDescription && (
                        <Button
                            variant="link"
                            startIcon={<Icon name="add" fontSize={16} />}
                            size="xxs"
                            sx={{ gap: '4px', fontWeight: 400, fontSize: 12, lineHeight: '15px' }}
                            text={t('field_add_description')}
                            onClick={() => {
                                setShowDescription(true);
                            }}
                        />
                    )}
                </Space>
                <Divider />
                <Controller
                    name="type"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                        <FieldSelect
                            {...field}
                            label={`${t('fields_management_form_type')}*`}
                            fullWidth
                            error={!!error}
                            helperText={error?.message}
                            placeholder={t('click_to_select')}
                            queryKey={['newFieldType']}
                            request={async () => {
                                return typeOptions;
                            }}
                            disabled={!!boardField}
                        />
                    )}
                />
                <FieldExtraOptions
                    boardType={boardType}
                    boardName={boardName}
                    containerRef={parentRef}
                    boardField={boardField}
                    methods={methods}
                />
            </Space>
        </SimpleBar>
    );
};

export default OperationFieldForm;
