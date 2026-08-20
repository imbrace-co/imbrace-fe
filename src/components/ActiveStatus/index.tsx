import { format } from 'date-fns';
import type { FC } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

interface ActiveStatusProps {
    time?: string;
    color?: string;
}

const ActiveStatus: FC<ActiveStatusProps> = (props) => {
    const { time, color } = props;
    const { t } = useTranslation();

    const renderTimestamp = useCallback(() => {
        if (time) {
            // if (isToday(new Date(time))) {
            //     return format(new Date(time), 'HH:mm');
            // }

            return format(new Date(time), 'MM/dd/yyyy');
        }
        return '';
    }, [time]);

    const ActiveText = () => {
        if (time) {
            return t('user_activeStatus_withtime', { time: renderTimestamp() });
        }
        return '';
    };

    return (
        <div className={styles.activeStatus}>
            <div className={styles.label} style={{ color: color }}>
                {ActiveText()}
            </div>
        </div>
    );
};

export default ActiveStatus;
