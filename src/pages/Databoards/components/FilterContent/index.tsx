import type { Option } from '@imbrace/ui';
import {
    Button,
    FieldDateRangePicker,
    FieldDateTimeRangePicker,
    FieldNumber,
    FieldRangeNumber,
    FieldSelect,
    FieldTimeRangePicker,
    Icon,
    IconButton,
    Space,
    Tooltip,
    Typography,
} from '@imbrace/ui';
import type { ColumnFiltersState } from '@tanstack/react-table';
import type { CountryCode } from 'libphonenumber-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Control, Path, PathValue, UseFormGetValues, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Field } from '@/components/FlexibleTable/fields';
import {
    CheckboxOperatorOptions,
    DateOperatorOptions,
    NotesOperatorOptions,
    NumberOperatorOptions,
    SelectionOperatorOptions,
    TextOperatorOptions,
    TimeOperatorOptions,
} from '@/components/FlexibleTable/filterPopover';
import OriginFilterField from '@/components/Origin/filter';
import { validatePhoneNumber } from '@/utils';

import { attachmentSupportedFileTypes, FieldTypeIcon } from '../../../Databoards/utils';
import styles from './index.module.scss';

export const FilterFields = <F extends FilterFormValue>({
    fields,
    watch,
    index,
    control,
    syncCondition,
    onDelete,
    setValue,
    getValues,
    request,
}: {
    fields?: API.BoardField[];
    control: Control<F, any>;
    watch: UseFormWatch<F>;
    index: number;
    syncCondition: (condition: 'and' | 'or') => void;
    onDelete: () => void;
    setValue: UseFormSetValue<F>;
    getValues: UseFormGetValues<F>;
    request?: () => Promise<Option[]>;
}) => {
    const [errorTooltip, setErrorTooltip] = useState({
        open: false,
        message: '',
    });
    const { t } = useTranslation();
    const fieldId = useWatch({
        control,
        name: `filters.${index}.field_id` as Path<F>,
    }) as string;
    const operator = useWatch({
        control,
        name: `filters.${index}.operator` as Path<F>,
    }) as API.Operator;
    const condition = useWatch({
        control,
        name: `filters.${index}.condition` as Path<F>,
    }) as 'and' | 'or';
    const filterValue = useWatch({
        control,
        name: `filters.${index}.value` as Path<F>,
    }) as API.Filters['value'];

    const fieldInfo = useMemo(() => {
        const targetFiled = fields?.find((field) => field._id === fieldId);
        if (targetFiled) {
            return targetFiled;
        }
        return undefined;
    }, [fields, fieldId]);

    const fieldType = useMemo(() => {
        if (fieldInfo?.type === 'Currency') {
            return 'Number';
        }

        if (
            fieldInfo?.type === 'SingleSelection' ||
            fieldInfo?.type === 'Assignee' ||
            fieldInfo?.type === 'Priority' ||
            fieldInfo?.type === 'Attachment'
        ) {
            if (['contains', 'not_contains'].indexOf(operator) !== -1) {
                return 'MultipleSelection';
            }
        }
        return fieldInfo?.type || 'ShortText';
    }, [fieldInfo, operator]);

    const operatorsOptions = useMemo(() => {
        if (fieldInfo?.type === 'Number') {
            return NumberOperatorOptions(t);
        }
        if (fieldInfo?.type === 'Date') {
            return DateOperatorOptions(t);
        }
        if (fieldInfo?.type === 'Time' || fieldInfo?.type === 'Datetime') {
            return TimeOperatorOptions(t);
        }
        if (fieldInfo?.type === 'Notes') {
            return NotesOperatorOptions(t);
        }
        if (fieldInfo?.type === 'Checkbox') {
            return CheckboxOperatorOptions(t);
        }
        if (
            fieldInfo?.type === 'MultipleSelection' ||
            fieldInfo?.type === 'SingleSelection' ||
            fieldInfo?.type === 'Assignee' ||
            fieldInfo?.type === 'Priority' ||
            fieldInfo?.type === 'Attachment' ||
            fieldInfo?.type === 'Origin'
        ) {
            return SelectionOperatorOptions(t);
        }

        return TextOperatorOptions(t);
    }, [fieldInfo, t]);

    const valueEnum = useMemo(() => {
        if (fieldInfo?.type === 'Attachment') {
            return attachmentSupportedFileTypes;
        }
        return fieldInfo?.data?.reduce((prev, current) => {
            return {
                ...prev,
                [current._id]: current.value,
            };
        }, {});
    }, [fieldInfo]);

    useEffect(() => {
        if (!operatorsOptions.find((option) => option.index === getValues(`filters.${index}.operator` as Path<F>))) {
            setValue(`filters.${index}.operator` as Path<F>, operatorsOptions[0].index as PathValue<F, Path<F>>);
        }
    }, [operatorsOptions, index, setValue, getValues]);

    const renderRelativeSelector = useCallback(() => {
        if (
            ['is_empty', 'is_not_empty', 'is_between', 'is_after_and_on', 'is_before_and_on'].indexOf(operator) === -1 &&
            fieldType === 'Date'
        ) {
            return (
                <Controller
                    control={control}
                    defaultValue={'exactly' as PathValue<F, Path<F>>}
                    name={`filters.${index}.value.0` as Path<F>}
                    render={({ field: { value, ...restField } }) => (
                        <FieldSelect
                            queryKey={['dataBoard', 'filter', 'relativeCondition', operator]}
                            value={value as string}
                            {...restField}
                            popoverProps={{ disablePortal: false }}
                            onChange={(selectedValue) => {
                                if (
                                    (value === 'exactly' && selectedValue !== 'exactly') ||
                                    (value !== 'exactly' && selectedValue === 'exactly')
                                ) {
                                    setValue(
                                        `filters.${index}.value.1` as Path<F>,
                                        (selectedValue === 'exactly' ? null : '1') as PathValue<F, Path<F>>,
                                    );
                                }
                                restField.onChange(selectedValue);
                            }}
                            request={async () => {
                                return operator === 'is' || operator === 'is_not'
                                    ? [
                                          { text: t('relative_exactly'), value: 'exactly' },
                                          { text: t('relative_last'), value: 'last' },
                                          { text: t('relative_next'), value: 'next' },
                                          { text: t('relative_empty'), value: 'empty' },
                                      ]
                                    : [
                                          { text: t('relative_exactly'), value: 'exactly' },
                                          { text: t('relative_last'), value: 'last' },
                                          { text: t('relative_next'), value: 'next' },
                                      ];
                            }}
                            formControlSx={{
                                width: 100,
                                minWidth: 100,
                            }}
                            fullWidth
                        />
                    )}
                />
            );
        }
        return null;
    }, [fieldType, control, index, operator, t, setValue]);

    const renderField = useCallback(() => {
        if (['is_empty', 'is_not_empty', 'is_between', 'is_checked', 'is_not_checked'].indexOf(operator) === -1) {
            if (fieldType === 'Date') {
                if (filterValue?.[0] === 'empty') {
                    return null;
                }
                if (filterValue?.[0] === 'last' || filterValue?.[0] === 'next') {
                    return (
                        <>
                            <Controller
                                control={control}
                                name={`filters.${index}.value.1` as Path<F>}
                                render={({ field: { value, onChange } }) => (
                                    <Tooltip
                                        open={errorTooltip.open}
                                        title={errorTooltip.message}
                                        disableFocusListener
                                        placement="top"
                                        arrow
                                    >
                                        <div style={{ width: 52 }}>
                                            <FieldNumber
                                                value={value ? +value : value}
                                                onChange={(e, valid) => {
                                                    if (valid) {
                                                        onChange(e);
                                                        setErrorTooltip((prev) => ({
                                                            ...prev,
                                                            open: false,
                                                        }));
                                                        return;
                                                    }
                                                    setErrorTooltip({
                                                        open: true,
                                                        message: t('crm_number_field_validation_tooltip'),
                                                    });
                                                }}
                                                formControlSx={{
                                                    width: 52,
                                                    minWidth: 52,
                                                }}
                                                sx={{
                                                    height: 38,
                                                }}
                                                fullWidth
                                                min={1}
                                            />
                                        </div>
                                    </Tooltip>
                                )}
                            />
                            <Controller
                                control={control}
                                defaultValue={'day' as PathValue<F, Path<F>>}
                                name={`filters.${index}.value.2` as Path<F>}
                                render={({ field: { value, ...restField } }) => (
                                    <FieldSelect
                                        value={value as string}
                                        queryKey={['dataBoard', 'filter', filterValue[0], 'condition']}
                                        {...restField}
                                        popoverProps={{ disablePortal: false }}
                                        request={async () => [
                                            { text: t('day_other'), value: 'day' },
                                            { text: t('week_other'), value: 'week' },
                                            { text: t('month_other'), value: 'month' },
                                            { text: t('year_other'), value: 'year' },
                                        ]}
                                        formControlSx={{
                                            width: 100,
                                            minWidth: 100,
                                        }}
                                        fullWidth
                                    />
                                )}
                            />
                        </>
                    );
                }
                return (
                    <Controller
                        control={control}
                        name={`filters.${index}.value.1` as Path<F>}
                        render={({ field: { value, onChange, ...restField } }) => (
                            <Field
                                fieldId={fieldId}
                                type={fieldType}
                                value={(value as string[]) ?? ''}
                                enum={valueEnum}
                                fieldProps={{
                                    inputProps: {
                                        autoFocus: false,
                                    },

                                    ...restField,
                                }}
                                onChange={onChange}
                            />
                        )}
                    />
                );
            }

            if (fieldType === 'Origin') {
                return (
                    <Controller
                        control={control}
                        name={`filters.${index}.value` as Path<F>}
                        render={({ field: { value, onChange, ...restField } }) => (
                            <OriginFilterField
                                value={(value as API.OriginValue[]) || []}
                                sx={{
                                    width: '100%',
                                    minWidth: '200px',
                                }}
                                enum={valueEnum}
                                onChange={(newValue) => {
                                    const prevValue =
                                        (getValues(`filters.${index}.value` as Path<F>) as API.OriginValue[]) || ([] as API.OriginValue[]);

                                    const ids = new Set(prevValue.map((item) => item.data.id));
                                    if (ids.has(newValue.data.id)) {
                                        ids.delete(newValue.data.id);
                                    } else {
                                        ids.add(newValue.data.id);
                                    }
                                    onChange?.([...ids].map((id) => [...prevValue, newValue].find((item) => item.data.id === id)));
                                }}
                                onDelete={(id) => {
                                    const prevValue =
                                        (getValues(`filters.${index}.value` as Path<F>) as API.OriginValue[]) || ([] as API.OriginValue[]);
                                    const newValue = prevValue.filter((item) => item.data.id !== id);
                                    onChange?.(newValue);
                                }}
                                onReset={() => {
                                    onChange?.([]);
                                }}
                            />
                        )}
                    />
                );
            }
            return (
                <Controller
                    control={control}
                    name={`filters.${index}.value` as Path<F>}
                    rules={{
                        validate: {
                            format: (newValue) => {
                                if (fieldType !== 'Phone') {
                                    return true;
                                }

                                if (
                                    newValue &&
                                    typeof newValue === 'object' &&
                                    'phone' in newValue &&
                                    'country_code' in newValue &&
                                    newValue.phone
                                ) {
                                    try {
                                        if (
                                            validatePhoneNumber({
                                                phoneNumber: newValue.phone as string,
                                                defaultCountryCode: newValue.country_code as CountryCode,
                                            })
                                        ) {
                                            return true;
                                        }
                                        return t('validation_phone_field_pattern');
                                    } catch (err) {
                                        return t('validation_phone_field_pattern');
                                    }
                                }
                                return t('validation_phone_field_pattern');
                            },
                        },
                    }}
                    render={({ field: { value, onChange, ...restField } }) => (
                        <Field
                            fieldId={fieldId}
                            type={fieldType}
                            value={fieldType === 'MultipleSelection' ? (!value ? [] : (value as string[])) : (value as string[]) ?? ''}
                            enum={valueEnum}
                            fieldProps={{
                                formControlSx: {
                                    minWidth: '200px',
                                },
                                inputProps: {
                                    autoFocus: false,
                                },
                                ...(fieldType === 'MultipleSelection' && {
                                    sx: {
                                        height: '100%',
                                        width: '100%',
                                    },
                                    selectProps: {
                                        wrap: false,
                                    },
                                    allowOutOfRangeValue: true,
                                    formControlSx: {
                                        overflow: 'hidden',
                                        minWidth: '200px',
                                    },
                                    placeholder: '',
                                    ...(Array.isArray(value) &&
                                        value.length > 0 && {
                                            selectProps: {
                                                customIcon: () => (
                                                    <IconButton
                                                        variant="text"
                                                        type="secondary"
                                                        size="xs"
                                                        sx={{
                                                            position: 'absolute',
                                                            right: '12px',
                                                            top: '7px',
                                                        }}
                                                        onClick={() => {
                                                            setValue(`filters.${index}.value` as Path<F>, [] as PathValue<F, Path<F>>);
                                                        }}
                                                    >
                                                        <Icon name="close" fontSize={20} />
                                                    </IconButton>
                                                ),
                                            },
                                        }),
                                }),
                                ...(fieldType === 'LongText' && {
                                    rows: 1,
                                }),
                                ...((fieldType === 'SingleSelection' ||
                                    fieldInfo?.type === 'Assignee' ||
                                    fieldInfo?.type === 'Priority') && {
                                    allowOutOfRangeValue: true,
                                }),
                                ...(fieldInfo?.type === 'Assignee' && {
                                    request,
                                }),
                                ...restField,
                            }}
                            validate={(newValue) => {
                                if (fieldType !== 'Phone') {
                                    return true;
                                }
                                if (typeof newValue === 'object' && newValue && 'phone' in newValue) {
                                    try {
                                        if (
                                            validatePhoneNumber({
                                                phoneNumber: newValue.phone,
                                                defaultCountryCode: newValue.country_code as CountryCode,
                                            })
                                        ) {
                                            return true;
                                        }
                                        return t('validation_phone_field_pattern');
                                    } catch (err) {
                                        return t('validation_phone_field_pattern');
                                    }
                                }
                                return true;
                            }}
                            settings={{
                                defaultCountryCode: fieldInfo?.settings?.default_country_code,
                            }}
                            onChange={onChange}
                        />
                    )}
                />
            );
        }
        return null;
    }, [operator, control, fieldInfo, fieldType, index, t, request, setValue, valueEnum, filterValue, errorTooltip, fieldId, getValues]);

    const renderRangeComponent = useCallback(() => {
        if (fieldType === 'Number') {
            return (
                <Controller
                    control={control}
                    name={`filters.${index}.value` as Path<F>}
                    render={({ field }) => (
                        <div style={{ width: '316px' }}>
                            <FieldRangeNumber
                                {...field}
                                disabled={field.disabled ? [field.disabled, field.disabled] : undefined}
                                placeholder={[t('min'), t('max')]}
                                fullWidth
                                value={(Array.isArray(field?.value) ? field?.value : []) as [string | number, string | number]}
                            />
                        </div>
                    )}
                />
            );
        }
        if (fieldType === 'Date') {
            return (
                <Controller
                    control={control}
                    name={`filters.${index}.value` as Path<F>}
                    render={({ field }) => (
                        <div style={{ width: '327px' }}>
                            <FieldDateRangePicker
                                {...field}
                                disabled={field.disabled ? [field.disabled, field.disabled] : undefined}
                                fullWidth
                                value={(Array.isArray(field?.value) ? field?.value : []) as [Date, Date]}
                                datePickerProps={{
                                    start: {
                                        customIcon: (open) => (
                                            <Icon style={{ color: 'var(--color-light-4)' }} name={open ? 'dropUp' : 'dropDown'} />
                                        ),
                                    },
                                    end: {
                                        customIcon: (open) => (
                                            <Icon style={{ color: 'var(--color-light-4)' }} name={open ? 'dropUp' : 'dropDown'} />
                                        ),
                                    },
                                }}
                            />
                        </div>
                    )}
                />
            );
        }
        if (fieldType === 'Datetime') {
            return (
                <Controller
                    control={control}
                    name={`filters.${index}.value` as Path<F>}
                    render={({ field }) => (
                        <div style={{ width: '327px' }}>
                            <FieldDateTimeRangePicker
                                {...field}
                                disabled={field.disabled ? [field.disabled, field.disabled] : undefined}
                                fullWidth
                                value={(Array.isArray(field?.value) ? field?.value : []) as [Date, Date]}
                                dateTimePickerProps={{
                                    start: {
                                        customIcon: (open) => (
                                            <Icon style={{ color: 'var(--color-light-4)' }} name={open ? 'dropUp' : 'dropDown'} />
                                        ),
                                    },
                                    end: {
                                        customIcon: (open) => (
                                            <Icon style={{ color: 'var(--color-light-4)' }} name={open ? 'dropUp' : 'dropDown'} />
                                        ),
                                    },
                                }}
                            />
                        </div>
                    )}
                />
            );
        }
        if (fieldType === 'Time') {
            return (
                <Controller
                    control={control}
                    name={`filters.${index}.value` as Path<F>}
                    render={({ field }) => (
                        <div style={{ width: '327px' }}>
                            <FieldTimeRangePicker
                                {...field}
                                disabled={field.disabled ? [field.disabled, field.disabled] : undefined}
                                fullWidth
                                value={(Array.isArray(field?.value) ? field?.value : []) as [Date, Date]}
                                timePickerProps={{
                                    start: {
                                        defaultValue: null,
                                        customIcon: (open) => (
                                            <Icon style={{ color: 'var(--color-light-4)' }} name={open ? 'dropUp' : 'dropDown'} />
                                        ),
                                    },
                                    end: {
                                        defaultValue: null,
                                        customIcon: (open) => (
                                            <Icon style={{ color: 'var(--color-light-4)' }} name={open ? 'dropUp' : 'dropDown'} />
                                        ),
                                    },
                                }}
                            />
                        </div>
                    )}
                />
            );
        }
        return null;
    }, [control, fieldType, index, t]);

    return (
        <Space size={12} align="center">
            {index === 1 ? (
                <Controller
                    control={control}
                    name={`filters.${index}.condition` as Path<F>}
                    render={({ field }) => (
                        <FieldSelect
                            queryKey={['dataBoard', 'filter', 'condition']}
                            {...field}
                            value={field.value as string}
                            formControlSx={{
                                width: 80,
                                minWidth: 80,
                            }}
                            popoverProps={{ disablePortal: false }}
                            fullWidth
                            request={async () => [
                                {
                                    text: t('and'),
                                    value: 'and',
                                },
                                {
                                    text: t('or'),
                                    value: 'or',
                                },
                            ]}
                            onChange={(selectedValue) => {
                                field.onChange(selectedValue);
                                syncCondition(selectedValue as 'and' | 'or');
                            }}
                        />
                    )}
                />
            ) : (
                <Space style={{ minWidth: '80px' }}>
                    <Typography style={{ color: 'var(--color-light-5)' }}>{index === 0 ? t('where') : t(condition)}</Typography>
                </Space>
            )}
            <Controller
                control={control}
                name={`filters.${index}.field_id` as Path<F>}
                render={({ field }) => (
                    <FieldSelect
                        queryKey={['dataBoard', 'filters', `${index}`, 'fields', ...(fields ?? []).map((f) => f._id)]}
                        {...field}
                        value={field.value as string}
                        formControlSx={{
                            width: 180,
                            minWidth: 180,
                        }}
                        paperSx={{
                            width: '240px',
                        }}
                        popoverProps={{ disablePortal: false }}
                        fullWidth
                        request={async () =>
                            fields?.map((boardField) => ({
                                value: boardField._id,
                                text: boardField.name,
                                icon: FieldTypeIcon(boardField.type, {
                                    style: {
                                        fontSize: '20px',
                                        color: 'var(--color-light-5)',
                                    },
                                }),
                            })) || []
                        }
                        onChange={(e) => {
                            field.onChange(e);
                            const currentField = fields?.find((boardField) => boardField._id === fieldId);

                            if (currentField && currentField.type === 'Date') {
                                setValue(`filters.${index}.value.0` as Path<F>, 'exactly' as PathValue<F, Path<F>>);
                                setValue(`filters.${index}.value.1` as Path<F>, null as PathValue<F, Path<F>>);
                            } else if (currentField) {
                                setValue(`filters.${index}.value` as Path<F>, '' as PathValue<F, Path<F>>);
                            }
                        }}
                    />
                )}
            />
            <Controller
                control={control}
                name={`filters.${index}.operator` as Path<F>}
                defaultValue={'is' as PathValue<F, Path<F>>}
                render={({ field }) => (
                    <FieldSelect
                        {...field}
                        queryKey={['dataBoard', 'filter', 'options', fieldInfo?.type || '']}
                        value={field.value as string}
                        formControlSx={{
                            width: 120,
                            minWidth: 120,
                        }}
                        paperSx={{
                            width: '240px',
                        }}
                        popoverProps={{ disablePortal: false }}
                        fullWidth
                        request={async () => {
                            return operatorsOptions.map((option) => ({ value: option.index, text: option.text }));
                        }}
                        onChange={(selectedValue) => {
                            field.onChange(selectedValue);
                            if (fieldType === 'Date' && selectedValue === 'is_between') {
                                setValue(`filters.${index}.value` as Path<F>, [] as PathValue<F, Path<F>>);
                            } else if (
                                fieldType === 'Date' &&
                                ['is_empty', 'is_not_empty', 'is_between'].indexOf((selectedValue as string) || '') === -1
                            ) {
                                setValue(`filters.${index}.value.0` as Path<F>, 'exactly' as PathValue<F, Path<F>>);
                                setValue(`filters.${index}.value.1` as Path<F>, null as PathValue<F, Path<F>>);
                            } else {
                                setValue(`filters.${index}.value` as Path<F>, '' as PathValue<F, Path<F>>);
                            }
                        }}
                    />
                )}
            />
            {renderRelativeSelector()}
            {renderField()}
            {operator === 'is_between' && renderRangeComponent()}
            <IconButton variant="text" size="xs" type="danger" sx={{ marginLeft: '2px' }} onClick={onDelete}>
                <Icon style={{ color: '#EE7D7D' }} name="delete" />
            </IconButton>
        </Space>
    );
};

