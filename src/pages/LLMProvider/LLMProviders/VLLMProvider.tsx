import { Button, FieldText, Space, Typography } from '@imbrace/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

interface VLLMCredentials {
    baseUrl: string;
    apiKey: string;
    baseGetModelUrl: string;
}

interface VLLMProviderProps {
    onCancel: () => void;
    onConnect: (config: VLLMCredentials) => void | Promise<void>;
    providerName: string;
    initialValues?: Partial<VLLMCredentials>;
}

export interface VLLMProviderRef {
    submit: () => Promise<void>;
}

const VLLMProvider = forwardRef<VLLMProviderRef, VLLMProviderProps>(
    ({ onCancel, onConnect, providerName, initialValues }, ref) => {
        const [showGuide, setShowGuide] = useState(true);
        const { t } = useTranslation();

        const vllmSchema = useMemo(() => z.object({
            baseUrl: z
                .string()
                .min(1, t('llm_provider_base_url_required'))
                .superRefine((val, ctx) => {
                    if (val.trim().length === 0) {
                        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('llm_provider_base_url_required') });
                    }
                }),
            apiKey: z.string().optional(),
            baseGetModelUrl: z.string().optional(),
        }), [t]);

        const {
            control,
            handleSubmit,
            formState: { isSubmitting },
        } = useForm<VLLMCredentials>({
            resolver: zodResolver(vllmSchema),
            mode: 'onBlur',
            defaultValues: {
                baseUrl: initialValues?.baseUrl || '',
                apiKey: initialValues?.apiKey || '',
                baseGetModelUrl: initialValues?.baseGetModelUrl || '',
            },
        });

        const onSubmit = async (values: VLLMCredentials) => {
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
                        {t('llm_provider_enter_credentials', { provider: 'vLLM' })}
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
                            {t('llm_provider_vllm_guide_title')}
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
                            <li>{t('llm_provider_vllm_step1')}</li>
                            <li>{t('llm_provider_vllm_step2')}</li>
                            <li>{t('llm_provider_vllm_step3')}</li>
                            <li>{t('llm_provider_vllm_step4')}</li>
                        </ol>
                    </Space>
                )}

                <Space direction="vertical" align="start" style={{ width: '100%', gap: '16px' }}>
                    <Controller
                        name="baseUrl"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                {...field}
                                fullWidth
                                label={t('llm_provider_base_url')}
                                placeholder="http://localhost:8000/v1"
                                error={!!error}
                                helperText={error?.message}
                            />
                        )}
                    />

                    <Controller
                        name="baseGetModelUrl"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                {...field}
                                fullWidth
                                label={t('llm_provider_base_get_model_url')}
                                placeholder={t('llm_provider_base_get_model_url_placeholder')}
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
                                placeholder={t('llm_provider_api_key_placeholder_optional')}
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

(VLLMProvider as any).displayName = 'VLLMProvider';

export default VLLMProvider;





