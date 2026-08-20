import { EllipsisText, Icon, Space, Typography } from '@imbrace/ui';
import { Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useState } from 'react';
// @ts-ignore
import type { TFunction } from 'react-i18next';
import { useTranslation } from 'react-i18next';

import type { FilterValue } from '@/components/FlexibleTable/filterPopover';
import { formatDate } from '@/components/FlexibleTable/utils';
import { formatCredentialName } from '@/utils/StringHelper';

import { openFilterPopover } from './filterPopover';

const StyledField = styled('div')(() => {
    return {
        minWidth: '160px',
        height: '40px',
        padding: '8px 8px 8px 12px',
        borderRadius: '4px',
        border: '1px solid var(--color-light-3)',
        color: 'var(--color-light-4)',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        cursor: 'pointer',
        '&:hover': {
            borderColor: 'var(--color-primary-1)',
        },
        '> div': {
            display: 'flex',
        },
    };
});

interface FilterFieldsProps {
    headerText: string;
    filterTypesArr?: string[];
    setFilterValues: Dispatch<SetStateAction<FilterValueObj[]>>;
    filterValues: FilterValueObj[];
}

export interface FilterValueObj extends FilterValue {
    type: string;
}

const renderOperator = (t: TFunction<'translation', undefined>, operator?: string) => {
    switch (operator) {
        case 'is_not': {
            return t('is_not');
        }
        case 'is_before': {
            return t('is_before');
        }
        case 'is_after': {
            return t('is_after');
        }
        case 'is_before_and_on': {
            return t('is_before_and_on');
        }
        case 'is_after_and_on': {
            return t('is_after_and_on');
        }
        case 'is_between': {
            return t('is_between');
        }
        default: {
            return '';
        }
    }
};

const FilterFields = (props: FilterFieldsProps) => {
    const { headerText, filterTypesArr, filterValues, setFilterValues } = props;
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const filterValue = useMemo(() => {
        const result = filterValues.find((item) => item.type === headerText);
        return result ?? undefined;
    }, [filterValues, headerText]);

    const renderLabel = () => {
        const displayValue = Array.isArray(filterValue?.value)
            ? filterValue.value.map((item) => formatCredentialName(item as string)).join(', ')
            : filterValue?.value;

        if (filterValue?.operator === 'not_contains') {
            return <EllipsisText text={`${headerText}: Not Contains ${displayValue}`} />;
        }

        return <EllipsisText text={`${t('credentials_table_header_type')}: ${displayValue}`} />;
    };

    const renderDateLabel = () => {
        if (filterValue?.operator === 'is_between' && Array.isArray(filterValue?.value) && filterValue?.value.length !== 0) {
            const displayValue = `${formatDate({
                columnValue: filterValue?.value[0] as Date,
                dateFormat: 'MM/dd/yyyy',
            })} - ${formatDate({
                columnValue: filterValue?.value[1] as Date,
                dateFormat: 'MM/dd/yyyy',
            })}`;
            return <EllipsisText text={`${headerText}: ${renderOperator(t, filterValue?.operator)} ${displayValue}`} />;
        }

        const label = formatDate({ columnValue: filterValue?.value, dateFormat: 'MM/dd/yyyy' });
        return <EllipsisText text={`${headerText}: ${renderOperator(t, filterValue?.operator)} ${label}`} />;
    };

    // Updated Chip
    if (filterValue && filterValue.type === 'Updated') {
        return (
            <Chip
                label={renderDateLabel()}
                sx={{
                    maxWidth: '280px',
                    background: 'var(--color-primary-3)',
                    padding: '8px 12px 8px 12px',
                    borderRadius: '4px',
                    height: '40px',
                    gap: '4px',
                    cursor: 'pointer',
                    '&:hover': {
                        background: 'var(--color-primary-5)',
                    },
                    '&:active': {
                        boxShadow: 'none',
                    },
                    '& .MuiChip-deleteIcon': {
                        margin: 0,
                        display: 'flex',
                    },
                    '& .MuiChip-label': {
                        fontSize: 14,
                        lineHeight: '16px',
                        padding: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        WebkitLineClamp: 2,
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                    },
                    '&.Mui-disabled': {
                        opacity: 1,
                        background: 'var(--color-primary-8)',
                        pointerEvents: 'initial',
                    },
                }}
                onClick={(e) => {
                    setOpen(true);
                    openFilterPopover({
                        title: headerText,
                        anchorEl: e.currentTarget,
                        onClose: () => {
                            setOpen(false);
                        },
                        filterTypesArr,
                        initialValue: filterValue,
                        setFilterValues,
                        selectedValues: filterValue.value,
                    });
                }}
            />
        );
    }

    // Type Chip
    if (filterValue && Array.isArray(filterValue?.value) && filterValue?.value?.length > 0) {
        return (
            <Chip
                label={renderLabel()}
                sx={{
                    maxWidth: '280px',
                    background: 'var(--color-primary-3)',
                    padding: '8px 12px 8px 12px',
                    borderRadius: '4px',
                    height: '40px',
                    gap: '4px',
                    cursor: 'pointer',
                    '&:hover': {
                        background: 'var(--color-primary-5)',
                    },
                    '&:active': {
                        boxShadow: 'none',
                    },
                    '& .MuiChip-deleteIcon': {
                        margin: 0,
                        display: 'flex',
                    },
                    '& .MuiChip-label': {
                        fontSize: 14,
                        lineHeight: '16px',
                        padding: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        WebkitLineClamp: 2,
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                    },
                    '&.Mui-disabled': {
                        opacity: 1,
                        background: 'var(--color-primary-8)',
                        pointerEvents: 'initial',
                    },
                }}
                onClick={(e) => {
                    setOpen(true);
                    openFilterPopover({
                        title: headerText,
                        anchorEl: e.currentTarget,
                        onClose: () => {
                            setOpen(false);
                        },
                        filterTypesArr,
                        initialValue: filterValue,
                        setFilterValues,
                        selectedValues: filterValue.value,
                    });
                }}
            />
        );
    }

    return (
        <StyledField
            onClick={(e) => {
                setOpen(true);
                openFilterPopover({
                    title: headerText,
                    anchorEl: e.currentTarget,
                    onClose: () => {
                        setOpen(false);
                    },
                    filterTypesArr,
                    initialValue: {
                        operator: headerText === 'Type' ? 'contains' : headerText === 'Updated' ? 'is' : undefined,
                        value: headerText === 'Type' ? [] : headerText === 'Updated' ? 'exactly' : '',
                    },
                    setFilterValues,
                    selectedValues: filterValue?.value,
                });
            }}
        >
            <Space size={12} style={{ flex: 1 }}>
                <Typography>
                    {headerText === 'Type' ? t('credentials_table_header_type') : t('credentials_table_header_updated_at')}
                </Typography>
            </Space>
            <div>
                <Icon name={open ? 'dropUp' : 'dropDown'} style={{ fontSize: 24 }} />
            </div>
        </StyledField>
    );
};

export default FilterFields;
