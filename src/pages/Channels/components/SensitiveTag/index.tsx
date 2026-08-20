import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import type { FC } from 'react';

import styles from './index.module.scss';

interface SensitiveTagType {
    level: number;
}
const SensitiveTag: FC<SensitiveTagType> = (props) => {
    const { level } = props;
    const getLevelStyle = () => {
        switch (level) {
            case 1:
                return styles.level1;
            case 2:
                return styles.level2;
            case 3:
                return styles.level3;
            case 4:
                return styles.level4;
            case 5:
                return styles.level5;
            default:
                return '';
        }
    };
    return (
        <div className={`${styles.sensitiveTag} ${getLevelStyle()}`}>
            <SignalCellularAltIcon
                sx={{
                    width: 14,
                    height: 14,
                }}
            />
            <span>{level}</span>
        </div>
    );
};

export default SensitiveTag;
