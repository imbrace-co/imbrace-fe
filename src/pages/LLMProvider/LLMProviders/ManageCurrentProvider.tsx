import { Space, Typography, FieldText, Button, Checkbox, DropdownMenuItem, FieldSelect, useDialog, Icon } from '@imbrace/ui';
import { Autocomplete, Tooltip } from '@mui/material';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import AmazonBedrockProvider, { AmazonBedrockProviderRef } from './AmazonBedrockProvider';
import GoogleAIProvider, { GoogleAIProviderRef } from './GoogleAIProvider';
import OpenAIProvider, { OpenAIProviderRef } from './OpenAIProvider';
import OllamaProvider, { OllamaProviderRef } from './OllamaProvider';
import CustomProvider, { CustomProviderRef } from './CustomProvider';
import VLLMProvider, { VLLMProviderRef } from './VLLMProvider';
import apiFetch from '@/services/axios/handler';
import { getCustomProviders, updateCustomProvider, deleteCustomProvider } from '@/services/api/ai-assistant';
import { useNotify } from '@/contexts/SnackbarContext';

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
}

interface Provider {
    _id: string;
    id: string;
    name: string;
    type: string;
    config: any;
    assistant_id: string;
    source: string;
    is_shown: boolean;
    models?: ProviderModel[];
    provider_id?: string;
}

interface ManageCurrentProviderProps {
    assistantId: string;
    onClose?: () => void;
    onSave?: (provider: any) => void;
    onRefreshProviders?: () => void | Promise<void>;
    onBackToAddProvider?: () => void;
}

