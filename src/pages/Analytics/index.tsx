import { Button, Dropdown, FieldDateRangePicker, Icon, Space, Typography } from '@imbrace/ui';
import { Divider } from '@mui/material';
import type { AxiosError } from 'axios';
import { sub } from 'date-fns';
import debounce from 'lodash/debounce';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import PageLayout from '@/components/PageLayout';
import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import useAccess from '@/hooks/useAccess';
import useChannels from '@/hooks/useChannels';
import { useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';
import { getDataAnalyticsTotalCount } from '@/services/api/dataAnalytics';
import { ImbraceDataAnalytics } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import BarChart from './components/BarChart';
import Filters from './components/Filters';
import PieChart from './components/PieChart';
import Statistic from './components/Statistic';
import Summary from './components/Summary';
import styles from './index.module.scss';

export type FiltersProps = {
    channel: string;
    statisticItem: keyof typeof StatisticItems;
    timePeriod: string;
    startDate: Date;
    endDate: Date;
    chartType: string;
};
export type DrawPieDataType = {
    id?: string;
    label?: string;
    value?: number;
};

export const StatisticItems = {
    active_customers: {
        unit: 'customer',
    },
    new_customers: {
        unit: 'customer',
    },
    received_messages: {
        unit: 'message',
    },
    messages_per_customer: {
        unit: 'avg_message',
    },
    response_time: {
        unit: 'avg_response_time',
    },
};

const Analytics = () => {
    const { t } = useTranslation();
    const { openHelpCenter } = useNavbar();
    const { channels, loading: channelLoading } = useChannels();
    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const supportTouchpoint = useAppSelector((state) => state.Account.support?.customer?.touchpoint);
    const { features } = useAccess();
    const [loading, setLoading] = useState(false);
    const [range, setRange] = useState<[Date | null, Date | null] | undefined>([sub(new Date(), { months: 1 }), new Date()]);
    const [filters, setFilters] = useState<FiltersProps>({
        channel: 'all',
        statisticItem: 'active_customers',
        timePeriod: 'day',
        startDate: sub(new Date(), { months: 1 }),
        endDate: new Date(),
        chartType: 'timeline',
    });
    const [total, setTotal] = useState<API.DataAnalyticsTotalCount>();
    const mainReportRef = useRef<HTMLDivElement>(null);

    const fetchTotal = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const api = getDataAnalyticsTotalCount.api();
            const { data } = await apiFetch<API.DataAnalyticsTotalCount>(api, getDataAnalyticsTotalCount.method, {}, ImbraceDataAnalytics, {
                signal,
            });
            setTotal(data);
            setLoading(false);
        } catch (err) {
            const error = err as AxiosError;
            console.log(error);
            if (error?.message !== 'canceled') {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;
        fetchTotal(signal);
        return () => {
            if (controller) {
                controller.abort();
            }
        };
    }, [fetchTotal]);

    const extraOnClick = useCallback((statisticItem: keyof typeof StatisticItems) => {
        setFilters((prev) => ({
            ...prev,
            statisticItem,
        }));
        mainReportRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const renderContent = () => {
        return (
            <>
                <div className={styles.block}>
                    <Typography variant="Heading2">{t('analytics_overview')}</Typography>
                    <div className={styles.inner}>
                        <Space
                            divider
                            size={16}
                            dividerProps={{
                                sx: {
                                    margin: '0 35.5px',
                                },
                            }}
                        >
                            <Statistic
                                title={t('analytics_total_customers')}
                                value={total?.total_customers || 0}
                                tooltip={t('analytics_total_customers_description')}
                                loading={loading}
                            />
                            <Statistic
                                title={t('analytics_total_messages')}
                                value={total?.total_messages || 0}
                                tooltip={t('analytics_total_messages_description')}
                                loading={loading}
                            />
                        </Space>
                    </div>
                </div>

                <Divider sx={{ margin: '32px 0' }} />

                <Space size={24} direction="vertical">
                    <div className={styles.block}>
                        <Space size={12} direction="vertical" align="start">
                            <Typography variant="Heading2">{t('analytics_detailed_report')}</Typography>
                            <FieldDateRangePicker
                                value={range}
                                onChange={debounce((dates) => {
                                    setRange(dates);
                                }, 200)}
                                maxDate={new Date()}
                            />
                        </Space>
                    </div>

                    <Summary channels={channels} range={range} extraOnClick={extraOnClick} />
                    <div className={styles.block} style={{ marginBottom: 30 }} ref={mainReportRef}>
                        <div className={`${styles.inner} ${styles.fullWidth}`}>
                            <div className={styles.header}>
                                <Dropdown
                                    variant="text"
                                    text={t(`analytics_${filters.statisticItem}`)}
                                    selectedIndex={filters.statisticItem}
                                    options={[
                                        { index: 'active_customers', text: t('analytics_active_customers') },
                                        { index: 'new_customers', text: t('analytics_new_customers') },
                                        { index: 'received_messages', text: t('analytics_received_messages') },
                                        { index: 'messages_per_customer', text: t('analytics_messages_per_customer') },
                                        { index: 'response_time', text: t('analytics_response_time') },
                                    ]}
                                    buttonSx={{
                                        color: 'var(--color-light-7)',
                                        textTransform: 'initial',
                                        gap: '12px',
                                        '& .textContainer > p': {
                                            fontSize: 20,
                                        },
                                        '& svg': {
                                            fontSize: 40,
                                        },
                                    }}
                                    hideOnSelect
                                    arrowColor={'var(--color-light-5)'}
                                    onSelect={(event, selected) => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            statisticItem: selected,
                                        }));
                                    }}
                                />
                                <Filters
                                    channels={channels}
                                    chartType={filters.chartType}
                                    channel={filters.channel}
                                    timePeriod={filters.timePeriod}
                                    onChange={(filter) => {
                                        setFilters((prev) => ({ ...prev, ...filter }));
                                    }}
                                />
                            </div>

                            {filters.chartType === 'timeline' ? (
                                <BarChart
                                    timePeriod={filters.timePeriod}
                                    channel={filters.channel}
                                    type={filters.statisticItem}
                                    range={range}
                                    unit={StatisticItems[filters.statisticItem].unit}
                                />
                            ) : (
                                <div style={{ height: 400 }}>
                                    <PieChart
                                        type={filters.statisticItem}
                                        channels={channels}
                                        range={range}
                                        title={t(`analytics_${filters.statisticItem}`)}
                                        statisticStyle={{
                                            fontSize: '14px',
                                            lineHeight: '16.8px',
                                            width: '115px',
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </Space>
            </>
        );
    };

    return (
        <PageLayout
            title={t('menu_analytics')}
            rightSideComponent={
                <div>
                    <Button
                        text="New Widget"
                        endIcon={features.analytics({ operation: 'create' }) ? <Icon name="premium" /> : null}
                        onClick={() => {
                            if (features.analytics({ operation: 'create' })) {
                                openUnlockFeature({
                                    channel: supportChannel,
                                    touchpoint: supportTouchpoint,
                                    openHelpCenter: (channelId: string) =>
                                        openHelpCenter?.({
                                            channelId,
                                            prefillMessage: t('unlock_feature_prefill_message'),
                                            defaultWebWidget: true,
                                        }),
                                });
                            }
                        }}
                    />
                </div>
            }
            loading={channelLoading}
        >
            {renderContent()}
        </PageLayout>
    );
};

export default Analytics;
