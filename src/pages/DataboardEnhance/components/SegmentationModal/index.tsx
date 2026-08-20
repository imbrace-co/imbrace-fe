import type { Option } from '@imbrace/ui';
import { Button, EllipsisText, FieldText, Icon, Space, Typography } from '@imbrace/ui';
import { Divider } from '@mui/material';
import { useCallback } from 'react';
import Scrollbars from 'react-custom-scrollbars';
import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { FilterFormValue } from '../FilterPopover';
import { FilterFields } from '../FilterPopover';

export interface SegmentationForm extends FilterFormValue {
    name: string;
    description: string;
}

const Step1 = (props: UseFormReturn<API.Segmentation, any>) => {
    const { control } = props;
    const { t } = useTranslation();
    return (
        <Space key="step-1" direction="vertical" size={18}>
            <Controller
                name="name"
                control={control}
                rules={{
                    required: t('validation_segmentation_name_required'),
                    validate: {
                        checkSpace: (val: string) => val.trim().length > 0 || t('validation_segmentation_name_required'),
                    },
                }}
                render={({ field, fieldState: { error } }) => (
                    <FieldText label={`${t('segmentation_name')}*`} fullWidth error={!!error} helperText={error?.message} {...field} />
                )}
            />
            <Controller
                name="description"
                control={control}
                render={({ field, fieldState: { error } }) => (
                    <FieldText label={t('segmentation_desc')} fullWidth error={!!error} helperText={error?.message} {...field} />
                )}
            />
        </Space>
    );
};

const Step2 = (
    props: { onPrev?: () => void; fields?: API.BoardField[]; request?: () => Promise<Option[]> } & UseFormReturn<API.Segmentation, any>,
) => {
    const { control, getValues, onPrev, setValue, watch, fields, request } = props;
    const { t } = useTranslation();
    const name = getValues('name');
    const description = getValues('description');

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

    return (
        <Space key={'step-2'} direction="vertical" size={24} align="start" justify="start">
            <Space size={16} align="start" justify="start">
                <Space size={4} justify="start" style={{ color: 'var(--color-light-5)' }}>
                    <Icon name="personSharp" />
                    <Typography>{t('segmentation')}</Typography>
                </Space>
                <Space
                    size={4}
                    justify="start"
                    align="start"
                    direction="vertical"
                    style={{ color: 'var(--color-light-5)', overflow: 'hidden' }}
                >
                    <Space size={8} style={{ maxWidth: '100%' }}>
                        <EllipsisText text={name} element={<Typography style={{ color: 'var(--color-light-7)' }} variant="BodyBold" />} />
                        <Button
                            size="xs"
                            variant="link"
                            sx={{ padding: 0, gap: '4px' }}
                            text={t('edit')}
                            startIcon={<Icon name="edit" />}
                            onClick={() => onPrev?.()}
                        />
                    </Space>
                    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
                        <EllipsisText text={description} style={{ color: 'var(--color-light-5)' }} element={<Typography />} />
                    </div>
                </Space>
            </Space>
            <Divider flexItem sx={{ borderColor: 'var(--color-light-3)' }} />
            <Scrollbars autoHeight autoHeightMax={460} autoHide>
                <Space size={8} direction="vertical" align="start" style={{ width: '100%' }}>
                    <Space size={16} direction="vertical" align="stretch" style={{ width: '100%' }}>
                        {formFields.map((field, index) => (
                            <FilterFields<API.Segmentation>
                                key={field.id}
                                index={index}
                                control={control}
                                fields={fields}
                                watch={watch}
                                syncCondition={syncCondition}
                                request={request}
                                onDelete={() => {
                                    remove(index);
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
            </Scrollbars>
        </Space>
    );
};

const SegmentationModal = (
    methods: UseFormReturn<API.Segmentation, any>,
    extraProps: { onPrev?: () => void; request?: () => Promise<Option[]>; fields?: API.BoardField[] },
) => {
    return [<Step1 key="step1" {...methods} />, <Step2 key="step2" {...methods} {...extraProps} />];
};

export default SegmentationModal;
