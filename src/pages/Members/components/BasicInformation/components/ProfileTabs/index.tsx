import { Icon, Tabs } from '@imbrace/ui';
import { Box, CircularProgress } from '@mui/material';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProfileTabType } from '@/pages/Databoards/components/BoardDetailedModal/ContactProfileTabs';

interface Props {
    currentTab: ProfileTabType;
    setCurrentTab: Dispatch<SetStateAction<ProfileTabType>>;
    linkedBoards?: Record<string, API.Board>;
    isTabLoading: boolean;
}

const ProfileTabs = (props: Props) => {
    const { currentTab, setCurrentTab, linkedBoards, isTabLoading } = props;
    const { t } = useTranslation();
    const TabsRef = useRef(null);

    const profileTabs = useMemo(() => {
        return [
            {
                id: 'basics',
                value: 'basics',
                label: t('basics'),
            },
            {
                id: 'conversations',
                value: 'conversations',
                label: t('conversations'),
            },
            {
                id: 'files',
                value: 'files',
                label: t('files'),
            },
            {
                id: 'opportunities',
                value: 'opportunities',
                label: linkedBoards?.Opportunities?.name,
                icon: () =>
                    isTabLoading ? (
                        <Box sx={{ height: '29px', width: '136px', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                            <CircularProgress size={20} />
                        </Box>
                    ) : (
                        <Icon name="relationship" fontSize={24} />
                    ),
            },
            {
                id: 'tasks',
                value: 'tasks',
                label: linkedBoards?.Tasks?.name,
                icon: () =>
                    isTabLoading ? (
                        <Box sx={{ height: '29px', width: '76px', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                            <CircularProgress size={20} />
                        </Box>
                    ) : (
                        <Icon name="relationship" fontSize={24} />
                    ),
            },
        ];
    }, [t, isTabLoading, linkedBoards]);

    return (
        <Tabs
            ref={TabsRef}
            tabs={profileTabs}
            currentTab={currentTab}
            onChange={(e, tab) => {
                setCurrentTab(tab);
            }}
        />
    );
};

export default ProfileTabs;
