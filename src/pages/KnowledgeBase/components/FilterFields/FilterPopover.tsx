import type { Option } from '@imbrace/ui';
import { Button, Dropdown, FieldNumber, FieldSelect, Icon, IconButton, Space, Tooltip, Typography } from '@imbrace/ui';
import { Popover } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useTranslation } from 'react-i18next';

import { queryClient } from '@/App';
import Fields from '@/components/FlexibleTable/fields';
import {
    DateOperatorOptions,
    NumberOperatorOptions,
    SelectionOperatorOptions,
    TextOperatorOptions,
    TimeOperatorOptions,
} from '@/components/FlexibleTable/filterPopover';
import styles from '@/components/FlexibleTable/index.module.scss';
import type { ColumnType, ColumnValue, FieldType } from '@/components/FlexibleTable/types';

export type FilterValue = {
    operator?: API.Operator;
    value?: ColumnValue;
    condition?: 'and' | 'or';
};

const FilterPopover = <D extends { id: string }>({
    anchorEl,
    handleClose,
    title,
    type = 'ShortText',
    initialValue,
    valueEnum,
    onFilter,
    column,
}: // request,
{
    column: ColumnDef<D, ColumnValue> & ColumnType;
    anchorEl?: HTMLElement;
    handleClose: () => void;
    title: string | ReactNode;
    type: FieldType;
    initialValue?: FilterValue;
    valueEnum?: Record<string | number, string>;
    onFilter: (value?: FilterValue) => Promise<void>;
    request?: () => Promise<Option[]>;
}) => {
    const { t } = useTranslation();
    const [value, setValue] = useState<ColumnValue | null>(initialValue?.value ?? '');
    const [operator, setOperator] = useState<API.Operator>(initialValue?.operator ?? 'is');
    const [errorTooltip, setErrorTooltip] = useState({
        open: false,
        message: '',
    });

    const open = Boolean(anchorEl);

    const fieldType = useMemo(() => {
        if (column.id === 'fileType') return 'MultipleSelection';
        if (column.id === 'updated_at') return 'Date';
        if (column.id === 'owner') return 'MultipleSelection';
        return type;
    }, [column.id, type]);

    const operatorsOptions = useMemo(() => {
        if (fieldType === 'Number') {
            return NumberOperatorOptions(t);
        }
        if (fieldType === 'Date') {
            return DateOperatorOptions(t);
        }
        if (fieldType === 'Datetime' || fieldType === 'Time') {
            return TimeOperatorOptions(t);
        }
        if (fieldType === 'MultipleSelection' || fieldType === 'SingleSelection' || fieldType === 'Assignee' || fieldType === 'Priority') {
            return SelectionOperatorOptions(t);
        }
        return TextOperatorOptions(t);
    }, [fieldType, t]);

    useEffect(() => {
        if (initialValue?.operator && operatorsOptions.find((option) => option.index === initialValue?.operator)) {
            setOperator(initialValue?.operator);
        } else {
            setOperator(operatorsOptions[0].index);
        }
    }, [operatorsOptions, initialValue?.operator]);

    const renderRelativeSelector = useCallback(() => {
        if (
            ['is_empty', 'is_not_empty', 'is_between', 'is_after_and_on', 'is_before_and_on'].indexOf(operator) === -1 &&
            fieldType === 'Date'
        ) {
            return (
                <FieldSelect
                    queryKey={['dataBoard', 'filter', 'relativeCondition', operator]}
                    value={((value as string[])?.[0] as string) ?? ''}
                    onChange={(selectedValue) => {
                        setValue(
                            (prev) =>
                                [
                                    selectedValue,
                                    (prev as string[])[0] === 'exactly' && selectedValue !== 'exactly'
                                        ? '1'
                                        : selectedValue === 'exactly'
                                        ? null
                                        : (prev as string[])[1],
                                    (prev as string[])[2] ?? 'day',
                                ] as string[],
                        );
                    }}
                    request={async () => {
                        return operator === 'is' || operator === 'is_not'
                            ? [
                                  { text: t('relative_exactly'), value: 'exactly' },
                                  { text: t('relative_last'), value: 'last' },
                                  { text: t('relative_next'), value: 'next' },
                                  { text: t('relative_empty'), value: 'empty' },
                              ]
                            : [
                                  { text: t('relative_exactly'), value: 'exactly' },
                                  { text: t('relative_last'), value: 'last' },
                                  { text: t('relative_next'), value: 'next' },
                              ];
                    }}
                    formControlSx={{
                        width: 100,
                        minWidth: 100,
                    }}
                    fullWidth
                />
            );
        }
        return null;
    }, [fieldType, value, operator, t]);

    const renderFields = useCallback(() => {
        if (['is_empty', 'is_not_empty', 'is_between'].indexOf(operator) === -1) {
            if (fieldType === 'Date') {
                if ((value as string[])[0] === 'empty') {
                    return null;
                }
                if ((value as string[])[0] === 'last' || (value as string[])[0] === 'next') {
                    return (
                        <>
                            <Tooltip open={errorTooltip.open} title={errorTooltip.message} disableFocusListener placement="top" arrow>
                                <div style={{ width: 52 }}>
                                    <FieldNumber
                                        value={(value as string[])[1]}
                                        onChange={(e, valid) => {
                                            if (valid) {
                                                setValue(
                                                    (prev) => [(prev as string[])[0], +e.target.value, (prev as string[])[2]] as string[],
                                                );
                                                setErrorTooltip((prev) => ({
                                                    ...prev,
                                                    open: false,
                                                }));
                                                return;
                                            }
                                            setErrorTooltip({
                                                open: true,
                                                message: t('crm_number_field_validation_tooltip'),
                                            });
                                        }}
                                        formControlSx={{
                                            width: 52,
                                            minWidth: 52,
                                        }}
                                        sx={{
                                            height: 38,
                                        }}
                                        fullWidth
                                        min={1}
                                    />
                                </div>
                            </Tooltip>

                            <FieldSelect
                                queryKey={['dataBoard', 'filter', (value as string[])[0], 'condition']}
                                value={(value as string[])[2]}
                                onChange={(selectedValue: any) => {
                                    setValue((prev) => [(prev as string[])[0], (prev as string[])[1], selectedValue] as string[]);
                                }}
                                request={async () => {
                                    return [
                                        { text: t('day_other'), value: 'day' },
                                        { text: t('week_other'), value: 'week' },
                                        { text: t('month_other'), value: 'month' },
                                        { text: t('year_other'), value: 'year' },
                                    ];
                                }}
                                formControlSx={{
                                    width: 100,
                                    minWidth: 100,
                                }}
                                fullWidth
                            />
                        </>
                    );
                }
                return (
                    <Fields
                        type={fieldType}
                        value={(value as string[])[1] ?? ''}
                        fieldProps={{
                            inputProps: {
                                autoFocus: false,
                            },
                        }}
                        onChange={(v) => {
                            setValue((prev) => [(prev as string[])[0], v] as string[]);
                        }}
                    />
                );
            }

            return (
                <Fields
                    type={fieldType}
                    value={fieldType === 'MultipleSelection' && typeof value === 'string' ? (value === '' ? [] : [value]) : value}
                    enum={valueEnum}
                    onChange={(v) => {
                        setValue(v);
                    }}
                    placeholder={''}
                    fieldProps={{
                        inputProps: {
                            autoFocus: false,
                        },

                        ...(fieldType === 'MultipleSelection' && {
                            sx: {
                                height: '100%',
                                maxHeight: 'auto',
                            },
                            selectProps: {
                                wrap: false,
                            },
                            allowOutOfRangeValue: true,
                            ...(Array.isArray(value) &&
                                value.length > 0 && {
                                    selectProps: {
                                        customIcon: () => (
                                            <IconButton
                                                variant="text"
                                                type="secondary"
                                                size="xs"
                                                sx={{
                                                    position: 'absolute',
                                                    right: '12px',
                                                    top: '7px',
                                                }}
                                                onClick={() => {
                                                    setValue([]);
                                                }}
                                            >
                                                <Icon name="close" fontSize={20} />
                                            </IconButton>
                                        ),
                                    },
                                }),
                        }),
                        ...((fieldType === 'SingleSelection' || fieldType === 'Assignee' || fieldType === 'Priority') && {
                            allowOutOfRangeValue: true,
                        }),
                        ...((fieldType === 'Assignee' || column.id === 'owner') && {
                            request: column.request,
                        }),
                        ...(fieldType === 'Assignee' &&
                            typeof value === 'object' &&
                            !Array.isArray(value) &&
                            value &&
                            !(value instanceof Date) && {
                                renderOutOfRangeValue: (selectedValue: string) => {
                                    return selectedValue === (value as unknown as API.AssigneeValue)._id
                                        ? (value as unknown as API.AssigneeValue).display_name
                                        : '';
                                },
                            }),
                    }}
                />
            );
        }
    }, [column.id, column.request, fieldType, operator, value, valueEnum, t, errorTooltip]);

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
            }}
            slotProps={{
                paper: {
                    sx: {
                        boxShadow: 'none',
                        overflow: 'visible',
                        background: 'transparent',
                    },
                },
            }}
        >
            <div className={styles.filterContainer}>
                <Space size={12} direction="vertical">
                    <div className={styles.header}>
                        <Space size={12} style={{ flex: 1 }}>
                            <Typography style={{ color: 'var(--color-light-5)' }}>{title}</Typography>
                            <Dropdown<API.Operator>
                                text={operatorsOptions.filter((o) => o.index === operator)?.[0]?.text}
                                variant="text"
                                hideOnSelect
                                typographyProps={{
                                    variant: 'Body',
                                    style: {
                                        color: 'var(--color-light-7)',
                                        textTransform: 'initial',
                                    },
                                }}
                                menuPaperProps={{
                                    sx: {
                                        width: '150px',
                                    },
                                }}
                                transformOrigin={{
                                    horizontal: 'center',
                                    vertical: 'top',
                                }}
                                anchorOrigin={{
                                    horizontal: 'center',
                                    vertical: 'bottom',
                                }}
                                selectedIndex={operator}
                                options={operatorsOptions}
                                onSelect={(e, selectedIndex) => {
                                    setOperator(selectedIndex);
                                    if (selectedIndex !== 'is' && selectedIndex !== 'is_not' && fieldType === 'Date') {
                                        if (
                                            (value as string[])[0] === 'empty' ||
                                            selectedIndex === 'is_after_and_on' ||
                                            selectedIndex === 'is_before_and_on'
                                        ) {
                                            setValue((prev) => ['exactly', (prev as string[])?.[1], (prev as string[])?.[2]] as string[]);
                                        }
                                    }
                                }}
                            />
                        </Space>
                    </div>
                    <Space size={12} style={{ width: '100%' }}>
                        {renderRelativeSelector()}
                        {renderFields()}
                        {/*{operator === 'is_between' && renderRangeComponent()}*/}
                    </Space>
                    <Space justify="end" style={{ width: '100%' }}>
                        <Button
                            size="xxs"
                            text={t('apply')}
                            onClick={() => {
                                onFilter({
                                    operator,
                                    value,
                                    condition: 'and',
                                });
                                handleClose();
                            }}
                        />
                    </Space>
                </Space>
            </div>
        </Popover>
    );
};

