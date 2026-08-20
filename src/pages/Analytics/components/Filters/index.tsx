import { Icon, Select, Space } from '@imbrace/ui';
import { useTranslation } from 'react-i18next';

const Filters = ({
    channels,
    chartType,
    channel,
    timePeriod,
    onChange,
}: {
    channels: API.ChannelType[];
    chartType: string;
    channel: string;
    timePeriod: string;
    onChange: (filter: Record<string, string>) => void;
}) => {
    const { t } = useTranslation();
    return (
        <Space size={15}>
            <Select
                value={chartType}
                queryKey={['chartType']}
                request={() => [
                    {
                        text: t('analytics_by_timeline'),
                        value: 'timeline',
                        icon: <Icon name="barChart" fontSize={20} />,
                    },
                    {
                        text: t('analytics_by_channel'),
                        value: 'channel',
                        icon: <Icon name="pieChart" fontSize={20} />,
                    },
                ]}
                onChange={(value) => {
                    if (value === 'channel') {
                        onChange({
                            chartType: value as string,
                            channel: 'all',
                            timePeriod: 'day',
                        });
                    } else {
                        onChange({
                            chartType: value as string,
                        });
                    }
                }}
                popoverProps={{
                    disablePortal: false,
                }}
            />
            {chartType === 'timeline' && (
                <Select
                    value={channel}
                    queryKey={['channel']}
                    request={() =>
                        [
                            {
                                text: t('channel_all_channels'),
                                value: 'all',
                                icon: <Icon name="widgets" fontSize={20} />,
                            },
                            {
                                text: t('channel_web'),
                                value: 'web',
                                icon: <Icon name="web" namespace="channel" fontSize={20} />,
                            },
                            {
                                text: t('channel_facebook'),
                                value: 'facebook',
                                icon: <Icon name="facebook" namespace="channel" fontSize={20} />,
                            },
                            {
                                text: t('channel_instagram'),
                                value: 'instagram',
                                icon: <Icon name="instagram" namespace="channel" fontSize={20} />,
                            },
                            {
                                text: t('channel_whatsapp'),
                                value: 'whatsapp',
                                icon: <Icon name="whatsapp" namespace="channel" fontSize={20} />,
                            },
                            {
                                text: t('channel_wechat'),
                                value: 'wechat',
                                icon: <Icon name="wechat" namespace="channel" fontSize={20} />,
                            },
                            {
                                text: t('channel_line'),
                                value: 'line',
                                icon: <Icon name="line" namespace="channel" fontSize={20} />,
                            },
                        ].filter((option) => channels.indexOf(option.value as API.ChannelType) !== -1 || option.value === 'all')
                    }
                    onChange={(value) => {
                        onChange({
                            channel: value as string,
                        });
                    }}
                    popoverProps={{
                        disablePortal: false,
                    }}
                    containerStyle={{
                        width: '176px',
                    }}
                    fullWidth
                />
            )}
            {chartType === 'timeline' && (
                <Select
                    value={timePeriod}
                    queryKey={['timePeriod']}
                    request={() => [
                        {
                            text: t('analytics_month'),
                            value: 'month',
                        },
                        {
                            text: t('analytics_week'),
                            value: 'week',
                        },
                        {
                            text: t('analytics_day'),
                            value: 'day',
                        },
                        {
                            text: t('analytics_hour'),
                            value: 'hour',
                        },
                    ]}
                    popoverProps={{
                        disablePortal: false,
                    }}
                    onChange={(value) => {
                        onChange({
                            timePeriod: value as string,
                        });
                    }}
                    containerStyle={{
                        width: '151px',
                    }}
                    fullWidth
                />
            )}
        </Space>
    );
};

export default Filters;
