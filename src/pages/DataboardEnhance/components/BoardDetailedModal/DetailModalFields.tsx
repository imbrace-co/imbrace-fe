import type {
    channelIconMapping,
    FieldCheckboxProps,
    FieldCountryProps,
    FieldNumberProps,
    FieldSelectProps,
    FieldTextProps,
} from '@imbrace/ui';
import { Button, Checkbox, EllipsisText, Icon, Illustration, Space, Typography } from '@imbrace/ui';
import { Box, Chip, Divider, Grid } from '@mui/material';
import { getCountry } from 'countries-and-timezones';
import { format } from 'date-fns';
import type { CountryCode } from 'libphonenumber-js';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { Control, FieldValues, UseFormSetError, UseFormWatch } from 'react-hook-form';
import { Controller, useFormContext } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';

import Attachment from '@/components/FlexibleTable/attachment';
import Fields from '@/components/FlexibleTable/fields';
import type { AttachmentValue } from '@/components/FlexibleTable/types';
import LinkButton from '@/components/LinkButton';
import Notes from '@/components/Notes';
import { boardDefaultFields } from '@/pages/Databoards/components/BoardDetailedModal/boardDefaultFields';
import type { Field } from '@/pages/Databoards/components/BoardDetailedModal/DetailModal';
import LinkPreview from '@/pages/Databoards/components/LinkPreview';
import type { CurrentBoardInfo } from '@/pages/Databoards/types';
import { postBoardUpload, putBoardRecord } from '@/services/api/crm';
import { getMembers } from '@/services/api/user';
import { ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { validatePhoneNumber } from '@/utils';

import { FieldTypeIcon } from '../../utils';
import EmailContentPreview from '../emailContentPreview';
import styles from './index.module.scss';
import { BasicFieldContainer, BasicsField, BasicsLabelContainer } from './StyledComponents';

interface Props {
    isEditMode: boolean;
    boardRecord?: API.BoardItem;
    columns?: 'one' | 'two';
    loading: boolean;
    selectedRowInfo?: CurrentBoardInfo;

    fields: Field[];
    onNewField?: () => void;
    afterUpdated: (record: API.BoardItem) => Promise<void>;
}

export const FieldControl = memo(
    ({
        formKey,
        fieldItem,
        control,
        selectedRowInfo,
        watch,
        boardRecord,
    }: {
        formKey: string;
        fieldItem: Field;
        control: Control<FieldValues, any>;
        setError: UseFormSetError<FieldValues>;
        selectedRowInfo?: CurrentBoardInfo;
        watch: UseFormWatch<FieldValues>;
        isDirty: boolean;
        boardRecord?: API.BoardItem;
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
                case 'Datetime':
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => {
                                return (
                                    <Fields
                                        type="Datetime"
                                        value={value}
                                        fieldProps={
                                            {
                                                id: formKey,
                                                error: !!error,
                                                helperText: error?.message,
                                                fullWidth: true,
                                                autoFocus: false,
                                                ...restField,
                                            } as FieldTextProps
                                        }
                                        onChange={onChange}
                                    />
                                );
                            }}
                        />
                    );
                case 'Date':
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => {
                                if (fieldItem.default_field_name === 'last_contact') {
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
                                                    disableFuture: true,
                                                    ...restField,
                                                } as FieldTextProps
                                            }
                                            onChange={onChange}
                                        />
                                    );
                                }
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
                                    fieldProps={
                                        {
                                            id: formKey,
                                            error: !!error,
                                            helperText: error?.message,
                                            fullWidth: true,
                                            request: async () => prioritySelectionOptions || [],
                                            ...restField,
                                        } as FieldSelectProps<string>
                                    }
                                    fieldId={fieldItem._id}
                                    onChange={onChange}
                                />
                            )}
                        />
                    );
                case 'SingleSelection': {
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
                                    fieldProps={
                                        {
                                            id: formKey,
                                            error: !!error,
                                            helperText: error?.message,
                                            fullWidth: true,
                                            queryKey: ['singleSelection', fieldItem._id],
                                            request: async () => {
                                                return singleSelectionOptions || [];
                                            },
                                            disabledTooltip: t('crm_field_stage_disabled_desc'),
                                            ...restField,
                                            disabled: isDisabled(),
                                        } as FieldSelectProps<string>
                                    }
                                    fieldId={fieldItem._id}
                                    onChange={onChange}
                                />
                            )}
                        />
                    );
                }
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
                                        fieldProps={
                                            {
                                                id: formKey,
                                                error: !!error,
                                                helperText: error?.message,
                                                fullWidth: true,
                                                request: async () => multipleSelectionOptions || [],
                                                hideSelectedItems: true,
                                                // sx: {
                                                //     height: '100%',
                                                //     maxHeight: 165,
                                                // },
                                                // selectProps: {
                                                //     wrap: true,
                                                //     chipsContainerScrollbarProps: {
                                                //         autoHeightMax: 165 - 14,
                                                //     },
                                                // },
                                                ...restField,
                                            } as FieldSelectProps<string | number[]>
                                        }
                                        fieldId={fieldItem._id}
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
                                        fieldId={fieldItem._id}
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
                                    fieldProps={
                                        {
                                            id: formKey,
                                            error: !!error,
                                            fullWidth: true,
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
                                    fieldProps={
                                        {
                                            id: formKey,
                                            error: !!error,
                                            helperText: error?.message,
                                            fullWidth: true,
                                            ...restField,
                                        } as FieldTextProps
                                    }
                                    fieldId={fieldItem._id}
                                    onChange={onChange}
                                />
                            )}
                        />
                    );
                case 'Country':
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => {
                                return (
                                    <Fields
                                        type="Country"
                                        value={value}
                                        fieldProps={
                                            {
                                                id: formKey,
                                                error: !!error,
                                                helperText: error?.message,
                                                fullWidth: true,
                                                ...restField,
                                            } as FieldCountryProps
                                        }
                                        fieldId={fieldItem._id}
                                        onChange={onChange}
                                    />
                                );
                            }}
                        />
                    );
                case 'Origin': {
                    const isDisabled = () => {
                        return selectedRowInfo?.boardType === 'Contacts' ? boardRecord?.created_type === 'system' : false;
                    };
                    const valueEnum = fieldItem.data?.reduce((prev, current) => {
                        return {
                            ...prev,
                            [current._id]: current.value,
                        };
                    }, {});
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => {
                                return (
                                    <Fields
                                        type="Attachment"
                                        fieldProps={
                                            {
                                                id: formKey,
                                                error: !!error,
                                                helperText: error?.message,
                                                fullWidth: true,
                                                disabled: isDisabled(),
                                                disabledTooltip: t('origin_system_filled_tooltip'),
                                                ...restField,
                                            } as FieldCountryProps
                                        }
                                        enum={valueEnum}
                                        fieldId={fieldItem._id}
                                        value={value}
                                        onChange={onChange}
                                    />
                                );
                            }}
                        />
                    );
                }
                case 'Attachment': {
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => {
                                return (
                                    <Fields
                                        type="Attachment"
                                        fieldProps={
                                            {
                                                id: formKey,
                                                error: !!error,
                                                helperText: error?.message,
                                                fullWidth: true,

                                                ...restField,
                                            } as FieldCountryProps
                                        }
                                        fieldId={fieldItem._id}
                                        value={value}
                                        onChange={onChange}
                                    />
                                );
                            }}
                        />
                    );
                }
                case 'Notes': {
                    return null;
                }
                case 'Checkbox': {
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            rules={{
                                maxLength: {
                                    value: 150,
                                    message: t('crm_field_short_text_length_limit'),
                                },
                            }}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => (
                                <Fields
                                    type="Checkbox"
                                    value={value}
                                    // checked={value as boolean}
                                    fieldProps={
                                        {
                                            id: formKey,
                                            error: !!error,
                                            helperText: error?.message,
                                            ...restField,
                                        } as FieldCheckboxProps
                                    }
                                    fieldId={fieldItem._id}
                                    onChange={onChange}
                                />
                            )}
                        />
                    );
                }
                default:
                    return (
                        <Controller
                            name={formKey}
                            control={control}
                            rules={{
                                maxLength: {
                                    value: 150,
                                    message: t('crm_field_short_text_length_limit'),
                                },
                            }}
                            render={({ field: { value, onChange, ...restField }, fieldState: { error } }) => (
                                <Fields
                                    type="ShortText"
                                    value={value}
                                    fieldProps={
                                        {
                                            id: formKey,
                                            error: !!error,
                                            helperText: error?.message,
                                            fullWidth: true,
                                            ...restField,
                                        } as FieldTextProps
                                    }
                                    fieldId={fieldItem._id}
                                    onChange={onChange}
                                />
                            )}
                        />
                    );
            }
        };

        return renderFieldControl();
    },
);

