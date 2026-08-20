import { Tooltip } from '@imbrace/ui';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

export type Type = 'active' | 'inactive' | 'archived' | 'update_needed';

const Status = ({ type }: { type: Type }) => {
    const { t } = useTranslation();

    return (
        <Tooltip title={t('campaign_touchpoint_badge_tooltip')} disableHoverListener={type !== 'update_needed'} placement="top" arrow>
            <span className={`${styles.container} ${styles[type]}`}>{t(type)}</span>
        </Tooltip>
    );
};

export default Status;
