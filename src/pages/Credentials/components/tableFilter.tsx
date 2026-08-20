import { Button, Icon, Space, Typography } from '@imbrace/ui';
import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import type { FilterValueObj } from './filterFields';
import FilterFields from './filterFields';

interface TableFilterProps {
    open: boolean;
    filterTypesArr: string[];
    setFilterValues: Dispatch<SetStateAction<FilterValueObj[]>>;
    filterValues: FilterValueObj[];
}

const TableFilter = (props: TableFilterProps) => {
    const { open, filterTypesArr, filterValues, setFilterValues } = props;
    const { t } = useTranslation();

    if (!open) {
        return null;
    }

    return (
        <Space size={12} align="center" style={{ margin: '8px 0', padding: '4px' }}>
            <Icon name="filter" fontSize={20} style={{ color: 'var(--color-light-5)' }} />
            <Typography style={{ color: 'var(--color-light-5)' }}>{t('filter')}</Typography>
            <Space size={12}>
                <FilterFields
                    headerText="Type"
                    filterTypesArr={filterTypesArr}
                    filterValues={filterValues}
                    setFilterValues={setFilterValues}
                />
                <FilterFields headerText="Updated" filterValues={filterValues} setFilterValues={setFilterValues} />
                <Button
                    variant="link"
                    size="xs"
                    text={t('clear_all')}
                    sx={{
                        textTransform: 'initial',
                        whiteSpace: 'nowrap',
                    }}
                    onClick={() => {
                        setFilterValues(() => []);
                    }}
                />
            </Space>
        </Space>
    );
};

export default TableFilter;
