import { Button, FieldSelect, FieldSwitch, FieldText, Icon, Space, Tooltip, Typography } from '@imbrace/ui';
import { Divider } from '@mui/material';
import { getCountryForTimezone } from 'countries-and-timezones';
import type { TFunction } from 'i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, type UseFormReturn, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import SimpleBar from 'simplebar-react';
import { z } from 'zod';

import { FieldTypes } from '@/pages/Databoards/utils';

import FieldExtraOptions from './fieldExtraOptions';
import styles from './index.module.scss';

export const FieldSchema = ({
    t,
    existFields,
    checkDuplicate = true,
}: {
    t: TFunction<'translation', undefined>;
    existFields?: FormManagement.FormField[];
    checkDuplicate?: boolean;
}) =>
    z.object({
        title: z.string({ required_error: t('validation_field_required') }).superRefine((val, ctx) => {
            if (!val || val.length < 1 || val.trim().length <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('validation_field_required'),
                    fatal: true,
                });

                return z.NEVER;
            }
        }),
        description: z
            .string()
            .max(
                150,
                t('error_field_maxlength', {
                    length: 150,
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
        placeholder: z.string().optional(),
        required: z.boolean().optional(),
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
                    const firstAppearanceIndex = uniqueValues.get(item.value);
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
                    uniqueValues.set(item.value, idx);
                });
            }),
        settings: z.record(z.string(), z.string().or(z.boolean()).or(z.number()).optional()).optional(),
    });

export type FieldType = z.infer<ReturnType<typeof FieldSchema>>;

