import { Button, FieldText, Space, Typography } from '@imbrace/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

interface GoogleAICredentials {
    apiKey: string;
    base_url?: string;
}

interface GoogleAIProviderProps {
    onCancel: () => void;
    onConnect: (config: GoogleAICredentials) => void | Promise<void>;
    providerName: string;
    initialValues?: Partial<GoogleAICredentials>;
}

export interface GoogleAIProviderRef {
    submit: () => Promise<void>;
}

const GoogleAIProvider = forwardRef<GoogleAIProviderRef, GoogleAIProviderProps>(
    ({ onCancel, onConnect, providerName, initialValues }, ref) => {
        const { t } = useTranslation();
        const [showGuide, setShowGuide] = useState(true);

        const googleAISchema = useMemo(() => z.object({
            apiKey: z
                .string()
                .min(1, t('llm_provider_api_key_required'))
                .superRefine((val, ctx) => {
                    if (val.trim().length === 0) {
                        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('llm_provider_api_key_required') });
                    }
                }),
            base_url: z.string().optional(),
        }), [t]);

        const {
            control,
            handleSubmit,
            formState: { isSubmitting },
        } = useForm<GoogleAICredentials>({
            resolver: zodResolver(googleAISchema),
            mode: 'onBlur',
            defaultValues: {
                apiKey: initialValues?.apiKey || '',
                base_url: initialValues?.base_url || '',
            },
        });

        const onSubmit = async (values: GoogleAICredentials) => {
            const baseUrl = values.base_url?.trim();
            await onConnect({
                apiKey: values.apiKey,
                ...(baseUrl ? { base_url: baseUrl } : {}),
            });
        };

        useImperativeHandle(ref, () => ({
            submit: async () => {
                await handleSubmit(onSubmit)();
            },
        }));

    return (
        <Space direction="vertical" style={{ width: '100%' }} align="start">
            <Space
                direction="horizontal"
                justify="between"
                align="center"
                style={{ width: '100%', marginBottom: '8px' }}
            >
                <Typography variant="Body" style={{ color: '#4F4F4F' }}>
                    {t('llm_provider_enter_credentials', { provider: 'Google AI' })}
                </Typography>
                <Button
                    variant="link"
                    size="xs"
                    text={showGuide ? t('llm_provider_hide') : t('llm_provider_need_help')}
                    onClick={() => setShowGuide((prev) => !prev)}
                    sx={{ padding: 0 }}
                />
            </Space>

            {showGuide && (
                <Space
                    direction="vertical"
                    align="start"
                    style={{
                        width: '100%',
                        borderRadius: '4px',
                        padding: '16px 16px 12px',
                        marginBottom: '24px',
                    }}
                >
                    <Typography variant="BodyBold" style={{ marginBottom: '8px' }}>
                        {t('llm_provider_google_guide_title')}
                    </Typography>
                    <ol
                        style={{
                            paddingLeft: '20px',
                            margin: 0,
                            color: '#4F4F4F',
                            fontSize: '13px',
                            lineHeight: '20px',
                        }}
                    >
                        <li>{t('llm_provider_google_step1')}</li>
                        <li>{t('llm_provider_step_create_api_key')}</li>
                        <li>{t('llm_provider_google_step3')}</li>
                        <li>{t('llm_provider_google_step4')}</li>
                    </ol>
                </Space>
            )}

            <Space direction="vertical" align="start" style={{ width: '100%', gap: '16px' }}>
                <Controller
                    name="apiKey"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                        <FieldText
                            {...field}
                            fullWidth
                            label={t('llm_provider_api_key')}
                            placeholder={t('llm_provider_google_api_key_placeholder')}
                            description={
                                <Typography variant="Body" style={{ color: '#828282', fontSize: '12px' }}>
                                    {t('llm_provider_google_api_key_desc')}
                                </Typography>
                            }
                            error={!!error}
                            helperText={error?.message}
                        />
                    )}
                />

                <Controller
                    name="base_url"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                        <FieldText
                            {...field}
                            fullWidth
                            label={t('llm_provider_base_url_optional')}
                            placeholder="https://generativelanguage.googleapis.com"
                            description={
                                <Typography variant="Body" style={{ color: '#828282', fontSize: '12px' }}>
                                    {t('llm_provider_google_base_url_desc')}
                                </Typography>
                            }
                            error={!!error}
                            helperText={error?.message}
                        />
                    )}
                />
            </Space>
        </Space>
    );
    },
);

(GoogleAIProvider as any).displayName = 'GoogleAIProvider';

export default GoogleAIProvider;


