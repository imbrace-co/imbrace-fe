import type { FieldNumberProps, FieldSelectProps, FieldTextProps } from '@imbrace/ui';
import { EllipsisText, Typography } from '@imbrace/ui';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import type { CountryCode } from 'libphonenumber-js';
import React, { memo, useCallback } from 'react';
import type { Control, FieldValues, UseFormSetError, UseFormWatch } from 'react-hook-form';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import Fields from '@/components/FlexibleTable/fields';
import { colorScheme } from '@/pages/Databoards/components/BoardDetailedModal/ContactProfileHeader';
import type { Field } from '@/pages/Databoards/components/BoardDetailedModal/DetailModal';
import type { CurrentBoardInfo } from '@/pages/Databoards/types';
import { getMembers } from '@/services/api/user';
import apiFetch from '@/services/axios/handler';
import { validatePhoneNumber } from '@/utils';

const FieldControl = memo(
    ({
        formKey,
        fieldItem,
        control,
        selectedRowInfo,
        watch,
    }: {
        formKey: string;
        fieldItem: Field;
        control: Control<FieldValues, any>;
        setError: UseFormSetError<FieldValues>;
        selectedRowInfo?: CurrentBoardInfo;
        watch: UseFormWatch<FieldValues>;
        isDirty: boolean;
    }) => {
        const { t } = useTranslation();

        const assigneeRequest = useCallback(async () => {
            const { data } = await apiFetch<API.User[]>(getMembers.api, getMembers.method, {
                status: 'active',
            });
            return data.map((user) => ({
                value: user.id,
                text: user.display_name,
            }));
        }, []);

        const renderFieldControl = () => {
            switch (fieldItem.type) {
                case 'Date':
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => {
                                return (
                                    <Fields
                                        type="Date"
                                        value={value}
                                        fieldProps={
                                            {
                                                id: formKey,
                                                error: !!error,
                                                helperText: error?.message,
                                                fullWidth: true,
                                                autoFocus: false,
                                                disableFuture: fieldItem.default_field_name === 'last_contact',
                                                bordered: false,
                                                slotProps: {
                                                    field: {
                                                        sx: {
                                                            height: '24px',
                                                            paddingBottom: '4px',
                                                            '& .MuiInputBase-input': {
                                                                fontSize: '20px',
                                                                fontWeight: 800,
                                                                lineHeight: '20px',
                                                                padding: 0,
                                                                width: '110px',
                                                                cursor: 'pointer',
                                                            },
                                                            '& .MuiIconButton-root': {
                                                                '&:hover': {
                                                                    backgroundColor: 'transparent',
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                                ...restField,
                                            } as FieldTextProps
                                        }
                                        onChange={onChange}
                                    />
                                );
                            }}
                        />
                    );
                case 'Priority':
                    const prioritySelectionOptions = fieldItem.data?.map((item) => {
                        return { value: item._id, text: item.value };
                    });
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => (
                                <Fields
                                    type="SingleSelection"
                                    value={value}
                                    fieldId={formKey}
                                    fieldProps={
                                        {
                                            id: formKey,
                                            error: !!error,
                                            helperText: error?.message,
                                            fullWidth: true,
                                            request: async () => prioritySelectionOptions || [],
                                            allowOutOfRangeValue: true,
                                            ...restField,
                                        } as FieldSelectProps<string>
                                    }
                                    onChange={onChange}
                                />
                            )}
                        />
                    );
                case 'SingleSelection':
                    if (!selectedRowInfo) return null;

                    const disabledOption =
                        selectedRowInfo.boardType === 'Contacts'
                            ? watch('stage') !== 'Unidentified Lead' && (watch('phone') || watch('email'))
                            : false;
                    const singleSelectionOptions = fieldItem.data?.map((item) => {
                        return {
                            value: item._id,
                            text: item.value,
                            disabled: item.value === 'Unidentified Lead' && disabledOption,
                        };
                    });

                    const isDisabled = () => {
                        return selectedRowInfo.boardType === 'Contacts'
                            ? fieldItem.default_field_name === 'stage' && !watch('phone') && !watch('email')
                            : false;
                    };

                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => (
                                <Fields
                                    type="SingleSelection"
                                    value={value}
                                    fieldId={formKey}
                                    fieldProps={
                                        {
                                            id: formKey,
                                            error: !!error,
                                            helperText: error?.message,
                                            fullWidth: true,
                                            request: async () => singleSelectionOptions || [],
                                            allowOutOfRangeValue: true,
                                            disabledTooltip: t('crm_field_stage_disabled_desc'),
                                            ...restField,
                                            sx: {
                                                border: 'none',
                                                height: '24px',
                                                minHeight: '24px',

                                                paddingBottom: '5px',
                                                '& .MuiInputBase-input': {
                                                    padding: 0,

                                                    height: '24px',
                                                    minHeight: '24px',
                                                    width: 'auto',
                                                    cursor: 'pointer',
                                                    '& p': {
                                                        height: '24px',
                                                        fontSize: '20px',
                                                        fontWeight: 800,
                                                        lineHeight: '20px',
                                                    },
                                                },
                                            },
                                            disabled: isDisabled(),
                                        } as FieldSelectProps<string>
                                    }
                                    onChange={onChange}
                                />
                            )}
                        />
                    );
                case 'MultipleSelection':
                    const multipleSelectionOptions = fieldItem.data?.map((item) => {
                        return { value: item._id, text: item.value };
                    });
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => {
                                return (
                                    <Fields
                                        type="MultipleSelection"
                                        value={value || []}
                                        fieldId={formKey}
                                        fieldProps={
                                            {
                                                id: formKey,
                                                error: !!error,
                                                helperText: error?.message,
                                                fullWidth: true,
                                                request: async () => multipleSelectionOptions || [],
                                                hideSelectedItems: true,
                                                sx: {
                                                    height: '100%',
                                                    maxHeight: 165,
                                                },
                                                selectProps: {
                                                    wrap: true,
                                                    chipsContainerScrollbarProps: {
                                                        autoHeightMax: 165 - 14,
                                                    },
                                                },
                                                ...restField,
                                            } as FieldSelectProps<string[]>
                                        }
                                        onChange={onChange}
                                    />
                                );
                            }}
                        />
                    );
                case 'Assignee':
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => {
                                return (
                                    <Fields
                                        type="Assignee"
                                        value={value}
                                        fieldProps={
                                            {
                                                id: formKey,
                                                error: !!error,
                                                helperText: error?.message,
                                                fullWidth: true,
                                                options: [],
                                                request: assigneeRequest,
                                                ...restField,
                                            } as FieldSelectProps
                                        }
                                        onChange={onChange}
                                    />
                                );
                            }}
                        />
                    );
                case 'LongText':
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => (
                                <Fields
                                    type="LongText"
                                    value={value}
                                    fieldProps={
                                        {
                                            id: formKey,
                                            error: !!error,
                                            helperText: error?.message,
                                            fullWidth: true,
                                            rows: 7,
                                            ...restField,
                                        } as FieldTextProps
                                    }
                                    onChange={onChange}
                                />
                            )}
                        />
                    );
                case 'Number':
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            rules={{
                                pattern: {
                                    value: /^[0-9]*/,
                                    message: t('validation_number_pattern'),
                                },
                            }}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => (
                                <Fields
                                    type="Number"
                                    value={value}
                                    fieldProps={
                                        {
                                            id: formKey,
                                            error: !!error,
                                            helperText: error?.message as string | undefined,
                                            fullWidth: true,
                                            autoFocus: false,
                                            ...restField,
                                        } as FieldNumberProps
                                    }
                                    onChange={onChange}
                                />
                            )}
                        />
                    );
                case 'Link':
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            rules={{
                                pattern: {
                                    value: /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/,
                                    message: t('validation_url_pattern'),
                                },
                            }}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => (
                                <Fields
                                    type="Link"
                                    value={value}
                                    fieldProps={
                                        {
                                            id: formKey,
                                            error: !!error,
                                            helperText: error?.message,
                                            fullWidth: true,
                                            ...restField,
                                            disabled:
                                                selectedRowInfo?.boardItemId === 'new' &&
                                                (fieldItem.default_field_name === 'contact_record' ||
                                                    fieldItem.default_field_name === 'opportunity_record'),
                                        } as FieldTextProps
                                    }
                                    onChange={onChange}
                                />
                            )}
                        />
                    );
                case 'Time':
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => (
                                <Fields
                                    type="Time"
                                    value={value}
                                    fieldProps={
                                        {
                                            id: formKey,
                                            error: !!error,
                                            helperText: error?.message,
                                            fullWidth: true,
                                            autoFocus: false,
                                            bordered: false,
                                            slotProps: {
                                                field: {
                                                    sx: {
                                                        height: '24px',
                                                        paddingBottom: '4px',
                                                        '& .MuiInputBase-input': {
                                                            fontSize: '20px',
                                                            fontWeight: 800,
                                                            lineHeight: '20px',
                                                            padding: 0,
                                                            width: '52px',
                                                            cursor: 'pointer',
                                                        },
                                                        '& .MuiIconButton-root': {
                                                            '&:hover': {
                                                                backgroundColor: 'transparent',
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                            ...restField,
                                        } as FieldTextProps
                                    }
                                    onChange={onChange}
                                />
                            )}
                        />
                    );
                case 'Email':
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            rules={{
                                pattern: {
                                    value: /^[a-zA-Z\d._%-]+@[[a-zA-Z\d.\-@]+\.[a-zA-Z]{2,4}$/,
                                    message: t('validation_email_pattern'),
                                },
                            }}
                            render={({ field: { onChange, value, ...restField }, fieldState: { error } }) => (
                                <Fields
                                    type="Email"
                                    value={value}
                                    placeholder={fieldItem.name}
                                    fieldId={formKey}
                                    fieldProps={
                                        {
                                            id: formKey,
                                            error: !!error,
                                            fullWidth: true,
                                            bordered: false,
                                            sx: {
                                                height: '24px',
                                                width: '508px',

                                                '& .MuiInputBase-input': {
                                                    height: '24px',
                                                    minHeight: '24px',
                                                    fontWeight: '800',
                                                    fontSize: '20px',
                                                    lineHeight: '20px',
                                                    padding: '0 0 4px 0',
                                                },

                                                '& input::placeholder': {
                                                    color: colorScheme.editMode.manual.placeholder,
                                                    opacity: 1,
                                                },
                                                '& .MuiFormHelperText-root': {
                                                    marginLeft: 0,
                                                },
                                            },
                                            ...restField,
                                        } as FieldTextProps
                                    }
                                    onChange={onChange}
                                />
                            )}
                        />
                    );
                case 'Phone':
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            rules={{
                                validate: {
                                    format: (newValue?: API.PhoneValue | string) => {
                                        if ((typeof newValue === 'object' && 'phone' in newValue && !newValue.phone) || !newValue) {
                                            return true;
                                        }
                                        if (
                                            typeof newValue === 'object' &&
                                            'phone' in newValue &&
                                            'country_code' in newValue &&
                                            newValue.phone
                                        ) {
                                            if (!newValue.phone) {
                                                return true;
                                            }
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
                                        return t('validation_phone_field_pattern');
                                    },
                                },
                            }}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => (
                                <Fields
                                    type="Phone"
                                    value={value}
                                    settings={{ defaultCountryCode: fieldItem?.settings?.default_country_code }}
                                    fieldId={formKey}
                                    fieldProps={
                                        {
                                            id: formKey,
                                            error: !!error,
                                            helperText: error?.message,
                                            fullWidth: true,
                                            ...restField,
                                        } as FieldTextProps
                                    }
                                    onChange={onChange}
                                />
                            )}
                        />
                    );

                default:
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            rules={{
                                required: t('validation_field_required'),
                                maxLength: {
                                    value: 150,
                                    message: t('crm_field_short_text_length_limit'),
                                },
                            }}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => {
                                return (
                                    <Fields
                                        type="ShortText"
                                        value={value}
                                        placeholder={fieldItem.name}
                                        fieldId={formKey}
                                        fieldProps={
                                            {
                                                id: formKey,
                                                error: !!error,
                                                helperText: error?.message,
                                                fullWidth: true,
                                                bordered: false,
                                                sx: {
                                                    height: '24px',
                                                    width: '508px',

                                                    '& .MuiInputBase-input': {
                                                        height: '24px',
                                                        minHeight: '24px',
                                                        fontWeight: '800',
                                                        fontSize: '20px',
                                                        lineHeight: '20px',
                                                        padding: '0 0 4px 0',
                                                    },

                                                    '& input::placeholder': {
                                                        color: colorScheme.editMode.manual.placeholder,
                                                        opacity: 1,
                                                    },
                                                    '& .MuiFormHelperText-root': {
                                                        marginLeft: 0,
                                                    },
                                                },
                                                formControlSx: {
                                                    '& .MuiFormHelperText-root': {
                                                        marginLeft: 0,
                                                    },
                                                },
                                                ...restField,
                                            } as FieldTextProps
                                        }
                                        onChange={onChange}
                                    />
                                );
                            }}
                        />
                    );
            }
        };

        return renderFieldControl();
    },
);

