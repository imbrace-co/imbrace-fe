import { Button, Checkbox, FieldSelect, FieldText, Icon, Space, Typography } from '@imbrace/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';

import AmazonBedrockProvider, { type AmazonBedrockProviderRef } from './AmazonBedrockProvider';
import CustomProvider, { type CustomProviderRef } from './CustomProvider';
import GoogleAIProvider, { type GoogleAIProviderRef } from './GoogleAIProvider';
import OllamaProvider, { type OllamaProviderRef } from './OllamaProvider';
import OpenAIProvider, { type OpenAIProviderRef } from './OpenAIProvider';
import VLLMProvider, { type VLLMProviderRef } from './VLLMProvider';

import apiFetch from '@/services/axios/handler';
import { updateCustomProvider, refreshProviderModels } from '@/services/api/ai-assistant';
import { useNotify } from '@/contexts/SnackbarContext';
import { maskSecret, resolveSecret } from '@/utils/maskSecret';

type ProviderTypeUi = 'amazon_bedrock' | 'google_ai' | 'openai' | 'ollama' | 'vllm' | 'custom';

interface ProviderModel {
    name: string;
    provider: string;
    description?: string;
    provider_name?: string;
    is_shown?: boolean;
    is_toolCall_available?: boolean;
    is_vision_available?: boolean;
    is_support_thinking?: boolean;
    is_parallel_tool_calls_available?: boolean;
    is_prompt_cache_available?: boolean;
    is_add_manually?: boolean;
}

export interface Provider {
    _id?: string;
    id?: string;
    provider_id?: string;
    name: string;
    type: string; // backend type: openai/google/bedrock/ollama/custom/vllm
    config: any;
    assistant_id?: string;
    source?: string;
    is_shown?: boolean;
    models?: ProviderModel[];
}

export interface ManageProviderDialogProps {
    provider: Provider;
    onClose?: () => void;
    onRefreshProviders?: () => void | Promise<void>;
}

const providerTypeOptions: Array<{ value: ProviderTypeUi; text: string }> = [
    { value: 'openai', text: 'OpenAI' },
    { value: 'google_ai', text: 'Google AI' },
    { value: 'amazon_bedrock', text: 'Amazon Bedrock' },
    { value: 'ollama', text: 'Ollama' },
    { value: 'vllm', text: 'vLLM' },
    { value: 'custom', text: 'Custom Provider' },
];

const getProviderTypeUi = (type: string): ProviderTypeUi => {
    const typeMap: Record<string, ProviderTypeUi> = {
        openai: 'openai',
        google: 'google_ai',
        bedrock: 'amazon_bedrock',
        ollama: 'ollama',
        custom: 'custom',
        vllm: 'vllm',
    };
    return typeMap[type] || (type as ProviderTypeUi);
};

const getInitialValues = (provider: Provider) => {
    const { type, config } = provider || ({} as Provider);

    if (type === 'openai' && config?.openApi) {
        return {
            apiKey: maskSecret(config.openApi.api_key),
        };
    }

    if (type === 'google' && config?.google) {
        return {
            apiKey: maskSecret(config.google.api_key),
            base_url: config.google.base_url || config.google.baseUrl || '',
        };
    }

    if (type === 'bedrock' && config?.bedrock) {
        return {
            accessKeyId: maskSecret(config.bedrock.access_key),
            secretAccessKey: maskSecret(config.bedrock.secret_key),
            sessionToken: maskSecret(config.bedrock.session_token),
            region: config.bedrock.region || 'us-east-1',
        };
    }

    if (type === 'ollama' && config?.ollama) {
        return {
            host: config.ollama.host || config.ollama.api_url || 'http://localhost:11434',
            apiKey: maskSecret(config.ollama.api_key),
        };
    }

    if (type === 'custom' && config?.openApi) {
        const openApiConfig = config.openApi || {};
        return {
            accessUrl: openApiConfig.base_url || openApiConfig.access_url || '',
            apiKey: maskSecret(openApiConfig.api_key),
            maxCompletionTokens:
                openApiConfig.max_completion_tokens !== undefined ? String(openApiConfig.max_completion_tokens) : '',
            maxOutputTokens: openApiConfig.max_output_tokens !== undefined ? String(openApiConfig.max_output_tokens) : '',
            maxTokens: openApiConfig.max_tokens !== undefined ? String(openApiConfig.max_tokens) : '',
            supportsTools: !!openApiConfig.supports_tools,
            supportsImages: !!openApiConfig.supports_images,
            supportsParallelToolCalls: !!openApiConfig.supports_parallel_tool_calls,
            supportsPromptCacheKey: !!openApiConfig.supports_prompt_cache_key,
        };
    }

    if (type === 'vllm' && config?.vllm) {
        return {
            baseUrl: config.vllm.host || '',
            baseGetModelUrl: config.vllm.base_get_model_url || '',
            apiKey: maskSecret(config.vllm.api_key),
        };
    }

    return undefined;
};

