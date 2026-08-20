import { env } from '@/env';
import { forwardRef, useRef, useEffect } from 'react';

interface SuggestedMessageProps {
    onMessageInsert?: (messageContent: string) => void;
}

const SuggestedMessage = forwardRef<HTMLIFrameElement, SuggestedMessageProps>(({ onMessageInsert }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const src = `${env.VITE_APP_BEST_ACTION}/suggested-messages`;

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== env.VITE_APP_BEST_ACTION) {
                return;
            }
            if (event.data?.type === 'insertMessage' && event.data?.content) {
                onMessageInsert?.(event.data.content);
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [onMessageInsert]);

    return (
        <iframe
            ref={ref ?? iframeRef}
            src={src}
            allow="clipboard-read; clipboard-write"
            title="Suggested Message"
            style={{
                width: '100%',
                height: '300px',
                border: 0,
                borderRadius: '4px',
            }}
        />
    );
});

export default SuggestedMessage; 