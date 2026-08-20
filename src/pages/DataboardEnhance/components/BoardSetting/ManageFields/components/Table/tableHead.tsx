import { Icon } from '@imbrace/ui';
import { TableSortLabel } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

import useAccess from '@/hooks/useAccess';

import styles from './index.module.scss';
interface HeadCell {
    id: keyof API.BoardField | 'operation';
    label: string;
    sortable?: boolean;
}
type Order = 'asc' | 'desc' | '';

interface EnhancedTableProps {
    onRequestSort: (event: React.MouseEvent<unknown>, property: keyof API.BoardField) => void;
    order: Order;
    orderBy: string | undefined;
}

const EnhancedTableHead = (props: EnhancedTableProps) => {
    const { t } = useTranslation();
    const { order, orderBy, onRequestSort } = props;

    const { isAdmin } = useAccess();
    const createSortHandler = (property: keyof API.BoardField) => (event: React.MouseEvent<unknown>) => {
        onRequestSort(event, property);
    };

    const headCells: HeadCell[] = [
        {
            id: 'name',
            label: t('fields_management_table_header_name'),
            sortable: false,
        },
        {
            id: 'type',
            label: t('fields_management_table_header_type'),
            sortable: false,
        },
        { id: 'operation', label: '', sortable: false },
    ];

    return (
        <div className={`${styles.tableRow} ${styles.tableHeader}`} style={!isAdmin() ? { top: 0 } : undefined}>
            {headCells.map((headCell) => (
                <div key={headCell.id} className={styles.cell}>
                    <TableSortLabel
                        IconComponent={() => (
                            <Icon
                                name="sort"
                                namespace="twoTone"
                                primaryColor={orderBy === headCell.id && order === 'desc' ? 'var(--color-primary-1)' : 'currentColor'}
                                secondaryColor={orderBy === headCell.id && order === 'asc' ? 'var(--color-primary-1)' : 'currentColor'}
                            />
                        )}
                        hideSortIcon={!headCell.sortable}
                        active={orderBy === headCell.id}
                        disabled={!headCell.sortable}
                        // direction={orderBy === headCell.id ? order : 'asc'}
                        onClick={createSortHandler(headCell.id as keyof API.BoardField)}
                        sx={{
                            flexDirection: 'row',
                            '& svg': { opacity: 1, marginLeft: '4px', fontSize: 24, color: 'var(--color-light-5)' },
                            '&.Mui-active': { color: 'var(--color-light-7)' },
                        }}
                    >
                        {headCell.label}
                    </TableSortLabel>
                </div>
            ))}
        </div>
    );
};

export default EnhancedTableHead;
