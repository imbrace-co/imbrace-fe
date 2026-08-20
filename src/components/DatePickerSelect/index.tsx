import type { FieldDatePickerProps } from '@imbrace/ui';
import { Button, FieldDatePicker } from '@imbrace/ui';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { DateView } from '@mui/x-date-pickers';
import type { PickersActionBarProps } from '@mui/x-date-pickers/PickersActionBar';
import type { PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { isBefore, isSameDay, isWithinInterval } from 'date-fns';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { ComponentType, FC, FocusEventHandler } from 'react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { validateDate } from '@/utils';

type DateRangeValue = [Date | Dayjs | null, Date | Dayjs | null];

interface DatePickerSelectTypes extends FieldDatePickerProps {
    name: 'start_datetime' | 'end_datetime';
    value: Date | null;
    onChange: () => void;
    showClear?: boolean;
    invalid?: boolean;
    onBlur: FocusEventHandler<HTMLInputElement>;
    startDate?: Date;
    isOutOfRange: boolean;
}

interface ModifiedPickerDayProps extends PickersDayProps<Dayjs> {
    selectedStartDate?: Dayjs;
    minDate?: Dayjs;
    endDate?: Dayjs;
}

interface CustomPickerDayProps extends PickersDayProps<Dayjs> {
    dayIsBetween?: boolean;
    isFirstDay?: boolean;
    isLastDay?: boolean;
}

const CustomActionBar = (actionProps: PickersActionBarProps) => {
    const { onClear, onSetToday } = actionProps;
    const { t } = useTranslation();

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'flex-end',
                margin: '0 2px',
                marginBottom: '10px',
            }}
        >
            <Button
                size={'s'}
                variant="text"
                onClick={() => {
                    onSetToday();
                }}
                text={t('today')}
            />
            <Button size={'s'} variant="text" onClick={onClear} text={t('clear_date')} />
        </div>
    );
};

const BlankActionBar = () => <Box sx={{ height: '18px' }} />;

const popperSx = {
    '& .MuiInputBase-root': {
        height: '38px',
    },
    '& .MuiPaper-root': {
        boxShadow: '0px 4px 8px rgba(189, 189, 189, 0.08), 0px 2px 24px rgba(224, 224, 224, 0.2)',

        '& .MuiIconButton-root': {
            transition: 'none',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            padding: '4px',

            '&:hover': {
                background: 'var(--color-secondary-2)',
                borderRadius: '8px',
            },
            '&:active': {
                background: 'var(--color-primary-3) !important',
                borderRadius: '8px',
            },
        },
    },
};

const paperSx = {
    minHeight: '365px',
    '.MuiDayPicker-header': {
        color: 'var(--color-light-4)',
        '& .MuiDayPicker-weekDayLabel': {
            margin: 0, // disableMargin
        },
    },
    '& .MuiYearCalendar-root': {
        '.MuiPickersYear-yearButton': {
            marginTop: '3px',
            marginBottom: '3px',
            gontWeight: 400,
            fontSize: '14px',
            lineHeight: '14px',
            color: 'var(-color-light-7)',
            border: '1px solid transparent',
            padding: '8px 16px',
            height: '32px',
            width: '68px',
            '&:hover': {
                borderRadius: '8px',
                transition: 'none',
                background: 'var(--color-primary-3)',
                color: 'var(--color-light-7)',
            },
            '&.Mui-selected': {
                color: 'var(--color-light-1)',
                backgroundColor: 'var(--color-primary-1)',
                borderRadius: '8px',
            },
            '&.Mui-disabled': {
                color: 'var(--color-light-3)',
            },
        },
    },

    '.MuiPickersDay-root': {
        color: 'var(--color-light-7)',
        borderRadius: '8px',
        fontWeight: 400,
        fontSize: '14px',
        '&:focus': {
            background: 'transparent !important',
        },
        '&:hover': {
            border: 'none',
            borderRadius: '8px',
            transition: 'none',
            background: 'var(--color-primary-3) !important',
            color: 'var(--color-light-7) !important',
        },
        '&.Mui-selected': {
            background: 'var(--color-primary-1) !important',
            color: 'var(--color-light-1) !important',

            '&:hover': {
                background: 'var(--color-primary-3) !important',
                color: 'var(--color-light-7) !important',
            },
        },
        '&.Mui-disabled': {
            color: 'var(--color-secondary-4) ',
        },
        '&.MuiPickersDay-today': {
            backgroundColor: 'transparent',
            border: '1px solid var(--color-primary-1)',
            // color: 'var(--color-light-7) !important',

            '&:hover': {
                border: 'none !important',
            },
        },
    },
};

// render selected start date style in end date picker
const ModifiedPickerDay = styled(PickersDay, {
    shouldForwardProp: (prop) => prop !== 'selectedStartDate' && prop !== 'minDate' && prop !== 'endDate',
})<ModifiedPickerDayProps>(({ selectedStartDate, minDate, endDate }) => {
    const convertedSelectedStartDate = validateDate(convertToDate(selectedStartDate));
    const convertedMinDate = validateDate(convertToDate(minDate));
    const convertedEndDate = validateDate(convertToDate(endDate));

    return {
        ...(convertedSelectedStartDate &&
            convertedMinDate &&
            convertedEndDate && {
                borderTopRightRadius:
                    selectedStartDate && endDate && isSameDay(convertedSelectedStartDate as Date, convertedEndDate as Date)
                        ? '8px !important'
                        : '0px !important',
                borderBottomRightRadius:
                    selectedStartDate && endDate && isSameDay(convertedSelectedStartDate as Date, convertedEndDate as Date)
                        ? '8px !important'
                        : '0px !important',
            }),
        backgroundColor: 'var(--color-primary-1) !important',
        color: 'var(--color-light-1) !important',
    };
}) as ComponentType<ModifiedPickerDayProps>;

