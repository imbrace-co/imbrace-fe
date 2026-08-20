import { Button, Dropdown, FieldDatePicker, FieldDateRangePicker, FieldSelect, Icon, IconButton, Space, Typography } from '@imbrace/ui';
import { Box, Popover } from '@mui/material';
import { styled } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useTranslation } from 'react-i18next';

import { queryClient } from '@/App';
import type { FilterValue } from '@/components/FlexibleTable/filterPopover';
import { DateOperatorOptions, SelectionOperatorOptions, TextOperatorOptions } from '@/components/FlexibleTable/filterPopover';
import type { ColumnValue } from '@/components/FlexibleTable/types';
import type { FilterValueObj } from '@/pages/Credentials/components/filterFields';
import { formatCredentialName } from '@/utils/StringHelper';

const FilterContainer = styled('div')(() => {
    return {
        width: '368px',
        padding: '12px 24px 24px 24px',
        boxShadow: '0px 0px 4px rgba(224, 224, 224, 0.88), 0px 16px 24px rgba(224, 224, 224, 0.2)',
        borderRadius: '4px',
        background: 'white',
    };
});

const FilterPopover = ({
    anchorEl,
    handleClose,
    title,
    filterTypesArr,
    initialValue,
    setFilterValues,
    selectedValues,
}: {
    anchorEl?: HTMLElement;
    handleClose: () => void;
    title: string;
    initialValue?: FilterValue;
    filterTypesArr?: string[];
    setFilterValues: Dispatch<SetStateAction<FilterValueObj[]>>;
    selectedValues?: ColumnValue;
}) => {
    const { t } = useTranslation();
    const open = Boolean(anchorEl);
    const [selectedFilter, setSelectedFilter] = useState<ColumnValue | undefined>(selectedValues);
    const [operator, setOperator] = useState<API.Operator>(initialValue?.operator ?? 'is');

    const typeOptions = useMemo(() => {
        if (!filterTypesArr) return [];
        return filterTypesArr.map((item) => ({
            value: item,
            text: formatCredentialName(item),
        }));
    }, [filterTypesArr]);

    const operatorsOptions = useMemo(() => {
        if (title === 'Updated') {
            return DateOperatorOptions(t);
        }
        if (title === 'Type') {
            return SelectionOperatorOptions(t).filter((o) => o.index !== 'is_empty' && o.index !== 'is_not_empty');
        }
        return TextOperatorOptions(t);
    }, [title, t]);

    const renderField = () => {
        if (title === 'Updated') {
            if (operator === 'is_between') {
                return (
                    <FieldDateRangePicker
                        onChange={(v) => {
                            setSelectedFilter(v || null);
                        }}
                        fullWidth
                        value={(Array.isArray(selectedFilter) ? selectedFilter : []) as [Date, Date]}
                        datePickerProps={{
                            start: {
                                customIcon: (pickerOpen) => (
                                    <Icon style={{ color: 'var(--color-light-4)' }} name={pickerOpen ? 'dropUp' : 'dropDown'} />
                                ),
                            },
                            end: {
                                customIcon: (pickerOpen) => (
                                    <Icon style={{ color: 'var(--color-light-4)' }} name={pickerOpen ? 'dropUp' : 'dropDown'} />
                                ),
                            },
                        }}
                    />
                );
            }
            return (
                <Box sx={{ width: '100%' }}>
                    <FieldDatePicker
                        fullWidth
                        sx={{
                            minWidth: 'auto',
                            width: '100%',
                            '& .MuiInputBase-input': { padding: '8.5px 11px' },
                            height: '38px',
                            background: 'white',
                        }}
                        formControlSx={{
                            width: '100%',
                            minWidth: 'auto',
                        }}
                        value={selectedFilter ? new Date(selectedFilter as string | number) : null}
                        onChange={(date) => {
                            setSelectedFilter(date);
                        }}
                        customIcon={(isOpen) => <Icon style={{ color: 'var(--color-light-4)' }} name={isOpen ? 'dropUp' : 'dropDown'} />}
                        slotProps={{
                            field: {
                                sx: {
                                    width: '100%',
                                    minWidth: 'auto',
                                    '& .MuiInputAdornment-root': {
                                        marginLeft: 0,
                                    },
                                    '.MuiIconButton-root': {
                                        width: '28px !important',
                                        height: '28px !important',
                                        '& svg': {
                                            fontSize: 20,
                                        },
                                    },
                                },
                            } as any,
                            openPickerButton: {
                                disabled: true,
                            },
                        }}
                        placeholder={'MM/DD/YYYY'}
                    />
                </Box>
            );
        }
        if (title === 'Type') {
            return (
                <FieldSelect
                    queryKey={['filterTypes', { typeOptions }]}
                    fullWidth
                    request={() => typeOptions}
                    value={selectedFilter as (string | number)[]}
                    customIcon={(isOpen) => {
                        if (Array.isArray(selectedFilter) && selectedFilter.length > 0) {
                            return (
                                <IconButton
                                    variant="text"
                                    type="secondary"
                                    size="xs"
                                    onClick={() => {
                                        setSelectedFilter([]);
                                    }}
                                >
                                    <Icon name="close" fontSize={20} />
                                </IconButton>
                            );
                        }
                        return (
                            <Icon
                                name="add"
                                fontSize={20}
                                style={{
                                    display: isOpen ? 'none' : undefined,
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                    color: 'var(--color-light-4)',
                                }}
                            />
                        );
                    }}
                    multiple
                    closeOnSelect={false}
                    displayType="chip"
                    menuType="chip"
                    chipWrap
                    onChange={(selectedTypes) => {
                        setSelectedFilter(selectedTypes as string[]);
                    }}
                />
            );
        }
    };

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
            <FilterContainer>
                <Space size={12} direction="vertical">
                    <Box
                        sx={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',

                            '> svg': {
                                fontSize: '20px',
                                color: 'var(--color-secondary-3)',
                            },
                        }}
                    >
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
                                }}
                            />
                        </Space>
                    </Box>
                    <Space size={12} style={{ width: '100%' }}>
                        {renderField()}
                    </Space>
                    <Space justify="end" style={{ width: '100%' }}>
                        <Button
                            size="xxs"
                            text={t('apply')}
                            onClick={() => {
                                setFilterValues((prev) => {
                                    if (
                                        !selectedFilter ||
                                        (selectedFilter &&
                                            Array.isArray(selectedFilter) &&
                                            selectedFilter.length === 0 &&
                                            prev.some((item) => item.type === title))
                                    ) {
                                        return prev.filter((item) => item.type !== title);
                                    }

                                    if (prev.some((item) => item.type === title)) {
                                        return prev.map((item) => {
                                            if (item.type === title) {
                                                return {
                                                    type: title,
                                                    operator: operator,
                                                    value: selectedFilter,
                                                };
                                            }
                                            return item;
                                        });
                                    }

                                    return [...prev, { type: title, operator: operator, value: selectedFilter }];
                                });

                                handleClose();
                            }}
                        />
                    </Space>
                </Space>
            </FilterContainer>
        </Popover>
    );
};

