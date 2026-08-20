import { FieldSelect, FieldTimePicker, FormLabel, Icon, Space, Typography } from '@imbrace/ui';
import { Box } from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

const SelectedUnitAsWeeks = () => {
    const { t } = useTranslation();
    const { control } = useFormContext();

    return (
        <Space size={12} justify="start" align="center" style={{ maxWidth: '496px', width: '100%' }}>
            <Box sx={{ width: '100%' }}>
                <FormLabel label={`${t('automation_field_time')}*`} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Typography style={{ width: '22px', paddingRight: '4px' }}>{t('automation_on')}</Typography>
                    <Box sx={{ width: '100%' }}>
                        <Controller
                            control={control}
                            name="trigger_day_of_week"
                            render={({ field }) => {
                                return (
                                    <FieldSelect
                                        fullWidth
                                        queryKey={['selectDay']}
                                        request={() => [
                                            {
                                                value: 'monday',
                                                text: t('monday'),
                                            },
                                            {
                                                value: 'tuesday',
                                                text: t('tuesday'),
                                            },
                                            {
                                                value: 'wednesday',
                                                text: t('wednesday'),
                                            },
                                            {
                                                value: 'thursday',
                                                text: t('thursday'),
                                            },
                                            {
                                                value: 'friday',
                                                text: t('friday'),
                                            },
                                            {
                                                value: 'saturday',
                                                text: t('saturday'),
                                            },
                                            {
                                                value: 'sunday',
                                                text: t('sunday'),
                                            },
                                        ]}
                                        defaultValue="monday"
                                        {...field}
                                    />
                                );
                            }}
                        />
                    </Box>
                    <Typography style={{ padding: '0 4px', width: '22px', textAlign: 'center', textTransform: 'lowercase' }}>
                        {t('automation_at')}
                    </Typography>
                    <Box sx={{ width: '100%' }}>
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

export default SelectedUnitAsWeeks;
