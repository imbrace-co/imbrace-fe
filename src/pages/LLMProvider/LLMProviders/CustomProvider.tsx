import { Checkbox, FieldText, Space, Typography } from '@imbrace/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { forwardRef, useImperativeHandle, useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

interface CustomProviderConfig {
    accessUrl: string;
    apiKey: string;
    maxCompletionTokens: string;
    maxOutputTokens: string;
    maxTokens: string;
    supportsTools: boolean;
    supportsImages: boolean;
    supportsParallelToolCalls: boolean;
    supportsPromptCacheKey: boolean;
}

interface CustomProviderProps {
    onCancel: () => void;
    onConnect: (config: CustomProviderConfig) => void | Promise<void>;
    providerName: string;
    initialValues?: Partial<CustomProviderConfig>;
    onCapabilitiesChange?: (caps: {
        supportsTools: boolean;
        supportsImages: boolean;
        supportsParallelToolCalls: boolean;
        supportsPromptCacheKey: boolean;
    }) => void;
}

export interface CustomProviderRef {
    submit: () => Promise<void>;
}

const CustomProvider = forwardRef<CustomProviderRef, CustomProviderProps>(
    ({ onCancel, onConnect, initialValues, onCapabilitiesChange }, ref) => {
        const { t } = useTranslation();

        const customProviderSchema = useMemo(
            () =>
                z.object({
                    accessUrl: z
                        .string()
                        .min(1, t('llm_provider_access_url_required'))
                        .superRefine((val, ctx) => {
                            if (val.trim().length === 0) {
                                ctx.addIssue({
                                    code: z.ZodIssueCode.custom,
                                    message: t('llm_provider_access_url_required'),
                                });
                            }
                        }),
                    apiKey: z
                        .string()
                        .min(1, t('llm_provider_api_key_required'))
                        .superRefine((val, ctx) => {
                            if (val.trim().length === 0) {
                                ctx.addIssue({
                                    code: z.ZodIssueCode.custom,
                                    message: t('llm_provider_api_key_required'),
                                });
                            }
                        }),
                    maxCompletionTokens: z.string().optional(),
                    maxOutputTokens: z.string().optional(),
                    maxTokens: z.string().optional(),
                    supportsTools: z.boolean().optional(),
                    supportsImages: z.boolean().optional(),
                    supportsParallelToolCalls: z.boolean().optional(),
                    supportsPromptCacheKey: z.boolean().optional(),
                }),
            [t],
        );

        const {
            control,
            handleSubmit,
            formState: { isSubmitting },
            watch,
        } = useForm<CustomProviderConfig>({
            resolver: zodResolver(customProviderSchema),
            mode: 'onBlur',
            defaultValues: {
                accessUrl: initialValues?.accessUrl || '',
                apiKey: initialValues?.apiKey || '',
                maxCompletionTokens: initialValues?.maxCompletionTokens || '',
                maxOutputTokens: initialValues?.maxOutputTokens || '',
                maxTokens: initialValues?.maxTokens || '',
                supportsTools: initialValues?.supportsTools ?? false,
                supportsImages: initialValues?.supportsImages ?? false,
                supportsParallelToolCalls: initialValues?.supportsParallelToolCalls ?? false,
                supportsPromptCacheKey: initialValues?.supportsPromptCacheKey ?? false,
            },
        });

        const onSubmit = async (values: CustomProviderConfig) => {
            await onConnect(values);
        };

        const [supportsTools, supportsImages, supportsParallelToolCalls, supportsPromptCacheKey] = watch([
            'supportsTools',
            'supportsImages',
            'supportsParallelToolCalls',
            'supportsPromptCacheKey',
        ]);

        useEffect(() => {
            if (!onCapabilitiesChange) return;
            onCapabilitiesChange({
                supportsTools: !!supportsTools,
                supportsImages: !!supportsImages,
                supportsParallelToolCalls: !!supportsParallelToolCalls,
                supportsPromptCacheKey: !!supportsPromptCacheKey,
            });
        }, [supportsTools, supportsImages, supportsParallelToolCalls, supportsPromptCacheKey, onCapabilitiesChange]);

        useImperativeHandle(ref, () => ({
            submit: async () => {
                await handleSubmit(onSubmit)();
            },
        }));

        return (
            <Space direction="vertical" style={{ width: '100%' }} align="start">
                <Typography variant="Body" style={{ color: '#4F4F4F', marginBottom: '24px' }}>
                    {t('llm_provider_enter_credentials_generic')}
                </Typography>

                <Space direction="vertical" style={{ width: '100%', gap: '16px' }} align="start">
                    <Controller
                        name="accessUrl"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                {...field}
                                fullWidth
                                label={t('llm_provider_access_url')}
                                placeholder="https://api.your-llm-provider.com"
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
                                placeholder={t('llm_provider_api_key_placeholder')}
                                error={!!error}
                                helperText={error?.message}
                            />
                        )}
                    />

                    <Controller
                        name="maxCompletionTokens"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                {...field}
                                fullWidth
                                label={t('llm_provider_max_completion_tokens')}
                                placeholder={t('llm_provider_optional')}
                                type="number"
                                inputProps={{ min: 1 }}
                                error={!!error}
                                helperText={error?.message}
                            />
                        )}
                    />

                    <Controller
                        name="maxOutputTokens"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                {...field}
                                fullWidth
                                label={t('llm_provider_max_output_tokens')}
                                placeholder={t('llm_provider_optional')}
                                type="number"
                                inputProps={{ min: 1 }}
                                error={!!error}
                                helperText={error?.message}
                            />
                        )}
                    />

                    <Controller
                        name="maxTokens"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                {...field}
                                fullWidth
                                label={t('llm_provider_max_tokens')}
                                placeholder={t('llm_provider_optional')}
                                type="number"
                                inputProps={{ min: 1 }}
                                error={!!error}
                                helperText={error?.message}
                            />
                        )}
                    />

                    <Space direction="vertical" align="start" style={{ gap: '8px', marginTop: '8px' }}>
                        <Typography variant="Body" style={{ color: '#4F4F4F' }}>
                            {t('ai_agent_capabilities')}
                        </Typography>

                        <Controller
                            name="supportsTools"
                            control={control}
                            render={({ field }) => (
                                <Checkbox
                                    checked={!!field.value}
                                    onChange={(checked: boolean) => field.onChange(checked)}
                                    label={t('llm_provider_supports_tools')}
                                />
                            )}
                        />

                        <Controller
                            name="supportsImages"
                            control={control}
                            render={({ field }) => (
                                <Checkbox
                                    checked={!!field.value}
                                    onChange={(checked: boolean) => field.onChange(checked)}
                                    label={t('llm_provider_supports_images')}
                                />
                            )}
                        />

                        <Controller
                            name="supportsParallelToolCalls"
                            control={control}
                            render={({ field }) => (
                                <Checkbox
                                    checked={!!field.value}
                                    onChange={(checked: boolean) => field.onChange(checked)}
                                    label={t('llm_provider_supports_parallel')}
                                />
                            )}
                        />

                        <Controller
                            name="supportsPromptCacheKey"
                            control={control}
                            render={({ field }) => (
                                <Checkbox
                                    checked={!!field.value}
                                    onChange={(checked: boolean) => field.onChange(checked)}
                                    label={t('llm_provider_supports_prompt_cache')}
                                />
                            )}
                        />
                    </Space>
                </Space>
            </Space>
        );
    },
);

(CustomProvider as any).displayName = 'CustomProvider';

export default CustomProvider;