const OperationFieldForm = ({
    methods,
    formField,
    currentForm,
}: {
    methods: UseFormReturn<FieldType, any>;
    formField?: FormManagement.FormField;
    currentForm?: FormManagement.Form;
}) => {
    const { control, setValue } = methods;
    const fieldType = useWatch({ control, name: 'type' });

    const { t } = useTranslation();
    const parentRef = useRef<HTMLDivElement>(null);
    const [showDescription, setShowDescription] = useState(false);
    const typeOptions = useMemo(() => {
        return [
            {
                value: 'ShortText',
                text: t('field_short_text'),
                icon: <Icon name="shortText" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'LongText',
                text: t('field_long_text'),
                icon: <Icon name="longText" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'SingleSelection',
                text: t('field_single_selection'),
                icon: <Icon name="singleSelection" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'MultipleSelection',
                text: t('field_multiple_selection'),
                icon: <Icon name="multipleSelection" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Number',
                text: t('field_number'),
                icon: <Icon name="numberSign" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Date',
                text: t('field_date'),
                icon: <Icon name="date" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Time',
                text: t('field_time'),
                icon: <Icon name="timeClock" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Datetime',
                text: t('field_datetime'),
                icon: <Icon name="calendar" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Email',
                text: t('field_email'),
                icon: <Icon name="emailOutline" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Phone',
                text: t('field_phone'),
                icon: <Icon name="call" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Link',
                text: t('field_link'),
                icon: <Icon name="linkSide" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Checkbox',
                text: t('field_checkbox'),
                icon: <Icon name="checkbox" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Country',
                text: t('field_country'),
                icon: <Icon name="country" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Priority',
                text: t('field_priority'),
                icon: <Icon name="priority" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Assignee',
                text: (
                    <Space align="center" justify="center">
                        <Typography>{t('field_assignee')}</Typography>
                        <Tooltip arrow placement="top" title={t('public_assignee_tips')}>
                            <Space align="center" justify="center">
                                <Icon name="info" style={{ color: 'var(--color-light-4)' }} />
                            </Space>
                        </Tooltip>
                    </Space>
                ),
                icon: <Icon name="assignee" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Origin',
                text: t('field_origin'),
                icon: <Icon name="mindMap" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Currency',
                text: t('field_currency'),
                icon: <Icon name="currency" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Notes',
                text: t('field_notes'),
                icon: <Icon name="notes" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
            {
                value: 'Attachment',
                text: t('field_attachment'),
                icon: <Icon name="attachment" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            },
        ];
    }, [t]);

    useEffect(() => {
        if (!formField) {
            if (fieldType === 'Priority') {
                setValue('data', [{ value: 'Low' }, { value: 'Medium' }, { value: 'High' }, { value: 'Very High' }], {
                    shouldDirty: true,
                });
                return;
            }
            if (fieldType === 'SingleSelection' || fieldType === 'MultipleSelection') {
                setValue('data', [{ value: '' }], {
                    shouldDirty: true,
                });
                return;
            }
            setValue('data', undefined, {
                shouldDirty: true,
            });
        } else if (!formField.data || formField.data?.length === 0) {
            if (fieldType === 'Priority') {
                setValue('data', [{ value: 'Low' }, { value: 'Medium' }, { value: 'High' }, { value: 'Very High' }], {
                    shouldDirty: true,
                });
                return;
            }
            if (fieldType === 'SingleSelection' || fieldType === 'MultipleSelection') {
                setValue('data', [{ value: '' }], {
                    shouldDirty: true,
                });
                return;
            }
            setValue('data', undefined, {
                shouldDirty: true,
            });
        }
    }, [fieldType, setValue, formField]);

    useEffect(() => {
        if (formField) {
            if (formField.description) setShowDescription(true);
            if (fieldType === 'Phone' && !formField.settings?.default_country_code) {
                setValue('settings.default_country_code', getCountryForTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)?.id, {
                    shouldDirty: true,
                });
            }
        } else if (fieldType === 'Phone') {
            setValue('settings.default_country_code', getCountryForTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)?.id, {
                shouldDirty: true,
            });
        } else {
            setValue('settings.default_country_code', undefined, {
                shouldDirty: true,
            });
        }
    }, [formField, setValue, fieldType]);

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
                        name="title"
                        render={({ field, fieldState: { error } }) => {
                            return (
                                <FieldText
                                    {...field}
                                    fullWidth
                                    placeholder={`${t('form_question_title')}*`}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            );
                        }}
                    />
                    {showDescription && (
                        <Controller
                            control={control}
                            name="description"
                            render={({ field, fieldState: { error } }) => {
                                return (
                                    <FieldText
                                        {...field}
                                        fullWidth
                                        placeholder={t('description')}
                                        error={!!error}
                                        helperText={error?.message}
                                        multiline
                                        maxRows={2}
                                        {...(field.value && {
                                            onReset: () => {
                                                setValue('description', '', { shouldValidate: true, shouldDirty: true });
                                                setShowDescription(false);
                                            },
                                        })}
                                    />
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
                            label={`${t('field_type')}*`}
                            fullWidth
                            error={!!error}
                            helperText={error?.message}
                            placeholder={t('click_to_select')}
                            queryKey={['newFieldType']}
                            request={async () => {
                                return typeOptions;
                            }}
                            disabled={(formField && formField.is_default) || !!currentForm}
                            tooltip={formField && formField.is_default && t('tips_existing_field_type_change')}
                            tooltipPlacement="top"
                            tooltipPosition="input"
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="name"
                    render={({ field, fieldState: { error } }) => {
                        return (
                            <FieldText
                                {...field}
                                fullWidth
                                label={`${t('data_board_field_name')}*`}
                                placeholder={t('data_board_field_name_placeholder')}
                                error={!!error}
                                helperText={error?.message}
                                disabled={(formField && formField.is_default) || !!currentForm}
                            />
                        );
                    }}
                />
                <Controller
                    control={control}
                    name="placeholder"
                    render={({ field, fieldState: { error } }) => {
                        return (
                            <FieldText
                                {...field}
                                fullWidth
                                placeholder={t('placeholder_hint_text')}
                                error={!!error}
                                helperText={error?.message}
                            />
                        );
                    }}
                />
                <FieldExtraOptions
                    boardType="System"
                    boardName=""
                    containerRef={parentRef}
                    formField={formField}
                    methods={methods}
                    disabled={!!currentForm}
                />
                <Controller
                    control={control}
                    name="required"
                    render={({ field, fieldState: { error } }) => {
                        return (
                            <FieldSwitch
                                {...field}
                                disabled={formField && formField.is_identifier}
                                switchLabel={() => t('required')}
                                onChange={async (checked) => {
                                    field.onChange(checked);
                                }}
                                error={!!error}
                                helperText={error?.message}
                                tooltip={formField && formField.is_identifier && t('tips_default_required_field')}
                            />
                        );
                    }}
                />
            </Space>
        </SimpleBar>
    );
};

export default OperationFieldForm;