interface IdentifierFieldProps {
    identifierField: Field;
    mode: 'editMode' | 'viewMode';
    selectedRowInfo: CurrentBoardInfo;
}

const IdentifierField = (props: IdentifierFieldProps) => {
    const { identifierField, mode, selectedRowInfo } = props;
    const {
        control,
        getValues,
        watch,
        setError,
        formState: { dirtyFields },
    } = useFormContext();
    const isEditMode = mode === 'editMode';
    const { default_field_name, _id } = identifierField;
    const formKey = (default_field_name as string) || _id;

    const outputValue = (fieldType: API.FieldType, fieldId: string) => {
        const value = getValues(default_field_name || fieldId);

        switch (fieldType) {
            case 'Date':
                return format(new Date(value as string | number), 'MM/dd/yyyy');
            case 'Time':
                return dayjs(value).format('HH:mm');
            default:
                return value;
        }
    };

    if (isEditMode) {
        return (
            <FieldControl
                formKey={formKey}
                fieldItem={identifierField}
                control={control}
                watch={watch}
                setError={setError}
                selectedRowInfo={selectedRowInfo}
                isDirty={!!dirtyFields[formKey]}
            />
        );
    }
    return (
        <EllipsisText
            text={outputValue(identifierField.type, identifierField._id)}
            element={
                <Typography
                    variant="Heading2"
                    style={{
                        width: '508px',
                        color: 'var(--color-light-7)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        wordBreak: 'break-word',
                        minHeight: '24px',
                    }}
                />
            }
        />
    );
};

export default IdentifierField;
