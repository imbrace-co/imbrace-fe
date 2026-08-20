import { Button, Icon, Typography } from '@imbrace/ui';
import { Box } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import PageLayout from '@/components/PageLayout';
import { useNotify } from '@/contexts/SnackbarContext';
import { generateThirdPartyToken } from '@/services/api/external';
import apiFetch from '@/services/axios/handler';

import styles from './index.module.scss';

const DEFAULT_EXPIRATION_DAYS = 10000;

interface GenerateTokenResponse {
    apiKey?: {
        // The enterprise backend returns the token as `apiKey.apiKey`; the OSS
        // platform service returns it as `apiKey.token`. Accept both.
        apiKey?: string;
        token?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

const External = () => {
    const { t } = useTranslation();
    const { notify } = useNotify();
    const [token, setToken] = useState<string>('');
    const [expirationDays, setExpirationDays] = useState<number>(DEFAULT_EXPIRATION_DAYS);

    const mutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiFetch<GenerateTokenResponse>(generateThirdPartyToken.api(), generateThirdPartyToken.method, {
                expirationDays,
            });
            return data;
        },
        onSuccess: (data) => {
            const generated = data?.apiKey?.apiKey || data?.apiKey?.token || '';
            if (generated) {
                setToken(generated);
                notify({ type: 'success', message: t('external_token_generated_success') });
            } else {
                setToken(JSON.stringify(data));
                notify({ type: 'warning', message: t('external_token_generated_unknown_shape') });
            }
        },
        onError: () => {
            notify({ type: 'error', message: t('external_token_generated_failed') });
        },
    });

    const copyText = async (text: string) => {
        // navigator.clipboard only exists on secure contexts (https/localhost).
        // LAN deployments are served over plain http, so fall back to the
        // legacy hidden-textarea copy there.
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            if (!document.execCommand('copy')) {
                throw new Error('execCommand copy failed');
            }
        } finally {
            document.body.removeChild(textarea);
        }
    };

    const handleCopy = async () => {
        if (!token) return;
        try {
            await copyText(token);
            notify({ type: 'success', message: t('external_token_copied') });
        } catch {
            notify({ type: 'error', message: t('external_token_copy_failed') });
        }
    };

    return (
        <PageLayout title={t('external_generate_token_title')}>
            <Box className={styles.container}>
                <Typography variant="Body">{t('external_generate_token_description')}</Typography>

                <Box className={styles.row}>
                    <label className={styles.label} htmlFor="expirationDays">
                        {t('external_expiration_days')}
                    </label>
                    <input
                        id="expirationDays"
                        type="number"
                        min={1}
                        className={styles.input}
                        value={expirationDays}
                        onChange={(e) => setExpirationDays(Number(e.target.value))}
                    />
                </Box>

                <Box>
                    <Button
                        onClick={() => mutation.mutate()}
                        loading={mutation.isPending}
                        disabled={!expirationDays || expirationDays < 1}
                        text={t('external_generate_button')}
                    />
                </Box>

                {token && (
                    <Box display="flex" flexDirection="column" gap={1}>
                        <Typography variant="SubHeading2">{t('external_token_label')}</Typography>
                        <Box className={styles.tokenBox}>{token}</Box>
                        <Box>
                            <Button
                                variant="outlined"
                                onClick={handleCopy}
                                startIcon={<Icon name="copy" />}
                                text={t('external_copy_token')}
                            />
                        </Box>
                        <Typography variant="Caption">{t('external_token_warning')}</Typography>
                    </Box>
                )}
            </Box>
        </PageLayout>
    );
};

export default External;
