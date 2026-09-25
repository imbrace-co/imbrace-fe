import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
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

    // No host configured means the literal would read "undefined/?..." — a
    // relative URL that nginx's SPA fallback serves index.html for, embedding
    // this app inside itself. Bail out instead of pointing the iframe at it.
    const src = useMemo(() => {
        const chatHost = env.VITE_APP_INTERNAL_AI_CHAT_HOST;
        if (!chatHost) return undefined;
        return `${chatHost}/?imbraceToken=${token}&organizationId=${organizationId}&lang=${initialLang}&isInsightsIQ=true`;
    }, [token, organizationId, initialLang]);

    useImperativeHandle(ref, () => iframeRef.current as HTMLIFrameElement);

    // useCallback keeps the identity stable across renders, so listing it in the
    // effect below satisfies exhaustive-deps without re-running on every render.
    const sendMessage = useCallback(() => {
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
    }, [i18n.language]);

    useEffect(() => {
        sendMessage();
    }, [sendMessage]);

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
