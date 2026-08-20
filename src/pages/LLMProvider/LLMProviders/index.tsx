import { Space, Typography, Tabs, FieldSelect, FieldText, Button, Checkbox } from '@imbrace/ui';
import { useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import AmazonBedrockProvider, { AmazonBedrockProviderRef } from './AmazonBedrockProvider';
import GoogleAIProvider, { GoogleAIProviderRef } from './GoogleAIProvider';
import OpenAIProvider, { OpenAIProviderRef } from './OpenAIProvider';
import OllamaProvider, { OllamaProviderRef } from './OllamaProvider';
import CustomProvider, { CustomProviderRef } from './CustomProvider';
import VLLMProvider, { VLLMProviderRef } from './VLLMProvider';
import ManageCurrentProvider from './ManageCurrentProvider';
import apiFetch from '@/services/axios/handler';
import { fetchMethod } from '@/services/axios';
import { createCustomProvider, updateCustomProvider } from '@/services/api/ai-assistant';
import { useNotify } from '@/contexts/SnackbarContext';

interface LLMProvidersDialogProps {
    assistantId: string;
    onClose?: () => void;
    onSave?: (provider: any) => void;
    onRefreshProviders?: () => void | Promise<void>;
}

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
    assistant_id: string;
    source: string;
    is_shown: boolean;
    models?: ProviderModel[];
    metadata?: Record<string, any>;
}

export const getProviderOptions = (t: any) => [
    { value: 'amazon_bedrock', text: t('ai_agent_amazon_bedrock') },
    { value: 'google_ai', text: t('ai_agent_google_ai') },
    { value: 'openai', text: t('ai_agent_open_ai') },
    { value: 'ollama', text: t('ai_agent_ollama') },
    { value: 'vllm', text: t('ai_agent_vllm_provider') },
    { value: 'custom', text: t('ai_agent_custom_provider') },
];

