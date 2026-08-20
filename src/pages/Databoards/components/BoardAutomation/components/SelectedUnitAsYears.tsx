import { FieldDatePicker, FieldTimePicker, FormLabel, Icon, Space, Typography } from '@imbrace/ui';
import { Box } from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

const SelectedUnitAsYears = () => {
    const { t } = useTranslation();
    const { control } = useFormContext();

    return (
        <Space
            size={12}
            justify="start"
            align="center"
            style={{
                maxWidth: '496px',
                width: '100%',
            }}
        >
            <Box sx={{ width: '100%' }}>
                <FormLabel
                    label={`${t('automation_field_time')}*`}
                    description="If the year does not have the set date, the automation will not be triggered"
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Typography
                        style={{
                            flex: '0 0 auto',
                        }}
                    >
                        {t('automation_on')}
                    </Typography>
                    <Box sx={{ flex: '1 1 auto' }}>
                        <Controller
                            control={control}
                            name="trigger_month_and_day"
                            rules={{
                                required: {
                                    value: true,
                                    message: t('validation_automation_trigger_month_and_day_required'),
                                },
                            }}
                            render={({ field }) => {
                                return (
                                    <FieldDatePicker
                                        fullWidth
                                        customIcon={(open) => (
                                            <Icon style={{ color: 'var(--color-light-4)' }} name={open ? 'dropUp' : 'dropDown'} />
                                        )}
                                        placeholder="MM/DD"
                                        slotProps={{
                                            textField: {
                                                helperText: 'MM/DD',
                                            },
                                        }}
                                        views={['month', 'day']}
                                        format={'MM/DD'}
                                        {...field}
                                        formControlSx={{
                                            flex: '1 1 auto',
                                            width: '100%',
                                            '& .MuiFormControl-root': {
                                                width: '100%',
                                            },
                                        }}
                                    />
                                );
                            }}
                        />
                    </Box>
                    <Typography
                        style={{
                            flex: '0 0 auto',
                            textAlign: 'center',
                        }}
                    >
                        {t('automation_of_the_year_at')}
                    </Typography>
                    <Box sx={{ flex: '1 1 auto' }}>
                        <Controller
                            control={control}
                            name="trigger_time"
                            rules={{
                                required: {
                                    value: true,
                                    message: t('validation_automation_trigger_time_required'),
                                },
                            }}
                            render={({ field }) => {
                                return (
                                    <FieldTimePicker
                                        fullWidth
                                        autoFocus
                                        customIcon={(open) => (
                                            <Icon style={{ color: 'var(--color-light-4)' }} name={open ? 'dropUp' : 'dropDown'} />
                                        )}
                                        {...field}
                                        formControlSx={{
                                            flex: '1 1 auto',
                                            width: '100%',
                                            '& .MuiFormControl-root': {
                                                width: '100%',
                                            },
                                        }}
                                    />
                                );
                            }}
                        />
                    </Box>
                </Box>
            </Box>
        </Space>
    );
};

export default SelectedUnitAsYears;
