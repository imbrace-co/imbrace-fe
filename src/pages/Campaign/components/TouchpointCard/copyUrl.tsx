import { Icon } from '@imbrace/ui';
import { useEffect, useState } from 'react';

import styles from './copyUrl.module.scss';

const CopyUrl = ({ url }: { url: string }) => {
    const [success, setSuccess] = useState(false);
    const [isHover, setIsHover] = useState(false);

    useEffect(() => {
        if (success) {
            const timeout = setTimeout(() => {
                setSuccess(false);
            }, 3000);
            return () => {
                clearTimeout(timeout);
            };
        }
    }, [success]);

    const copy = async () => {
        try {
            const type = 'text/plain';
            const blob = new Blob([url], { type });
            await navigator.clipboard.write([
                new ClipboardItem({
                    [type]: blob,
                }),
            ]);
            setSuccess(true);
        } catch (error) {
            console.log(error);
            setSuccess(false);
        }
    };

    return (
        <div
            className={styles.copyUrl}
            onMouseEnter={() => {
                setIsHover(true);
            }}
            onMouseLeave={() => {
                setIsHover(false);
            }}
            onClick={copy}
        >
            <Icon name={success ? 'codeCopied' : isHover ? 'copy' : 'link'} />
            <div>
                <div className={styles.textContainer}>
                    <span>{url}</span>
                </div>
            </div>
        </div>
    );
};

export default CopyUrl;
