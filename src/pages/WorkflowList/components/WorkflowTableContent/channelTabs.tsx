import { Icon } from '@imbrace/ui';
import { styled, Tab as MuiTab, Tabs } from '@mui/material';
import type { SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';

const Tab = styled(MuiTab)(() => ({
    textTransform: 'none',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    minHeight: 'auto',
    gap: '8px',
    padding: '4px 8px',
    borderRadius: '4px 4px 0px 0px',
    lineHeight: 'initial',
    fontSize: 14,
    fontWeight: 600,
    width: 120,
    height: 32,
    background: 'var(--color-secondary-2)',
    '&:hover': {
        background: 'var(--color-primary-3)',
    },
    '& .MuiTab-iconWrapper': {
        marginBottom: 0,
    },
    '& svg': {
        width: '16px !important',
        height: '16px',
    },
    '&.Mui-selected': {
        background: 'var(--color-primary-3)',
    },
}));

const ChannelTabs = ({
    channels,
    currentChannel,
    handleChange,
}: {
    channels: API.ChannelType[];
    currentChannel?: API.ChannelType;
    handleChange: (event: SyntheticEvent<Element, Event>, value: API.ChannelType) => void;
}) => {
    const { t } = useTranslation();
    if (channels.length === 0) {
        return null;
    }
    return (
        <Tabs
            sx={{
                minHeight: 'auto',
                '& .MuiTabs-flexContainer': {
                    gap: '10px',
                },
            }}
            onChange={handleChange}
            value={currentChannel}
            TabIndicatorProps={{
                style: {
                    display: 'none',
                },
            }}
        >
            {channels.map((channel) => (
                <Tab
                    key={channel}
                    value={channel}
                    label={<span>{t(`channel_${channel}`)}</span>}
                    icon={<Icon namespace="channel" name={channel} fontSize={16} />}
                />
            ))}
        </Tabs>
    );
};

export default ChannelTabs;
