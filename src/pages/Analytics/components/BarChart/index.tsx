import type { ColumnConfig } from '@ant-design/plots';
import { Column } from '@ant-design/plots';
import { Typography } from '@imbrace/ui';
import { CircularProgress } from '@mui/material';
import type { AxiosError } from 'axios';
import { format } from 'date-fns';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import EmptyBarChart from '@/assets/images/emptyBarChart.svg?react';
import { getDataAnalyticsBarChartList } from '@/services/api/dataAnalytics';
import { ImbraceDataAnalytics } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { validateDate } from '@/utils';

import styles from './index.module.scss';

interface BarChartProps {
    type: string;
    channel: string;
    timePeriod: string;
    range?: [Date | null, Date | null];
    unit: string;
}
const BarChart = ({ range, type, timePeriod, channel, unit }: BarChartProps) => {
    const [loading, setLoading] = useState(false);
    const [dataSource, setDataSource] = useState<API.DataAnalyticsBarChart[]>([]);
    const { t } = useTranslation();

    const startDate = format(validateDate(range?.[0]) || new Date(), 'yyyy-MM-dd');
    const endDate = format(validateDate(range?.[1]) || new Date(), 'yyyy-MM-dd');

    const fetchSummary = useCallback(
        async (signal?: AbortSignal) => {
            try {
                setLoading(true);
                const api = getDataAnalyticsBarChartList.api(type, startDate, endDate, timePeriod, channel);
                const { data } = await apiFetch<API.DataAnalyticsBarChart[]>(
                    api,
                    getDataAnalyticsBarChartList.method,
                    {},
                    ImbraceDataAnalytics,
                    {
                        signal,
                    },
                );
                setDataSource(data);
                setLoading(false);
            } catch (err) {
                const error = err as AxiosError;
                console.log(error);
                if (error?.message !== 'canceled') {
                    setLoading(false);
                }
            }
        },
        [startDate, endDate, type, timePeriod, channel],
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

    const config: ColumnConfig = useMemo(
        () => ({
            data: dataSource,

            xField: 'date',
            yField: 'value',
            xAxis: {
                label: {
                    autoRotate: false,
                    style: {
                        fill: '#828282',
                    },
                },
            },
            yAxis: {
                label: {
                    style: {
                        fill: '#828282',
                    },
                },
            },
            columnStyle: {
                fill: '#32AFF5',
            },
            color: '#32AFF5',
            slider: {
                start: dataSource.length > 7 ? 1 - 7 / dataSource.length : 0,
                end: 1,
            },
            label: {
                position: 'top',
                style: {
                    fontSize: 10,
                    lineHeight: '11px',
                    fill: '#333',
                },
                offsetY: 11,
            },
            appendPadding: [18, 0, 0, 0],
            tooltip: {
                formatter: (datum: Record<string, string | number>) => {
                    return { name: t(`${unit}`, { count: +datum.value }), value: datum.value };
                },
            },
        }),
        [dataSource, unit, t],
    );

    return (
        <div className={styles.container}>
            {!isEmpty && <div className={loading ? styles.blur : ''}>{dataSource.length !== 0 && <Column {...config} autoFit />}</div>}
            {isEmpty && (
                <div className={styles.emptyContainer}>
                    <EmptyBarChart style={{ height: '100%', width: 'auto' }} />
                    <div className={styles.description}>
                        <Typography>Currently there is no data to be shown yet. Please check back later.</Typography>
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

export default memo(BarChart);
