import React from 'react';
import { Link } from 'react-router-dom';

import ImbraceSvgLogo from '@/assets/icons/imbrace_logo.svg?react';

import styles from './index.module.scss';

const ImbraceLogo = () => {
    return (
        <Link to={'/'}>
            <ImbraceSvgLogo className={styles.logo} />
        </Link>
    );
};

export default ImbraceLogo;
