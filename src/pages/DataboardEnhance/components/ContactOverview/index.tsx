import { Space, Tabs } from '@imbrace/ui';
import { Divider } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Files from '@/pages/Members/components/MemberDetailV2/files';

import Conversations from '../Conversations';
import styles from './index.module.scss';
import Overview from './overview';
import PinnedAndNotes from '../RecordDetail/PinnedAndNotes';
import Activities from '../RecordDetail/Activities';

const ContactOverView = ({
    inModal,
    userId,
    stages,
    origin,
    defaultView,
}: {
    inModal?: boolean;
    userId: string;
    stages?: string;
    origin?: API.OriginValue;
    defaultView?: string;
}) => {
    const [currentTab, setCurrentTab] = useState(defaultView || 'activities');
    const { t } = useTranslation();

    return (
        <Space size={0} direction="vertical" align="stretch" className={styles.container}>
            <Tabs
                tabs={[
                    // {
                    //     id: 'overview',
                    //     value: 'overview',
                    //     label: t('overview'),
                    // },
                    {
                        id: 'conversations',
                        value: 'conversations',
                        label: t('conversations'),
                    },
                     {
                        id: 'activities',
                        value: 'activities',
                        label: t('activities'),
                    },
                    // {
                    //     id: 'pinnedAndNotes',
                    //     value: 'pinnedAndNotes',
                    //     label: 'Pinned & Notes',
                    // },
                    {
                        id: 'files',
                        value: 'files',
                        label: t('files'),
                    },
                ]}
                currentTab={currentTab}
                onChange={(tab, newValue) => {
                    setCurrentTab(newValue);
                }}
                sx={{
                    padding: '0 16px',
                }}
            />
            <div style={{ flex: 1, overflow: 'scroll', height: 'calc(100vh - 120px)' }}>
                {/* {currentTab === 'overview' && <Overview stages={stages} origin={origin} />} */}
                {currentTab === 'conversations' && <Conversations userId={userId} onClose={() => {}} frameLess />}
                {/* {currentTab === 'pinnedAndNotes' && <PinnedAndNotes userId={userId} />} */}
                {currentTab === 'activities' && <Activities userId={userId} inModal={inModal} frameLess />}
                {currentTab === 'files' && <Files userId={userId} frameLess  />}
            </div>
        </Space>
    );
};

export default ContactOverView;
