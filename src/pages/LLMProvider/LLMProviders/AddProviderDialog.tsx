import { Button, Checkbox, FieldSelect, FieldText, Space, Typography } from '@imbrace/ui';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';

import AmazonBedrockProvider, { type AmazonBedrockProviderRef } from './AmazonBedrockProvider';
import CustomProvider, { type CustomProviderRef } from './CustomProvider';
import GoogleAIProvider, { type GoogleAIProviderRef } from './GoogleAIProvider';
import OllamaProvider, { type OllamaProviderRef } from './OllamaProvider';
import OpenAIProvider, { type OpenAIProviderRef } from './OpenAIProvider';
import VLLMProvider, { type VLLMProviderRef } from './VLLMProvider';

import apiFetch from '@/services/axios/handler';
import { createCustomProvider, updateCustomProvider } from '@/services/api/ai-assistant';
import { useNotify } from '@/contexts/SnackbarContext';
import { isMaskedSecret, maskSecret, resolveSecret } from '@/utils/maskSecret';

type ProviderType = 'amazon_bedrock' | 'google_ai' | 'openai' | 'ollama' | 'vllm' | 'custom';

interface ProviderModel {
    name: string;
    provider: string;
    description?: string;
    provider_name?: string;
    is_shown?: boolean;
}

interface ProviderResponse {
    _id?: string;
    id?: string;
    provider_id?: string;
    name: string;
    type: string;
    config: any;
    assistant_id?: string;
    source: string;
    is_shown: boolean;
    models?: ProviderModel[];
    metadata?: Record<string, any>;
}

const providerTypeOptions: Array<{ value: ProviderType; text: string }> = [
    { value: 'openai', text: 'OpenAI' },
    { value: 'google_ai', text: 'Google AI' },
    { value: 'amazon_bedrock', text: 'Amazon Bedrock' },
    { value: 'ollama', text: 'Ollama' },
    { value: 'vllm', text: 'vLLM' },
    { value: 'custom', text: 'Custom Provider' },
];

export interface AddProviderDialogProps {
    onClose?: () => void;
    onRefreshProviders?: () => void | Promise<void>;
    /**
     * Optional: If your backend associates providers to an assistant, pass it in.
     * For the standalone LLM Provider page, omit it.
     */
    assistantId?: string;
}

