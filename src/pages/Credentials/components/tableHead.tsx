import { Icon } from '@imbrace/ui';
import { TableSortLabel } from '@mui/material';
import { useTranslation } from 'react-i18next';

import styles from '../index.module.scss';
interface HeadCell {
    disablePadding: boolean;
    id: keyof API.Credential;
    label: string;
    numeric: boolean;
    width: string;
}
type Order = 'asc' | 'desc';

interface EnhancedTableProps {
    onRequestSort: (event: React.MouseEvent<unknown>, property: keyof API.Credential) => void;
    order: Order;
    orderBy: string;
}

const EnhancedTableHead = (props: EnhancedTableProps) => {
    const { t } = useTranslation();
    const { order, orderBy, onRequestSort } = props;
    const createSortHandler = (property: keyof API.Credential) => (event: React.MouseEvent<unknown>) => {
        onRequestSort(event, property);
    };

    const headCells: HeadCell[] = [
        {
            id: 'name',
            numeric: false,
            disablePadding: true,
            label: t('credentials_table_header_name'),
            width: '50%',
        },
        {
            id: 'type',
            numeric: false,
            disablePadding: true,
            label: t('credentials_table_header_type'),
            width: '20%',
        },
        {
            id: 'updatedAt',
            numeric: true,
            disablePadding: true,
            label: t('credentials_table_header_updated_at'),
            width: '20%',
        },
    ];

    return (
        <div className={`${styles.tableRow} ${styles.tableHeader}`}>
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
                        direction={orderBy === headCell.id ? order : 'asc'}
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
            <div></div>
        </div>
    );
};

export default EnhancedTableHead;
