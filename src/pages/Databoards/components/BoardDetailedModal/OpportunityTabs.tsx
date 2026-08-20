import { Icon, Tabs } from '@imbrace/ui';
import { Box, CircularProgress } from '@mui/material';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export type ProfileTabType = 'basics' | 'conversations' | 'files' | 'opportunities' | 'tasks';

interface Props {
    currentTab: ProfileTabType;
    setCurrentTab: Dispatch<SetStateAction<ProfileTabType>>;
    linkedBoards?: Record<string, API.Board>;
    isTabLoading: boolean;
}

const OpportunityTabs = (props: Props) => {
    const { isTabLoading, linkedBoards, currentTab, setCurrentTab } = props;
    const { t } = useTranslation();
    const TabsRef = useRef(null);

    const profileTabs = useMemo(() => {
        return [
            {
                id: 'basics',
                value: 'basics',
                label: t('summary'),
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
    }, [t, linkedBoards, isTabLoading]);
    return (
        <Tabs
            ref={TabsRef}
            tabs={profileTabs}
            currentTab={currentTab}
            onChange={(e, newValue) => {
                setCurrentTab(newValue);
            }}
            sx={{
                '& .MuiTabs-flexContainer': {
                    height: '40px',
                },
            }}
        />
    );
};

export default OpportunityTabs;