export const LLMProvidersDialog = ({ assistantId, onClose, onSave, onRefreshProviders }: LLMProvidersDialogProps) => {
    const { t } = useTranslation();
    const { notify } = useNotify();
    const [activeTab, setActiveTab] = useState('add_provider');
    const [providerType, setProviderType] = useState('');
    const [providerName, setProviderName] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [createdProvider, setCreatedProvider] = useState<ProviderResponse | null>(null);
    const [providerModels, setProviderModels] = useState<ProviderModel[]>([]);

    const providerRef = useRef<
        | OpenAIProviderRef
        | GoogleAIProviderRef
        | AmazonBedrockProviderRef
        | OllamaProviderRef
        | CustomProviderRef
        | VLLMProviderRef
        | null
    >(null);

    const handleCancel = useCallback(() => {
        setProviderType('');
        setProviderName('');
        setCreatedProvider(null);
        setProviderModels([]);
    }, []);

    const handleConnect = useCallback(
        async (config: any) => {
            if (!providerType || !providerName) {
                return;
            }

            let payload: any | null = null;

            const parseOptionalNumber = (value?: string) => {
                if (value === undefined || value === null || value === '') return undefined;
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : undefined;
            };

            if (providerType === 'openai') {
                // OpenAI
                payload = {
                    name: providerName,
                    type: 'openai',
                    config: {
                        openApi: {
                            api_key: config.apiKey,
                        },
                    },
                    assistant_id: assistantId,
                    source: 'custom',
                    is_shown: true,
                };
            } else if (providerType === 'amazon_bedrock') {
                // Amazon Bedrock
                payload = {
                    name: providerName,
                    type: 'bedrock',
                    config: {
                        bedrock: {
                            access_key: config.accessKeyId,
                            secret_key: config.secretAccessKey,
                            region: config.region,
                            // session_token is optional in backend payload; include only if present
                            ...(config.sessionToken
                                ? {
                                    session_token: config.sessionToken,
                                }
                                : {}),
                        },
                    },
                    assistant_id: assistantId,
                    source: 'custom',
                    is_shown: true,
                };
            } else if (providerType === 'google_ai') {
                // Google AI (Gemini)
                const baseUrl = config?.base_url ?? config?.baseUrl;
                payload = {
                    name: providerName,
                    type: 'google',
                    config: {
                        google: {
                            api_key: config.apiKey,
                            ...(baseUrl ? { base_url: baseUrl } : {}),
                            // Optional static defaults – can be wired to fields later if needed
                            model: config.model || 'gemini-2.0-flash',
                            embedding_model: config.embeddingModel || 'text-embedding-004',
                        },
                    },
                    assistant_id: assistantId,
                    source: 'custom',
                    is_shown: true,
                };
            } else if (providerType === 'ollama') {
                // Ollama
                payload = {
                    name: providerName,
                    type: 'ollama',
                    config: {
                        ollama: {
                            host: config.host,
                            ...(config.apiKey ? { api_key: config.apiKey } : {}),
                        },
                    },
                    assistant_id: assistantId,
                    source: 'custom',
                    is_shown: true,
                };
            } else if (providerType === 'vllm') {
                // vLLM (Self-hosted OpenAI-compatible)
                payload = {
                    name: providerName,
                    type: 'vllm',
                    config: {
                        vllm: {
                            host: config.baseUrl,
                            api_key: config.apiKey,
                        },
                    },
                    assistant_id: assistantId,
                    source: 'custom',
                    is_shown: true,
                };
            } else if (providerType === 'custom') {
                // Custom Provider
                const maxCompletionTokens = parseOptionalNumber(config.maxCompletionTokens);
                const maxOutputTokens = parseOptionalNumber(config.maxOutputTokens);
                const maxTokens = parseOptionalNumber(config.maxTokens);

                payload = {
                    name: providerName,
                    type: 'custom',
                    config: {
                        openApi: {
                            base_url: config.accessUrl,
                            api_key: config.apiKey,
                            ...(maxCompletionTokens !== undefined && { max_completion_tokens: maxCompletionTokens }),
                            ...(maxOutputTokens !== undefined && { max_output_tokens: maxOutputTokens }),
                            ...(maxTokens !== undefined && { max_tokens: maxTokens }),
                            supports_tools: !!config.supportsTools,
                            supports_images: !!config.supportsImages,
                            supports_parallel_tool_calls: !!config.supportsParallelToolCalls,
                            supports_prompt_cache_key: !!config.supportsPromptCacheKey,
                        },
                    },
                    assistant_id: assistantId,
                    source: 'custom',
                    is_shown: true,
                };
            }

            if (payload) {
                try {
                    // If provider has already been created, update it (including models)
                    if (createdProvider) {
                        const providerId = createdProvider.id || createdProvider.provider_id || createdProvider._id;

                        const modelsPayload =
                            providerModels && providerModels.length
                                ? providerModels.map((model) => ({
                                    ...model,
                                    is_shown: model.is_shown ?? false,
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
                        // Prefer the payload we just sent (guaranteed to include models + flags),
                        // but merge any extra fields returned from the API (ids, metadata, etc.)
                        const mergedProvider: ProviderResponse = {
                            ...(data as ProviderResponse),
                            ...updatePayload,
                            models: modelsPayload ?? (data as ProviderResponse)?.models,
                        };
                        setCreatedProvider(mergedProvider);
                        setProviderModels((mergedProvider.models || []).map((m) => ({ ...m })));
                        onSave?.(mergedProvider);
                        await onRefreshProviders?.();
                        // Close dialog after successful update
                        onClose?.();
                    } else {
                        // First-time connect – create provider, then populate models from response
                        const { data } = await apiFetch<ProviderResponse>(
                            createCustomProvider.api(),
                            createCustomProvider.method,
                            payload,
                        );
                        const normalized: ProviderResponse = {
                            ...(data as ProviderResponse),
                            // Ensure models exist even if BE doesn't send them yet
                            models: (data as ProviderResponse)?.models ?? [],
                        };
                        setCreatedProvider(normalized);
                        setProviderModels(
                            (normalized.models || []).map((m) => ({
                                ...m,
                                // On first load, keep all models unchecked; user will choose which to enable
                                is_shown: false,
                            })),
                        );
                        onSave?.(normalized);
                        // Refresh providers list after successful add
                        await onRefreshProviders?.();
                    }
                } catch (error) {
                    const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
                    let errorMessage = t('ai_agent_provider_connect_fail');
                    if (axiosError.response?.data?.detail) {
                        errorMessage = axiosError.response.data.detail;
                    } else if (axiosError.response?.data?.message) {
                        errorMessage = axiosError.response.data.message;
                    }
                    notify({
                        type: 'error',
                        message: errorMessage,
                    });

                    throw error; // Re-throw to prevent onSave from being called
                }
            }
        },
        [assistantId, providerType, providerName, createdProvider, providerModels, onSave, onRefreshProviders, notify],
    );

    const handleModelToggle = useCallback((modelName: string, checked: boolean) => {
        setProviderModels((prev) =>
            prev.map((model) => (model.name === modelName ? { ...model, is_shown: checked } : model)),
        );
    }, []);

    const handleProviderTypeChange = useCallback((value: string | undefined) => {
        setProviderType(value as string);
        providerRef.current = null; // Reset ref when provider type changes
        setCreatedProvider(null);
        setProviderModels([]);
    }, []);

    const handleProviderNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setProviderName(e.target.value);
    }, []);

    const handleConnectProvider = useCallback(async () => {
        if (!providerType || !providerName) {
            return;
        }

        if (providerRef.current) {
            setIsConnecting(true);
            try {
                await providerRef.current.submit();
            } catch (error) {
                console.error('Error submitting provider form:', error);
            } finally {
                setIsConnecting(false);
            }
        }
    }, [providerType, providerName]);

    const renderProviderForm = useMemo(() => {
        if (!providerType) return null;

        const commonProps = {
            onCancel: handleCancel,
            onConnect: handleConnect,
            providerName,
        };

        switch (providerType) {
            case 'amazon_bedrock':
                return <AmazonBedrockProvider key="amazon_bedrock" ref={providerRef as React.Ref<AmazonBedrockProviderRef>} {...commonProps} />;
            case 'google_ai':
                return <GoogleAIProvider key="google_ai" ref={providerRef as React.Ref<GoogleAIProviderRef>} {...commonProps} />;
            case 'openai':
                return <OpenAIProvider key="openai" ref={providerRef as React.Ref<OpenAIProviderRef>} {...commonProps} />;
            case 'ollama':
                return <OllamaProvider key="ollama" ref={providerRef as React.Ref<OllamaProviderRef>} {...commonProps} />;
            case 'vllm':
                return <VLLMProvider key="vllm" ref={providerRef as React.Ref<VLLMProviderRef>} {...commonProps} />;
            case 'custom':
                return <CustomProvider key="custom" ref={providerRef as React.Ref<CustomProviderRef>} {...commonProps} />;
            default:
                return null;
        }
    }, [providerType, providerName, handleCancel, handleConnect]);

    const tabs = useMemo(
        () => [
            {
                value: 'add_provider',
                label: t('ai_agent_add_provider'),
            },
            {
                value: 'manage_current_provider',
                label: t('ai_agent_manage_current_provider'),
            },
        ],
        [t],
    );

    return (
        <div>
            <Space direction="vertical" style={{ width: '100%', minHeight: '500px' }} align="start">
                <Tabs
                    currentTab={activeTab}
                    onChange={(event, value) => setActiveTab(value as string)}
                    tabs={tabs}
                    variant="standard"
                    style={{ width: '100%', borderBottom: '1px solid #E0E0E0' }}
                />
                <div style={{ width: '100%', marginBottom: '40px' }}>
                    {activeTab === 'add_provider' && (
                        <Space direction="vertical" style={{ width: '100%', padding: '24px 0' }} align="start">
                            <Space direction="horizontal" style={{ width: '100%', gap: '16px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <FieldSelect
                                        label={t('ai_agent_provider_type')}
                                        value={providerType}
                                        onChange={handleProviderTypeChange}
                                        queryKey={['provider_type']}
                                        request={async () => getProviderOptions(t)}
                                        placeholder={t('ai_agent_select_provider_type')}
                                        fullWidth
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <FieldText
                                        label={t('name')}
                                        value={providerName}
                                        onChange={handleProviderNameChange}
                                        placeholder={t('ai_agent_enter_provider_name')}
                                        fullWidth
                                    />
                                </div>
                            </Space>

                            {providerType && (
                                <Space direction="vertical" style={{ width: '100%', marginTop: '24px', gap: '24px' }} align="start">
                                    <Space direction="vertical" style={{ width: '100%' }} align="start">
                                        {renderProviderForm}
                                    </Space>

                                    {createdProvider && providerModels.length > 0 && (
                                        <Space direction="vertical" style={{ width: '100%' }} align="start">
                                            <Typography variant="BodyBold">
                                                {t('ai_agent_model')}
                                            </Typography>
                                            <Typography variant="Body" style={{ color: '#828282', fontSize: '12px', marginBottom: '8px' }}>
                                                {t('ai_agent_select_models_desc')}
                                            </Typography>
                                            <Space direction="vertical" align="start" style={{ gap: '4px' }}>
                                                {providerModels.map((model) => (
                                                    <Checkbox
                                                        key={model.name}
                                                        checked={!!model.is_shown}
                                                        onChange={(checked: boolean) =>
                                                            handleModelToggle(model.name, !!checked)
                                                        }
                                                        label={
                                                            model.description
                                                                ? `${model.name} (${model.description})`
                                                                : model.name
                                                        }
                                                    />
                                                ))}
                                            </Space>
                                        </Space>
                                    )}
                                </Space>
                            )}
                        </Space>
                    )}

                    {activeTab === 'manage_current_provider' && (
                        <ManageCurrentProvider
                            assistantId={assistantId}
                            onClose={onClose}
                            onSave={onSave}
                            onRefreshProviders={onRefreshProviders}
                            onBackToAddProvider={() => setActiveTab('add_provider')}
                        />
                    )}
                </div>
            </Space>
            {activeTab === 'add_provider' && (
                <Space
                    direction="horizontal"
                    style={{
                        gap: '12px',
                        width: '100%',
                        position: 'absolute',
                        bottom: 0,
                        paddingTop: '12px',
                        paddingBottom: '32px',
                        right: '32px',
                        backgroundColor: 'white',
                    }}
                    justify="end"
                >
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
                                    ? t('updating')
                                    : t('connecting')
                                : createdProvider
                                    ? t('ai_agent_update_provider')
                                    : t('ai_agent_connect_provider')
                        }
                        onClick={handleConnectProvider}
                        sx={{ minWidth: '160px' }}
                        disabled={isConnecting || !providerType || !providerName}
                    />
                </Space>
            )}
        </div>
    );
};

export default LLMProvidersDialog;
