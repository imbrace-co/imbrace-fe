import { Button, Dropdown, Icon, Search, Space, Tabs } from '@imbrace/ui';
import type { QueryFunction } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { SyntheticEvent } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router';

import PageLayout from '@/components/PageLayout';
import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import useDebounce from '@/hooks/useDebounce';
import { useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';
import { getOrgJourneys } from '@/services/api/app';
import { getJourneyLibraries, installProduct } from '@/services/api/marketplace';
import apiFetch from '@/services/axios/handler';

const fetchJourneyLibraries: QueryFunction<API.JourneyLibrary[], [string, { search?: string }]> = async ({ queryKey }) => {
    const searchParams = new URLSearchParams();
    if (queryKey[1].search) {
        searchParams.append('search', queryKey[1].search);
    }
    const { data } = await apiFetch<{ data: API.JourneyLibrary[] }>(getJourneyLibraries.api, getJourneyLibraries.method, searchParams);
    return data.data;
};

const fetchOrgJourneys: QueryFunction<API.Journey[], [string, { search?: string }]> = async ({ queryKey }) => {
    const searchParams = new URLSearchParams();
    if (queryKey[1].search) {
        searchParams.append('search', queryKey[1].search);
    }
    const { data } = await apiFetch<{ data: API.Journey[] }>(getOrgJourneys.api, getOrgJourneys.method, searchParams);
    return data.data;
};

export const installApp = async (productId: string) => {
    const { data } = await apiFetch<{ message: string; data: API.Journey }>(installProduct.api(productId), installProduct.method);
    return data;
};

const Main = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { tab } = useParams();
    const { openHelpCenter } = useNavbar();
    const support = useAppSelector((state) => state.Account.support);
    const [searchAppValue, setSearchAppValue] = useState<string>();
    const [searchProdValue, setSearchProdValue] = useState<string>();
    const debouncedSearchAppInput = useDebounce(searchAppValue, 300);
    const debouncedSearchProdInput = useDebounce(searchProdValue, 300);

    const { data: libraries, isFetching: isFetchingLibraries } = useQuery({
        queryKey: [
            'journeyLibraries',
            {
                search: debouncedSearchProdInput ?? '',
            },
        ],
        queryFn: fetchJourneyLibraries,
    });

    const {
        data: orgJourneys,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: [
            'orgJourneys',
            {
                search: debouncedSearchAppInput ?? '',
            },
        ],
        queryFn: fetchOrgJourneys,
    });

    useEffect(() => {
        if (!tab && !isFetching) {
            navigate(`/journeys/${orgJourneys && orgJourneys.length >= 1 ? 'org' : 'libraries'}`, { replace: true });
        }
    }, [tab, navigate, orgJourneys, isFetching]);

    const onSearchDebounce = (searchText: string) => {
        tab === 'libraries' ? setSearchProdValue(searchText) : setSearchAppValue(searchText);
    };

    const onResetSearchValue = () => {
        tab === 'libraries' ? setSearchProdValue('') : setSearchAppValue('');
    };

    const onSwitchTab = (newValue: string) => {
        setSearchProdValue('');
        setSearchAppValue('');
        navigate(`/journeys/${newValue}`);
    };

    return (
        <PageLayout
            title={t('menu_journeys')}
            loading={pathname === '/journeys/libraries' ? isFetchingLibraries : isFetching}
            extra={
                <Space justify="between">
                    <div style={{ flex: 1, borderBottom: '1px solid var(--color-light-3)' }}>
                        <Tabs
                            currentTab={tab}
                            tabs={[
                                { value: 'org', label: t('installed') },
                                { value: 'libraries', label: t('libraries') },
                            ]}
                            onChange={(event: SyntheticEvent, newValue: any) => onSwitchTab(newValue)}
                        />
                    </div>

                    <Space size={12}>
                        <Search
                            value={tab === 'libraries' ? searchProdValue : searchAppValue}
                            placeholder={t('search')}
                            onSearch={(val) => onSearchDebounce(val)}
                            onReset={() => onResetSearchValue()}
                        />
                        {tab === 'libraries' && (
                            <Button
                                text={t('new_inquiry')}
                                onClick={() => {
                                    openUnlockFeature({
                                        title: t('new_inquiry_title'),
                                        content: t('new_inquiry_desc'),
                                        channel: support.customer?.channel,
                                        touchpoint: support.app?.touchpoint,
                                        initialStep: 2,
                                        openHelpCenter: (channelId) => {
                                            openHelpCenter?.({
                                                channelId,
                                                prefillMessage: t('new_inquiry_prefill_message'),
                                                defaultWebWidget: true,
                                            });
                                        },
                                    });
                                }}
                            />
                        )}
                        {tab === 'org' && (
                            <Dropdown
                                options={[
                                    {
                                        text: t('ready_to_use_journey'),
                                        index: 0,
                                        icon: <Icon name="readyToUseJourney" />,
                                    },
                                    {
                                        text: t('customized_journeys'),
                                        index: 1,
                                        icon: <Icon name="premium" />,
                                    },
                                ]}
                                text={t('add_new')}
                                hideOnSelect
                                onSelect={(e, selectedIndex) => {
                                    switch (selectedIndex) {
                                        case 0:
                                            navigate('/journeys/libraries');
                                            break;
                                        case 1:
                                            openUnlockFeature({
                                                title: t('new_inquiry_title'),
                                                content: t('new_inquiry_desc'),
                                                channel: support.customer?.channel,
                                                touchpoint: support.app?.touchpoint,
                                                initialStep: 2,
                                                openHelpCenter: (channelId) => {
                                                    openHelpCenter?.({
                                                        channelId,
                                                        prefillMessage: t('new_inquiry_prefill_message'),
                                                        defaultWebWidget: true,
                                                    });
                                                },
                                            });
                                            break;
                                        default:
                                            break;
                                    }
                                }}
                            />
                        )}
                    </Space>
                </Space>
            }
        >
            <Outlet
                context={{
                    data: tab === 'libraries' ? libraries : tab === 'org' ? orgJourneys : [],
                    searchValue: tab === 'libraries' ? searchProdValue : searchAppValue,
                    refetch,
                    openHelpCenter,
                }}
            />
        </PageLayout>
    );
};

const JourneysContainer = () => {
    const { productId } = useParams();
    const { openHelpCenter } = useNavbar();

    if (productId) {
        return <Outlet context={{ openHelpCenter }} />;
    }
    return <Main />;
};

export default JourneysContainer;
