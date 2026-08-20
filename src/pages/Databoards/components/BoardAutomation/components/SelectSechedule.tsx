import { FieldNumber, FieldSelect, FieldTimePicker, FormLabel, Icon, Space, Tooltip, Typography } from '@imbrace/ui';
import { Box } from '@mui/material';
import { useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import SelectedUnitAsYears from '@/pages/Databoards/components/BoardAutomation/components/SelectedUnitAsYears';
import StartingFrom from '@/pages/Databoards/components/BoardAutomation/components/StartingFrom';

import SelectedUnitAsMonths from './SelectedUnitAsMonths';
import SelectedUnitAsWeeks from './SelectedUnitAsWeeks';

const SelectSchedule = () => {
    const { t, i18n } = useTranslation();
    const { control, watch, trigger, setValue } = useFormContext();

    const trigger_frequency_unit = watch('trigger_frequency_unit');

    useEffect(() => {
        trigger('trigger_frequency_value');
    }, [trigger, trigger_frequency_unit]);

    const commonRules = {
        required: {
            value: true,
            message: t('validation_automation_trigger_time_required'),
        },
        pattern: {
            value: /^[0-9]*$/,
            message: t('validation_automation_trigger_time_numerical'),
        },
    };

    const minutesSpecificRules = {
        min: {
            value: 30,
            message: t('validation_automation_trigger_time_minimum_value'),
        },
        max: {
            value: 1440,
            message: t('validation_automation_trigger_time_maximum_value'),
        },
    };

    const nonMinutesSpecificRules = {
        min: {
            value: 1,
            message: t('validation_automation_trigger_time_numerical'),
        },
        max: undefined,
    };

    const secondsSpecificRules = {
        min: {
            value: 10,
            message: 'Minimum 10 seconds are required',
        },
        max: undefined,
    };

    const rules = {
        ...commonRules,
        ...(trigger_frequency_unit === 'minutes' ? minutesSpecificRules : nonMinutesSpecificRules),
        ...(trigger_frequency_unit === 'seconds' && secondsSpecificRules),
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Space size={24} direction="vertical" align="start" style={{ padding: 0, width: '100%' }}>
                <Space style={{ maxWidth: '496px', width: '100%' }}>
                    <Box sx={{ width: '242px' }}>
                        <FormLabel label={`${t('automation_field_frequency')}*`} />
                        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Typography style={{ flex: '0 0 auto' }}>{t('automation_every')}</Typography>
                            <Box sx={{ width: '56px' }}>
                                <Controller
                                    name="trigger_frequency_value"
                                    rules={rules}
                                    control={control}
                                    render={({ field: { onChange, ...restField }, fieldState: { error } }) => {
                                        return (
                                            <Tooltip open={!!error} title={error?.message} disableFocusListener placement="top" arrow>
                                                <div style={{ width: '100%' }}>
                                                    <FieldNumber
                                                        fullWidth
                                                        onChange={(e) => {
                                                            onChange(e.target.value);
                                                        }}
                                                        {...restField}
                                                    />
                                                </div>
                                            </Tooltip>
                                        );
                                    }}
                                />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: '122px' }}>
                                <Controller
                                    control={control}
                                    name="trigger_frequency_unit"
                                    render={({ field: { onChange, ...restField } }) => {
                                        return (
                                            <FieldSelect
                                                fullWidth
                                                queryKey={['selectFrequencyUnit', i18n.language]}
                                                request={() => [
                                                    {
                                                        value: 'seconds',
                                                        text: 'Seconds',
                                                    },
                                                    {
                                                        value: 'minutes',
                                                        text: t('minute_other'),
                                                    },
                                                    {
                                                        value: 'hours',
                                                        text: t('hour_other'),
                                                    },
                                                    {
                                                        value: 'days',
                                                        text: t('day_other'),
                                                    },
                                                    {
                                                        value: 'weeks',
                                                        text: t('week_other'),
                                                    },
                                                    {
                                                        value: 'months',
                                                        text: t('month_other'),
                                                    },
                                                    {
                                                        value: 'years',
                                                        text: t('year_other'),
                                                    },
                                                ]}
                                                onChange={async (value) => {
                                                    onChange(value);
                                                    switch (value) {
                                                        case 'seconds':
                                                            setValue('trigger_time', new Date());
                                                            setValue('trigger_frequency_value', 10);
                                                            break;
                                                        case 'minutes':
                                                        case 'hours':
                                                            const now = new Date();
                                                            const nextHour = new Date(
                                                                now.getFullYear(),
                                                                now.getMonth(),
                                                                now.getDate(),
                                                                now.getHours() + 1,
                                                                0,
                                                                0,
                                                            );
                                                            setValue('start_datetime', nextHour);
                                                            break;
                                                        case 'days':
                                                        case 'weeks':
                                                        case 'months':
                                                        case 'years':
                                                        default:
                                                            setValue('trigger_time', new Date());
                                                    }
                                                }}
                                                {...restField}
                                            />
                                        );
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>
                    {trigger_frequency_unit === 'days' && (
                        <Box sx={{ flex: 1, width: '100%' }}>
                            <FormLabel label={`${t('automation_field_time')}*`} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                    )}
                </Space>

                {trigger_frequency_unit === 'weeks' && <SelectedUnitAsWeeks />}
                {trigger_frequency_unit === 'months' && <SelectedUnitAsMonths />}
                {trigger_frequency_unit === 'years' && <SelectedUnitAsYears />}
                <StartingFrom />
            </Space>
        </Box>
    );
};

export default SelectSchedule;
