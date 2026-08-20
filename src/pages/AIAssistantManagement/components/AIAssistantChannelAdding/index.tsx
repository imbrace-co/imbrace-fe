import { useTranslation } from 'react-i18next';
import { Controller, UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { FieldSelect, Space, Icon, EllipsisText } from '@imbrace/ui';
import { ChannelIconTypes } from '@imbrace/ui/dist/components/Icon';
import apiFetch from '@/services/axios/handler';
import { ChannelCountType } from '@/pages/Channels';
import { getChannelCount, getChannelList } from '@/services/api/channel';

const fetchChannelCount = async () => {
    const { data } = await apiFetch<ChannelCountType>(getChannelCount.api(), getChannelCount.method);

    const availableChannels = Object.entries(data)
        .filter(([key, value]) => key !== 'all' && key !== 'store' && key !== 'email' && value !== 0)
        .map(([key]) => key);
    return availableChannels as API.ChannelType[];
};

const fetchChannel = async (channelType: API.ChannelType) => {
    const { data } = await apiFetch<API.PaginatedResponse<API.Channel[]>>(getChannelList.api(channelType), getChannelList.method);
    return data.data;
};

export const AIAssistantChannelAdding = ({
    methods,
}: {
    methods: UseFormReturn<
        {
            channel: string;
            channel_id: string;
        },
        any
    >;
}) => {
    const { control, setValue, watch } = methods;

    const { t } = useTranslation();
    const renderChannelTypes = async () => {
        const channels = await fetchChannelCount();
        return channels.map((channelType) => ({
            icon: <Icon name={`${channelType}` as ChannelIconTypes['name']} fontSize={24} namespace="channel" />,
            text: t(`channel_${channelType}`),
            value: channelType,
            onClick: () => {
                setValue('channel', channelType);
            },
        }));
    };

    const renderChannelList = async () => {
        const channelOptions = await fetchChannel(watch('channel') as API.ChannelType);
        return channelOptions
            .filter((channel: API.Channel) => {
                if (channel.config.type === 'web' && channel.is_init) {
                    return false;
                }
                if ('errorCode' in channel) {
                    return false;
                }
                if(channel.is_replace){
                    return false;
                }
                return true;
            })
            .map((channel: API.Channel) => ({
                onClick: () => {
                    setValue('channel_id', channel.id);
                },
                icon: <Icon name={channel.config.type as ChannelIconTypes['name']} fontSize={24} namespace="channel" />,
                text: (
                    <Space direction="horizontal" justify="between" align="center" style={{ width: '100%' }}>
                        <EllipsisText text={channel.name} />
                    </Space>
                ),
                value: channel.id,
            }));
    };

    const selectedChannel = useWatch({ control, name: 'channel' });

    return (
        <Space size={16} direction="vertical" align="stretch" style={{ width: '100%' }}>
            <Space size={4} direction="vertical" align="start" style={{ width: '100%' }}>
                <Controller
                    name={'channel'}
                    control={control}
                    render={({ field: { onChange, value }, fieldState: { error } }) => {
                        return (
                            <Space size={0} style={{ width: '100%', marginTop: '20px' }} direction="vertical" align="start">
                                <FieldSelect
                                    fullWidth
                                    label={t('ai_assistant_management_set_as_default_chatbot_select_platform')}
                                    description={t('ai_assistant_management_set_as_default_chatbot_select_platform_desc')}
                                    queryKey={['channel']}
                                    request={renderChannelTypes}
                                    value={value}
                                    placeholder={t('ai_assistant_management_set_as_default_chatbot_select_platform')}
                                    emptyText={t('ai_assistant_management_basic_info_assistant_platform_empty')}
                                    onReset={() => {
                                        onChange('');
                                        setValue('channel_id', '');
                                    }}
                                    onChange={(value) => {
                                        onChange(value);
                                        setValue('channel_id', '');
                                    }}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            </Space>
                        );
                    }}
                />
                {selectedChannel && (
                    <Controller
                        name={'channel_id'}
                        control={control}
                        render={({ field: { onChange, value }, fieldState: { error } }) => {
                            return (
                                <Space size={0} style={{ width: '100%', marginTop: '20px' }} direction="vertical" align="start">
                                    <FieldSelect
                                        fullWidth
                                        label={t('ai_assistant_management_set_as_default_chatbot_assign_channel_name')}
                                        queryKey={['channel_id', selectedChannel]}
                                        request={renderChannelList}
                                        value={value}
                                        placeholder={t('ai_assistant_management_set_as_default_chatbot_assign_channel_name_placeholder')}
                                        emptyText={t('ai_assistant_management_basic_info_assistant_platform_empty')}
                                        onReset={() => {
                                            onChange('');
                                        }}
                                        onChange={(value) => {
                                            onChange(value);
                                        }}
                                        error={!!error}
                                        helperText={error?.message}
                                    />
                                </Space>
                            );
                        }}
                    />
                )}
            </Space>
        </Space>
    );
};
