import { TableSortLabel } from '@mui/material';
import styles from './index.module.scss';
import { Icon } from '@imbrace/ui';
import SortIcon from '@/components/FlexibleTable/sort';
import { useTranslation } from 'react-i18next';

interface HeadCell {
    id: string;
    label: string;
}

type Order = 'asc' | 'desc';

interface EnhancedTableProps {
    onRequestSort: (event: React.MouseEvent<unknown>, property: keyof API.WorkflowListItem) => void;
    order: Order;
    orderBy: string;
}

const EnhancedTableHead = (props: EnhancedTableProps) => {
    const { order, orderBy, onRequestSort } = props;
    const { t } = useTranslation();

    const createSortHandler = (property: keyof API.WorkflowListItem) => (event: React.MouseEvent<unknown>) => {
        onRequestSort(event, property);
    };

    const headCells: HeadCell[] = [
        {
            id: 'name',
            label: t('ai_assistant_management_behavior_setting_list_of_functions_title'),
        },
    ];

    return (
        <div
            className={`${styles.tableRow} ${styles.tableHeader}`}
            style={{
                height: '64px',
            }}
        >
            {headCells.map((headCell) => (
                <div key={headCell.id} className={styles.cell}>
                    <TableSortLabel
                        IconComponent={() => (
                            <SortIcon
                                primaryColor={order === 'desc' ? 'var(--color-primary-1)' : 'currentColor'}
                                secondaryColor={order === 'asc' ? 'var(--color-primary-1)' : 'currentColor'}
                            />
                        )}
                        hideSortIcon={false}
                        active={orderBy === headCell.id}
                        direction={orderBy === headCell.id ? order : 'asc'}
                        onClick={createSortHandler(headCell.id as keyof API.WorkflowListItem)}
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
