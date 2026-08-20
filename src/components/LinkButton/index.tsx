import type { AnchorHTMLAttributes, ButtonHTMLAttributes, PropsWithChildren } from 'react';

import styles from './index.module.scss';

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> | ButtonHTMLAttributes<HTMLButtonElement>;

const LinkButton = ({ children, ...restProps }: PropsWithChildren<LinkButtonProps>) => {
    if ('target' in restProps) {
        return (
            <a className={styles.link} {...(restProps as AnchorHTMLAttributes<HTMLAnchorElement>)}>
                {children}
            </a>
        );
    }
    return (
        <button className={styles.linkButton} {...(restProps as ButtonHTMLAttributes<HTMLButtonElement>)}>
            {children}
        </button>
    );
};

export default LinkButton;
