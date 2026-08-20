import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import type { FC, SyntheticEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import BatchInvite from '@/pages/Members/components/AddMemberDrawer/batchInvite';
import type { InviteTabsProp, TabPanelProp } from '@/pages/Members/IMember.types';

import styles from './index.module.scss';
import Invite from './invite';

function TabPanel(props: TabPanelProp) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            className={styles.tabContainer}
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`inviteMember-tab-${index}`}
            {...other}
        >
            {value === index && children}
        </div>
    );
}
const InviteTabs: FC<InviteTabsProp> = (props) => {
    const { step, setStep, onFinish } = props;
    const [value, setValue] = useState(0);
    const { t } = useTranslation();
    const handleChange = (event: SyntheticEvent, newValue: number) => {
        setValue(newValue);
        setStep(0);
    };

    return (
        <>
            <Tabs
                value={value}
                sx={{
                    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                    '& .MuiTabs-indicator': {
                        backgroundColor: 'var(--color-primary-1)',
                        height: 5,
                    },
                }}
                onChange={handleChange}
                variant="fullWidth"
                scrollButtons="auto"
                aria-label="invite member tabs"
            >
                <Tab
                    sx={{
                        color: '#bdbdbd',
                        '&.Mui-selected': {
                            color: 'var(--color-primary-1)',
                            fontWeight: 500,
                        },
                    }}
                    label={t('member_add_member_invite')}
                />
                <Tab
                    sx={{
                        color: '#bdbdbd',
                        '&.Mui-selected': {
                            color: 'var(--color-primary-1)',
                            fontWeight: 500,
                        },
                    }}
                    label={t('member_add_member_batch_invite')}
                />
            </Tabs>
            <TabPanel value={value} index={0}>
                <Invite step={step} setStep={setStep} onFinish={onFinish} />
            </TabPanel>
            <TabPanel value={value} index={1}>
                <BatchInvite onFinish={onFinish} />
            </TabPanel>
        </>
    );
};

export default InviteTabs;
