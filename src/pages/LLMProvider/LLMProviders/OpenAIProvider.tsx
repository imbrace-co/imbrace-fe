import { Button, FieldText, Space, Typography } from '@imbrace/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

interface OpenAICredentials {
    apiKey: string;
}

interface OpenAIProviderProps {
    onCancel: () => void;
    onConnect: (config: OpenAICredentials) => void | Promise<void>;
    providerName: string;
    initialValues?: Partial<OpenAICredentials>;
}

export interface OpenAIProviderRef {
    submit: () => Promise<void>;
}

const OpenAIProvider = forwardRef<OpenAIProviderRef, OpenAIProviderProps>(
    ({ onCancel, onConnect, providerName, initialValues }, ref) => {
        const { t } = useTranslation();
        const [showGuide, setShowGuide] = useState(true);

        const openAISchema = useMemo(() => z.object({
            apiKey: z
                .string()
                .min(1, t('llm_provider_api_key_required'))
                .superRefine((val, ctx) => {
                    if (val.trim().length === 0) {
                        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('llm_provider_api_key_required') });
                    }
                }),
        }), [t]);

        const {
            control,
            handleSubmit,
            formState: { isSubmitting },
        } = useForm<OpenAICredentials>({
            resolver: zodResolver(openAISchema),
            mode: 'onBlur',
            defaultValues: {
                apiKey: initialValues?.apiKey || '',
            },
        });

        const onSubmit = async (values: OpenAICredentials) => {
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
                    {t('llm_provider_enter_credentials', { provider: 'OpenAI' })}
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
                        {t('llm_provider_openai_guide_title')}
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
                        <li>{t('llm_provider_openai_step1')}</li>
                        <li>{t('llm_provider_step_create_api_key')}</li>
                        <li>{t('llm_provider_openai_step3')}</li>
                        <li>{t('llm_provider_openai_step4')}</li>
                        <li>{t('llm_provider_openai_step5')}</li>
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
                            placeholder={t('llm_provider_openai_api_key_placeholder')}
                            description={
                                <Typography variant="Body" style={{ color: '#828282', fontSize: '12px' }}>
                                    {t('llm_provider_openai_api_key_desc')}
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

(OpenAIProvider as any).displayName = 'OpenAIProvider';

export default OpenAIProvider;