const DetailModalFields = (props: Props) => {
    const { isEditMode, columns = 'one', fields, selectedRowInfo, onNewField, boardRecord, afterUpdated } = props;
    const { t } = useTranslation();
    const [defaultFields, setDefaultFields] = useState<Record<string, Field>>();
    const {
        control,
        formState: { dirtyFields },
        getValues,
        watch,
        setError,
    } = useFormContext();

    useEffect(() => {
        const displayDefaultFields = fields.filter((field) => field.is_default || field.is_identifier);
        const omittedFields = ['name', 'birthday', 'gender', 'title', 'location', 'created_at', 'last_seen'];
        const filteredDefaultFields = displayDefaultFields.filter((field) => {
            if (!field.default_field_name) return null;
            return !omittedFields.includes(field?.default_field_name);
        });

        const groupedFields = filteredDefaultFields.reduce((acc: Record<string, Field>, field) => {
            const { default_field_name } = field;
            if (!default_field_name) return acc;
            acc[default_field_name] = field;
            return acc;
        }, {});
        // filtered out header fields, output as object
        setDefaultFields(groupedFields);
    }, [fields, selectedRowInfo]);

    const handleUpdateRecord = useCallback(async (boardId: string, recordId: string, data: { key: string; value: unknown }[]) => {
        try {
            const { data: record } = await apiFetch<API.BoardItem>(putBoardRecord.api(boardId, recordId), putBoardRecord.method, {
                data,
            });

            return { ...record, ...record.fields } as unknown as API.BoardItem;
        } catch (err) {
            console.log(err);
        }
    }, []);

    const updateAttachment = useCallback(
        async (fieldId: string, attachments?: AttachmentValue[]) => {
            const newValue = attachments || [];
            let fieldValue = [];
            const formData = new FormData();
            newValue.forEach((item) => {
                if (item?.extra?.file) {
                    formData.append('', item.extra.file);
                }
            });

            if ([...formData.entries()].length > 0) {
                const { data } = await apiFetch<{ name: string; extension: string; url: string; key: string }[]>(
                    postBoardUpload.api,
                    postBoardUpload.method,
                    formData,
                    ImbraceFileUpload,
                );
                fieldValue = newValue.map((item) => {
                    const targetData = data.find((d) => d.name === item.data.name?.split('.')[0]);
                    return {
                        type: item.type,
                        data: {
                            name: item.data.name,
                            url: targetData?.url || item.data.url,
                            key: targetData?.key || item.data.key,
                            extension: targetData?.extension || item.data.extension,
                        },
                    };
                });
            } else {
                fieldValue = newValue.map((item) => {
                    return {
                        type: item.type,
                        data: {
                            name: item.data?.name,
                            url: item.data?.url,
                            key: item.data?.key,
                            extension: item.data?.extension,
                        },
                    };
                });
            }
            if (!selectedRowInfo?.boardId || !selectedRowInfo?.boardItemId) {
                return;
            }
            const result = await handleUpdateRecord(selectedRowInfo?.boardId, selectedRowInfo?.boardItemId, [
                {
                    key: fieldId,
                    value: fieldValue,
                },
            ]);
            if (result) {
                afterUpdated(result);
            }

            return result;
        },
        [selectedRowInfo, handleUpdateRecord, afterUpdated],
    );

    const renderCustomFields = useMemo(() => {
        const displayCustomFields = fields.filter((field) => !field.is_default);

        if (selectedRowInfo?.boardType === 'General') {
            return {
                dynamic: displayCustomFields.filter((field) => !field.is_identifier && !field.hidden_on_record),
            };
        }

        if (selectedRowInfo?.boardType === 'System' || selectedRowInfo?.boardType === 'OptOut') {
            return {
                dynamic: fields.filter((field) => !field.is_identifier && !field.hidden_on_record),
            };
        }

        return {
            dynamic: displayCustomFields.filter((field) => !field.hidden_on_record),
        };
    }, [fields, selectedRowInfo]);

    const renderFieldValue = useCallback(
        (fieldItem: Field) => {
            const { default_field_name, type, _id } = fieldItem;
            const formKey = default_field_name || _id;
            const result = fields.find((field) => field._id === _id);
            if (!result || !result.value) {
                return (
                    <Typography variant="Body" style={{ color: 'var(--color-light-5)', lineHeight: '20px' }}>
                        —
                    </Typography>
                );
            }
            switch (type) {
                case 'SingleSelection':
                    return <EllipsisText text={result.value as string} element={<Typography style={{ lineHeight: '20px' }} />} />;

                case 'MultipleSelection':
                    const renderSelectedItems = (result.value as string[]).map((item) => {
                        return (
                            <Chip key={item} sx={{ height: 24, background: 'rgba(250, 153, 23, 0.2)', maxWidth: 'none' }} label={item} />
                        );
                    });
                    return <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{renderSelectedItems}</Box>;
                case 'Priority':
                    return <EllipsisText text={result.value as string} element={<Typography style={{ lineHeight: '20px' }} />} />;

                case 'LongText':
                    const replaceWithBr = () => {
                        return (result.value as string).replace(/\n/g, '<br />');
                    };
                    return (
                        <Typography variant="Body" style={{ lineHeight: '20px' }}>
                            <span
                                dangerouslySetInnerHTML={{ __html: replaceWithBr() }}
                                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                            />
                        </Typography>
                    );
                case 'Date':
                    return (
                        <EllipsisText
                            text={`${format(new Date(result.value as string | number), 'MM/dd/yyyy')}`}
                            element={
                                <Typography
                                    variant="Body"
                                    style={{
                                        lineHeight: '20px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        wordBreak: 'break-word',
                                    }}
                                />
                            }
                        />
                    );
                case 'Time':
                    return (
                        <EllipsisText
                            text={`${
                                /^\d{2}:\d{2}$/.test(`${result.value}`)
                                    ? result.value
                                    : format(new Date(result.value as string | number), 'HH:mm')
                            }`}
                            element={
                                <Typography
                                    variant="Body"
                                    style={{
                                        lineHeight: '20px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        wordBreak: 'break-word',
                                    }}
                                />
                            }
                        />
                    );
                case 'Datetime':
                    return (
                        <EllipsisText
                            text={`${format(new Date(result.value as string | number), 'MM/dd/yyyy HH:mm')}`}
                            element={
                                <Typography
                                    variant="Body"
                                    style={{
                                        lineHeight: '20px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        wordBreak: 'break-word',
                                    }}
                                />
                            }
                        />
                    );
                case 'Link':
                    if (default_field_name === 'contact_record' || default_field_name === 'opportunity_record') {
                        return (
                            <Button
                                variant="link"
                                text={<EllipsisText text={result.value as string | number} className={styles.ellipsisLink} />}
                                onClick={() => {
                                    window.open(result.value as string, '_blank', 'noreferrer');
                                }}
                                sx={{
                                    padding: 0,
                                    maxWidth: '221px',
                                    fontWeight: 400,
                                    fontSize: '14px',
                                    lineHeight: '20px',
                                    textDecoration: 'underline',
                                    '& :hover': {
                                        textDecoration: 'underline',
                                    },
                                }}
                            />
                        );
                    }
                    return <LinkPreview value={getValues(formKey)} columnMode={columns === 'one'} />;
                case 'Assignee':
                    const value = result?.value ? (result.value as API.AssigneeValue).display_name : '';
                    return (
                        <Typography variant="Body" style={{ lineHeight: '20px' }}>
                            {value}
                        </Typography>
                    );
                case 'Phone':
                    const phoneNumber = result.value as string | API.PhoneValue;
                    if (typeof phoneNumber === 'object' && 'phone' in phoneNumber) {
                        return (
                            <EllipsisText
                                text={`${phoneNumber.country_calling_code ?? ''} ${phoneNumber.national_number}`}
                                element={<Typography style={{ lineHeight: '20px' }} />}
                            />
                        );
                    }
                    return <EllipsisText text={result.value as string | number} element={<Typography style={{ lineHeight: '20px' }} />} />;
                case 'RichText': {
                    const richContent = result.value as unknown as {
                        subject: string;
                        content: { content: string; files: [] };
                    };
                    const emailField = fields.find((field) => field.name === 'Outbound Source');

                    return (
                        <EmailContentPreview
                            {...richContent}
                            email={emailField ? (boardRecord?.fields?.[emailField._id] as string) || '' : ''}
                        />
                    );
                }
                case 'Country':
                    const countryCode = (result.value as API.CountryValue).country_code;
                    const country = getCountry(countryCode as CountryCode);
                    return <EllipsisText text={`${country?.name}`} element={<Typography style={{ lineHeight: '20px' }} />} />;
                case 'Origin':
                    const originValue = result.value as API.OriginValue;
                    if (!originValue || typeof originValue !== 'object') {
                        return <Typography style={{ color: 'var(--color-light-4)' }}>—</Typography>;
                    }
                    const {
                        type: originType,
                        data: { name, type: dataType },
                    } = originValue;
                    const iconType: Record<API.ProductType, keyof typeof channelIconMapping> = {
                        business_contact_collector: 'crm',
                        email_campaign: 'email',
                        facebook_leads_management: 'facebook',
                        facebook_social_media_management: 'facebook',
                        'ai-assistant_management': 'imbraceai',
                        form_management: 'formManagement',
                        whatsapp_outbound: 'whatsapp',
                    };
                    if (originType === 'customized') {
                        return (
                            <EllipsisText
                                text={`${name ?? '—'}`}
                                element={
                                    <Typography
                                        style={{
                                            color: !name ? 'var(--color-light-4)' : 'inherit',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            wordBreak: 'break-word',
                                        }}
                                    />
                                }
                            />
                        );
                    }
                    return (
                        <Space size={12} align="center" justify="start" style={{ width: '100%' }}>
                            <Space>
                                <Icon
                                    namespace="channel"
                                    name={
                                        originType === 'channel'
                                            ? (dataType as keyof typeof channelIconMapping)
                                            : iconType[dataType as API.ProductType]
                                    }
                                    style={{ fontSize: 24 }}
                                />
                            </Space>

                            <EllipsisText
                                text={`${name ?? '—'}`}
                                element={
                                    <Typography
                                        style={{
                                            color: !name ? 'var(--color-light-4)' : 'inherit',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            wordBreak: 'break-word',
                                        }}
                                    />
                                }
                            />
                        </Space>
                    );
                case 'Attachment':
                    return (
                        <Attachment
                            value={result.value as AttachmentValue[]}
                            fieldId={_id}
                            onUpdate={(attachments) => {
                                updateAttachment(_id, attachments);
                            }}
                        />
                    );
                case 'Notes':
                    return <Notes notes={(result.value as API.NotesValue[]) || []} />;
                case 'Checkbox':
                    return <Checkbox checked={result.value as boolean} />;
                default:
                    return <EllipsisText text={result.value as string | number} element={<Typography style={{ lineHeight: '20px' }} />} />;
            }
        },
        [fields, getValues, columns, boardRecord, updateAttachment],
    );

    const renderNewBoardField = useCallback(
        (fieldItem: Field) => {
            const { default_field_name, _id, type } = fieldItem;
            const formKey = (default_field_name as string) || _id;
            if (isEditMode && type !== 'RichText') {
                return (
                    <Box sx={{ width: '100%', minHeight: fieldItem.type === 'LongText' ? '164px' : 'auto' }}>
                        <FieldControl
                            formKey={formKey}
                            fieldItem={fieldItem}
                            control={control}
                            watch={watch}
                            setError={setError}
                            selectedRowInfo={selectedRowInfo}
                            isDirty={!!dirtyFields[formKey]}
                            boardRecord={boardRecord}
                        />
                    </Box>
                );
            }
            return (
                <Box
                    sx={{
                        width: '100%',
                        minHeight: fieldItem.type === 'LongText' ? '164px' : 'auto',
                        padding: '0 12px',
                    }}
                >
                    {renderFieldValue(fieldItem)}
                </Box>
            );
        },
        [control, watch, setError, selectedRowInfo, isEditMode, dirtyFields, renderFieldValue, boardRecord],
    );

    return (
        <Box sx={{ padding: '0 32px 16px 16px' }}>
            <Grid container spacing={2} sx={{ width: '100%', margin: 0 }}>
                <>
                    {defaultFields &&
                        selectedRowInfo &&
                        selectedRowInfo.boardType !== 'General' &&
                        boardDefaultFields[selectedRowInfo.boardType as keyof typeof boardDefaultFields].map(
                            (field: { key: string; size: number }) => {
                                const item = defaultFields[field.key];

                                if (!item) return null;
                                return (
                                    <Grid item xs={12} sm={columns === 'one' ? 12 : field.size} key={defaultFields[field.key]._id}>
                                        <BasicFieldContainer isEditMode={isEditMode}>
                                            <BasicsLabelContainer
                                                alignTop={
                                                    item.type === 'LongText' || item.type === 'MultipleSelection' || item.type === 'Link'
                                                }
                                                {...((item.type === 'LongText' || item.type === 'MultipleSelection') && {
                                                    sx: {
                                                        paddingTop: isEditMode ? '8px' : 0,
                                                    },
                                                })}
                                            >
                                                {FieldTypeIcon(item.type, { color: 'var(--color-light-5)' })}

                                                <Box sx={{ width: '87px' }}>
                                                    <EllipsisText
                                                        text={item.name}
                                                        element={
                                                            <Typography
                                                                variant="BodyTight"
                                                                style={{
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    wordBreak: 'break-word',
                                                                    color: 'var(--color-light-5)',
                                                                    lineHeight: '20px',
                                                                }}
                                                            />
                                                        }
                                                    />
                                                </Box>
                                            </BasicsLabelContainer>
                                            <BasicsField>{renderNewBoardField(item)}</BasicsField>
                                        </BasicFieldContainer>
                                    </Grid>
                                );
                            },
                        )}
                </>

                {selectedRowInfo?.boardType !== 'General' && renderCustomFields?.dynamic.length > 0 && (
                    <Grid item xs={12} sm={12}>
                        <Divider />
                    </Grid>
                )}

                {selectedRowInfo?.boardType === 'General' && renderCustomFields?.dynamic.length === 0 && onNewField && (
                    <div style={{ width: '100%', marginTop: '72px' }}>
                        <Illustration
                            name="filesMissing"
                            description={
                                <Space size={4} direction="vertical" style={{ width: '360px' }}>
                                    <Typography variant="SubHeading2">{t('board_empty_fields_header')}</Typography>
                                    <Typography variant="Caption" style={{ color: 'var(--color-light-5)' }}>
                                        <Trans i18nKey={'board_empty_fields_desc'}>
                                            Create
                                            <LinkButton
                                                style={{ fontWeight: 700 }}
                                                onClick={() => {
                                                    onNewField();
                                                }}
                                            >
                                                a new field
                                            </LinkButton>
                                            now or manage the fields on the “Field Management” page later.
                                        </Trans>
                                    </Typography>
                                </Space>
                            }
                        />
                    </div>
                )}

                {renderCustomFields?.dynamic.map((field) => {
                    const { _id, type, name } = field;
                    return (
                        <Grid item xs={12} sm={12} key={_id}>
                            <BasicFieldContainer key={_id} isEditMode={isEditMode}>
                                <BasicsLabelContainer
                                    alignTop={type === 'LongText' || type === 'MultipleSelection' || (type === 'Link' && !isEditMode)}
                                    {...((type === 'LongText' || type === 'MultipleSelection') && {
                                        sx: {
                                            paddingTop: isEditMode ? '8px' : 0,
                                        },
                                    })}
                                >
                                    {FieldTypeIcon(type, {
                                        style: {
                                            color: 'var(--color-light-5)',
                                        },
                                    })}
                                    <Box sx={{ width: '87px' }}>
                                        <EllipsisText
                                            text={name}
                                            element={
                                                <Typography
                                                    variant="BodyTight"
                                                    style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        wordBreak: 'break-word',
                                                        color: 'var(--color-light-5)',
                                                        lineHeight: '20px',
                                                    }}
                                                />
                                            }
                                        />
                                    </Box>
                                </BasicsLabelContainer>
                                <BasicsField>{renderNewBoardField(field)}</BasicsField>
                            </BasicFieldContainer>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
};

export default DetailModalFields;