const CustomPickersDay = styled(PickersDay, {
    shouldForwardProp: (prop) => prop !== 'dayIsBetween' && prop !== 'isFirstDay' && prop !== 'isLastDay',
})<CustomPickerDayProps>((params) => {
    const { dayIsBetween, isFirstDay, isLastDay } = params;
    return {
        color: 'var(--color-light-7)',
        borderRadius: '8px',
        fontWeight: '400 !important',
        fontSize: '14px',

        '&:hover': {
            transition: 'none',
            background: 'var(--color-primary-3)',
            color: 'var(--color-light-7) !important',
            border: 'none !important',
        },
        '&.Mui-disabled': {
            color: 'var(--color-secondary-4)',
        },
        '&.MuiPickersDay-today': {
            backgroundColor: 'transparent',
            border: '1px solid var(--color-primary-1)',
            color: dayIsBetween || isFirstDay || isLastDay ? 'var(--color-light-1) !important' : 'var(--color-light-7) !important',

            '&:hover': {
                border: 'none !important',
            },
        },
        ...(dayIsBetween && {
            borderRadius: '0px !important',
            backgroundColor: 'var(--color-primary-1) !important',
            color: 'var(--color-light-1) !important',
            '&:hover': {
                backgroundColor: 'var(--color-primary-3) !important',
                border: 'none !important',
            },
            '&.MuiPickersDay-today': {
                border: 'none',
                color: 'var(--color-light-1) !important',

                '&:hover': {
                    backgroundColor: 'var(--color-primary-3) !important',
                },
            },
        }),
        ...((isFirstDay || isLastDay) && {
            margin: 0,
            background: 'var(--color-primary-1)',
            color: 'var(--color-light-1) !important',
            '&:hover, &:focus': {
                backgroundColor: 'var(--color-primary-3) !important',
                border: 'none !important',
            },
            '&.Mui-selected': {
                background: 'var(--color-primary-1)',
            },
        }),
        ...(isFirstDay && {
            borderRadius: 0,
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
        }),
        ...(isLastDay && {
            borderRadius: '0px !important',
            borderTopRightRadius: '8px !important',
            borderBottomRightRadius: '8px !important',
        }),
    };
}) as ComponentType<CustomPickerDayProps>;

const convertToDate = (date: Date | Dayjs | null | undefined) => {
    if (date) {
        if (dayjs.isDayjs(date)) {
            return date.toDate();
        }
        return date;
    }
    return date;
};

const DatePickerSelect: FC<DatePickerSelectTypes> = (props) => {
    const { showClear, value, minDate, startDate, isOutOfRange } = props;
    const [view, setView] = useState<DateView>('day');

    const { setValue, clearErrors } = useFormContext();
    const renderSelectedDates = (params: PickersDayProps<Dayjs> & { selectedDates?: DateRangeValue }) => {
        const { day, selectedDates, ...restProps } = params;
        const start = validateDate(convertToDate(minDate));
        const end = validateDate(convertToDate(value));
        const convertedDay = validateDate(convertToDate(day));

        if (!start || !end) {
            return <CustomPickersDay day={day} {...restProps} />;
        }
        if (start && end && isBefore(end, start)) {
            return <CustomPickersDay day={day} {...restProps} />;
        }

        // only render start date in end date picker
        // if (startDate && isSameDay(day.toDate(), startDate)) {
        if (startDate && isSameDay(convertedDay as Date, startDate)) {
            return (
                <ModifiedPickerDay
                    day={day}
                    disableMargin
                    {...restProps}
                    selectedStartDate={dayjs(startDate)}
                    {...(value && startDate && { endDate: dayjs(end) })}
                    {...(minDate && { minDate: minDate })}
                />
            );
        }

        if (!value || !minDate) {
            return <PickersDay day={day} disableMargin {...restProps} />;
        }

        // Check for valid input date
        if (!day.isValid()) {
            return <PickersDay day={day} disableMargin {...restProps} />;
        }
        const dayIsBetween = isWithinInterval(convertedDay as Date, { start: start, end: end });
        const isFirstDay = isSameDay(convertedDay as Date, start);
        const isLastDay = isSameDay(convertedDay as Date, end);

        return (
            <>
                <CustomPickersDay
                    {...restProps}
                    day={day}
                    disableMargin
                    dayIsBetween={dayIsBetween}
                    isFirstDay={isFirstDay}
                    isLastDay={isLastDay}
                />
            </>
        );
    };

    return (
        <>
            <FieldDatePicker
                {...props}
                disablePast
                value={value}
                onViewChange={(newView) => setView(newView)}
                onOpen={() => {
                    if (isOutOfRange) {
                        setValue('start_datetime', new Date());
                        setValue('end_datetime', null);
                        clearErrors(['start_datetime', 'end_datetime']);
                    }
                }}
                slots={{
                    day: renderSelectedDates,
                    actionBar: showClear && view === 'day' ? CustomActionBar : BlankActionBar,
                }}
                slotProps={{
                    field: {
                        fullWidth: true,
                        sx: {
                            minWidth: '100%',
                        },
                    } as any,
                    ...(showClear &&
                        view === 'day' && {
                            actionBar: {
                                actions: ['clear', 'today'],
                            },
                        }),
                    mobilePaper: {
                        sx: paperSx,
                    },
                    desktopPaper: {
                        sx: paperSx,
                    },
                    popper: {
                        sx: popperSx,
                    },
                    layout: {
                        sx: {
                            display: 'flex',
                            flexDirection: 'column',
                        },
                    },
                }}
            />
        </>
    );
};

export default DatePickerSelect;
