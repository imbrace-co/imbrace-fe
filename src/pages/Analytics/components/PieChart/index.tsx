import type { PieConfig } from '@ant-design/plots';
import { Pie } from '@ant-design/plots';
import { Typography } from '@imbrace/ui';
import { CircularProgress } from '@mui/material';
import type { AxiosError } from 'axios';
import { format } from 'date-fns';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import EmptyPieChart from '@/assets/images/emptyPieChart.svg?react';
import { getDataAnalyticsSummary } from '@/services/api/dataAnalytics';
import { ImbraceDataAnalytics } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { validateDate } from '@/utils';

import styles from './index.module.scss';

interface PieChartProps {
    type: string;
    title: string;
    range?: [Date | null, Date | null];
    channels: API.ChannelType[];
    statisticStyle?: Omit<Partial<CSSStyleDeclaration>, 'opacity' | 'fontWeight' | 'lineHeight'> & {
        /**
         * @title 透明度
         */
        opacity?: number;
        /**
         * @title 字體粗细程度
         */
        fontWeight?: string | number;
        /**
         * @title 行高
         */
        lineHeight?: string | number;
    };
}

const formatSeconds = (totalSeconds: number) => {
    let seconds: string | number = totalSeconds;
    const hours = `${Math.floor(seconds / 3600)}`.padStart(2, '0');
    seconds %= 3600;
    const minutes = `${Math.floor(seconds / 60)}`.padStart(2, '0');
    seconds = `${Math.floor(seconds % 60)}`.padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
};

const PieChart = ({ title, range, type, channels, statisticStyle }: PieChartProps) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [dataSource, setDataSource] = useState<API.ChannelInfo>();

    const startDate = format(validateDate(range?.[0]) || new Date(), 'yyyy-MM-dd');
    const endDate = format(validateDate(range?.[1]) || new Date(), 'yyyy-MM-dd');

    const fetchSummary = useCallback(
        async (signal?: AbortSignal) => {
            try {
                setLoading(true);
                const api = getDataAnalyticsSummary.api(type, startDate, endDate, 'all');
                const { data } = await apiFetch<API.DataAnalyticsSummary>(api, getDataAnalyticsSummary.method, {}, ImbraceDataAnalytics, {
                    signal,
                });
                setDataSource(data.channel_info);
                setLoading(false);
            } catch (err) {
                const error = err as AxiosError;
                console.log(error);
                if (error?.message !== 'canceled') {
                    setLoading(false);
                }
            }
        },
        [startDate, endDate, type],
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
            return !Object.entries(dataSource)
                .filter(([key, value]) =>
                    key === 'web_widget'
                        ? value > 0 && channels.indexOf('web') !== -1
                        : value > 0 && channels.indexOf(key as API.ChannelType) !== -1,
                )
                .map(([key, value]) => ({
                    label: key,
                    value,
                }))
                .some((data) => data.value > 0);
        }
        return true;
    }, [dataSource, channels]);

    const config: PieConfig = useMemo(
        () => ({
            appendPadding: 10,
            data: dataSource
                ? Object.entries(dataSource)
                      .filter(([key, value]) =>
                          key === 'web_widget'
                              ? value > 0 && channels.indexOf('web') !== -1
                              : value > 0 && channels.indexOf(key as API.ChannelType) !== -1,
                      )
                      .map(([key, value]) => ({
                          label: key,
                          value,
                      }))
                : [],
            meta: {
                value: {
                    formatter: (value) => {
                        return type === 'response_time' ? formatSeconds(value) : value;
                    },
                },
            },
            angleField: 'value',
            colorField: 'label',
            radius: 1,
            innerRadius: 0.64,
            label: {
                type: 'inner',
                offset: '-50%',
                style: {
                    textAlign: 'center',
                    fontSize: 10,
                    fill: '#333',
                },
                autoRotate: false,
                content: (datum) => {
                    return type === 'response_time' ? formatSeconds(+datum.value || 0) : datum.value;
                },
            },
            color: ({ label }) => {
                switch (label) {
                    case 'facebook':
                        return '#62C0F4';
                    case 'line':
                        return '#97E3C7';
                    case 'wechat':
                        return '#FAF1CC';
                    case 'whatsapp':
                        return '#5AD3A8';
                    case 'web_widget':
                        return '#9DD6F8';
                    case 'instagram':
                        return '#F6E18B';
                    default:
                        return '#156df2';
                }
            },
            statistic: {
                title: false,
                content: {
                    style: {
                        whiteSpace: 'pre-wrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontSize: '10px',
                        lineHeight: '12px',
                        fontWeight: 800,
                        width: '88px',
                        color: 'var(--color-light-5)',
                        ...statisticStyle,
                    },
                    content: title,
                },
            },
            interactions: [
                {
                    type: 'element-selected',
                },
                {
                    type: 'element-active',
                },
            ],
            tooltip: {
                formatter: (datum: Record<string, string | number>) => {
                    return {
                        name: t(`channel_${datum.label}`),
                        value: type === 'response_time' ? formatSeconds(+datum.value || 0) : datum.value,
                    };
                },
            },
            legend: {
                itemName: {
                    formatter: (text) => t(`channel_${text}`),
                },
            },
        }),
        [dataSource, t, title, channels, statisticStyle, type],
    );

    return (
        <div className={styles.container}>
            {!isEmpty && (
                <div className={loading ? styles.blur : ''}>
                    <Pie {...config} autoFit />
                </div>
            )}
            {isEmpty && (
                <div className={styles.emptyContainer}>
                    <EmptyPieChart style={{ height: '100%', width: 'auto' }} />
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

export default memo(PieChart);
