import React from 'react';
import { useTranslation } from 'react-i18next';

import useAccess from '@/hooks/useAccess';

import styles from './index.module.scss';

type Order = 'asc' | 'desc' | '';

interface EnhancedTableProps {
    onRequestSort: (event: React.MouseEvent<unknown>, property: keyof API.BoardField) => void;
    order: Order;
    orderBy: string | undefined;
    isNested?: boolean;
    isDocumentAIRoute?: boolean;
}

// Inline "AI" layout header: plain (non-sortable) labels spanning the grid.
// A leading empty cell aligns the headers with the in-flow drag-handle column in each row.
const EnhancedTableHead = (_props: EnhancedTableProps) => {
    const { t } = useTranslation();
    const { isAdmin } = useAccess();
    const canEditBoard = isAdmin();

    const aiHeadCells = [
        '',
        t('databoard_attribute_name'),
        t('databoard_ai_logic'),
        t('databoard_extraction_prompt'),
        '',
    ];

    return (
        <div
            className={`${styles.tableRow} ${styles.tableHeader} ${styles.aiLayout}`}
            style={!canEditBoard ? { top: 0 } : undefined}
        >
            {aiHeadCells.map((label, idx) => (
                <div key={idx} className={`${styles.cell} ${idx === aiHeadCells.length - 1 ? styles.kebabCell : ''}`}>
                    {label}
                </div>
            ))}
        </div>
    );
};

export default EnhancedTableHead;