const FilterPopoverHOC = <D extends { id: string }>({
    onClose,
    anchorEl,
    ...restProps
}: {
    column: ColumnDef<D, ColumnValue> & ColumnType;
    anchorEl: HTMLElement;
    title: string | ReactNode;
    type: FieldType;
    initialValue?: FilterValue;
    valueEnum?: Record<string | number, string>;
    onFilter: (value?: FilterValue) => Promise<void>;
    onClose?: () => void;
    request?: () => Promise<Option[]>;
}) => {
    const [open, setOpen] = useState<HTMLElement | undefined>(anchorEl);
    return (
        <FilterPopover<D>
            {...restProps}
            anchorEl={open}
            handleClose={() => {
                setOpen(undefined);
                onClose?.();
            }}
        />
    );
};
export const openFilterPopover = <D extends { id: string }>(props: {
    column: ColumnDef<D, ColumnValue> & ColumnType;
    anchorEl: HTMLElement;
    title: string | ReactNode;
    type: FieldType;
    initialValue?: FilterValue;
    valueEnum?: Record<string | number, string>;
    onFilter: (value?: FilterValue) => Promise<void>;
    onClose?: () => void;
    currentFilterState?: ColumnFiltersState;
    request?: () => Promise<Option[]>;
}) => {
    const fragment = document.createDocumentFragment();
    const root = createRoot(fragment);

    return root.render(
        createPortal(
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <QueryClientProvider client={queryClient}>
                    <FilterPopoverHOC<D> {...props} />
                </QueryClientProvider>
            </LocalizationProvider>,
            document.body,
        ),
    );
};