export interface FilterFormValue {
    filters: API.Filters[];
}

export const defaultFilter: Record<API.BoardType, string> = {
    Contacts: 'stage',
    Companies: 'size',
    Opportunities: 'stage',
    Tasks: 'assignee',
    Products: 'tags',
    General: '',
    OptOut: '',
    System: '',
    KnowledgeHub: '',
    DocumentAI: '',
};

export const FilterContent = ({
    request,
    onFilter,
    fields,
    currentFilterState,
    boardType,
    onClose,
    updateContainerRect,
}: {
    currentFilterState?: ColumnFiltersState;
    fields?: API.BoardField[];
    onFilter: (value?: API.Filters[]) => Promise<void>;
    request?: () => Promise<Option[]>;
    boardType: API.BoardType;
    onClose: () => void;
    updateContainerRect: () => void;
}) => {
    const { t } = useTranslation();

    const { control, handleSubmit, watch, setValue, getValues } = useForm<FilterFormValue>({
        mode: 'all',
        defaultValues: {
            filters:
                currentFilterState && currentFilterState.length > 0
                    ? currentFilterState.map((state) => ({
                          field_id: state.id,
                          operator: (state.value as API.Filters).operator,
                          condition: (state.value as API.Filters).condition,
                          value: (state.value as API.Filters).value,
                      }))
                    : [
                          {
                              operator: 'is',
                              condition: 'and',
                              field_id: fields?.find((field) => defaultFilter[boardType] === field.default_field_name)?._id,
                          },
                      ],
        },
    });

    const {
        fields: formFields,
        append,
        remove,
    } = useFieldArray({
        control,
        name: 'filters',
    });

    const syncCondition = useCallback(
        (condition: 'and' | 'or') => {
            formFields.forEach((form, index) => {
                setValue(`filters.${index}.condition`, condition);
            });
        },
        [formFields, setValue],
    );

    const applyFilter = (formData: FilterFormValue) => {
        onFilter(
            formData.filters.filter((filter) => {
                if (
                    filter.operator === 'is_empty' ||
                    filter.operator === 'is_not_empty' ||
                    filter.operator === 'is_checked' ||
                    filter.operator === 'is_not_checked'
                ) {
                    return true;
                }
                if (
                    filter.value === '' ||
                    filter.value === undefined ||
                    filter.value === null ||
                    (Array.isArray(filter.value) && filter.value.length === 0)
                ) {
                    return false;
                }
                return true;
            }),
        );
    };

    return (
        <div className={styles.filterContainer}>
            <Space size={18} direction="vertical" align="start">
                <Space justify="between" align="center" style={{ width: '100%' }}>
                    <Typography onClick={onClose} variant="Body" style={{ textDecoration: 'underline', color: '#156DF2', cursor: 'pointer' }}>
                        {t('filter')}
                    </Typography>
                    <Button variant="text" size="xxs" startIcon={<Icon name="close" />} onClick={onClose} />
                </Space>
                <Space size={8} direction="vertical" align="start" style={{ width: '100%' }}>
                    <Space size={16} direction="vertical" align="stretch" style={{ width: '100%' }}>
                        {formFields.map((field, index) => (
                            <FilterFields<FilterFormValue>
                                key={field.id}
                                index={index}
                                control={control}
                                fields={fields}
                                watch={watch}
                                syncCondition={syncCondition}
                                request={request}
                                onDelete={() => {
                                    if (formFields.length === 1) {
                                        onFilter();
                                        return;
                                    }
                                    remove(index);
                                    updateContainerRect();
                                }}
                                setValue={setValue}
                                getValues={getValues}
                            />
                        ))}
                    </Space>
                    <Space size={24}>
                        <Button
                            size="xxs"
                            variant="link"
                            startIcon={<Icon name="add" />}
                            text={t('add_filter')}
                            onClick={() => {
                                append({
                                    operator: 'is',
                                    condition: getValues('filters.0.condition') ?? 'and',
                                    field_id: fields?.[0]?._id,
                                });
                                updateContainerRect();
                            }}
                            sx={{
                                textTransform: 'initial',
                                fontWeight: 400,
                                gap: '4px',
                                padding: 0,
                            }}
                        />
                    </Space>
                </Space>
                <Space justify="end" style={{ width: '100%' }}>
                    <Button
                        size="xxs"
                        variant="text"
                        text={t('clear_all')}
                        onClick={() => {
                            onFilter();
                        }}
                    />
                    <Button size="xs" sx={{width: '68px', borderRadius:'4px'}} text={t('apply')} onClick={handleSubmit(applyFilter)} />
                </Space>
            </Space>
        </div>
    );
};
