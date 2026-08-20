import { Copy } from '@imbrace/ui';
import type { FC } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import { env } from '@/env';
import { useAppSelector } from '@/redux/store';

const SCRIPT = (server: string, channelID: string): string => `<script 
 src="${server}" 
 data-id="imbracechatwidget" 
 data-channelid="${channelID}"
></script>`;

interface WebWidgetCodeProps {
    channelId: string;
}

const WebWidgetCode: FC<WebWidgetCodeProps> = (props) => {
    const { channelId } = props;
    const { t } = useTranslation();

    const generateCode = useMemo(() => {
        const server = env.VITE_APP_API_CHAT_HOST;
        if (!channelId || !server) return '';
        return SCRIPT(server, channelId);
    }, [channelId]);

    return (
        <Copy
            copyText={t('web_widget_copy_code')}
            copyValue={generateCode}
            displayText={generateCode}
            ellipsisTextProps={{
                whiteSpace: 'pre-wrap',
            }}
            spaceProps={{
                align: 'start',
            }}
            typographyProps={{
                style: {
                    maxWidth: '404px',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 6,
                    display: '-webkit-box',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                },
            }}
        />
    );
};

export const WebWidgetURL: FC<WebWidgetCodeProps> = (props) => {
    const { channelId } = props;
    const { t } = useTranslation();

    const organizationId = useAppSelector((state) => state.Account.organizationId);

    const url = useMemo(() => {
        const token = window.localStorage.getItem(IMBRACE_ACCESS_TOKEN) || '';
        return `${env.VITE_APP_CHAT_HOST}/full_page.html?channel_id=${channelId}&org_id=${organizationId}&token=${token}`;
    }, [channelId, organizationId]);

    return (
        <>
            <Copy
                copyText={t('copy_url')}
                copyValue={url}
                displayText={url}
                ellipsisTextProps={{
                    whiteSpace: 'pre-wrap',
                }}
                spaceProps={{
                    align: 'start',
                }}
                typographyProps={{
                    style: {
                        maxWidth: '404px',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 4,
                        display: '-webkit-box',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    },
                }}
            />
        </>
    );
};

export default WebWidgetCode;
