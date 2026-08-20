import { forwardRef, useRef } from 'react';

import { env } from '@/env';
import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';

const DeveloperPortal = forwardRef<HTMLIFrameElement, Record<string, never>>((props, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const token = window.localStorage.getItem(IMBRACE_ACCESS_TOKEN);
    const src = `${env.VITE_APP_DEV_PORTAL}/docs?token=${token}`;


    return (
        <iframe
            ref={ref ?? iframeRef}
            src={src}
            allow="clipboard-read; clipboard-write"
            title='Internal AI Chat'
            style={{
                width: '100%',
                height: '100%',
                border: 0,
                borderBottomLeftRadius: '4px',
                borderBottomRightRadius: '4px',
                paddingTop: '16px',
            }}
        />
    );
});

export default DeveloperPortal;