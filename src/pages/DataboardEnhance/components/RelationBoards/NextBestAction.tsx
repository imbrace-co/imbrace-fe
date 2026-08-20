import { env } from '@/env';
import { forwardRef, useRef } from 'react';

const NextBestAction = forwardRef<HTMLIFrameElement, Record<string, never>>((props, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const src = `${env.VITE_APP_BEST_ACTION}/best-actions`;

    return (
        <iframe
            ref={ref ?? iframeRef}
            src={src}
            allow="clipboard-read; clipboard-write"
            title="Next Best Action"
            style={{
                width: '100%',
                height: '300px',
                border: 0,
                borderRadius: '4px',
            }}
        />
    );
});

export default NextBestAction; 