import React from 'react';

import Logo from '../../assets/icons/imbrace_logo_small.svg?react';
import styles from './loading.module.scss';

interface Props {
    width?: number;
    height?: number;
}

function Loading(props: Props) {
    return (
        <div className={styles.loadingContainer}>
            <Logo {...props} />
        </div>
    );
}

export default Loading;