const FilterPopoverHOC = ({
    onClose,
    anchorEl,
    ...restProps
}: {
    anchorEl: HTMLElement;
    title: string;
    initialValue?: FilterValue;
    onClose?: () => void;
    filterTypesArr?: string[];
    setFilterValues: Dispatch<SetStateAction<FilterValueObj[]>>;
    selectedValues?: ColumnValue;
}) => {
    const [open, setOpen] = useState<HTMLElement | undefined>(anchorEl);
    const client = useQueryClient(queryClient);

    return (
        <QueryClientProvider client={client}>
            <FilterPopover
                {...restProps}
                anchorEl={open}
                handleClose={() => {
                    setOpen(undefined);
                    onClose?.();
                }}
                filterTypesArr={restProps.filterTypesArr}
            />
        </QueryClientProvider>
    );
};
export const openFilterPopover = (props: {
    anchorEl: HTMLElement;
    title: string;
    initialValue?: FilterValue;
    onClose?: () => void;
    filterTypesArr?: string[];
    setFilterValues: Dispatch<SetStateAction<FilterValueObj[]>>;
    selectedValues?: ColumnValue;
}) => {
    const fragment = document.createDocumentFragment();
    const root = createRoot(fragment);
    return root.render(
        createPortal(
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <FilterPopoverHOC {...props} />
            </LocalizationProvider>,
            document.body,
        ),
    );
};
