import { Icon, IconButton } from '@imbrace/ui';
import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface ActionProps {
    type: 'copy' | 'download';
    fileName?: string;
    qrCodeRef: RefObject<HTMLDivElement>;
}

const Action = ({ type = 'copy', fileName, qrCodeRef }: ActionProps) => {
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
            const canvas = qrCodeRef?.current?.querySelector('canvas');
            const data = canvas?.toDataURL('image/jpg');
            if (data) {
                setState({ success: false, doing: true });
                const link = document.createElement('a');
                link.setAttribute('href', data);
                link.setAttribute('download', `${fileName}.png`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setState({ success: true, doing: false });
            }
        } catch (error) {
            console.log(error);
            setState({ success: false, doing: false });
        }
    }, [qrCodeRef, fileName]);

    const copy = useCallback(async () => {
        try {
            const canvas = qrCodeRef?.current?.querySelector('canvas');
            const data = canvas?.toDataURL('image/jpg');
            if (data) {
                setState({ success: false, doing: false });
                const getImageBlob = async () => {
                    const image = await fetch(data);
                    const imageBlob = await image.blob();
                    return imageBlob;
                };
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': getImageBlob(),
                    }),
                ]);
                setState({ success: true, doing: false });
            }
        } catch (error) {
            console.log(error);
            setState({ success: false, doing: false });
        }
    }, [qrCodeRef]);

    const iconName = useMemo(() => {
        if (type === 'download') {
            return state.success ? 'downloaded' : 'download';
        }
        return state.success ? 'codeCopied' : 'copy';
    }, [type, state.success]);

    const handleClick = useCallback(() => {
        if (state.success) {
            return;
        }
        if (type === 'copy') {
            copy();
        } else {
            download();
        }
    }, [state.success, copy, download, type]);

    return (
        <IconButton variant="text" size="s" onClick={handleClick} loading={state.doing}>
            <Icon name={iconName} />
        </IconButton>
    );
};

export default Action;