const ManageCurrentProvider = ({ assistantId, onClose, onSave, onRefreshProviders, onBackToAddProvider }: ManageCurrentProviderProps) => {
    const { t } = useTranslation();
    const { notify } = useNotify();
    const [{ dialog }, dialogHolder] = useDialog();
    const [selectedProviderId, setSelectedProviderId] = useState<string>('');
    const [providerName, setProviderName] = useState('');
    const [isManaging, setIsManaging] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [providerModels, setProviderModels] = useState<ProviderModel[]>([]);
    const [capabilitiesFilter, setCapabilitiesFilter] = useState<{
        supportsTools: boolean;
        supportsImages: boolean;
        supportsParallelToolCalls: boolean;
        supportsPromptCacheKey: boolean;
    }>({
        supportsTools: false,
        supportsImages: false,
        supportsParallelToolCalls: false,
        supportsPromptCacheKey: false,
    });

    const providerRef = useRef<
        OpenAIProviderRef | GoogleAIProviderRef | AmazonBedrockProviderRef | OllamaProviderRef | CustomProviderRef | VLLMProviderRef | null
    >(null);

    // Fetch providers - store in state for later use
    const [providers, setProviders] = useState<Provider[]>([]);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);

    // Fetch providers function similar to useAIAssistantFormHook
    const fetchCustomProviders = useCallback(async () => {
        try {
            setIsLoadingProviders(true);
            const { data } = await apiFetch<
                Array<{
                    _id: string;
                    id: string;
                    name: string;
                    type: string;
                    config: any;
                    assistant_id: string;
                    source: string;
                    is_shown: boolean;
                    models?: Array<{
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
                    }>;
                    provider_id?: string;
                }>
            >(getCustomProviders.api(), getCustomProviders.method);

            // Store providers with models for later use
            const providersList = Array.isArray(data) ? data : [];
            setProviders(providersList);

            // Return options (kept for backward compatibility, though not used directly now)
            return providersList
                .filter((p) => p.is_shown !== false)
                .map((provider) => ({
                    text: provider.name,
                    value: provider.id || provider.provider_id || provider._id,
                }));
        } catch (error) {
            console.error('Error fetching custom providers:', error);
            setProviders([]);
            return [];
        } finally {
            setIsLoadingProviders(false);
        }
    }, []);

    // Get selected provider data
    const selectedProvider = useMemo(() => {
        if (!selectedProviderId || !providers) return null;
        return providers.find((p) => p.id === selectedProviderId || p._id === selectedProviderId);
    }, [selectedProviderId, providers]);

    // Filter models by capabilities - ONLY for custom provider
    const filteredProviderModels = useMemo(() => {
        if (!selectedProvider) {
            return providerModels;
        }

        // Only apply capability-based filtering for custom providers
        if (selectedProvider.type !== 'custom') {
            return providerModels;
        }

        const { supportsTools, supportsImages, supportsParallelToolCalls, supportsPromptCacheKey } = capabilitiesFilter;

        const hasAnyCapabilityFilter = supportsTools || supportsImages || supportsParallelToolCalls || supportsPromptCacheKey;

        if (!hasAnyCapabilityFilter) {
            return [];
        }

        return providerModels.filter((model) => {
            if (supportsTools && !model.is_toolCall_available) {
                return false;
            }
            if (supportsImages && !model.is_vision_available) {
                return false;
            }
            if (supportsParallelToolCalls && !model.is_parallel_tool_calls_available) {
                return false;
            }
            if (supportsPromptCacheKey && !model.is_prompt_cache_available) {
                return false;
            }
            return true;
        });
    }, [providerModels, selectedProvider, capabilitiesFilter]);

    useEffect(() => {
        if (!selectedProvider || selectedProvider.type !== 'custom') {
            return;
        }

        const { supportsTools, supportsImages, supportsParallelToolCalls, supportsPromptCacheKey } = capabilitiesFilter;
        const hasAnyCapabilityFilter =
            supportsTools || supportsImages || supportsParallelToolCalls || supportsPromptCacheKey;

        setProviderModels((prevModels) =>
            prevModels.map((model) => {
                if (!hasAnyCapabilityFilter) {
                    return model.is_shown ? { ...model, is_shown: false } : model;
                }

                let visible = true;
                if (supportsTools && !model.is_toolCall_available) {
                    visible = false;
                }
                if (supportsImages && !model.is_vision_available) {
                    visible = false;
                }
                if (supportsParallelToolCalls && !model.is_parallel_tool_calls_available) {
                    visible = false;
                }
                if (supportsPromptCacheKey && !model.is_prompt_cache_available) {
                    visible = false;
                }

                // If not visible (hidden) → set is_shown = false
                if (!visible && model.is_shown) {
                    return { ...model, is_shown: false };
                }

                return model;
            }),
        );
    }, [capabilitiesFilter, selectedProvider]);

    // Map provider type from API to component type
    const getProviderType = useCallback((type: string): string => {
        const typeMap: Record<string, string> = {
            openai: 'openai',
            google: 'google_ai',
            bedrock: 'amazon_bedrock',
            ollama: 'ollama',
            custom: 'custom',
            vllm: 'vllm',
        };
        return typeMap[type] || type;
    }, []);

    // Extract initial values from provider config
    const getInitialValues = useCallback((provider: Provider) => {
        if (!provider) return undefined;

        const { type, config } = provider;

        if (type === 'openai' && config?.openApi) {
            return {
                apiKey: config.openApi.api_key || '',
            };
        }

        if (type === 'google' && config?.google) {
            return {
                apiKey: config.google.api_key || '',
                base_url: config.google.base_url || config.google.baseUrl || '',
            };
        }

        if (type === 'bedrock' && config?.bedrock) {
            return {
                accessKeyId: config.bedrock.access_key || '',
                secretAccessKey: config.bedrock.secret_key || '',
                sessionToken: config.bedrock.session_token || '',
                region: config.bedrock.region || 'us-east-1',
            };
        }

        if (type === 'ollama' && config?.ollama) {
            return {
                // Support both legacy api_url and new host field
                host: config.ollama.host || config.ollama.api_url || 'http://localhost:11434',
                apiKey: config.ollama.api_key || '',
            };
        }

        if (type === 'custom' && config?.openApi) {
            const openApiConfig = config.openApi || {};
            return {
                // Support both `base_url` (current BE shape) and legacy `access_url` if present
                accessUrl: openApiConfig.base_url || openApiConfig.access_url || '',
                apiKey: openApiConfig.api_key || '',
                maxCompletionTokens:
                    openApiConfig.max_completion_tokens !== undefined
                        ? String(openApiConfig.max_completion_tokens)
                        : '',
                maxOutputTokens:
                    openApiConfig.max_output_tokens !== undefined ? String(openApiConfig.max_output_tokens) : '',
                maxTokens: openApiConfig.max_tokens !== undefined ? String(openApiConfig.max_tokens) : '',
                supportsTools: !!openApiConfig.supports_tools,
                supportsImages: !!openApiConfig.supports_images,
                supportsParallelToolCalls: !!openApiConfig.supports_parallel_tool_calls,
                supportsPromptCacheKey: !!openApiConfig.supports_prompt_cache_key,
            };
        }

        if (type === 'vllm' && config?.vllm) {
            return {
                // Map backend `host` field to the form's `baseUrl` field
                baseUrl: config.vllm.host || '',
                apiKey: config.vllm.api_key || '',
            };
        }

        return undefined;
    }, []);

    // Group label by provider type for select UI
    const getProviderGroupLabel = useCallback(
        (type: string): string => {
            const normalized = getProviderType(type);
            switch (normalized) {
                case 'openai':
                    return 'Open AI';
                case 'google_ai':
                    return 'Google AI';
                case 'amazon_bedrock':
                    return 'Amazon Bedrock';
                case 'ollama':
                    return 'Ollama';
                case 'custom':
                    return 'Custom Provider (OpenAI compatible)';
                case 'vllm':
                    return 'VLLM Provider';
                default:
                    return 'Other Providers';
            }
        },
        [getProviderType],
    );

    type ProviderSelectOption = {
        label: string;
        value: string;
        group: string;
    };

    const providerSelectOptions: ProviderSelectOption[] = useMemo(
        () =>
            providers
                .map((provider) => ({
                    label: provider.name,
                    value: provider.id || provider.provider_id || provider._id,
                    group: getProviderGroupLabel(provider.type),
                }))
                // Sort by group then label so same groups are contiguous (avoid duplicate group headers)
                .sort((a, b) => {
                    if (a.group === b.group) {
                        return a.label.localeCompare(b.label);
                    }
                    return a.group.localeCompare(b.group);
                }),
        [providers, getProviderGroupLabel],
    );

    // Handle provider selection
    const handleProviderChange = useCallback(
        (value: string | undefined) => {
            setSelectedProviderId(value as string);
            setIsManaging(false);
            if (value && providers) {
                const provider = providers.find((p) => p.id === value || p._id === value);
                if (provider) {
                    setProviderName(provider.name);
                    setProviderModels((provider.models || []).map((m) => ({ ...m })));
                }
            } else {
                setProviderName('');
                setProviderModels([]);
            }
            providerRef.current = null; // Reset ref when provider changes
        },
        [providers],
    );

    // Handle provider name change
    const handleProviderNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setProviderName(e.target.value);
    }, []);

    const handleModelToggle = useCallback((modelName: string, checked: boolean) => {
        setProviderModels((prev) => prev.map((model) => (model.name === modelName ? { ...model, is_shown: checked } : model)));
    }, []);

    const handleBack = useCallback(() => {
        if (isManaging) {
            setIsManaging(false);
            providerRef.current = null;
            return;
        }
        if (onBackToAddProvider) {
            onBackToAddProvider();
            return;
        }
        onClose?.();
    }, [isManaging, onBackToAddProvider, onClose]);

    // Handle update
    const handleUpdate = useCallback(
        async (config: any) => {
            if (!selectedProvider || !providerName) {
                return;
            }

            let payload: any | null = null;
            const providerType = selectedProvider.type;

            const parseOptionalNumber = (value?: string) => {
                if (value === undefined || value === null || value === '') return undefined;
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : undefined;
            };

            if (providerType === 'openai') {
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
            } else if (providerType === 'bedrock') {
                payload = {
                    name: providerName,
                    type: 'bedrock',
                    config: {
                        bedrock: {
                            access_key: config.accessKeyId,
                            secret_key: config.secretAccessKey,
                            region: config.region,
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
            } else if (providerType === 'google') {
                const baseUrl = config?.base_url ?? config?.baseUrl;
                payload = {
                    name: providerName,
                    type: 'google',
                    config: {
                        google: {
                            api_key: config.apiKey,
                            ...(baseUrl ? { base_url: baseUrl } : {}),
                            model: config.model || 'gemini-2.0-flash',
                            embedding_model: config.embeddingModel || 'text-embedding-004',
                        },
                    },
                    assistant_id: assistantId,
                    source: 'custom',
                    is_shown: true,
                };
            } else if (providerType === 'ollama') {
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
                payload = {
                    name: providerName,
                    type: 'vllm',
                    config: {
                        vllm: {
                            // Use `host` in payload to align with backend expectations
                            host: config.baseUrl,
                            api_key: config.apiKey,
                        },
                    },
                    assistant_id: assistantId,
                    source: 'custom',
                    is_shown: true,
                };
            } else if (providerType === 'custom') {
                const maxCompletionTokens = parseOptionalNumber(config.maxCompletionTokens);
                const maxOutputTokens = parseOptionalNumber(config.maxOutputTokens);
                const maxTokens = parseOptionalNumber(config.maxTokens);

                payload = {
                    name: providerName,
                    type: 'custom',
                    config: {
                        // Align update payload shape with create payload (config.openApi)
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

                    const { data } = await apiFetch<Provider>(
                        updateCustomProvider.api(selectedProvider.id || selectedProvider._id),
                        updateCustomProvider.method,
                        updatePayload,
                    );

                    // Sync local provider list + models with latest data
                    setProviders((prev) =>
                        prev.map((p) =>
                            p.id === data.id || p._id === data._id
                                ? {
                                      ...p,
                                      ...data,
                                  }
                                : p,
                        ),
                    );
                    setProviderModels((data.models || modelsPayload || []).map((m: any) => ({ ...m })));
                    onSave?.(data);
                    // Refresh providers list after successful update
                    await onRefreshProviders?.();
                } catch (error) {
                    const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
                    let errorMessage = 'Failed to update provider. Please try again.';
                    if (axiosError.response?.data?.detail) {
                        errorMessage = axiosError.response.data.detail;
                    } else if (axiosError.response?.data?.message) {
                        errorMessage = axiosError.response.data.message;
                    }
                    notify({
                        type: 'error',
                        message: errorMessage,
                    });
                    throw error;
                }
            }
        },
        [selectedProvider, providerName, assistantId, providerModels, onSave, onRefreshProviders, notify],
    );

    // Handle update button click
    const handleUpdateProvider = useCallback(async () => {
        if (!selectedProvider || !providerName) {
            return;
        }

        if (providerRef.current) {
            setIsUpdating(true);
            try {
                await providerRef.current.submit();
            } catch (error) {
                console.error('Error updating provider:', error);
            } finally {
                setIsUpdating(false);
            }
        }
    }, [selectedProvider, providerName]);

    // Handle delete provider (show confirmation dialog similar to delete assistant)
    const handleDeleteProvider = useCallback(() => {
        if (!selectedProvider) {
            return;
        }

        dialog({
            title: `Are you sure to delete provider "${selectedProvider.name}"?`,
            content: (
                <Space direction="vertical" size={8} align="start">
                    <Typography variant="Body" style={{ color: '#EE7D7D' }}>
                        Warning: This provider may be in use by one or more AI Agents. Deleting it could cause those agents to stop working.
                    </Typography>
                    <Typography variant="Body">
                        If you choose to proceed, you won't be able to undo this action.
                    </Typography>
                </Space>
            ),
            confirmText: t('yes'),
            confirmButtonProps: {
                type: 'danger',
            },
            actionsAlign: 'flex-end',
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    await apiFetch(
                        deleteCustomProvider.api(selectedProvider.id || selectedProvider._id),
                        deleteCustomProvider.method,
                    );

                    notify({
                        type: 'success',
                        message: 'Provider deleted successfully.',
                    });

                    // Reset state
                    setSelectedProviderId('');
                    setProviderName('');
                    setProviderModels([]);
                    setIsManaging(false);
                    providerRef.current = null;

                    // Refresh providers list
                    await fetchCustomProviders();
                    await onRefreshProviders?.();
                } catch (error) {
                    const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
                    let errorMessage = 'Failed to delete provider. Please try again.';
                    if (axiosError.response?.data?.detail) {
                        errorMessage = axiosError.response.data.detail;
                    } else if (axiosError.response?.data?.message) {
                        errorMessage = axiosError.response.data.message;
                    }
                    notify({
                        type: 'error',
                        message: errorMessage,
                    });
                } finally {
                    setIsDeleting(false);
                }
            },
            onClose: () => {},
        });
    }, [selectedProvider, dialog, t, notify, fetchCustomProviders, onRefreshProviders]);

    // Fetch providers on mount
    useEffect(() => {
        fetchCustomProviders();
    }, [fetchCustomProviders]);

    // Render provider form
    const renderProviderForm = useMemo(() => {
        if (!selectedProvider) return null;

        const providerType = getProviderType(selectedProvider.type);
        const initialValues = getInitialValues(selectedProvider);

        const commonProps = {
            onCancel: () => {
                setSelectedProviderId('');
                setProviderName('');
            },
            onConnect: handleUpdate,
            providerName,
            initialValues,
        };

        switch (providerType) {
            case 'amazon_bedrock':
                return (
                    <AmazonBedrockProvider
                        key={`bedrock-${selectedProvider.id}`}
                        ref={providerRef as React.Ref<AmazonBedrockProviderRef>}
                        {...commonProps}
                    />
                );
            case 'google_ai':
                return (
                    <GoogleAIProvider
                        key={`google-${selectedProvider.id}`}
                        ref={providerRef as React.Ref<GoogleAIProviderRef>}
                        {...commonProps}
                    />
                );
            case 'openai':
                return (
                    <OpenAIProvider
                        key={`openai-${selectedProvider.id}`}
                        ref={providerRef as React.Ref<OpenAIProviderRef>}
                        {...commonProps}
                    />
                );
            case 'ollama':
                return (
                    <OllamaProvider
                        key={`ollama-${selectedProvider.id}`}
                        ref={providerRef as React.Ref<OllamaProviderRef>}
                        {...commonProps}
                    />
                );
            case 'vllm':
                return (
                    <VLLMProvider key={`vllm-${selectedProvider.id}`} ref={providerRef as React.Ref<VLLMProviderRef>} {...commonProps} />
                );
            case 'custom':
                return (
                    <CustomProvider
                        key={`custom-${selectedProvider.id}`}
                        ref={providerRef as React.Ref<CustomProviderRef>}
                        {...commonProps}
                        onCapabilitiesChange={setCapabilitiesFilter}
                    />
                );
            default:
                return null;
        }
    }, [selectedProvider, providerName, getProviderType, getInitialValues, handleUpdate]);

    // Update provider name when selection changes
    useEffect(() => {
        if (selectedProvider) {
            setProviderName(selectedProvider.name);
        }
    }, [selectedProvider]);

    return (
        <>
            {dialogHolder}
            <Space direction="vertical" style={{ width: '100%', padding: '24px 0' }} align="start">
                <Typography variant="Body" style={{ marginBottom: '16px', color: '#4F4F4F' }}>
                    Manage the LLM providers you&apos;ve already connected.
                </Typography>
                <Space direction="horizontal" style={{ width: '100%', gap: '16px', alignItems: 'flex-end', marginBottom: '24px' }}>
                    <div style={{ flex: 1 }}>
                        {selectedProvider && isManaging ? (
                            <FieldSelect
                                label="Connected Provider Type"
                                value={getProviderType(selectedProvider.type)}
                                onChange={() => {}}
                                queryKey={['provider_type']}
                                disabled={true}
                                request={async () => providerOptions}
                                placeholder="Select provider type"
                                fullWidth
                            />
                        ) : (
                            <Autocomplete<ProviderSelectOption, false, true, false>
                                disableClearable
                                openOnFocus
                                options={providerSelectOptions}
                                groupBy={(option) => option.group}
                                getOptionLabel={(option) => option.label}
                                value={providerSelectOptions.find((opt) => opt.value === selectedProviderId)}
                                loading={isLoadingProviders}
                                onChange={(_, newValue) => {
                                    const value = (newValue as ProviderSelectOption | null)?.value;
                                    handleProviderChange(value);
                                }}
                                sx={{
                                    width: '100%',
                                    '& .MuiAutocomplete-popupIndicator': {
                                        right: '9px',
                                        '& :focus, :hover': {
                                            background: 'transparent',
                                        },
                                    },
                                }}
                                slotProps={{
                                    popupIndicator: {
                                        disableRipple: true,
                                    },
                                    paper: {
                                        sx: {
                                            boxShadow: '0px 2px 24px 0px #E0E0E033, 0px 4px 8px 0px #BDBDBD14',
                                            '.MuiAutocomplete-noOptions': {
                                                fontSize: '14px',
                                                fontWeight: 400,
                                                lineHeight: '20px',
                                                color: 'var(--color-light-5)',
                                            },
                                        },
                                    },
                                }}
                                isOptionEqualToValue={(option, value) => option.value === value.value}
                                renderGroup={(params) => (
                                    <li key={params.key}>
                                        <Typography
                                            variant="Caption"
                                            style={{
                                                padding: '4px 12px',
                                                color: 'var(--color-light-5)',
                                            }}
                                        >
                                            {params.group}
                                        </Typography>
                                        <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
                                    </li>
                                )}
                                renderOption={(optionProps, option) => (
                                    <DropdownMenuItem
                                        {...optionProps}
                                        sx={{
                                            padding: '8px 12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-start',
                                            justifyContent: 'flex-start',
                                            gap: '2px',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <Typography
                                            variant="Body"
                                            style={{
                                                width: '100%',
                                                textAlign: 'left',
                                            }}
                                        >
                                            {option.label}
                                        </Typography>
                                    </DropdownMenuItem>
                                )}
                                renderInput={(params) => (
                                    <FieldText {...params} label="Provider Type" placeholder="Select a provider type to manage" fullWidth />
                                )}
                            />
                        )}
                    </div>
                    {selectedProvider && isManaging && (
                        <div style={{ flex: 1 }}>
                            <FieldText
                                label="Name"
                                value={providerName}
                                onChange={handleProviderNameChange}
                                placeholder="Enter provider name"
                                fullWidth
                            />
                        </div>
                    )}
                </Space>

                {selectedProvider && isManaging && renderProviderForm && (
                    <Space direction="vertical" style={{ width: '100%', marginTop: '24px', gap: '24px' }} align="start">
                        <Space direction="vertical" style={{ width: '100%' }} align="start">
                            {renderProviderForm}
                        </Space>

                        {filteredProviderModels.length > 0 && (
                                <Space direction="vertical" style={{ width: '100%' }} align="start">
                                    <Typography variant="BodyBold">
                                        Model
                                    </Typography>
                                    <Typography
                                        variant="Body"
                                        style={{ color: '#828282', fontSize: '12px', marginBottom: '8px' }}
                                    >
                                        Select models to enable for this provider.
                                    </Typography>
                                    <Space direction="vertical" align="start" style={{ gap: '4px' }}>
                                        {filteredProviderModels.map((model) => {
                                            const baseLabel = model.description
                                                ? `${model.name} (${model.description})`
                                                : model.name;

                                            return (
                                                <Checkbox
                                                    key={model.name}
                                                    checked={!!model.is_shown}
                                                    onChange={(checked: boolean) =>
                                                        handleModelToggle(model.name, !!checked)
                                                    }
                                                    label={
                                                        <Space
                                                            direction="horizontal"
                                                            align="center"
                                                            style={{ gap: 8 }}
                                                        >
                                                            <span>{baseLabel}</span>
                                                        </Space>
                                                    }
                                                />
                                            );
                                        })}
                                    </Space>
                                </Space>
                        )}
                    </Space>
                )}

                {!selectedProvider && !isLoadingProviders && (
                    <Typography variant="Body" style={{ color: '#828282' }}>
                        Please select a provider from the dropdown above to manage its configuration.
                    </Typography>
                )}
                {selectedProvider && !isManaging && (
                    <Typography variant="Body" style={{ color: '#828282' }}>
                        Click &quot;Manage&quot; to view and update this provider&apos;s configuration.
                    </Typography>
                )}
            </Space>
            <Space
                direction="horizontal"
                style={{
                    width: '100%',
                    position: 'absolute',
                    bottom: 0,
                    padding: '12px 32px 32px',
                    right: 0,
                    backgroundColor: 'white',
                }}
                justify="between"
            >
                <div>
                    {selectedProvider && isManaging && (
                        <Button
                            type="danger"
                            variant="outlined"
                            loading={isDeleting}
                            text="Delete"
                            onClick={handleDeleteProvider}
                            sx={{ minWidth: '140px' }}
                            disabled={isUpdating || isDeleting}
                        />
                    )}
                </div>
                <Space direction="horizontal" style={{ gap: '12px' }}>
                    <Button
                        variant="outlined"
                        text="Back"
                        onClick={handleBack}
                        sx={{ minWidth: '120px' }}
                        disabled={isUpdating || isDeleting}
                    />
                    <Button
                        variant="contained"
                        text={isUpdating ? 'Updating...' : !isManaging ? 'Manage' : 'Update Provider'}
                        onClick={async () => {
                            if (!selectedProvider) return;

                            if (!isManaging) {
                                setIsManaging(true);
                                return;
                            }

                            await handleUpdateProvider();
                        }}
                        sx={{ minWidth: '160px' }}
                        disabled={isUpdating || isDeleting || !selectedProvider || (!isManaging && !selectedProvider)}
                    />
                </Space>
            </Space>
        </>
    );
};

export default ManageCurrentProvider;
