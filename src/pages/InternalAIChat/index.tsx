import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import { env } from '@/env';
import { useAppSelector } from '@/redux/store';
import { postMessage } from '@/utils/postMessage';

const InternalAIChat = forwardRef<HTMLIFrameElement, Record<string, never>>((props, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const token = window.localStorage.getItem(IMBRACE_ACCESS_TOKEN);
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const { i18n } = useTranslation();

    const initialLang = useRef(i18n.language || 'en').current;

    const src = useMemo(() => {
        return `${env.VITE_APP_INTERNAL_AI_CHAT_HOST}/?imbraceToken=${token}&organizationId=${organizationId}&lang=${initialLang}&isInsightsIQ=true`;
    }, [token, organizationId, initialLang]);

    useImperativeHandle(ref, () => iframeRef.current!);

    const sendMessage = () => {
        if (iframeRef.current?.contentWindow) {
            postMessage({
                action: 'SET_LANGUAGE',
                data: {
                    language: i18n.language,
                },
                target: iframeRef.current.contentWindow,
                origin: '*',
            });
        }
    };

    useEffect(() => {
        sendMessage();
    }, [i18n.language]);

    return (
        <iframe
            ref={iframeRef}
            src={src}
            onLoad={sendMessage}
            title="Internal AI Chat"
            allow="clipboard-read; clipboard-write"
            style={{
                width: '100%',
                height: '100%',
                border: 0,
                borderBottomLeftRadius: '4px',
                borderBottomRightRadius: '4px',
            }}
        />
    );
});

export default InternalAIChat;
