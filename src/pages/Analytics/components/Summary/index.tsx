import { Button, Icon, Space, Typography } from '@imbrace/ui';
import type { AxiosError } from 'axios';
import { format } from 'date-fns';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getDataAnalyticsSummary } from '@/services/api/dataAnalytics';
import { ImbraceDataAnalytics } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { validateDate } from '@/utils';

import type { StatisticItems } from '../..';
import styles from '../../index.module.scss';
import PieChart from '../PieChart';
import Statistic from '../Statistic';
import TinyChart from '../TinyChart';

interface SummaryProps {
    range?: [Date | null, Date | null];
    extraOnClick?: (statistic: keyof typeof StatisticItems) => void;
    channels: API.ChannelType[];
}

const Summary = (props: SummaryProps) => {
    const { extraOnClick, range, channels } = props;
    const [loading, setLoading] = useState(false);
    const [summaryData, setSummaryData] = useState<API.DataAnalyticsSummary>();
    const { t } = useTranslation();

    const startDate = format(validateDate(range?.[0]) || new Date(), 'yyyy-MM-dd');
    const endDate = format(validateDate(range?.[1]) || new Date(), 'yyyy-MM-dd');

    const fetchSummary = useCallback(
        async (signal?: AbortSignal) => {
            try {
                setLoading(true);
                const api = getDataAnalyticsSummary.api('active_customers', startDate, endDate, 'all');
                const { data } = await apiFetch<API.DataAnalyticsSummary>(api, getDataAnalyticsSummary.method, {}, ImbraceDataAnalytics, {
                    signal,
                });
                setSummaryData(data);
                setLoading(false);
            } catch (err) {
                const error = err as AxiosError;
                console.log(error);
                if (error?.message !== 'canceled') {
                    setLoading(false);
                }
            }
        },
        [startDate, endDate],
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

    const extra = useMemo(
        () => (statisticItem: keyof typeof StatisticItems) =>
            (
                <Button
                    variant="link"
                    sx={{ padding: 0 }}
                    text={
                        <Space size={4}>
                            <Typography>{t('full_report')}</Typography>
                            <Icon name="chevronRight" />
                        </Space>
                    }
                    onClick={() => {
                        extraOnClick?.(statisticItem);
                    }}
                />
            ),
        [extraOnClick, t],
    );

    return (
        <>
            <div className={styles.block}>
                <Space size={8}>
                    <div className={styles.block}>
                        <div className={`${styles.inner} ${styles.fullWidth}`}>
                            <Space size={4} direction="vertical" align="start">
                                <Statistic
                                    title={t('analytics_active_customers')}
                                    value={Math.round(summaryData?.active_customers || 0)}
                                    fullWidth
                                    extra={extra('active_customers')}
                                    tooltip={t('analytics_active_customers_description')}
                                    loading={loading}
                                />
                                <Typography variant="Caption">{t('analytics_up_to_7_days')}</Typography>
                            </Space>

                            <TinyChart type="bar" statisticItem="active_customers" range={range} />
                        </div>
                    </div>
                    <div className={styles.block}>
                        <div className={`${styles.inner} ${styles.fullWidth}`}>
                            <Space size={4} direction="vertical" align="start">
                                <Statistic
                                    title={t('analytics_new_customers')}
                                    value={Math.round(summaryData?.new_customers || 0)}
                                    fullWidth
                                    extra={extra('new_customers')}
                                    tooltip={t('analytics_new_customers_description')}
                                    loading={loading}
                                />
                                <Typography variant="Caption">{t('analytics_up_to_7_days')}</Typography>
                            </Space>
                            <TinyChart type="bar" statisticItem="new_customers" range={range} />
                        </div>
                    </div>
                    <div className={styles.block}>
                        <div className={`${styles.inner} ${styles.fullWidth}`}>
                            <Space size={4} direction="vertical" align="start">
                                <Statistic
                                    title={t('analytics_received_messages')}
                                    value={Math.round(summaryData?.received_messages || 0)}
                                    fullWidth
                                    extra={extra('received_messages')}
                                    tooltip={t('analytics_received_messages_description')}
                                    loading={loading}
                                />
                                <Typography variant="Caption">{t('analytics_up_to_7_days')}</Typography>
                            </Space>
                            <TinyChart type="line" statisticItem="received_messages" range={range} />
                        </div>
                    </div>
                </Space>
            </div>
            <div style={{ width: '100%' }}>
                <Space size={8}>
                    <div className={styles.block}>
                        <div className={`${styles.inner} ${styles.fullWidth}`}>
                            <Statistic
                                title={t('analytics_messages_per_customer')}
                                value={Math.round(summaryData?.message_per_customer || 0)}
                                fullWidth
                                extra={extra('messages_per_customer')}
                                tooltip={t('analytics_messages_per_customer_description')}
                                loading={loading}
                            />
                            <div style={{ height: 276 }}>
                                <PieChart
                                    type={'messages_per_customer'}
                                    channels={channels}
                                    range={range}
                                    title={t('analytics_messages_per_customer')}
                                />
                            </div>
                        </div>
                    </div>
                    <div className={styles.block}>
                        <div className={`${styles.inner} ${styles.fullWidth}`}>
                            <Statistic
                                title={t('analytics_response_time')}
                                value={summaryData?.response_time || '00:00:00'}
                                fullWidth
                                extra={extra('response_time')}
                                tooltip={t('analytics_response_time_description')}
                                loading={loading}
                            />
                            <div style={{ height: 276 }}>
                                <PieChart type={'response_time'} channels={channels} range={range} title={t('analytics_response_time')} />
                            </div>
                        </div>
                    </div>
                </Space>
            </div>
        </>
    );
};

export default memo(Summary);
