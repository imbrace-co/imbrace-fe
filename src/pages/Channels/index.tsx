import { Button, Search, Space } from '@imbrace/ui';
import { List } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import PageLayout from '@/components/PageLayout';
import { createInstagramDirectV2, getChannelCount, getChannelProviders } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';
import { getIsAllowModify } from '@/utils/CookiesHelper';

import { LineChannels, WebWidgetChannels, WeChatChannels } from './components/ChannelCollapse/channelHOC';
import { FbChannel, IgChannel } from './components/ChannelCollapse/FacebookChannel';
import WhatsAppChannel from './components/ChannelCollapse/WhatsAppChannel';
import styles from './index.module.scss';

export interface ChannelCountType {
    all: number;
    whatsapp: number;
    web: number;
    instagram: number;
    facebook: number;
    store: number;
    wechat: number;
    email: number;
}

export type ChannelProvider = {
    provider: string;
    configured: boolean;
};

export type ChannelProvidersResponse = {
    data: ChannelProvider[];
};

const Channels = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    // const [viewType, setViewType] = useState<'list' | '360'>('list');
    const [searchBarInput, setSearchBarInput] = useState('');
    const isAllowModifyChannel = getIsAllowModify();
    const queryParams = new URLSearchParams(location.search);
    const accessToken = queryParams.get('code');
    let currentAccessToken = '';

    const instagramRef = useRef<{ onRefresh: () => void }>(null);
    const fetchChannelCount = useCallback(async () => {
        try {
            const { data } = await apiFetch<ChannelCountType>(getChannelCount.api(), getChannelCount.method);

            const entries = Object.entries(data).filter((item) => item[0] !== 'all');
            return entries.sort((a, b) => b[1] - a[1]);
        } catch (error) {
            console.error(error);
        }
    }, []);

    const { data: sortedChannels, refetch } = useQuery({
        queryFn: fetchChannelCount,
        queryKey: ['channels'],
        initialData: [],
    });

    const { data: channelProviders } = useQuery({
        queryKey: ['channel-providers'],
        queryFn: async () => {
            const { data } = await apiFetch<ChannelProvidersResponse>(getChannelProviders.api(), getChannelProviders.method);
            return data.data;
        },
    });

    useEffect(() => {
        if (!accessToken) return;
        const loginIGbyAccessToken = async () => {
            try {
                await apiFetch<API.InstagramChannel[]>(createInstagramDirectV2.api(), createInstagramDirectV2.method, {
                    access_token: accessToken,
                });
                const timeout = setTimeout(() => {
                    if (instagramRef.current) {
                        instagramRef.current.onRefresh();
                    }
                }, 1000);
                return () => clearTimeout(timeout);
            } catch (err) {
                console.log('create instagram error', err);
            }
        };
        if (currentAccessToken !== accessToken) {
            currentAccessToken = accessToken;
            loginIGbyAccessToken();
        }
    }, [accessToken]);

    const refresh = useCallback(() => {
        refetch();
    }, [refetch]);

    const channelComponents: Record<string, JSX.Element> = {
        web: <WebWidgetChannels searchInput={searchBarInput} refresh={refresh} channelProviders={channelProviders} />,
        // email: <MailChannels refresh={refresh} />,
        facebook: <FbChannel searchInput={searchBarInput} refresh={refresh} channelProviders={channelProviders} />,
        whatsapp: <WhatsAppChannel searchInput={searchBarInput} refresh={refresh} channelProviders={channelProviders} />,
        instagram: <IgChannel ref={instagramRef} searchInput={searchBarInput} refresh={refresh} channelProviders={channelProviders} />,
        wechat: <WeChatChannels searchInput={searchBarInput} refresh={refresh} channelProviders={channelProviders} />,
        line: <LineChannels searchInput={searchBarInput} refresh={refresh} channelProviders={channelProviders} />,
        // store: <PhysicalStoreChannel refresh={refresh} />,
    };

    const renderExtra = () => (
        <Space size={12}>
            <Search
                value={searchBarInput}
                placeholder={t('channels_search_placeholder')}
                onSearch={(inputValue) => setSearchBarInput(inputValue)}
                onReset={() => setSearchBarInput('')}
                sx={{ width: '248px' }}
            />
            {/* TODO: temporarily disabled, waiting for further notice */}
            {/* <Dropdown
                variant="text"
                icon={viewType === 'list' ? <Icon name="list" /> : <Icon name="mindMap" />}
                options={[
                    {
                        text: t('channels_channel_list'),
                        icon: (
                            <Icon
                                name="list"
                                style={{
                                    color: 'var(--color-secondary-1)',
                                }}
                            />
                        ),
                        index: 'list',
                    },
                    // {
                    //     text: t('channels_connect_360'),
                    //     icon: (
                    //         <Icon
                    //             name="mindMap"
                    //             style={{
                    //                 color: 'var(--color-secondary-1)',
                    //             }}
                    //         />
                    //     ),
                    //     index: '360',
                    // },
                ]}
                selectedIndex={viewType}
                hideOnSelect
                buttonSx={{
                    color: 'var(--color-secondary-3)',
                }}
                onSelect={(event, selectedIndex) => {
                    setViewType(selectedIndex);
                }}
            /> */}

            {isAllowModifyChannel && (
                <Button
                    text={t('credentials_add_new_button')}
                    sx={{ padding: 0, width: '127px' }}
                    onClick={() => {
                        navigate('/channels/new');
                    }}
                />
            )}
        </Space>
    );

    return (
        <PageLayout title={t('channels_heading')} rightSideComponent={renderExtra()}>
            <div className={styles.container}>
                <List dense={false} sx={{ padding: 0 }}>
                    {sortedChannels?.map((channel: [string, number]) => {
                        const channelType = channel[0];
                        return <React.Fragment key={channelType}>{channelComponents[channelType]}</React.Fragment>;
                    })}
                </List>
            </div>
        </PageLayout>
    );
};

export default Channels;
