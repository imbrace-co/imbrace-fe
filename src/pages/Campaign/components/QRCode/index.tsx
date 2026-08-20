import { QRCode } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { getBase64FromUrl } from '../campaignCommonFunc';
import Action from './action';
import styles from './index.module.scss';

interface QRCodeProps {
    url: string;
    logo?: string;
    fileName: string;
}

const QRCodeInfo = ({ url, logo, fileName }: QRCodeProps) => {
    const [logoBase64, setLogoBase64] = useState<string>();
    const qrCodeContainerRef = useRef<HTMLDivElement>(null);
    const isFirefox = typeof window !== 'undefined' && window.navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

    useEffect(() => {
        if (logo) {
            const execute = async () => {
                const data = await getBase64FromUrl(logo);
                setLogoBase64(data as string);
            };
            execute();
        }
    }, [logo]);

    return (
        <div className={styles.container}>
            <div>
                <QRCode type="svg" errorLevel="H" bordered={false} bgColor="white" size={88} iconSize={88 * 0.4} value={url} icon={logoBase64} />
            </div>
            <div ref={qrCodeContainerRef} style={{ position: 'absolute', display: 'none' }}>
                <QRCode errorLevel="H" bgColor="white" bordered={false} size={2000} iconSize={800} value={url} icon={logoBase64} />
            </div>
            <div className={styles.actions}>
                {!isFirefox && (
                    <div>
                        <Action type="copy" qrCodeRef={qrCodeContainerRef} />
                    </div>
                )}
                <div>
                    <Action type="download" qrCodeRef={qrCodeContainerRef} fileName={fileName} />
                </div>
            </div>
        </div>
    );
};

export default QRCodeInfo;
