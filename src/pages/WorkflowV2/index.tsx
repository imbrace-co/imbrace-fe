import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { postMessage } from '@/utils/postMessage';

import { env } from '@/env';
import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import { useAppSelector } from '@/redux/store';

const WorkflowV2 = forwardRef<HTMLIFrameElement, Record<string, never>>((props, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const location = useLocation();
    const token = window.localStorage.getItem(IMBRACE_ACCESS_TOKEN);
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    // Get flowId from navigation state
    const flowIdFromState = (location.state as any)?.flowId as string | undefined;
    const flowIdFromQuery = new URLSearchParams(location.search).get('flowId') ?? undefined;
    const flowId = flowIdFromState ?? flowIdFromQuery;
    const { i18n } = useTranslation();

    const normalizeLang = (rawLang: string) => {
        let lang = rawLang;
        if (rawLang.startsWith('zh')) {
            if (['zh-CN', 'zh-SG', 'zh-Hans'].includes(rawLang)) {
                lang = 'cn';
            } else if (['zh-TW', 'zh-HK', 'zh-Hant'].includes(rawLang)) {
                lang = 'zh';
            }
        }
        return lang;
    };

    const initialLang = useRef(normalizeLang(i18n.language || 'en')).current;

    const src = useMemo(() => {
        let baseUrl = `${env.VITE_APP_ACTIVEPIECES_DOMAIN}/projects?token=${token}&organizationId=${organizationId}&lang=${initialLang}`;
        if (flowId) {
            baseUrl = `${env.VITE_APP_ACTIVEPIECES_DOMAIN}/flows/${flowId}?token=${token}&organizationId=${organizationId}&lang=${initialLang}`;
        }
        return baseUrl;
    }, [token, organizationId, flowId, initialLang]);

    useImperativeHandle(ref, () => iframeRef.current!);

    const sendMessage = () => {
        if (iframeRef.current?.contentWindow) {
            postMessage({
                action: 'SET_LANGUAGE',
                data: {
                    language: normalizeLang(i18n.language),
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
            allow="clipboard-read; clipboard-write"
            title="Workflow V2"
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

export default WorkflowV2;
