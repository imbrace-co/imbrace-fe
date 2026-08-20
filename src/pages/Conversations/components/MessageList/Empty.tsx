import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import LogoSVG from '@/assets/images/imbrace_logo.svg?react';

import styles from './index.module.scss';

const Empty = () => {
    const { t } = useTranslation();
    return (
        <div className={styles.empty}>
            <LogoSVG />
            <Typography variant="body1" sx={{ mt: '29px', color: '#828282' }}>
                {t('conversation_start')}
            </Typography>
        </div>
    );
};
export default Empty;
