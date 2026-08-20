import { Icon, IconButton } from '@imbrace/ui';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import store from '@/redux/store';

interface DownloadFileProps {
    fileName: string;
    url: string;
}

const DownloadFile = ({ fileName, url }: DownloadFileProps) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { t } = useTranslation();
    const [state, setState] = useState({
        success: false,
        doing: false,
    });

    useEffect(() => {
        if (state.success) {
            const timeout = setTimeout(() => {
                setState({ success: false, doing: false });
            }, 3000);
            return () => {
                clearTimeout(timeout);
            };
        }
    }, [state.success]);

    const download = useCallback(async () => {
        try {
            setState({ success: false, doing: true });
            const res = await axios(url, { responseType: 'blob' });

            const link = document.createElement('a');
            const href = URL.createObjectURL(res.data);
            link.setAttribute('target', '_blank');
            link.setAttribute('href', href);
            link.setAttribute('download', `${fileName}`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(href);
            setState({ success: true, doing: false });
        } catch (error) {
            console.log(error);
            import('@/redux/slices/notification').then(({ pushNotification }) => {
                store.dispatch(
                    pushNotification({
                        notification: {
                            message: t('file_expired'),
                            messageType: 'noti_failed',
                            variant: 'error',
                        },
                    }),
                );
            });

            setState({ success: false, doing: false });
        }
    }, [fileName, url, t]);

    const handleClick = useCallback(() => {
        buttonRef.current?.blur();
        if (state.success) {
            return;
        }

        download();
    }, [state.success, download]);

    return (
        <IconButton ref={buttonRef} variant="text" size="s" onClick={handleClick} loading={state.doing}>
            <Icon name={state.success ? 'downloaded' : 'download'} />
        </IconButton>
    );
};

export default DownloadFile;
