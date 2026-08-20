import { Button, FieldText, Space, Typography } from '@imbrace/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

interface OllamaCredentials {
    host: string;
    apiKey?: string;
}

interface OllamaProviderProps {
    onCancel: () => void;
    onConnect: (config: OllamaCredentials) => void | Promise<void>;
    providerName: string;
    initialValues?: Partial<OllamaCredentials>;
}

export interface OllamaProviderRef {
    submit: () => Promise<void>;
}

const OllamaProvider = forwardRef<OllamaProviderRef, OllamaProviderProps>(
    ({ onCancel, onConnect, providerName, initialValues }, ref) => {
        const [showGuide, setShowGuide] = useState(true);
        const { t } = useTranslation();

        const ollamaSchema = useMemo(() => z.object({
            host: z
                .string()
                .min(1, t('llm_provider_api_url_required'))
                .superRefine((val, ctx) => {
                    if (val.trim().length === 0) {
                        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('llm_provider_api_url_required') });
                    }
                }),
            apiKey: z.string().optional(),
        }), [t]);

        const {
            control,
            handleSubmit,
            formState: { isSubmitting },
        } = useForm<OllamaCredentials>({
            resolver: zodResolver(ollamaSchema),
            mode: 'onBlur',
            defaultValues: {
                host: initialValues?.host || 'http://localhost:11434',
                apiKey: initialValues?.apiKey || '',
            },
        });

        const onSubmit = async (values: OllamaCredentials) => {
            await onConnect(values);
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
                    {t('llm_provider_enter_credentials', { provider: 'Ollama' })}
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
                        {t('llm_provider_ollama_guide_title')}
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
                        <li>{t('llm_provider_ollama_step1')}</li>
                        <li>{t('llm_provider_ollama_step2')}</li>
                        <li>{t('llm_provider_ollama_step3')}</li>
                        <li>{t('llm_provider_ollama_step4')}</li>
                        <li>
                            {t('llm_provider_ollama_step5')}
                            <br />
                            • {t('llm_provider_ollama_step5_url')}
                            <br />
                            • {t('llm_provider_ollama_step5_key')}
                        </li>
                    </ol>
                </Space>
            )}

            <Space direction="vertical" align="start" style={{ width: '100%', gap: '16px' }}>
                <Controller
                    name="host"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                        <FieldText
                            {...field}
                            fullWidth
                            label={t('llm_provider_api_url')}
                            placeholder="http://localhost:11434"
                            error={!!error}
                            helperText={error?.message}
                        />
                    )}
                />

                <Controller
                    name="apiKey"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                        <FieldText
                            {...field}
                            fullWidth
                            label={t('llm_provider_api_key')}
                            placeholder={t('llm_provider_ollama_api_key_placeholder')}
                            description={
                                <Typography variant="Body" style={{ color: '#828282', fontSize: '12px' }}>
                                    {t('llm_provider_ollama_api_key_desc')}
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

(OllamaProvider as any).displayName = 'OllamaProvider';

export default OllamaProvider;