const ManageProviderDialog = ({ provider, onClose, onRefreshProviders }: ManageProviderDialogProps) => {
    const { notify } = useNotify();
    const { t } = useTranslation();
    const providerId = provider.id || provider.provider_id || provider._id || '';
    const [providerName, setProviderName] = useState(provider.name || '');
    const [providerModels, setProviderModels] = useState<ProviderModel[]>((provider.models || []).map((m) => ({ ...m })));
    const [isUpdating, setIsUpdating] = useState(false);

    const [showAddModel, setShowAddModel] = useState(false);
    const [newModelName, setNewModelName] = useState('');
    const [newModelToolCall, setNewModelToolCall] = useState(false);
    const [newModelVision, setNewModelVision] = useState(false);
    const [newModelThinking, setNewModelThinking] = useState(false);

    const [editingModelName, setEditingModelName] = useState<string | null>(null);
    const [editModelToolCall, setEditModelToolCall] = useState(false);
    const [editModelVision, setEditModelVision] = useState(false);
    const [editModelThinking, setEditModelThinking] = useState(false);
    const [isRefreshingModels, setIsRefreshingModels] = useState(false);

    const handleRefreshModels = useCallback(async () => {
        if (!providerId || isRefreshingModels) return;
        setIsRefreshingModels(true);
        try {
            const res = await apiFetch(refreshProviderModels.api(providerId), refreshProviderModels.method);
            const data = res?.data || res;
            const models: ProviderModel[] = data?.models || data || [];
            if (Array.isArray(models) && models.length > 0) {
                setProviderModels((prev) => {
                    const prevMap = new Map(prev.map((m) => [m.name, m]));
                    return models.map((m: ProviderModel) => {
                        const existing = prevMap.get(m.name);
                        return existing ? { ...m, is_shown: existing.is_shown } : { ...m, is_shown: m.is_shown ?? false };
                    });
                });
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
            const errorMessage =
                axiosError?.response?.data?.detail ||
                axiosError?.response?.data?.message ||
                t('llm_provider_refresh_failed');
            notify({ type: 'error', message: errorMessage });
        } finally {
            setIsRefreshingModels(false);
        }
    }, [providerId, isRefreshingModels, t]);

    useEffect(() => {
        handleRefreshModels();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const providerRef = useRef<
        | OpenAIProviderRef
        | GoogleAIProviderRef
        | AmazonBedrockProviderRef
        | OllamaProviderRef
        | CustomProviderRef
        | VLLMProviderRef
        | null
    >(null);

    const providerTypeUi = useMemo(() => getProviderTypeUi(provider.type), [provider.type]);
    const initialValues = useMemo(() => getInitialValues(provider), [provider]);

    const handleProviderNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setProviderName(e.target.value);
    }, []);

    const handleModelToggle = useCallback((modelName: string, checked: boolean) => {
        setProviderModels((prev) => prev.map((m) => (m.name === modelName ? { ...m, is_shown: checked } : m)));
    }, []);

    const handleStartEditModel = useCallback((model: ProviderModel) => {
        setEditingModelName(model.name);
        setEditModelToolCall(!!model.is_toolCall_available);
        setEditModelVision(!!model.is_vision_available);
        setEditModelThinking(!!model.is_support_thinking);
    }, []);

    const handleCancelEditModel = useCallback(() => {
        setEditingModelName(null);
        setEditModelToolCall(false);
        setEditModelVision(false);
        setEditModelThinking(false);
    }, []);

    const handleSaveEditModel = useCallback(() => {
        if (!editingModelName) return;
        setProviderModels((prev) =>
            prev.map((m) =>
                m.name === editingModelName
                    ? {
                          ...m,
                          is_toolCall_available: editModelToolCall,
                          is_vision_available: editModelVision,
                          is_support_thinking: editModelThinking,
                      }
                    : m,
            ),
        );
        setEditingModelName(null);
        setEditModelToolCall(false);
        setEditModelVision(false);
        setEditModelThinking(false);
    }, [editingModelName, editModelToolCall, editModelVision, editModelThinking]);

    const handleAddCustomModel = useCallback(() => {
        const trimmedName = newModelName.trim();
        if (!trimmedName) {
            notify({ type: 'error', message: t('llm_provider_model_name_empty') });
            return;
        }

        const isDuplicate = providerModels.some((m) => m.name.toLowerCase() === trimmedName.toLowerCase());
        if (isDuplicate) {
            notify({ type: 'error', message: t('llm_provider_model_exists', { name: trimmedName }) });
            return;
        }

        const newModel: ProviderModel = {
            name: trimmedName,
            provider: provider.type,
            is_shown: true,
            is_toolCall_available: newModelToolCall,
            is_vision_available: newModelVision,
            is_support_thinking: newModelThinking,
            is_add_manually: true,
        };

        setProviderModels((prev) => [...prev, newModel]);
        setNewModelName('');
        setNewModelToolCall(false);
        setNewModelVision(false);
        setNewModelThinking(false);
        setShowAddModel(false);
    }, [newModelName, newModelToolCall, newModelVision, newModelThinking, notify, provider.type, providerModels, t]);

    const handleDeleteModel = useCallback((modelName: string) => {
        setProviderModels((prev) => prev.filter((m) => m.name !== modelName));
    }, []);

    const handleUpdate = useCallback(
        async (config: any) => {
            if (!providerId || !providerName) return;

            const parseOptionalNumber = (value?: string) => {
                if (value === undefined || value === null || value === '') return undefined;
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : undefined;
            };

            let payload: any | null = null;
            const providerType = provider.type;

            const existingConfig = provider.config || {};

            if (providerType === 'openai') {
                const apiKey = resolveSecret(
                    config.apiKey,
                    existingConfig.openApi?.api_key,
                );
                payload = {
                    name: providerName,
                    type: 'openai',
                    config: {
                        openApi: {
                            ...(apiKey !== undefined ? { api_key: apiKey } : {}),
                        },
                    },
                    source: provider.source || 'custom',
                    is_shown: provider.is_shown ?? true,
                };
            } else if (providerType === 'bedrock') {
                const accessKey = resolveSecret(
                    config.accessKeyId,
                    existingConfig.bedrock?.access_key,
                );
                const secretKey = resolveSecret(
                    config.secretAccessKey,
                    existingConfig.bedrock?.secret_key,
                );
                const sessionToken = resolveSecret(
                    config.sessionToken,
                    existingConfig.bedrock?.session_token,
                );
                payload = {
                    name: providerName,
                    type: 'bedrock',
                    config: {
                        bedrock: {
                            region: config.region,
                            ...(accessKey !== undefined ? { access_key: accessKey } : {}),
                            ...(secretKey !== undefined ? { secret_key: secretKey } : {}),
                            ...(sessionToken !== undefined ? { session_token: sessionToken } : {}),
                        },
                    },
                    source: provider.source || 'custom',
                    is_shown: provider.is_shown ?? true,
                };
            } else if (providerType === 'google') {
                const apiKey = resolveSecret(
                    config.apiKey,
                    existingConfig.google?.api_key,
                );
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
                    source: provider.source || 'custom',
                    is_shown: provider.is_shown ?? true,
                };
            } else if (providerType === 'ollama') {
                const apiKey = resolveSecret(
                    config.apiKey,
                    existingConfig.ollama?.api_key,
                );
                payload = {
                    name: providerName,
                    type: 'ollama',
                    config: {
                        ollama: {
                            host: config.host,
                            ...(apiKey !== undefined ? { api_key: apiKey } : {}),
                        },
                    },
                    source: provider.source || 'custom',
                    is_shown: provider.is_shown ?? true,
                };
            } else if (providerType === 'vllm') {
                const apiKey = resolveSecret(
                    config.apiKey,
                    existingConfig.vllm?.api_key,
                );
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
                    source: provider.source || 'custom',
                    is_shown: provider.is_shown ?? true,
                };
            } else if (providerType === 'custom') {
                const apiKey = resolveSecret(
                    config.apiKey,
                    existingConfig.openApi?.api_key,
                );
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
                    source: provider.source || 'custom',
                    is_shown: provider.is_shown ?? true,
                };
            }

            if (!payload) return;

            // Preserve assistant association if it exists on the provider payload
            if (provider.assistant_id) {
                payload.assistant_id = provider.assistant_id;
            }

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

            try {
                await apiFetch(updateCustomProvider.api(providerId), updateCustomProvider.method, updatePayload);
                notify({ type: 'success', message: t('llm_provider_updated_success') });
                await onRefreshProviders?.();
                onClose?.();
            } catch (error) {
                const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
                const errorMessage =
                    axiosError?.response?.data?.detail ||
                    axiosError?.response?.data?.message ||
                    t('llm_provider_update_failed');
                notify({ type: 'error', message: errorMessage });
                throw error;
            }
        },
        [notify, onClose, onRefreshProviders, provider, providerId, providerModels, providerName, t],
    );

    const handleUpdateProvider = useCallback(async () => {
        if (!providerId || !providerName) return;
        if (!providerRef.current) return;

        setIsUpdating(true);
        try {
            await providerRef.current.submit();
        } catch (error) {
            console.error('Error updating provider:', error);
        } finally {
            setIsUpdating(false);
        }
    }, [providerId, providerName]);

    const renderProviderForm = useMemo(() => {
        const commonProps = {
            onCancel: () => {},
            onConnect: handleUpdate,
            providerName,
            initialValues,
        };

        switch (providerTypeUi) {
            case 'amazon_bedrock':
                return <AmazonBedrockProvider ref={providerRef as React.Ref<AmazonBedrockProviderRef>} {...commonProps} />;
            case 'google_ai':
                return <GoogleAIProvider ref={providerRef as React.Ref<GoogleAIProviderRef>} {...commonProps} />;
            case 'openai':
                return <OpenAIProvider ref={providerRef as React.Ref<OpenAIProviderRef>} {...commonProps} />;
            case 'ollama':
                return <OllamaProvider ref={providerRef as React.Ref<OllamaProviderRef>} {...commonProps} />;
            case 'vllm':
                return <VLLMProvider ref={providerRef as React.Ref<VLLMProviderRef>} {...commonProps} />;
            case 'custom':
                return (
                    <CustomProvider
                        ref={providerRef as React.Ref<CustomProviderRef>}
                        {...commonProps}
                    />
                );
            default:
                return null;
        }
    }, [handleUpdate, initialValues, providerName, providerTypeUi]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '75vh', minHeight: 520 }}>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16, paddingRight: 20, boxSizing: 'border-box' }}>
                <Space direction="vertical" style={{ width: '100%', paddingTop: 8 }} align="start">
                    <Space direction="horizontal" style={{ width: '100%', gap: 16, alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <FieldSelect
                                label={t('llm_provider_provider_label')}
                                value={providerTypeUi}
                                onChange={() => {}}
                                queryKey={['llm_provider_manage', 'provider_type']}
                                request={async () => providerTypeOptions}
                                placeholder={t('llm_provider_select_placeholder')}
                                fullWidth
                                disabled
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

                    <Space direction="vertical" style={{ width: '100%', marginTop: 8 }} align="start">
                        {renderProviderForm}
                    </Space>

                    <Space direction="vertical" style={{ width: '100%', marginTop: 8, gap: 6 }} align="start">
                        <Space direction="horizontal" style={{ width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="BodyBold">{t('llm_provider_model_label')}</Typography>
                            <Button
                                variant="outlined"
                                text={t('llm_provider_refresh')}
                                startIcon={<Icon name="sync" />}
                                onClick={handleRefreshModels}
                                disabled={isRefreshingModels}
                                sx={{ minWidth: 'auto', padding: '2px 12px', fontSize: 12 }}
                            />
                        </Space>

                        {isRefreshingModels ? (
                            <Typography variant="Body" style={{ color: '#828282', fontSize: 12, fontStyle: 'italic' }}>
                                {t('llm_provider_loading_models')}
                            </Typography>
                        ) : (
                            <>
                                {providerModels.length > 0 && (
                                    <>
                                        <Typography variant="Body" style={{ color: '#828282', fontSize: 12 }}>
                                            {t('llm_provider_select_models_desc')}
                                        </Typography>
                                        <Space direction="vertical" align="start" style={{ gap: 6, width: '100%' }}>
                                            {providerModels.map((m) => (
                                                <div key={m.name} style={{ width: '100%' }}>
                                                    <Space direction="horizontal" style={{ alignItems: 'center', gap: 8 }}>
                                                        <Checkbox
                                                            checked={!!m.is_shown}
                                                            onChange={(checked: boolean) => handleModelToggle(m.name, !!checked)}
                                                            label={m.description ? `${m.name} (${m.description})` : m.name}
                                                        />
                                                        <Icon
                                                            name="edit"
                                                            fontSize="small"
                                                            style={{ cursor: 'pointer', color: '#828282' }}
                                                            onClick={() => handleStartEditModel(m)}
                                                        />
                                                        <Icon
                                                            name="delete"
                                                            fontSize="small"
                                                            style={{ cursor: 'pointer', color: '#828282' }}
                                                            onClick={() => handleDeleteModel(m.name)}
                                                        />
                                                    </Space>
                                                    {editingModelName === m.name && (
                                                        <Space
                                                            direction="vertical"
                                                            align="start"
                                                            style={{
                                                                width: '100%',
                                                                gap: 8,
                                                                marginTop: 8,
                                                                marginBottom: 8,
                                                                padding: 12,
                                                                border: '1px solid #E0E0E0',
                                                                borderRadius: 8,
                                                            }}
                                                        >
                                                            <Typography variant="BodyBold" style={{ fontSize: 13 }}>
                                                                {t('llm_provider_edit_model', { name: m.name })}
                                                            </Typography>
                                                            <Space direction="vertical" align="start" style={{ gap: 4 }}>
                                                                <Checkbox
                                                                    checked={editModelToolCall}
                                                                    onChange={(checked: boolean) => setEditModelToolCall(!!checked)}
                                                                    label={t('llm_provider_tool_call_available')}
                                                                />
                                                                <Checkbox
                                                                    checked={editModelVision}
                                                                    onChange={(checked: boolean) => setEditModelVision(!!checked)}
                                                                    label={t('llm_provider_vision_available')}
                                                                />
                                                                <Checkbox
                                                                    checked={editModelThinking}
                                                                    onChange={(checked: boolean) => setEditModelThinking(!!checked)}
                                                                    label={t('llm_provider_support_thinking')}
                                                                />
                                                            </Space>
                                                            <Space direction="horizontal" style={{ gap: 8 }}>
                                                                <Button
                                                                    variant="outlined"
                                                                    text={t('cancel')}
                                                                    onClick={handleCancelEditModel}
                                                                    sx={{ minWidth: 'auto', padding: '4px 16px', fontSize: 12 }}
                                                                />
                                                                <Button
                                                                    variant="contained"
                                                                    text={t('save')}
                                                                    onClick={handleSaveEditModel}
                                                                    sx={{ minWidth: 'auto', padding: '4px 16px', fontSize: 12 }}
                                                                />
                                                            </Space>
                                                        </Space>
                                                    )}
                                                </div>
                                            ))}
                                        </Space>
                                    </>
                                )}
                            </>
                        )}

                        {!showAddModel && (
                            <Button
                                variant="text"
                                text={t('llm_provider_add_custom_model')}
                                onClick={() => setShowAddModel(true)}
                                sx={{ padding: '4px 0', minWidth: 'auto' }}
                            />
                        )}

                        {showAddModel && (
                            <div
                                style={{
                                    width: '100%',
                                    border: '1px solid #E0E0E0',
                                    borderRadius: 8,
                                    padding: 16,
                                    marginTop: 4,
                                    boxSizing: 'border-box',
                                }}
                            >
                                <Space direction="vertical" style={{ width: '100%', gap: 12 }} align="start">
                                    <FieldText
                                        label={t('llm_provider_model_name_label')}
                                        value={newModelName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewModelName(e.target.value)}
                                        placeholder={t('llm_provider_model_name_placeholder')}
                                        fullWidth
                                    />
                                    <Space direction="vertical" align="start" style={{ gap: 6 }}>
                                        <Checkbox
                                            checked={newModelToolCall}
                                            onChange={(checked: boolean) => setNewModelToolCall(!!checked)}
                                            label={t('llm_provider_tool_call_available')}
                                        />
                                        <Checkbox
                                            checked={newModelVision}
                                            onChange={(checked: boolean) => setNewModelVision(!!checked)}
                                            label={t('llm_provider_vision_available')}
                                        />
                                        <Checkbox
                                            checked={newModelThinking}
                                            onChange={(checked: boolean) => setNewModelThinking(!!checked)}
                                            label={t('llm_provider_support_thinking')}
                                        />
                                    </Space>
                                    <Space direction="horizontal" style={{ gap: 8 }}>
                                        <Button
                                            variant="outlined"
                                            text={t('cancel')}
                                            onClick={() => {
                                                setShowAddModel(false);
                                                setNewModelName('');
                                                setNewModelToolCall(false);
                                                setNewModelVision(false);
                                                setNewModelThinking(false);
                                            }}
                                            sx={{ minWidth: 80 }}
                                        />
                                        <Button
                                            variant="contained"
                                            text={t('add')}
                                            onClick={handleAddCustomModel}
                                            sx={{ minWidth: 80 }}
                                            disabled={!newModelName.trim()}
                                        />
                                    </Space>
                                </Space>
                            </div>
                        )}

                    </Space>
                </Space>
            </div>

            <div style={{ paddingTop: 12, backgroundColor: 'white' }}>
                <Space direction="horizontal" style={{ width: '100%' }} justify="end">
                    <Space direction="horizontal" style={{ gap: 12 }}>
                        <Button
                            variant="outlined"
                            type="danger"
                            text={t('cancel')}
                            onClick={onClose}
                            sx={{ minWidth: '140px' }}
                            disabled={isUpdating}
                        />
                        <Button
                            variant="contained"
                            text={isUpdating ? t('llm_provider_updating') : t('llm_provider_update')}
                            onClick={handleUpdateProvider}
                            sx={{ minWidth: '200px' }}
                            disabled={isUpdating || !providerName}
                        />
                    </Space>
                </Space>
            </div>
        </div>
    );
};

export default ManageProviderDialog;

