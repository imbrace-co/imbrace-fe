import { Checkbox, FieldSwitch, Icon, IconButton, Space, Tooltip, Typography } from '@imbrace/ui';
import clsx from 'clsx';
import { useRef } from 'react';

import styles from './index.module.scss';


const TableRow = ({
    item,
    onSelect,
    index,
    isSelected,
}: {
    item: API.WorkflowListItem;
    onSelect: (val: { id: string | number; name: string; description: string }) => void;
    index: number;
    isSelected: boolean;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    if (!item) {
        return <></>;
    }
    return (
        <>
            <div
                onClick={() =>
                    onSelect({
                        id: item.id,
                        name: item.name || '',
                        description: item.settings?.ai?.function?.description || '',
                    })
                }
                className={`${styles.tableRow} ${index % 2 !== 0 ? styles.evenBackground : ''} ${isSelected ? styles.selected : ''}`}
                ref={containerRef}
            >
                <Space className={styles.cell} size={4}>
                    <Space direction="vertical" align="start" style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                        <Typography
                            variant="BodyBold"
                            style={{
                                textDecoration: 'underline',
                                width: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {item.name}
                        </Typography>
                        <Typography
                            style={{
                                color: '#828282',
                                width: '100%',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'break-word',
                            }}
                        >
                            {item.settings?.ai?.function?.description}
                        </Typography>
                    </Space>
                </Space>
            </div>
        </>
    );
};

export default TableRow;
