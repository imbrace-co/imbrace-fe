import { FieldDatePicker, FieldSelect, FieldText, Typography } from '@imbrace/ui';
import { Box, Chip, ClickAwayListener, Grid } from '@mui/material';
import { useEffect, useState } from 'react';
import type { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { FieldTypeIcon } from '@/pages/Databoards/utils';
import { BasicsField, BasicsLabelContainer } from '@/pages/Members/components/BasicInformation/StyledComponents';

import type { EditType } from '../../../../IMember.types';

interface Props {
    editing: boolean;
    control: Control<Partial<API.BaseContact>>;
    basicInfoData: EditType;
    handleClickAway: (KeyVariable: keyof Partial<API.BaseContact>) => Promise<void>;
    errors: FieldErrors<Partial<API.BaseContact>>;
    setValue: UseFormSetValue<Partial<API.BaseContact>>;
    onEditing: (KeyVariable: keyof Partial<API.BaseContact>, value: boolean) => void;
    expanded: boolean;
    handleBasicInfoClick: () => void;
    columns?: 'one' | 'two';
    boardFields?: API.ContactBoardField[];
    formHeight?: number;
}

const BasicsTabContent = ({ editing, control, errors, boardFields, columns = 'one', handleClickAway }: Props) => {
    const [defaultFields, setDefaultFields] = useState<API.ContactBoardField[]>(boardFields || []);
    const [customFields, setCustomFields] = useState<API.ContactBoardField[]>(boardFields || []);

    const gridItemSize = columns === 'two' ? 6 : 12;

    useEffect(() => {
        if (!boardFields) return;
        const omittedFields = ['display_name', 'birthday', 'gender', 'title', 'created_at', 'last_seen'];
        const filteredFields = boardFields.filter((field) => !omittedFields.includes(field.contact_field));

        const displayContactFields = filteredFields.filter((field) => field.contact_field && !field.field.hidden);
        const displayCustomFields = filteredFields.filter((field) => !field.contact_field);

        setDefaultFields(displayContactFields);
        setCustomFields(displayCustomFields);
    }, [boardFields]);

    const renderFieldValue = (fieldItem: API.ContactBoardField) => {
        switch (fieldItem.field.type) {
            case 'MultipleSelection':
                if (!fieldItem.value || !Array.isArray(fieldItem.value)) return [];
                const map =
                    fieldItem.field?.data?.reduce((acc: Record<string, string>, item: Record<string, string>) => {
                        acc[item._id] = item.value;
                        return acc;
                    }, {}) || {};
                const renderSelectedItems = fieldItem?.value.map((item) => {
                    return (
                        <Chip key={item} sx={{ height: 24, background: 'rgba(250, 153, 23, 0.2)', maxWidth: 'none' }} label={map[item]} />
                    );
                });
                return <Box sx={{ display: 'flex', gap: '8px' }}>{renderSelectedItems}</Box>;
            case 'SingleSelection':
                if (typeof fieldItem.value !== 'string') return '-';

                const singleSelectionMap =
                    fieldItem.field?.data?.reduce((acc: Record<string, string>, item: Record<string, string>) => {
                        acc[item._id] = item.value;
                        return acc;
                    }, {}) || {};
                return <Typography variant="BodyTight">{singleSelectionMap[fieldItem?.value]}</Typography>;

            case 'Priority':
                if (typeof fieldItem.value !== 'string') return '-';

                const priorityMap =
                    fieldItem.field?.data?.reduce((acc: Record<string, string>, item: Record<string, string>) => {
                        acc[item._id] = item.value;
                        return acc;
                    }, {}) || {};
                return <Typography variant="BodyTight">{priorityMap[fieldItem?.value]}</Typography>;

            case 'LongText':
                return (
                    <Box sx={{ width: '100%' }}>
                        <Typography variant="BodyTight">{fieldItem.value}</Typography>
                    </Box>
                );
            default:
                return <Typography variant="BodyTight">{fieldItem.value}</Typography>;
        }
    };

    const renderFieldControl = (formKey: string, fieldItem: API.ContactBoardField) => {
        switch (fieldItem.field.type) {
            case 'Date':
                return (
                    <Controller
                        // @ts-ignore
                        name={formKey as string}
                        control={control}
                        render={({ field }) => {
                            return (
                                <ClickAwayListener
                                    mouseEvent="onMouseDown"
                                    touchEvent="onTouchStart"
                                    // @ts-ignore
                                    onClickAway={() => handleClickAway(formKey as string)}
                                    disableReactTree
                                >
                                    <FieldDatePicker
                                        {...field}
                                        fullWidth
                                        sx={{
                                            '& .MuiInputBase-input': { padding: '8.5px 11px' },
                                            height: '40px',
                                            background: 'white',
                                        }}
                                        value={field.value ? new Date(field.value) : new Date()}
                                    />
                                </ClickAwayListener>
                            );
                        }}
                    />
                );
            case 'Priority':
                const prioritySelectionOptions = fieldItem.field?.data?.map((item) => {
                    return { value: item._id, text: item.value };
                });
                return (
                    <Controller
                        // @ts-ignore
                        name={formKey as string}
                        control={control}
                        render={({ field }) => (
                            <FieldSelect
                                queryKey={['prioritySelectionOptions', { prioritySelectionOptions }]}
                                fullWidth
                                onChange={(event) => {
                                    field.onChange(event);
                                }}
                                value={field.value as string}
                                // @ts-ignore
                                error={!!errors?.[formKey as string]}
                                // @ts-ignore
                                helperText={errors?.[formKey as string]?.message}
                                request={async () => prioritySelectionOptions || []}
                            />
                        )}
                    />
                );
            case 'SingleSelection':
                const singleSelectionOptions = fieldItem.field?.data?.map((item) => {
                    return { value: item._id, text: item.value };
                });
                return (
                    <Controller
                        // @ts-ignore
                        name={formKey as string}
                        control={control}
                        render={({ field }) => (
                            <FieldSelect
                                queryKey={['singleSelectionOptions', { singleSelectionOptions }]}
                                fullWidth
                                onChange={(event) => {
                                    field.onChange(event);
                                }}
                                value={field.value as string}
                                // @ts-ignore
                                error={!!errors?.[formKey as string]}
                                // @ts-ignore
                                helperText={errors?.[formKey as string]?.message}
                                request={async () => singleSelectionOptions || []}
                            />
                        )}
                    />
                );

            case 'MultipleSelection':
                // map over fieldItem.field.data and change value to text and _id to value
                const multipleSelectionOptions = fieldItem.field?.data?.map((item) => {
                    return { value: item._id, text: item.value };
                });
                return (
                    <Controller
                        // @ts-ignore
                        name={formKey as string}
                        control={control}
                        render={({ field }) => (
                            <FieldSelect
                                queryKey={['multipleSelectionOptions', { multipleSelectionOptions }]}
                                displayType="chip"
                                menuType="chip"
                                multiple
                                request={async () => multipleSelectionOptions || []}
                                placeholder="Click to select"
                                value={field.value || []}
                                onChange={(event) => {
                                    field.onChange(event);
                                }}
                            />
                        )}
                    />
                );

            default:
                return (
                    <Controller
                        // @ts-ignore
                        name={formKey as string}
                        control={control}
                        // rules={rules}
                        render={({ field }) => (
                            <FieldText
                                id={formKey}
                                // @ts-ignore
                                error={!!errors?.[formKey as string]}
                                // @ts-ignore
                                helperText={errors?.[formKey as string]?.message}
                                autoFocus
                                {...field}
                            />
                        )}
                    />
                );
        }
    };

    const renderBoardField = (fieldItem: API.ContactBoardField) => {
        const formKey = fieldItem.contact_field ? fieldItem.contact_field : fieldItem.board_field_id;
        if (editing) {
            return <>{renderFieldControl(formKey, fieldItem)}</>;
        }

        return fieldItem.value ? renderFieldValue(fieldItem) : <Typography variant="BodyTight">—</Typography>;
    };

    return (
        <>
            <Box sx={{ padding: '32px' }}>
                <Grid container spacing={2}>
                    {/* Board Fields */}
                    {defaultFields?.map((field) => {
                        const { value } = field;
                        const { name, type } = field.field;
                        return (
                            <Grid item xs={12} sm={gridItemSize} key={field._id}>
                                <Box key={field._id} sx={{ height: '40px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <BasicsLabelContainer>
                                        <Box sx={{ '& svg': { fontSize: '20px' } }}>{FieldTypeIcon(type)}</Box>
                                        <Typography variant="BodyTight">{name}</Typography>
                                    </BasicsLabelContainer>
                                    <BasicsField isEmptyValue={!value}>{renderBoardField(field)}</BasicsField>
                                </Box>
                            </Grid>
                        );
                    })}

                    {customFields?.map((field) => {
                        const { value } = field;
                        const { name, type } = field.field;
                        return (
                            <Grid item xs={12} sm={12} key={field._id}>
                                <Box
                                    key={field._id}
                                    sx={{
                                        minHeight: '40px',
                                        display: 'flex',
                                        gap: '16px',
                                        justifyContent: 'flex-start',
                                        alignItems: type === 'LongText' ? 'flex-start' : 'center',
                                    }}
                                >
                                    <BasicsLabelContainer>
                                        <Box sx={{ '& svg': { fontSize: '20px' } }}>{FieldTypeIcon(type)}</Box>
                                        <Typography variant="BodyTight">{name}</Typography>
                                    </BasicsLabelContainer>
                                    <BasicsField isEmptyValue={!value}>{renderBoardField(field)}</BasicsField>
                                </Box>
                            </Grid>
                        );
                    })}
                </Grid>
            </Box>
        </>
    );
};

export default BasicsTabContent;
