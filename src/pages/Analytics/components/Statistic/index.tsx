import { Icon, Space, Tooltip, Typography } from '@imbrace/ui';
import { Skeleton } from '@mui/material';
import type { ReactNode } from 'react';

import styles from './index.module.scss';

interface StatisticProps {
    title: string;
    value?: string | number;
    fullWidth?: boolean;
    extra?: ReactNode;
    tooltip?: string;
    loading?: boolean;
}

const Statistic = (props: StatisticProps) => {
    const { title, value, fullWidth, extra, tooltip, loading } = props;

    return (
        <div className={`${styles.statistic} ${fullWidth ? styles.fullWidth : ''}`}>
            <div className={styles.header}>
                <Space size={4}>
                    <Typography>{title}</Typography>
                    {tooltip && (
                        <Tooltip placement="top" disableFocusListener disableTouchListener arrow title={tooltip}>
                            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-light-4)' }}>
                                <Icon name="info" style={{ fontSize: '16px', color: 'var(--color-light-4)' }} />
                            </div>
                        </Tooltip>
                    )}
                </Space>
                {extra}
            </div>

            {loading ? (
                <Skeleton variant="text" sx={{ fontSize: '20px', width: '100px' }} />
            ) : (
                <Typography variant="Heading2">
                    {typeof value === 'number'
                        ? new Intl.NumberFormat('en', {
                              maximumFractionDigits: 0,
                          }).format(value)
                        : value}
                </Typography>
            )}
        </div>
    );
};

export default Statistic;
