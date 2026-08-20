// import { useTranslation } from 'react-i18next';
import { Icon } from '@imbrace/ui';
import { TableSortLabel } from '@mui/material';
import React from 'react';

import styles from './index.module.scss';

// export type HeadCellId = 'index' | 'firstName' | 'lastName' | 'teamRole' | 'email' | undefined;
interface HeadCell {
    id: keyof API.User;
    label: string;
}
type Order = 'asc' | 'desc' | '';

interface EnhancedTableProps {
    onRequestSort: (event: React.MouseEvent<unknown>, property: keyof API.User) => void;
    order: Order;
    orderBy: string | undefined;
}

const EnhancedTableHead = (props: EnhancedTableProps) => {
    // const { t } = useTranslation();
    const { order, orderBy, onRequestSort } = props;
    const createSortHandler = (property: keyof API.User) => (event: React.MouseEvent<unknown>) => {
        onRequestSort(event, property);
    };

    const headCells: HeadCell[] = [
        {
            id: 'first_name',
            label: 'First Name',
        },
        {
            id: 'last_name',
            label: 'Last Name',
        },
        {
            id: 'role',
            label: 'Team Role',
        },
        {
            id: 'email',
            label: 'Email',
        },
    ];

    return (
        <div className={`${styles.tableRow} ${styles.tableHeader}`}>
            <div />
            {headCells.map((headCell) => (
                <div key={headCell.id}>
                    <TableSortLabel
                        IconComponent={() => (
                            <Icon
                                name="sort"
                                namespace="twoTone"
                                primaryColor={orderBy === headCell.id && order === 'desc' ? 'var(--color-primary-1)' : 'currentColor'}
                                secondaryColor={orderBy === headCell.id && order === 'asc' ? 'var(--color-primary-1)' : 'currentColor'}
                            />
                        )}
                        hideSortIcon={false}
                        active={orderBy === headCell.id}
                        // direction={orderBy === headCell.id ? order : 'asc'}
                        onClick={createSortHandler(headCell.id)}
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
            <div />
        </div>
    );
};

export default EnhancedTableHead;
