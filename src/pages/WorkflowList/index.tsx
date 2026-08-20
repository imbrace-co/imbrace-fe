import { Button, Icon, Search, Tabs } from '@imbrace/ui';
import { Box } from '@mui/material';
import type { QueryFunction } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { FC, SyntheticEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import PageLayout from '@/components/PageLayout';
import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import { FETCH_IN_PROGRESS } from '@/constants/app';
import useAccess from '@/hooks/useAccess';
import useChannels from '@/hooks/useChannels';
import { useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';
import { fetchAutomationWorkflows } from '@/services/api/boardAutomation';
import { getAllWorkflows } from '@/services/api/workflow';
import { IpsClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { getIsAllowModify } from '@/utils/CookiesHelper';

import type { WorkflowTableContentRef } from './components/WorkflowTableContent';
import WorkflowTableContent from './components/WorkflowTableContent';
import styles from './index.module.scss';

export type TabName = 'channels' | 'board' | 'automations';

export const workflowTabs: { tab: string; tag: string }[] = [
    /* 'libraries', */ { tab: 'channels', tag: 'channel' },
    { tab: 'board', tag: 'board,automation' },
    { tab: 'automations', tag: 'automation' },
];

const handleFetchWorkflow: QueryFunction<
    API.WorkflowListItem[],
    [
        'workflows',
        string | undefined,
        {
            channel?: string;
            search?: string;
        },
    ]
> = async ({ queryKey }) => {
    const { search, channel } = queryKey[2];
    const tag = queryKey[1];
    if (!tag) {
        throw new Error('missing tag');
    }
    if (tag === 'channel' && !channel) {
        throw new Error('missing channel');
    }
    if (tag === 'board,automation') {
        const { data } = await apiFetch<API.WorkflowListItem[]>(
            fetchAutomationWorkflows.api,
            fetchAutomationWorkflows.method,
            {},
            IpsClient,
        );
        if (search) {
            return data.filter((workflow) => workflow.name.toLowerCase().includes(search.toLowerCase()));
        }
        return data;
    }
    const { data } = await apiFetch<{ data: API.WorkflowListItem[] }>(
        getAllWorkflows.api({
            tag: tag === 'channel' ? channel : tag,
            search,
        }),
        getAllWorkflows.method,
    );

    return data.data;
};

const WorkflowList: FC<{ isV2?: boolean }> = ({ isV2 = false }) => {
    const { tab } = useParams<{ tab?: TabName }>();
    const { t } = useTranslation();
    const location = useLocation();
    const { features } = useAccess();
    const { openHelpCenter } = useNavbar();
    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const supportTouchpoint = useAppSelector((state) => state.Account.support?.customer?.touchpoint);
    const loadingStatus = useAppSelector((state) => state.Workflow.fetchAllWorkFlowListLoadingStatus);
    const [tabIndex, setTabIndex] = useState<TabName>('channels');
    const [searchBarInput, setSearchBarInput] = useState('');
    const [currentChannel, setCurrentChannel] = useState<API.ChannelType>(location.state?.currentChannel);

    const workflowTableRef = useRef<WorkflowTableContentRef>(null);
    const navigate = useNavigate();
    const { channels } = useChannels();
    const isAllowModifyWorkflow = getIsAllowModify();

    const { data, isFetching, refetch } = useQuery({
        queryKey: [
            'workflows',
            workflowTabs?.find((workflowTab) => workflowTab.tab === tabIndex)?.tag,
            {
                channel: currentChannel,
                search: searchBarInput,
            },
        ],
        queryFn: handleFetchWorkflow,
        initialData: [],
        enabled: !(tab === 'channels' && !currentChannel),
    });

    const needUpgrade = useMemo(() => {
        if (tabIndex === 'channels') {
            return features.workflows({
                channelWorkflowCount: data.length || 0,
            });
        }
        return false;
    }, [features, tabIndex, data]);

    useEffect(() => {
        if (tab && ['channels', 'board', 'automations'].indexOf(tab) !== -1) {
            setTabIndex(tab);
        } else {
            setTabIndex('channels');
        }
    }, [tab]);

    useEffect(() => {
        if (!currentChannel && channels.length > 0) {
            setCurrentChannel(channels[0]);
        }
    }, [currentChannel, channels]);

    const resetSearchInput = useCallback(() => {
        setSearchBarInput('');
    }, []);

    useEffect(() => {
        resetSearchInput();
    }, [resetSearchInput, tabIndex]);

    const handleChange = (event: SyntheticEvent<Element, Event>, newValue: TabName) => {
        setTabIndex(newValue);
    };

    const handleChannelChange = (event: SyntheticEvent<Element, Event>, newValue: API.ChannelType) => {
        setCurrentChannel(newValue);
    };

    return (
        <PageLayout
            title={t('workflows_heading')}
            loading={isFetching}
            extra={
                <Box className={styles.workflowContainer}>
                    <div className={styles.tabContainer}>
                        <Tabs
                            tabs={[
                                {
                                    value: 'channels',
                                    label: t('workflows_tab_channels'),
                                    onClick: () => {
                                        if (isV2) {
                                            navigate('/workflows_v2/channels');
                                        } else {
                                            navigate('/workflows/channels');
                                        }
                                    },
                                },
                                {
                                    value: 'board',
                                    label: t('workflows_tab_board'),
                                    onClick: () => {
                                        if (isV2) {
                                            navigate('/workflows_v2/board');
                                        } else {
                                            navigate('/workflows/board');
                                        }
                                    },
                                },

                                {
                                    value: 'automations',
                                    label: t('workflows_tab_automations'),
                                    onClick: () => {
                                        if (isV2) {
                                            navigate('/workflows_v2/automations');
                                        } else {
                                            navigate('/workflows/automations');
                                        }
                                    },
                                },
                            ]}
                            currentTab={tabIndex}
                            onChange={handleChange}
                        />
                    </div>

                    <Box className={styles.workflowRightContainer}>
                        <div style={{ width: 248 }}>
                            <Search
                                value={searchBarInput}
                                placeholder={t('workflow_search')}
                                onSearch={(inputValue) => setSearchBarInput(inputValue)}
                                onReset={resetSearchInput}
                            />
                        </div>

                        {isAllowModifyWorkflow && (
                            <Button
                                onClick={() => {
                                    if (needUpgrade) {
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
                                        return;
                                    }
                                    navigate(`/workflow${isV2 ? '_v2' : ''}/${tabIndex}/new`, {
                                        state: {
                                            tag:
                                                tabIndex === 'channels'
                                                    ? `${tabIndex === 'channels' && currentChannel ? `${currentChannel},` : ''}automation`
                                                    : workflowTabs.find((workflowTab) => workflowTab.tab === tabIndex)?.tag,
                                        },
                                    });
                                }}
                                disabled={loadingStatus === FETCH_IN_PROGRESS}
                                endIcon={needUpgrade ? <Icon name="premium" /> : null}
                                text={t('workflow_add_new_button')}
                            />
                        )}
                    </Box>
                </Box>
            }
        >
            <Box sx={{ width: '100%' }}>
                <Box className={styles.workflowTableContainer}>
                    <WorkflowTableContent
                        ref={workflowTableRef}
                        tabIndex={tabIndex}
                        searchBarInput={searchBarInput}
                        channels={channels}
                        currentChannel={currentChannel}
                        handleChannelChange={handleChannelChange}
                        dataSource={data}
                        refetch={refetch}
                        isV2={isV2}
                    />
                </Box>
            </Box>
        </PageLayout>
    );
};

export default WorkflowList;
