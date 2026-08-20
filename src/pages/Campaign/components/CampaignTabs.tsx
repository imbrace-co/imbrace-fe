import type { TabProps, TabsRef } from '@imbrace/ui';
import { Icon, IconButton, Tabs } from '@imbrace/ui';
import { useQueryClient } from '@tanstack/react-query';
import type { Ref, SyntheticEvent } from 'react';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { deleteCampaign, getCampaigns } from '@/services/api/campaign';
import apiFetch from '@/services/axios/handler';

import { openDeleteCampaignDialog } from './DeleteCampaignModal';

interface CampaignProps {
    tabsRef: Ref<TabsRef>;
    currentTab: string;
    refresh: () => void;
    handleChange: (event: SyntheticEvent<Element, Event>, value: string) => void;
}

const CampaignTabs = ({ currentTab, handleChange, refresh, tabsRef }: CampaignProps) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const navigateRef = useRef(navigate);

    const handleDeleteCampaign = useCallback(
        async (campaignId: string) => {
            try {
                openDeleteCampaignDialog({
                    onClose: async (step) => {
                        if (step !== 3) {
                            await apiFetch(deleteCampaign.api(campaignId), deleteCampaign.method, {
                                move_touchpoint_to_all: true,
                            });
                            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
                        } else {
                            refresh();
                            navigateRef.current('../all');
                        }
                    },
                    onConfirm: async (step, dontAskAgain) => {
                        if (step !== 3) {
                            if (localStorage.getItem('dont_asked_delete_all_touchpoints_again') === 'true') {
                                await apiFetch(deleteCampaign.api(campaignId), deleteCampaign.method, {
                                    move_touchpoint_to_all: false,
                                });
                                queryClient.invalidateQueries({ queryKey: ['campaigns'] });
                                refresh();
                                navigateRef.current('../all');
                                return true;
                            }
                            if (step === 2) {
                                if (dontAskAgain) {
                                    localStorage.setItem('dont_asked_delete_all_touchpoints_again', 'true');
                                }
                                await apiFetch(deleteCampaign.api(campaignId), deleteCampaign.method, {
                                    move_touchpoint_to_all: false,
                                });
                                queryClient.invalidateQueries({ queryKey: ['campaigns'] });
                                refresh();
                                navigateRef.current('../all');
                            }
                        } else {
                            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
                            refresh();
                            navigateRef.current('../all');
                        }
                    },
                });
            } catch (error) {
                console.log(error);
            }
        },
        [refresh],
    );

    const fetchCampaigns = useCallback(async () => {
        try {
            const { data } = await apiFetch<API.PaginatedResponse<API.CampaignBase[]>>(getCampaigns.api(), getCampaigns.method);

            const campaignTabs = data.data.map((campaign) => {
                const menuOptions = [
                    {
                        text: 'Delete',
                        index: 'delete',
                        handler: () => {
                            handleDeleteCampaign(campaign.id || campaign._id);
                        },
                    },
                ];

                return {
                    id: campaign.id || campaign._id,
                    value: campaign.id || campaign._id,
                    label: campaign.name,
                    menuOptions: menuOptions,
                    icon: (handleOpen) => (
                        <IconButton
                            size="xs"
                            type="secondary"
                            variant="text"
                            onClick={handleOpen}
                            disableRipple
                            sx={{
                                color: 'var(--color-primary-1)',
                                '&:hover': {
                                    color: 'var(--color-primary-1)',
                                },
                            }}
                        >
                            <Icon name="moreVert" />
                        </IconButton>
                    ),
                    iconPosition: 'end',
                    onClick: () => {
                        navigateRef.current(`../${campaign.id || campaign._id}`);
                    },
                } as TabProps;
            });

            return [
                {
                    value: 'all',
                    label: t('all'),
                    onClick: () => {
                        navigateRef.current('../all');
                    },
                },
                ...campaignTabs,
                { type: 'divider' },
                {
                    value: 'archive',
                    label: t('archive'),
                    onClick: () => {
                        navigateRef.current('../archive');
                    },
                    icon: () => <Icon name="archive" />,
                    iconPosition: 'start',
                },
            ] as TabProps[];
        } catch (error) {
            console.log(error);
            return [];
        }
    }, [t, handleDeleteCampaign]);

    return <Tabs ref={tabsRef} queryKey={['campaigns', 'tab']} currentTab={currentTab} request={fetchCampaigns} onChange={handleChange} />;
};

export default CampaignTabs;
