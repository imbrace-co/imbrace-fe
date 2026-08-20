import type { Option } from '@imbrace/ui';
import { Button, EllipsisText, FieldText, Icon, Space, Typography } from '@imbrace/ui';
import { Divider } from '@mui/material';
import { useCallback } from 'react';
import Scrollbars from 'react-custom-scrollbars';
import { Controller, useFieldArray, useForm, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { FilterFormValue } from '../FilterContent';
import { FilterFields } from '../FilterContent';

export interface SegmentationForm extends FilterFormValue {
    _id: string;
    name: string;
    description: string;
}

const SegmentationModal = ({
    defaultValues,
    fields,
    request,
    onSubmit,
    onClose,
    onBack,
    onDelete,
    isEdit = false,
}: {
    defaultValues?: SegmentationForm;
    fields?: API.BoardField[];
    request?: () => Promise<Option[]>;
    onSubmit: (data: API.Segmentation) => Promise<void>;
    isEdit?: boolean;
    onClose: () => void;
    onBack: () => void;
    onDelete: () => void;
}) => {
    const { t } = useTranslation();
    const methods = useForm<API.Segmentation>({
        defaultValues,
        mode: 'onChange',
    });

    const { control, getValues, setValue, watch, handleSubmit } = methods;

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

    const onSubmitHandler = (data: API.Segmentation) => {
        return onSubmit(data);
    };

    const renderAction = () => {
        if (isEdit) {
            return (
                <Space style={{ marginTop: '32px' }} justify="between">
                    <Space>
                        <Button variant="link" onClick={onBack} text="Select Other Saved Segment" />
                    </Space>
                    <Space size={16}>
                        <Button type="danger" variant="outlined" onClick={onDelete} text="Delete" />
                        <Button onClick={handleSubmit(onSubmitHandler)} text="Update" />
                    </Space>
                </Space>
            );
        }
        return (
            <Space style={{ marginTop: '32px' }} justify="end">
                <Button variant="link" onClick={onBack} sx={{ textTransform: 'uppercase', marginRight: '24px' }} text="Back" />
                <Button onClick={handleSubmit(onSubmitHandler)} text="Apply" />
            </Space>
        );
    };

    return (
        <form>
            <Space direction="vertical" size={24} align="start" justify="start" style={{ width: '100%' }}>
            <Typography style={{ color: '#828282', marginBottom: '10px' }}>{t('crm_segmentation_description')}</Typography>
                <Space direction="vertical" size={18} style={{ width: '100%' }}>
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
                            <FieldText
                                label={`${t('segmentation_name')}*`}
                                fullWidth
                                error={!!error}
                                helperText={error?.message}
                                {...field}
                            />
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
                <Space key={'step-2'} direction="vertical" size={24} align="start" justify="start">
                    <Scrollbars autoHeight autoHeightMax={460} autoHide>
                        <Space size={8} direction="vertical" align="start" style={{ width: '100%' }}>
                            <Space size={16} direction="vertical" align="stretch" style={{ width: '100%' }}>
                                <Typography variant="BodyBold">Conditions</Typography>
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
                                    text="Add Condition"
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
            </Space>
            {renderAction()}
        </form>
    );
};

export default SegmentationModal;
