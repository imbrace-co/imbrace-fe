import { FieldDatetimePicker, FormLabel, Icon, Space } from '@imbrace/ui';
import { Box, Divider } from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

const StartingFromField = () => {
    const { t } = useTranslation();
    const { control, watch } = useFormContext();

    return (
        <Space
            size={12}
            direction="vertical"
            align="start"
            style={{
                width: '100%',
            }}
        >
            <Box sx={{ maxWidth: '496px', width: '100%' }}>
                <FormLabel
                    label={`${t('automation_starting_from')}*`}
                    description="If the year does not have the set date, the automation will not be triggered"
                />
                <Controller
                    control={control}
                    name="start_datetime"
                    rules={{
                        required: {
                            value: true,
                            message: t('validation_automation_starting_date_required'),
                        },
                    }}
                    render={({ field, fieldState: { error } }) => {
                        return (
                            <FieldDatetimePicker
                                {...(watch('trigger_frequency_unit') === 'hours' || watch('trigger_frequency_unit') === 'minutes'
                                    ? {
                                          timeSteps: {
                                              minutes: 60,
                                          },
                                      }
                                    : {})}
                                fullWidth
                                disablePast
                                placeholder="MM/DD/YYYY HH:MM"
                                customIcon={(open) => (
                                    <Icon style={{ color: 'var(--color-light-4)' }} name={open ? 'dropUp' : 'dropDown'} />
                                )}
                                error={!!error}
                                helperText={error?.message}
                                {...field}
                            />
                        );
                    }}
                />
            </Box>

            <Divider flexItem sx={{ margin: '12px 0 0 0' }} />
        </Space>
    );
};

export default StartingFromField;
