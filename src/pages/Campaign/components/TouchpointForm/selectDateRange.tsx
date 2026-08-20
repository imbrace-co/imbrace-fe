import { format, isBefore, isSameDay, isValid, startOfDay } from 'date-fns';
import dayjs from 'dayjs';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import DatePickerSelect from '@/components/DatePickerSelect';
import TooltipWithHelpIcon from '@/components/TooltipWithHelpIcon';

import { FormLabel } from '../StyledComponents';
import styles from './index.module.scss';

interface SelectDateRangeTypes {
    touchpointData?: API.Touchpoint;
}

const SelectDateRange = (props: SelectDateRangeTypes) => {
    const { touchpointData } = props;
    const { t } = useTranslation();
    const {
        control,
        watch,
        getValues,
        setValue,
        clearErrors,
        formState: { dirtyFields },
    } = useFormContext();

    const isSameOrAfter = (date1: Date, date2: Date) => {
        return isSameDay(startOfDay(date1), startOfDay(date2)) || !isBefore(startOfDay(date1), startOfDay(date2));
    };

    return (
        <div className={styles.date}>
            <div className={styles.dateField}>
                <FormLabel>{t('campaign_start_day')}*</FormLabel>
                <Controller
                    control={control}
                    name="start_datetime"
                    rules={{
                        required: {
                            value: true,
                            message: t('validation_datepicker_required'),
                        },
                        validate: {
                            beforeToday: (value) => {
                                if (!isValid(value) || isNaN(value) || value.toString() === 'Invalid Date') {
                                    return t('validation_datepicker_end_date_format');
                                }
                                const formatSelectedDate = format(value, 'MM/dd/yyyy');

                                const defaultDate = (touchpointData && new Date(touchpointData.start_datetime)) || new Date();
                                const formatDefaultDate = format(defaultDate, 'MM/dd/yyyy');
                                if (formatSelectedDate === formatDefaultDate && !dirtyFields.start_datetime) return true;

                                const error = isBefore(value, startOfDay(new Date()));
                                return !error || t('validation_datepicker_before_today');
                            },
                            afterEndDate: (value) => {
                                const error = isBefore(startOfDay(getValues('end_datetime')), value);
                                if (error) {
                                    clearErrors('end_datetime');
                                    return t('validation_datepicker_before_end_date');
                                }
                                return !error;
                            },
                        },
                    }}
                    render={({ field: { onBlur, onChange, value }, fieldState: { error, invalid } }) => {
                        return (
                            <>
                                <DatePickerSelect
                                    name="start_datetime"
                                    value={value}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    maxDate={dayjs(watch('end_datetime')) ?? undefined}
                                    error={!!error}
                                    helperText={error?.message}
                                    invalid={invalid}
                                    isOutOfRange={touchpointData?.is_outside_range ?? false}
                                />
                            </>
                        );
                    }}
                />
            </div>
            <div className={styles.dash}>－</div>
            <div className={styles.dateField}>
                <FormLabel sx={{ gap: '4px', display: 'flex', alignItems: 'center' }}>
                    {t('campaign_end_day')}
                    <TooltipWithHelpIcon title={t('campaign_end_day_help')} placement="top" />
                </FormLabel>
                <Controller
                    control={control}
                    name="end_datetime"
                    rules={{
                        validate: {
                            beforeStartDate: (value) => {
                                if (!value || !isValid(value)) return true;

                                const startDatetime = getValues('start_datetime');
                                const error = isSameOrAfter(value, startDatetime);

                                if (!error) {
                                    clearErrors('start_datetime');
                                    return t('validation_datepicker_end_date_pattern');
                                }
                                return error;
                            },
                            endDate: (value) => {
                                if (!value) return true;
                                const startDateTime = getValues('start_datetime');
                                if (isNaN(value) || value.toString() === 'Invalid Date') {
                                    return t('validation_datepicker_end_date_format');
                                }

                                const formatSelectedDate = format(value, 'MM/dd/yyyy');
                                if (value && touchpointData && touchpointData.end_datetime) {
                                    const defaultDate = new Date(touchpointData.end_datetime);
                                    const formatDefaultDate = format(defaultDate, 'MM/dd/yyyy');
                                    if (formatSelectedDate === formatDefaultDate && !dirtyFields.end_datetime) return true;
                                }
                                if (formatSelectedDate <= startDateTime) {
                                    setValue('start_datetime', null);
                                    return t('validation_datepicker_end_date_pattern');
                                }

                                const error = isBefore(value, startOfDay(new Date()));
                                return !error || t('validation_datepicker_end_date_pattern');
                            },
                        },
                    }}
                    render={({ field: { onBlur, onChange, value }, fieldState: { error, invalid } }) => {
                        return (
                            <>
                                <DatePickerSelect
                                    name="end_datetime"
                                    value={value}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    minDate={dayjs(watch('start_datetime')) ?? undefined}
                                    startDate={watch('start_datetime') ?? undefined}
                                    showClear
                                    error={!!error}
                                    helperText={error?.message}
                                    invalid={invalid}
                                    isOutOfRange={touchpointData?.is_outside_range ?? false}
                                />
                            </>
                        );
                    }}
                />
            </div>
        </div>
    );
};
export default SelectDateRange;
