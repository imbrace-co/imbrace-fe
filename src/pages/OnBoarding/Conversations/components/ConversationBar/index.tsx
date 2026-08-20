import { Icon } from '@imbrace/ui';
import { Button, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SimpleBar from 'simplebar-react';

import ChannelButton from '@/pages/Conversations/components/ChannelButton';
import styles from '@/pages/Conversations/components/ConversationBar/index.module.scss';
import ConversationSearchBar from '@/pages/Conversations/components/ConversationSearchBar';
import { resetChannelFilter, selectAllChannel, updateChannelFilter } from '@/redux/slices/teamConversation';
import { useAppDispatch, useAppSelector } from '@/redux/store';

import ConversationList from '../ConversationList';

export const ChannelInfo: Record<
    API.ChannelType,
    {
        size: 'small' | 'large' | 'medium';
    }
> = {
    web: {
        size: 'medium',
    },
    whatsapp: {
        size: 'small',
    },
    facebook: {
        size: 'small',
    },
    email: {
        size: 'small',
    },
    wechat: {
        size: 'small',
    },
    line: {
        size: 'small',
    },
    instagram: {
        size: 'small',
    },
};

function ConversationBar() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const channelFilter = useAppSelector((state) => state.TeamConversation.channelFilter);
    const channels = useMemo(() => {
        return ['web'] as API.ChannelType[];
    }, []);

    return (
        <div className={styles.roomListRoot}>
            <ConversationSearchBar />
            <div className={styles.roomListChannelRoot}>
                <div className={styles.roomListChannelHeader}>
                    <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }} variant={'body1'}>
                        {t('conversation_channels_select')}
                    </Typography>

                    <div className={styles.roomListChannelHeaderButtons}>
                        <Button
                            size="small"
                            sx={{ fontSize: '0.875rem', color: '#3399fc', padding: 0, minWidth: 50 }}
                            onClick={() => dispatch(selectAllChannel())}
                        >
                            {t('conversation_channels_all')}
                        </Button>

                        <Button
                            size="small"
                            sx={{ fontSize: '0.875rem', color: '#3399fc', padding: 0, minWidth: 50 }}
                            onClick={() => dispatch(resetChannelFilter())}
                        >
                            {t('conversation_channels_reset')}
                        </Button>
                    </div>
                </div>
            </div>
            <SimpleBar autoHide className={styles.channelItems}>
                <div
                    className={`${styles.inner}`}
                    style={{ width: (channels?.length ?? 0) * 40 + ((channels?.length ?? 1) - 1) * 10 + 26 }}
                >
                    {channels?.map((channel, index) => (
                        <ChannelButton
                            key={index}
                            icon={<Icon namespace="channel" name={channel} style={{ fontSize: 24 }} />}
                            size={ChannelInfo[channel]?.size}
                            isCheck={channelFilter.includes(channel)}
                            onClick={() => dispatch(updateChannelFilter(channel))}
                        />
                    ))}
                </div>
            </SimpleBar>

            <ConversationList />
        </div>
    );
}

export default ConversationBar;
