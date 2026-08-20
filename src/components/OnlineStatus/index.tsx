import type { FC } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import clsx from '@/utils/clsx';

import styles from './index.module.scss';

interface OnlineStatusProps {
    isOnline?: boolean;
    hideOfflineLabel?: boolean;
    showTime?: boolean;
    time?: string;
    color?: string;
}

const OnlineStatus: FC<OnlineStatusProps> = (props) => {
    const { isOnline, time, showTime, color } = props;
    const { t } = useTranslation();

    const renderTimestamp = useCallback(() => {
        if (time) {
            if (
                new Date(time).getDate() === new Date().getDate() && // if today, render the time
                new Date(time).getMonth() === new Date().getMonth() &&
                new Date(time).getFullYear() === new Date().getFullYear()
            ) {
                return `${new Date(time).getHours().toString().padStart(2, '0')}:${new Date(time)
                    .getMinutes()
                    .toString()
                    .padStart(2, '0')}`;
            }

            return `${new Date(time).getDate()}/${new Date(time).getMonth() + 1}/${new Date(time).getFullYear()}`;
        }
        return '';
    }, [time]);

    const offlineText = () => {
        if (showTime && time) {
            return t('last_active', { time: renderTimestamp() });
        }
        return t('offline');
    };

    return (
        <div className={clsx(styles.onlineStatus, isOnline && styles.online)}>
            <div className={styles.label} style={{ color: !isOnline && color ? color : '' }}>
                {isOnline ? t('online') : offlineText()}
            </div>
        </div>
    );
};

export default OnlineStatus;
