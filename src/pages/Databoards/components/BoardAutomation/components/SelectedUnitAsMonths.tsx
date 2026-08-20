import { FieldSelect, FieldTimePicker, FormLabel, Icon, Space, Typography } from '@imbrace/ui';
import { Box } from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

const SelectedUnitAsMonths = () => {
    const { t, i18n } = useTranslation();
    const { control } = useFormContext();

    return (
        <Space size={12} justify="start" align="center" style={{ maxWidth: '496px', width: '100%' }}>
            <Box sx={{ width: '100%' }}>
                <FormLabel
                    label={`${t('automation_field_time')}*`}
                    description="If the month does not have the set day, the automation will not be triggered"
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Typography
                        style={{
                            flex: '0 0 auto',
                        }}
                    >
                        {t('automation_on_the')}
                    </Typography>
                    <Controller
                        control={control}
                        name="trigger_day_of_month"
                        render={({ field }) => {
                            return (
                                <FieldSelect
                                    fullWidth
                                    queryKey={['selectDayOfMonth', i18n.language]}
                                    request={() => [
                                        {
                                            value: 'first',
                                            text: t('automation_months_first'),
                                        },
                                        {
                                            value: 'last',
                                            text: t('automation_months_last'),
                                        },
                                        {
                                            value: 'second_last',
                                            text: t('automation_months_second_last'),
                                        },
                                        ...Array.from({ length: 30 }, (_, i) => i + 2).map((i) => ({
                                            value: i.toString(),
                                            text: t(`automation_months_${i}`),
                                        })),
                                    ]}
                                    defaultValue="first"
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
                    <Typography
                        style={{
                            flex: '0 0 auto',
                            textAlign: 'center',
                        }}
                    >
                        {t('automation_day_of_the_month_at')}
                    </Typography>

                    <Controller
                        control={control}
                        name="trigger_time"
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
        </Space>
    );
};

export default SelectedUnitAsMonths;
