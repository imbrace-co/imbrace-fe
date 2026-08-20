import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

const OrDivider = () => {
    const { t } = useTranslation();

    return (
        <div className={styles.divider}>
            <Typography sx={{ mx: 1, color: '#4f4f4f', fontSize: 14 }}>{t('or')}</Typography>
        </div>
    );
};

export default OrDivider;
