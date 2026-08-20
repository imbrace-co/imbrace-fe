import type { QueryFunction } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { useAppSelector } from '@/redux/store';
import { getChannelCount, getConversationCount } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';

interface ChannelCountType {
    all: number;
    whatsapp: number;
    web: number;
    instagram: number;
    facebook: number;
    store: number;
}

const fetchChannelCount: QueryFunction<
    API.ChannelType[],
    [string, { viewFilter: string; viewFilterTeamId?: string; countConvs?: boolean }]
> = async ({ queryKey }) => {
    const { countConvs, viewFilter, viewFilterTeamId } = queryKey[1];

    if (countConvs) {
        let api = getConversationCount.api();
        if (viewFilter === 'team') {
            api = api.concat(`?team_id=${viewFilterTeamId}`);
        }
        if (viewFilter === 'all' || viewFilter === 'yours') {
            api = api.concat(`?view=${viewFilter === 'yours' ? 'joined' : viewFilter}`);
        } else if (viewFilter !== 'team') {
            api = api.concat(`?status=${viewFilter}`);
        }

        const { data } = await apiFetch<ChannelCountType>(api, getConversationCount.method);

        const availableChannels = Object.entries(data)
            .filter(([key, value]) => key !== 'all' && key !== 'store' && value !== 0)
            .map(([key]) => key);
        return availableChannels as API.ChannelType[];
    }

    const { data } = await apiFetch<ChannelCountType>(getChannelCount.api(), getChannelCount.method);

    const availableChannels = Object.entries(data)
        .filter(([key, value]) => key !== 'all' && key !== 'store' && value !== 0)
        .map(([key]) => key);
    return availableChannels as API.ChannelType[];
};

const useChannels = (props: { countConvs?: boolean } | void) => {
    const viewFilter = useAppSelector((state) => state.TeamConversation.viewFilter);
    const viewFilterTeamId = useAppSelector((state) => state.TeamConversation.viewFilterTeamId);
    const { data: channels, isFetching } = useQuery({
        queryKey: [
            'channel_count',
            {
                viewFilter,
                viewFilterTeamId,
                countConvs: props?.countConvs,
            },
        ],
        queryFn: fetchChannelCount,
        initialData: [],
    });

    return { channels, loading: isFetching };
};

export default useChannels;
