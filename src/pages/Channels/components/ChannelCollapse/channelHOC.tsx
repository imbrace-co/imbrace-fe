import { Icon } from '@imbrace/ui';
import { useQuery } from '@tanstack/react-query';
import type { FC, ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { ChannelProvider } from '@/pages/Channels';
import { getChannelList } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';

import type { ChannelCollapseType } from '.';
import ChannelCollapse from '.';

export type ChannelPropsType = {
    icon?: ReactNode;
    inactiveIcon?: ReactNode;
    refresh: () => void;
    onAdd?: () => void;
    onEdit?: (channel: API.Channel) => void;
    onDetail?: (channel: API.Channel) => void;
    hasPagination?: boolean;
    hasMore?: boolean;
    searchInput?: string;
    channelProviders?: ChannelProvider[];
};

const channelHOC = (
    Component: FC<ChannelCollapseType>,
    { type, title, icon, inactiveIcon }: { type: string; title: string; icon: ReactNode; inactiveIcon: ReactNode },
) => {
    return (props: ChannelPropsType) => {
        const { t } = useTranslation();
        const { onAdd, onEdit, onDetail, hasPagination, hasMore, searchInput, channelProviders } = props;

        const fetchChannel = useCallback(async () => {
            try {
                const api = getChannelList.api(type);
                const { data } = await apiFetch<{ data: API.Channel[] }>(api, getChannelList.method);

                return data.data;
            } catch (error) {
                console.error('Fetching channels: ', error);
            }
        }, []);

        const {
            data: channels,
            isLoading: loading,
            refetch,
        } = useQuery({
            queryFn: fetchChannel,
            queryKey: ['channel', type],
        });

        const onRefresh = useCallback(() => {
            refetch();
        }, [refetch]);

        const filteredChannels = useMemo(() => {
            if (searchInput) {
                const filteredData = channels?.filter((channel) => {
                    return channel.name.toLowerCase().includes(searchInput.toLowerCase());
                });
                return filteredData;
            }
            return channels;
        }, [channels, searchInput]);

        return (
            <Component
                title={t(title)}
                type={type}
                icon={icon}
                inactiveIcon={inactiveIcon}
                onRefresh={onRefresh}
                channels={filteredChannels}
                loading={loading}
                onAdd={onAdd}
                onEdit={onEdit}
                onDetail={onDetail}
                hasPagination={hasPagination}
                hasMore={hasMore}
                channelProviders={channelProviders}
            />
        );
    };
};

const WebWidgetChannels = channelHOC(ChannelCollapse, {
    type: 'web',
    title: 'channel_web_widget',
    icon: <Icon namespace="channel" name="web" fontSize={24} />,
    inactiveIcon: <Icon namespace="channel" name="web" fontSize={24} inactive />,
});

const WeChatChannels = channelHOC(ChannelCollapse, {
    type: 'wechat',
    title: 'channel_wechat',
    icon: <Icon namespace="channel" name="wechat" fontSize={24} />,
    inactiveIcon: <Icon namespace="channel" name="wechat" fontSize={24} inactive />,
});

const LineChannels = channelHOC(ChannelCollapse, {
    type: 'line',
    title: 'channel_line',
    icon: <Icon namespace="channel" name="line" fontSize={24} />,
    inactiveIcon: <Icon namespace="channel" name="line" fontSize={24} inactive />,
});

const MailChannels = channelHOC(ChannelCollapse, {
    type: 'email',
    title: 'channel_mail',
    icon: <Icon namespace="channel" name="email" fontSize={24} />,
    inactiveIcon: <Icon namespace="channel" name="email" fontSize={24} inactive />,
});

export { LineChannels, MailChannels, WebWidgetChannels, WeChatChannels };
