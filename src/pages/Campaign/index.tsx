import type { TabsRef } from '@imbrace/ui';
import { Dropdown, Icon, Illustration, Search, Space } from '@imbrace/ui';
import { Box, Link as MuiLink } from '@mui/material';
import { type QueryFunction, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FC, SyntheticEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom';

import InfiniteScrollList from '@/components/InfiniteScrollList';
import PageLayout from '@/components/PageLayout';
import TouchpointCard from '@/pages/Campaign/components/TouchpointCard';
import { getTouchpointList } from '@/services/api/campaign';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import CampaignTabs from './components/CampaignTabs';
import { openCreateCampaignDialog } from './components/CreateCampaignModal';
import styles from './index.module.scss';
import { getIsAllowModify } from '@/utils/CookiesHelper';

const CampaignList: FC = () => {
    const { t } = useTranslation();
    const { tab } = useParams<{ tab?: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const match = useMatch('/campaign/:viewType/:tab');
    const { viewType = 'list' } = match?.params as { viewType: 'list' | 'grid' };
    const [tabIndex, setTabIndex] = useState<string>(tab ?? 'all');
    const [searchBarInput, setSearchBarInput] = useState('');
    const [filteredList, setFilteredList] = useState<API.Touchpoint[]>([]);

    const listRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<TabsRef>(null);
    const isAllowModifyCampaign = getIsAllowModify();

    useEffect(() => {
        if (tab) {
            setTabIndex(tab);
        }
    }, [tab]);

    const fetchTouchpoint: QueryFunction<API.Touchpoint[]> = useCallback(
        async ({ signal }: { signal?: AbortSignal }) => {
            const params: {
                is_archived?: boolean;
                campaignId?: string;
            } = {};
            if (tabIndex === 'archive') {
                params.is_archived = true;
            } else if (tabIndex === 'all' || tabIndex === 'undefined') {
                params.campaignId = 'null';
            } else {
                params.campaignId = tabIndex;
            }

            const { data } = await apiFetch<{ data: API.Touchpoint[] }>(
                getTouchpointList.api(params),
                getTouchpointList.method,
                {},
                ImbraceClient,
                {
                    signal,
                },
            );
            return data.data;
        },
        [tabIndex],
    );

    const {
        data: touchpointList,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ['campaigns', { campaignId: tabIndex }],
        initialData: [],
        queryFn: fetchTouchpoint,
    });

    useEffect(() => {
        if (touchpointList) {
            if (!searchBarInput) {
                setFilteredList(touchpointList);
                return;
            }
            let filteredData = touchpointList;
            if (searchBarInput) {
                filteredData = touchpointList.filter((touchpoint) => {
                    return (
                        touchpoint.name.toLowerCase().includes(searchBarInput.toLowerCase()) ||
                        (touchpoint.description && touchpoint.description.toLowerCase().includes(searchBarInput.toLowerCase()))
                    );
                });
            }

            setFilteredList(filteredData);
        }
    }, [touchpointList, searchBarInput]);

    useEffect(() => {
        setSearchBarInput('');
    }, [tabIndex]);

    const handleChangeTab = useCallback(
        (event: SyntheticEvent<Element, Event>, newValue: string) => {
            // navigate(`/campaign/list/${newValue}`);
            refetch();
        },
        [refetch],
    );

    const openDialog = useCallback(() => {
        openCreateCampaignDialog({
            onClose: (campaign) => {
                if (campaign && campaign.id) {
                    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
                    tabsRef.current?.refresh();
                    navigate(`../${campaign.id}`);
                }
            },
        });
    }, [navigate]);

    const refresh = useCallback(async () => {
        setSearchBarInput('');
        await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        await refetch();
        tabsRef.current?.refresh();
    }, [refetch, queryClient]);

    const Tabs = useMemo(
        () => <CampaignTabs tabsRef={tabsRef} currentTab={tabIndex} handleChange={handleChangeTab} refresh={refresh} />,
        [tabIndex, handleChangeTab, refresh],
    );

    const renderExtra = useCallback(
        () => (
            <Box className={styles.qrCodeContainer}>
                <div className={styles.tabContainer}>{Tabs}</div>
                <Space size={12}>
                    <Search
                        value={searchBarInput}
                        placeholder={t('campaign_search')}
                        onSearch={(inputValue) => setSearchBarInput(inputValue)}
                        onReset={() => setSearchBarInput('')}
                        width={248}
                        height={40}
                    />
                    <Dropdown
                        variant="text"
                        icon={viewType === 'list' ? <Icon name="list" /> : <Icon name="grid" />}
                        options={[
                            {
                                text: t('list_view'),
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
                            {
                                text: t('grid_view'),
                                icon: (
                                    <Icon
                                        name="grid"
                                        style={{
                                            color: 'var(--color-secondary-1)',
                                        }}
                                    />
                                ),
                                index: 'grid',
                            },
                        ]}
                        selectedIndex={viewType}
                        hideOnSelect
                        buttonSx={{
                            color: 'var(--color-secondary-3)',
                        }}
                        onSelect={(event, selectedIndex) => {
                            navigate(`/campaign/${selectedIndex}/${tab}`);
                        }}
                    />
                    {tabIndex !== 'archive' && isAllowModifyCampaign && (
                        <Dropdown
                            text={t('campaign_add')}
                            options={[
                                {
                                    text: t('campaign_new'),
                                    icon: <Icon name="folderAdd" />,
                                    index: 'campaign',
                                },
                                {
                                    text: t('campaign_new_touchpoint'),
                                    icon: <Icon name="insights" />,
                                    index: 'touchpoint',
                                },
                            ]}
                            hideOnSelect
                            onSelect={(event, selectedIndex) => {
                                if (selectedIndex === 'campaign') {
                                    openDialog();
                                }
                                if (selectedIndex === 'touchpoint') {
                                    navigate('/touchpoint/new', {
                                        state: {
                                            campaignId: tabIndex !== 'all' && tabIndex !== 'archive' ? tabIndex : undefined,
                                        },
                                    });
                                }
                            }}
                        />
                    )}
                </Space>
            </Box>
        ),
        [tabIndex, navigate, openDialog, searchBarInput, viewType, t, Tabs, tab],
    );

    const listItem = useCallback(
        (touchpoint: API.Touchpoint) => {
            return <TouchpointCard touchpoint={touchpoint} key={touchpoint.id} refresh={refresh} type={viewType} />;
        },
        [refresh, viewType],
    );

    const renderEmptyText = () => {
        if (searchBarInput) {
            return (
                <Trans i18nKey="campaign_list_empty_search">
                    No matching result has been found.\nCheck the spelling or create
                    <MuiLink
                        variant="inherit"
                        component={Link}
                        to={'/touchpoint/new'}
                        state={{
                            campaignId: tabIndex !== 'all' && tabIndex !== 'archive' ? tabIndex : undefined,
                        }}
                    >
                        a new Touchpoint
                    </MuiLink>
                    now.
                </Trans>
            );
        }
        if (tabIndex === 'archive') {
            return t('campaign_archived_list_empty');
        }
        if (tabIndex !== 'all') {
            return (
                <Trans i18nKey="campaign_list_empty_in_campaign">
                    You currently don’t have any Touchpoint set up in this Campaign.\nCreate
                    <MuiLink
                        variant="inherit"
                        component={Link}
                        to={'/touchpoint/new'}
                        state={{
                            campaignId: tabIndex !== 'all' && tabIndex !== 'archive' ? tabIndex : undefined,
                        }}
                    >
                        a new Touchpoint
                    </MuiLink>{' '}
                    in this Campaign folder now.
                </Trans>
            );
        }

        return (
            <Trans i18nKey="campaign_list_empty">
                You currently don’t have any Touchpoint set up.\nCreate
                <MuiLink
                    variant="inherit"
                    sx={{ cursor: 'pointer' }}
                    component="a"
                    onClick={() => {
                        openDialog();
                    }}
                >
                    a new Campaign
                </MuiLink>
                <MuiLink variant="inherit" component={Link} to={'/touchpoint/new'}>
                    a new Touchpoint
                </MuiLink>
            </Trans>
        );
    };

    return (
        <PageLayout loading={isFetching} title={t('campaign_header')} extra={renderExtra()}>
            {filteredList && filteredList.length > 0 ? (
                <InfiniteScrollList<API.Touchpoint>
                    containerProps={{
                        ref: listRef,
                        className: `${styles.container} ${styles[viewType]}`,
                    }}
                    dataSource={filteredList}
                    listItem={listItem}
                    onLoadMore={() => {
                        // TODO: implement load more with useInfiniteQuery with fetchNextPage
                    }}
                    loading={false}
                    hasMore={false}
                />
            ) : (
                <Space size={48} direction="vertical">
                    {searchBarInput ? (
                        <Illustration
                            name="fileSearch"
                            style={{
                                marginTop: '129px',
                            }}
                            description={renderEmptyText()}
                        />
                    ) : (
                        <Illustration
                            name={
                                tabIndex !== 'all' && tabIndex !== 'archive'
                                    ? 'qrCode'
                                    : tabIndex === 'archive'
                                    ? 'archiveEmpty'
                                    : 'campaignEmpty'
                            }
                            style={{
                                marginTop: '129px',
                            }}
                            description={renderEmptyText()}
                        />
                    )}
                </Space>
            )}
        </PageLayout>
    );
};

export default CampaignList;
