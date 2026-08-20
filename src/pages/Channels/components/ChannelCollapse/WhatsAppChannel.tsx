import { Icon } from '@imbrace/ui';
import { useQuery } from '@tanstack/react-query';
import type { FC, ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getChannelList } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';

import type { ChannelCollapseType } from '.';
import ChannelCollapse from '.';
import type { ChannelPropsType } from './channelHOC';

const whatsappChannel = (
    Component: FC<ChannelCollapseType>,
    { type, title, icon, inactiveIcon }: { type: string; title: string; icon: ReactNode; inactiveIcon: ReactNode },
) => {
    return (props: ChannelPropsType) => {
        const { refresh, searchInput } = props;
        const { t } = useTranslation();

        const fetchChannel = useCallback(async () => {
            try {
                const api = getChannelList.api(type);
                const { data } = await apiFetch<API.PaginatedResponse<API.Channel[]>>(api, getChannelList.method);
                return data.data;
            } catch (error) {
                console.log(error);
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

        const filteredChannels = useMemo(() => {
            if (searchInput) {
                const filteredData = channels?.filter((channel) => {
                    return channel.name.toLowerCase().includes(searchInput.toLowerCase());
                });
                return filteredData;
            }
            return channels;
        }, [channels, searchInput]);

        const onRefresh = useCallback(() => {
            refresh();
            refetch();
        }, [refresh, refetch]);

        const onAdd = () => {};

        const onDetail = () => {};

        return (
            <>
                <Component
                    title={t(title)}
                    type={type}
                    icon={icon}
                    inactiveIcon={inactiveIcon}
                    channels={filteredChannels}
                    loading={loading}
                    onRefresh={onRefresh}
                    onAdd={onAdd}
                    onDetail={onDetail}
                    {...props}
                />
            </>
        );
    };
};

export default whatsappChannel(ChannelCollapse, {
    type: 'whatsapp',
    title: 'channel_whatsapp',
    icon: <Icon namespace="channel" name="whatsapp" fontSize={24} />,
    inactiveIcon: <Icon namespace="channel" name="whatsapp" fontSize={24} inactive />,
});