const AddProviderDialog = ({ onClose, onRefreshProviders, assistantId }: AddProviderDialogProps) => {
    const { notify } = useNotify();
    const { t } = useTranslation();
    const [providerType, setProviderType] = useState<ProviderType | ''>('');
    const [providerName, setProviderName] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [createdProvider, setCreatedProvider] = useState<ProviderResponse | null>(null);
    const [providerModels, setProviderModels] = useState<ProviderModel[]>([]);
    // Store last submitted (unmasked) config so we can reuse secrets when the UI is masked after connect.
    const [lastSubmittedConfig, setLastSubmittedConfig] = useState<any | null>(null);
    // After successful connect (create), remount provider form with masked values (show only once).
    const [maskedInitialValues, setMaskedInitialValues] = useState<any | null>(null);
    const [formResetNonce, setFormResetNonce] = useState(0);

    const providerRef = useRef<
        | OpenAIProviderRef
        | GoogleAIProviderRef
        | AmazonBedrockProviderRef
        | OllamaProviderRef
        | CustomProviderRef
        | VLLMProviderRef
        | null
    >(null);

    const resetAll = useCallback(() => {
        setProviderType('');
        setProviderName('');
        setCreatedProvider(null);
        setProviderModels([]);
        setLastSubmittedConfig(null);
        setMaskedInitialValues(null);
        setFormResetNonce(0);
        providerRef.current = null;
    }, []);

    const handleBackToType = useCallback(() => {
        resetAll();
    }, [resetAll]);

    const handleProviderTypeChange = useCallback((value: string | undefined) => {
        setProviderType((value as ProviderType) || '');
        setProviderName('');
        setCreatedProvider(null);
        setProviderModels([]);
        setLastSubmittedConfig(null);
        setMaskedInitialValues(null);
        setFormResetNonce(0);
        providerRef.current = null;
    }, []);

    const handleProviderNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setProviderName(e.target.value);
    }, []);

    const handleModelToggle = useCallback((modelName: string, checked: boolean) => {
        setProviderModels((prev) => prev.map((m) => (m.name === modelName ? { ...m, is_shown: checked } : m)));
    }, []);

    const handleConnect = useCallback(
        async (config: any) => {
            if (!providerType || !providerName) return;

            // Keep a copy of the last submitted config (unmasked) to preserve secrets in update stage.
            setLastSubmittedConfig((prev: any) => {
                // Only overwrite if the user actually provided a non-masked value; if masked, keep previous.
                if (!prev) return config;
                if (!config || typeof config !== 'object') return prev;
                const next: any = { ...prev, ...config };
                for (const key of Object.keys(config)) {
                    if (typeof config[key] === 'string' && isMaskedSecret(config[key])) {
                        next[key] = prev[key];
                    }
                }
                return next;
            });

            const parseOptionalNumber = (value?: string) => {
                if (value === undefined || value === null || value === '') return undefined;
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : undefined;
            };

            let payload: any | null = null;

            // If UI is masked (after create), and user keeps masked placeholders, reuse the original secrets.
            const existing = lastSubmittedConfig || {};

            if (providerType === 'openai') {
                const apiKey = resolveSecret(config.apiKey, existing.apiKey);
                payload = {
                    name: providerName,
                    type: 'openai',
                    config: {
                        openApi: {
                            ...(apiKey !== undefined ? { api_key: apiKey } : {}),
                        },
                    },
                    source: 'custom',
                    is_shown: true,
                };
            } else if (providerType === 'amazon_bedrock') {
                const accessKeyId = resolveSecret(config.accessKeyId, existing.accessKeyId);
                const secretAccessKey = resolveSecret(config.secretAccessKey, existing.secretAccessKey);
                const sessionToken = resolveSecret(config.sessionToken, existing.sessionToken);
                payload = {
                    name: providerName,
                    type: 'bedrock',
                    config: {
                        bedrock: {
                            region: config.region,
                            ...(accessKeyId !== undefined ? { access_key: accessKeyId } : {}),
                            ...(secretAccessKey !== undefined ? { secret_key: secretAccessKey } : {}),
                            ...(sessionToken !== undefined ? { session_token: sessionToken } : {}),
                        },
                    },
                    source: 'custom',
                    is_shown: true,
                };
            } else if (providerType === 'google_ai') {
                const apiKey = resolveSecret(config.apiKey, existing.apiKey);
                const baseUrl = config?.base_url ?? config?.baseUrl;
                payload = {
                    name: providerName,
                    type: 'google',
                    config: {
                        google: {
                            ...(baseUrl ? { base_url: baseUrl } : {}),
                            model: config.model || 'gemini-2.0-flash',
                            embedding_model: config.embeddingModel || 'text-embedding-004',
                            ...(apiKey !== undefined ? { api_key: apiKey } : {}),
                        },
                    },
                    source: 'custom',
                    is_shown: true,
                };
            } else if (providerType === 'ollama') {
                const apiKey = resolveSecret(config.apiKey, existing.apiKey);
                payload = {
                    name: providerName,
                    type: 'ollama',
                    config: {
                        ollama: {
                            host: config.host,
                            ...(apiKey !== undefined ? { api_key: apiKey } : {}),
                        },
                    },
                    source: 'custom',
                    is_shown: true,
                };
            } else if (providerType === 'vllm') {
                const apiKey = resolveSecret(config.apiKey, existing.apiKey);
                payload = {
                    name: providerName,
                    type: 'vllm',
                    config: {
                        vllm: {
                            host: config.baseUrl,
                            ...(config.baseGetModelUrl ? { base_get_model_url: config.baseGetModelUrl } : {}),
                            ...(apiKey !== undefined ? { api_key: apiKey } : {}),
                        },
                    },
                    source: 'custom',
                    is_shown: true,
                };
            } else if (providerType === 'custom') {
                const apiKey = resolveSecret(config.apiKey, existing.apiKey);
                const maxCompletionTokens = parseOptionalNumber(config.maxCompletionTokens);
                const maxOutputTokens = parseOptionalNumber(config.maxOutputTokens);
                const maxTokens = parseOptionalNumber(config.maxTokens);

                payload = {
                    name: providerName,
                    type: 'custom',
                    config: {
                        openApi: {
                            base_url: config.accessUrl,
                            ...(maxCompletionTokens !== undefined && { max_completion_tokens: maxCompletionTokens }),
                            ...(maxOutputTokens !== undefined && { max_output_tokens: maxOutputTokens }),
                            ...(maxTokens !== undefined && { max_tokens: maxTokens }),
                            supports_tools: !!config.supportsTools,
                            supports_images: !!config.supportsImages,
                            supports_parallel_tool_calls: !!config.supportsParallelToolCalls,
                            supports_prompt_cache_key: !!config.supportsPromptCacheKey,
                            ...(apiKey !== undefined ? { api_key: apiKey } : {}),
                        },
                    },
                    source: 'custom',
                    is_shown: true,
                };
            }

            if (!payload) return;

            // Optional association to an assistant
            if (assistantId) {
                payload.assistant_id = assistantId;
            }

            try {
                if (createdProvider) {
                    const providerId = createdProvider.id || createdProvider.provider_id || createdProvider._id;
                    const modelsPayload =
                        providerModels && providerModels.length
                            ? providerModels.map((m) => ({
                                  ...m,
                                  is_shown: m.is_shown ?? false,
                              }))
                            : undefined;

                    const updatePayload = {
                        ...payload,
                        ...(modelsPayload ? { models: modelsPayload } : {}),
                    };

                    const { data } = await apiFetch<ProviderResponse>(
                        updateCustomProvider.api(providerId as string),
                        updateCustomProvider.method,
                        updatePayload,
                    );

                    const mergedProvider: ProviderResponse = {
                        ...(data as ProviderResponse),
                        ...updatePayload,
                        models: modelsPayload ?? (data as ProviderResponse)?.models,
                    };

                    setCreatedProvider(mergedProvider);
                    setProviderModels((mergedProvider.models || []).map((m) => ({ ...m })));

                    notify({ type: 'success', message: t('llm_provider_updated_success') });
                    await onRefreshProviders?.();
                    onClose?.();
                } else {
                    const { data } = await apiFetch<ProviderResponse>(
                        createCustomProvider.api(),
                        createCustomProvider.method,
                        payload,
                    );

                    const normalized: ProviderResponse = {
                        ...(data as ProviderResponse),
                        models: (data as ProviderResponse)?.models ?? [],
                    };

                    setCreatedProvider(normalized);
                    setProviderModels(
                        (normalized.models || []).map((m) => ({
                            ...m,
                            is_shown: false,
                        })),
                    );

                    // Mask secrets immediately after connect (show only once).
                    // We remount the provider form with masked initialValues.
                    const masked = (() => {
                        if (providerType === 'openai') {
                            return { apiKey: maskSecret(existing.apiKey || config.apiKey) };
                        }
                        if (providerType === 'google_ai') {
                            return {
                                apiKey: maskSecret(existing.apiKey || config.apiKey),
                                base_url: config.base_url ?? config.baseUrl ?? '',
                            };
                        }
                        if (providerType === 'amazon_bedrock') {
                            return {
                                accessKeyId: maskSecret(existing.accessKeyId || config.accessKeyId),
                                secretAccessKey: maskSecret(existing.secretAccessKey || config.secretAccessKey),
                                sessionToken: maskSecret(existing.sessionToken || config.sessionToken),
                                region: config.region || 'us-east-1',
                            };
                        }
                        if (providerType === 'ollama') {
                            return {
                                host: config.host || 'http://localhost:11434',
                                apiKey: maskSecret(existing.apiKey || config.apiKey),
                            };
                        }
                        if (providerType === 'vllm') {
                            return {
                                baseUrl: config.baseUrl || '',
                                baseGetModelUrl: config.baseGetModelUrl || '',
                                apiKey: maskSecret(existing.apiKey || config.apiKey),
                            };
                        }
                        if (providerType === 'custom') {
                            return {
                                accessUrl: config.accessUrl || '',
                                apiKey: maskSecret(existing.apiKey || config.apiKey),
                                maxCompletionTokens: config.maxCompletionTokens || '',
                                maxOutputTokens: config.maxOutputTokens || '',
                                maxTokens: config.maxTokens || '',
                                supportsTools: !!config.supportsTools,
                                supportsImages: !!config.supportsImages,
                                supportsParallelToolCalls: !!config.supportsParallelToolCalls,
                                supportsPromptCacheKey: !!config.supportsPromptCacheKey,
                            };
                        }
                        return null;
                    })();

                    setMaskedInitialValues(masked);
                    setFormResetNonce((n) => n + 1);
                    // Keep the unmasked secrets in memory for update.
                    setLastSubmittedConfig((prev: any) => ({ ...(prev || {}), ...(existing || {}), ...(config || {}) }));

                    notify({ type: 'success', message: t('llm_provider_created_success') });
                    await onRefreshProviders?.();
                }
            } catch (error) {
                const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
                const errorMessage =
                    axiosError?.response?.data?.detail ||
                    axiosError?.response?.data?.message ||
                    t('llm_provider_connect_failed');

                notify({ type: 'error', message: errorMessage });
                throw error;
            }
        },
        [assistantId, createdProvider, lastSubmittedConfig, notify, onClose, onRefreshProviders, providerModels, providerName, providerType, t],
    );

    const handleConnectProvider = useCallback(async () => {
        if (!providerType || !providerName) return;
        if (!providerRef.current) return;

        setIsConnecting(true);
        try {
            await providerRef.current.submit();
        } catch (error) {
            console.error('Error submitting provider form:', error);
        } finally {
            setIsConnecting(false);
        }
    }, [providerType, providerName]);

    const renderProviderForm = useMemo(() => {
        if (!providerType) return null;

        const commonProps = {
            onCancel: handleBackToType,
            onConnect: handleConnect,
            providerName,
            // When provider has been connected once, show masked values for secrets.
            initialValues: maskedInitialValues || undefined,
        };

        switch (providerType) {
            case 'amazon_bedrock':
                return (
                    <AmazonBedrockProvider
                        key={`amazon_bedrock-${formResetNonce}`}
                        ref={providerRef as React.Ref<AmazonBedrockProviderRef>}
                        {...commonProps}
                    />
                );
            case 'google_ai':
                return (
                    <GoogleAIProvider
                        key={`google_ai-${formResetNonce}`}
                        ref={providerRef as React.Ref<GoogleAIProviderRef>}
                        {...commonProps}
                    />
                );
            case 'openai':
                return (
                    <OpenAIProvider
                        key={`openai-${formResetNonce}`}
                        ref={providerRef as React.Ref<OpenAIProviderRef>}
                        {...commonProps}
                    />
                );
            case 'ollama':
                return (
                    <OllamaProvider
                        key={`ollama-${formResetNonce}`}
                        ref={providerRef as React.Ref<OllamaProviderRef>}
                        {...commonProps}
                    />
                );
            case 'vllm':
                return (
                    <VLLMProvider
                        key={`vllm-${formResetNonce}`}
                        ref={providerRef as React.Ref<VLLMProviderRef>}
                        {...commonProps}
                    />
                );
            case 'custom':
                return (
                    <CustomProvider
                        key={`custom-${formResetNonce}`}
                        ref={providerRef as React.Ref<CustomProviderRef>}
                        {...commonProps}
                    />
                );
            default:
                return null;
        }
    }, [providerType, handleBackToType, handleConnect, providerName, maskedInitialValues, formResetNonce]);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                // Keep dialog content from growing too tall; allow inner scroll instead.
                maxHeight: '70vh',
                minHeight: providerType ? 420 : 160,
            }}
        >
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16, paddingRight: 20, boxSizing: 'border-box' }}>
                <Space direction="vertical" style={{ width: '100%' }} align="start">
                    {!providerType ? (
                        <Space direction="vertical" style={{ width: '100%', padding: '8px 0 0' }} align="start">
                            <FieldSelect
                                label={t('llm_provider_provider_label')}
                                value={providerType}
                                onChange={handleProviderTypeChange}
                                queryKey={['llm_provider_add', 'provider_type']}
                                request={async () => providerTypeOptions}
                                placeholder={t('llm_provider_select_placeholder')}
                                fullWidth
                            />
                        </Space>
                    ) : (
                        <Space direction="vertical" style={{ width: '100%', padding: '16px 0', gap: 16 }} align="start">
                            <Space direction="horizontal" style={{ width: '100%', gap: 16, alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <FieldSelect
                                        label={t('llm_provider_provider_label')}
                                        value={providerType}
                                        onChange={handleProviderTypeChange}
                                        queryKey={['llm_provider_add', 'provider_type']}
                                        request={async () => providerTypeOptions}
                                        placeholder={t('llm_provider_select_placeholder')}
                                        fullWidth
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <FieldText
                                        label={t('name')}
                                        value={providerName}
                                        onChange={handleProviderNameChange}
                                        placeholder={t('llm_provider_name_placeholder')}
                                        fullWidth
                                    />
                                </div>
                            </Space>

                            {renderProviderForm}

                            {createdProvider && providerModels.length > 0 && (
                                <Space direction="vertical" style={{ width: '100%', gap: 8 }} align="start">
                                    <Typography variant="BodyBold">{t('llm_provider_col_models')}</Typography>
                                    <Typography variant="Body" style={{ color: '#828282', fontSize: 12 }}>
                                        {t('llm_provider_select_models_desc')}
                                    </Typography>
                                    <Space direction="vertical" align="start" style={{ gap: 4 }}>
                                        {providerModels.map((model) => (
                                            <Checkbox
                                                key={model.name}
                                                checked={!!model.is_shown}
                                                onChange={(checked: boolean) => handleModelToggle(model.name, !!checked)}
                                                label={model.description ? `${model.name} (${model.description})` : model.name}
                                            />
                                        ))}
                                    </Space>
                                </Space>
                            )}
                        </Space>
                    )}
                </Space>
            </div>

            {providerType && (
                <div
                    style={{
                        paddingTop: 12,
                        backgroundColor: 'white',
                    }}
                >
                    <Space direction="horizontal" style={{ width: '100%' }} justify="between">
                        <Button
                            variant="outlined"
                            text={t('back')}
                            onClick={handleBackToType}
                            sx={{ minWidth: '120px' }}
                            disabled={isConnecting}
                        />
                        <Space direction="horizontal" style={{ gap: 12 }}>
                            <Button
                                variant="outlined"
                                text={t('cancel')}
                                onClick={onClose}
                                sx={{ minWidth: '120px' }}
                                disabled={isConnecting}
                            />
                            <Button
                                variant="contained"
                                text={
                                    isConnecting
                                        ? createdProvider
                                            ? t('llm_provider_updating')
                                            : t('llm_provider_connecting')
                                        : createdProvider
                                          ? t('llm_provider_update_provider')
                                          : t('llm_provider_connect_provider')
                                }
                                onClick={handleConnectProvider}
                                sx={{ minWidth: '160px' }}
                                disabled={isConnecting || !providerName}
                            />
                        </Space>
                    </Space>
                </div>
            )}
        </div>
    );
};

export default AddProviderDialog;


