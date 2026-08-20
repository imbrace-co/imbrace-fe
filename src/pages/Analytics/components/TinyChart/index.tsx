import { TinyColumn, TinyLine } from '@ant-design/plots';
import { Typography } from '@imbrace/ui';
import { CircularProgress } from '@mui/material';
import type { AxiosError } from 'axios';
import { format } from 'date-fns';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import EmptyBarChart from '@/assets/images/emptyBarChart.svg?react';
import EmptyLineChart from '@/assets/images/emptyLineChart.svg?react';
import { getDataAnalyticsBarChartList } from '@/services/api/dataAnalytics';
import { ImbraceDataAnalytics } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { validateDate } from '@/utils';

import styles from './index.module.scss';

interface TinyChartProps {
    type: 'line' | 'bar';
    statisticItem: string;
    range?: [Date | null, Date | null];
}

const TinyChart = ({ type, range, statisticItem }: TinyChartProps) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [dataSource, setDataSource] = useState<API.DataAnalyticsBarChart[]>([]);

    const startDate = format(validateDate(range?.[0]) || new Date(), 'yyyy-MM-dd');
    const endDate = format(validateDate(range?.[1]) || new Date(), 'yyyy-MM-dd');

    const fetchSummary = useCallback(
        async (signal?: AbortSignal) => {
            try {
                setLoading(true);
                const api = getDataAnalyticsBarChartList.api(statisticItem, startDate, endDate, 'day', 'all');
                const { data } = await apiFetch<API.DataAnalyticsBarChart[]>(
                    api,
                    getDataAnalyticsBarChartList.method,
                    {},
                    ImbraceDataAnalytics,
                    {
                        signal,
                    },
                );
                setDataSource(data.slice(data.length - 7, data.length));
                setLoading(false);
            } catch (err) {
                const error = err as AxiosError;
                console.log(error);
                if (error?.message !== 'canceled') {
                    setLoading(false);
                }
            }
        },
        [startDate, endDate, statisticItem],
    );

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;
        fetchSummary(signal);
        return () => {
            if (controller) {
                controller.abort();
            }
        };
    }, [fetchSummary]);

    const isEmpty = useMemo(() => {
        if (dataSource) {
            return !dataSource.some((data) => data.value > 0);
        }
        return true;
    }, [dataSource]);

    const config = useMemo(
        () => ({
            height: 200,
            data: dataSource.map((source) => source.value),
            tooltip: {
                customContent: (index: string, datum: any[]) => {
                    return `${dataSource[+index].date}<br/>
                ${datum?.[0]?.data?.y}`;
                },
            },
            columnStyle: {
                fill: '#32AFF5',
            },
            color: '#32AFF5',
            label: {
                position: 'top',
                autoHide: false,
                style: {
                    fontSize: 10,
                    lineHeight: '11px',
                    fill: '#333',
                },
                offsetY: type === 'bar' ? 11 : 5,
            },
            appendPadding: [18, 5, 5, 5],
        }),
        [dataSource, type],
    );

    return (
        <div className={styles.container}>
            {!isEmpty && (
                <div className={loading ? styles.blur : ''}>
                    {type === 'bar' ? <TinyColumn autoFit {...config} /> : <TinyLine autoFit {...config} />}
                </div>
            )}

            {isEmpty && (
                <div className={styles.emptyContainer}>
                    {type === 'bar' ? <EmptyBarChart /> : <EmptyLineChart />}
                    <div className={styles.description}>
                        <Typography>{t('analytics_empty')}</Typography>
                    </div>
                </div>
            )}

            {loading && (
                <div className={styles.loadingContainer}>
                    <CircularProgress size={'25px'} />
                </div>
            )}
        </div>
    );
};

export default memo(TinyChart);
