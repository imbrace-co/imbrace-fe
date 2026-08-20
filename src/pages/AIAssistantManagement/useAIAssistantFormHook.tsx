'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, FieldText, Icon, FieldSelect, Space, Spin, Typography, useDialog, Switch } from '@imbrace/ui';
import { useMutation } from '@tanstack/react-query';
import { generatePath, useNavigate, useSearchParams } from 'react-router-dom';
import { enqueueSnackbar, OptionsObject } from 'notistack';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Controller, FormProvider, useForm, useWatch, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { getAIAssistantById, getBuiltinAssistantById, getAIAssistantLLMModels, postAIAssistant, putAIAssistant, verifyToolServer, getCustomProviders } from '@/services/api/ai-assistant';
import { createCustomUseCase as createCustomUseCaseAPI, deleteUseCaseById, deleteUseCaseByIdV2, getTemplates, updateCustomUseCaseById as updateCustomUseCaseByIdAPI, updateUseCaseById } from '@/services/api/ai';
import { getBoards } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';
import { AIAssistantSchema, AIAssistantType, OpenAIAssistant, DEFAULT_VIBE_CODING, VIBE_CODING_NON_TOOL_KEYS } from '@/pages/AIAssistantManagement/components/type';
import Notes from './components/Notes';
import { env } from '@/env';
import { RAGFile } from './components/type';
import { getAccount } from '@/services/api/account';
import { replaceChannel } from '@/services/api/channel';
import { fetchAllApWorkflows } from '@/services/api/apWorkflow';
import { getAllIPSWorkflow } from '@/services/api/workflow';
import { AlertVariantProps } from '@/Router';
import WorkflowFunctionsSelection from './components/WorkflowFunctionsSelection';
import KnowledgeHubBoardSelection from './components/KnowledgeHubBoardSelection';
import { AIAssistantChannelAdding } from './components/AIAssistantChannelAdding';
import { updateAiAssistant } from '@/services/api/ai-assistant';
import { useNotify } from '@/contexts/SnackbarContext';
import { z } from 'zod';
import { convertOpenApiToToolPayload } from '@/utils/openApiConverter';
import styles from './index.module.scss';
import { getIsAllowModify } from '@/utils/CookiesHelper';
import { Checkbox, Chip, CircularProgress, Tooltip } from '@mui/material';
import IconGuideDetail from '@/assets/icons/icon_guide_detail.svg?react';
import FlowChart from '../AIAgent/components/flowChart';
import { ReactFlowProvider } from '@xyflow/react';
import { UseCaseProps } from '../AIAgent/components/UseCaseItem';
import LLMProviderSelectField from './components/LLMProviderSelectField';
import { deleteKnowledgeHubFiles, deleteKnowledgeHubFolder, getKnowledgeHubFoldersContentById, getKnowledgeHubFoldersSearch } from '@/services/api/knowledgeHub';
import { Folder } from '../KnowledgeHub';
import DataboardSelection from './components/DataboardSelection';
import KnowledgeFolderSelection, { FolderContent } from './components/KnowledgeFolderSelection';
import { ImbraceClient } from '@/services/axios';
import { AxiosError } from 'axios';
import KnowledgeHubV2Section from './components/KnowledgeHubV2Section';
export enum AIAssistantManagementTab {
    Basics = 'basic',
    Behavior = 'behavior',
    Knowledge = 'knowledge',
    Advanced = 'advanced',
}



export const agentTypeValue = {
    teamLead: 'team_lead',
    agent: 'agent',
};


type ProviderSelectOption = {
    label: string;
    value: string;
    group: string;
    type?: string;
    isSearch?: boolean;
};

/** One MCP / OpenAPI tool-server config as stored in assistant metadata. */
interface ToolServerConfig {
    url: string;
    path?: string;
    auth_type?: 'bearer' | 'session';
    key?: string;
    type?: 'openapi' | 'mcp';
    enabled?: boolean;
    /** operationId whitelist from the tool picker; null = legacy (all safe tools). */
    enabled_tools?: string[] | null;
}

/** Normalize a raw tool-server object into the exact metadata shape we persist. */
const normalizeToolServer = (cfg: any): ToolServerConfig => ({
    url: cfg?.url,
    path: cfg?.path || '',
    auth_type: cfg?.auth_type,
    key: cfg?.key || '',
    type: cfg?.type || 'openapi',
    enabled: cfg?.enabled !== false,
    // Tool whitelist from the picker; null = legacy (executor loads all safe
    // tools, destructive stays opt-in).
    enabled_tools: cfg?.enabled_tools ?? null,
});

/**
 * Build the tool-server metadata to save. `tool_servers` (array) is the source
 * of truth; `tool_server` is kept as the first entry so any reader still on the
 * legacy single-object shape keeps working.
 */
const buildToolServersMeta = (formData: any) => {
    const list = (Array.isArray(formData?.tool_servers) ? formData.tool_servers : [])
        .filter(Boolean)
        .map(normalizeToolServer);
    return { tool_servers: list, tool_server: list[0] ?? null };
};

export const useAIAssistantForm = ({
    isDuplicate,
    id,
    AIAgentId,
    isCustomAIAgent = false,
    isAIAgent = false,
    isUseCaseVersion2 = false,
    supportedChannels,
    onBack,
    onCreateSuccess,
    onUpdateSuccess,
}: {
    id?: string;
    AIAgentId?: string;
    isDuplicate?: boolean;
    isAIAgent?: boolean;
    isUseCaseVersion2?: boolean;
    isCustomAIAgent?: boolean;
    supportedChannels?: API.ChannelType[];
    onBack?: () => void;
    onCreateSuccess?: (returnedId: string) => void;
    onUpdateSuccess?: (returnedId: string) => void;
}) => {
    const [editData, setEditData] = useState<OpenAIAssistant | undefined>(undefined);
    const isAllowModify = getIsAllowModify();
    const [knowledgeBoards, setKnowledgeBoards] = useState<API.Board[]>([]);
    const [folders, setFolders] = useState<API.Folder[]>([]);
    const [databoards, setDataboards] = useState<API.Board[]>([]);

    const [account, setAccount] = useState<API.Account | null>(null);
    const [showMoreBehavior, setShowMoreBehavior] = useState(false);
    const searchParams = useSearchParams();
    const { t, i18n } = useTranslation();
    const mode = {
        standard: t('ai_agent_standard_assistant'),
        advanced: t('ai_agent_advanced_assistant'),
    };
    const categoryOptions = [
        { value: 0, text: t('hr', 'HR') },
        { value: 1, text: t('data', 'Data') },
        { value: 2, text: t('procurement', 'Procurement') },
        { value: 3, text: t('legal', 'Legal') },
        { value: 4, text: t('sales_ops', 'Sales/Ops') },
        { value: 5, text: t('finance_hr', 'Finance/HR') },
        { value: 6, text: t('safety', 'Safety') },
        { value: 7, text: t('customer', 'Customer') },
        { value: 8, text: t('it', 'IT') },
    ];
    const router = useNavigate();
    const [isPending] = useTransition();
    const [tab, setTab] = useState(AIAssistantManagementTab.Basics);
    const [loading, setLoading] = useState(false);
    const [assistantId, setAssistantId] = useState('');
    const [isEnableStreaming, setIsEnableStreaming] = useState(true);

    const [isAgentSwitching, setIsAgentSwitching] = useState(false);

    const [llmModels, setLlmModels] = useState<{ name: string; is_toolCall_available: boolean; label?: string }[]>([]);
    const [customProviders, setCustomProviders] = useState<
        Array<{
            _id: string;
            name: string;
            type: string;
            provider_id: string;
            config?: any;
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
                label?: string;
            }>;
        }>
    >([]);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [providersVersion, setProvidersVersion] = useState(0);
    const [filesLoaded, setFilesLoaded] = useState(false);
    const [fileListUpload, setFileListUpload] = useState<Array<API.DataBoardFile>>([]);
    const [agentFolderDefaultData, setAgentFolderDefaultData] = useState<Folder>();

    const [toolListLoading, setToolListLoading] = useState(false);
    const [{ dialog, dialogForm }, dialogHolder] = useDialog();
    const { notify } = useNotify();
    const leftRef = useRef<HTMLDivElement>(null);
    const originDefaultFolderId = useRef<string | undefined>(undefined);
    const isEditMode = useMemo(() => !isDuplicate && id, [isDuplicate, id]);
    const llmModelsFetchSeqRef = useRef(0);
    const translateTextType = {
        normal: isAIAgent ? 'agent' : 'assistant',
        capitalize: isAIAgent ? 'Agent' : 'Assistant',
    };
    const navigate = useNavigate();
    const formMethods = useForm<AIAssistantType>({
        mode: 'all',
        defaultValues: {
            name: '',
            description: '',
            mode: 'standard',
            model: 'rag',
            model_id: '',
            provider_id: 'system',
            instructions: '',
            channel: '',
            channel_id: '',
            categories: [],
            personality_and_role: '',
            core_task: '',
            preload_information: undefined,
            tone_and_style: '',
            response_length: '',
            list_of_banned_words: '',
            other_requirements: [],
            files: [],
            selected_board_id: '',
            folder_ids: [],
            default_folder_id: '',
            board_ids: [],
            workflow_functions: [],
            teams: 'all',
            show_thinking_process: true,
            streaming: true,
            agent_type: agentTypeValue.agent,
            sub_agents: [],
            temperature: 0.1,
            use_memory: true,
            is_orchestrator: false,
            team_leads: [],
            tool_servers: [],
            enable_echart: false,
            max_steps: 20,
            vibe_code: false,
            vibe_coding: DEFAULT_VIBE_CODING,
            top_k_relevant_results: 3,
            top_k: 40,
        },
        resolver: zodResolver(AIAssistantSchema({ t }), { async: true }, { mode: 'async' }),
    });

    const {
        setError,
        clearErrors,
        control,
        getValues,
        handleSubmit,
        trigger,
        setValue,
        watch,
        reset,
        formState: { isValid, isDirty, errors, dirtyFields },
    } = formMethods;

    console.log({ forms: getValues(), errors })

    // DEBUG: why is the Save button disabled? (disabled = !isValid || loading || !isDirty)
    console.log('[AIAssistantForm][SAVE-DEBUG]', {
        isValid,
        isDirty,
        loading,
        dirtyFields,
        errorKeys: Object.keys(errors || {}),
        errors,
    });

    // DEBUG: log whenever any field changes, even if the component does not re-render
    useEffect(() => {
        const runSchemaCheck = async () => {
            try {
                const result = await AIAssistantSchema({ t }).safeParseAsync(formMethods.getValues());
                console.log('[AIAssistantForm][SCHEMA-CHECK]', {
                    success: result.success,
                    issues: result.success
                        ? []
                        : result.error.issues.map((i) => ({
                            path: i.path.join('.'),
                            code: i.code,
                            message: i.message,
                        })),
                });
            } catch (e) {
                console.log('[AIAssistantForm][SCHEMA-CHECK] THREW', e);
            }
        };
        runSchemaCheck();
        const sub = formMethods.watch((value, { name, type }) => {
            console.log('[AIAssistantForm][WATCH]', {
                changedField: name,
                type,
                isValid: formMethods.formState.isValid,
                isDirty: formMethods.formState.isDirty,
                dirtyFields: Object.keys(formMethods.formState.dirtyFields || {}),
                errorKeys: Object.keys(formMethods.formState.errors || {}),
            });
            runSchemaCheck();
        });
        return () => sub.unsubscribe();
    }, [formMethods, t]);

    // DEBUG: log whenever the Save-button inputs actually change
    useEffect(() => {
        console.log('[AIAssistantForm][STATE-CHANGE]', { isValid, isDirty, loading });
    }, [isValid, isDirty, loading]);

    const folderSelection = watch('folder_ids');
    const boardSelection = watch('board_ids');
    const folderDefaultId = watch('default_folder_id');
    const selectedProviderId = watch('provider_id');

    const agentName = watch('name');
    const vibeCodeEnabled = watch('vibe_code');
    const vibeCoding = watch('vibe_coding');

    const handleDeleteFile = useCallback(
        async (fileId: string) => {
            await apiFetch<{ id: string; filename: string }>(`/ai/v3/rag/files/${fileId}`, 'DELETE');

            // Update assistant to remove file from file_ids if in edit mode
            if (editData && editData.id) {
                try {
                    // Remove fileId from current file_ids array
                    const updatedFileIds =
                        (getValues('files') || [])
                            .filter((file) => file.id !== fileId)
                            .map((file) => file.id) || [];
                    // Update assistant with new file_ids
                    await apiFetch(putAIAssistant.api(editData.id), putAIAssistant.method, {
                        ...editData,
                        file_ids: updatedFileIds,
                        workflow_name: `${mode[editData.mode as keyof typeof mode]} | ${editData.name}`,
                    });
                    // Update local editData state
                    setEditData((prev) =>
                        prev
                            ? {
                                ...prev,
                                file_ids: updatedFileIds,
                            }
                            : prev,
                    );
                } catch (error) {
                    console.error('Error updating assistant after file deletion:', error);
                    // Show notification about the error
                    notify({
                        message: 'File deleted but failed to update assistant. Please refresh the page.',
                        type: 'error',
                    });
                }
            }
        },
        [editData, notify],
    );

    const isAiAssistantVersion1 = watch('model') !== 'rag';
    const agentType = watch('agent_type');
    const subAgents = getValues('sub_agents');
    const teamLeads = getValues('team_leads');
    const initialAgentType = useRef('');

    console.log({ LLMModels: llmModels })

    const fetchInitData = async (id?: string, isDuplicate?: boolean) => {
        try {
            setLoading(true);
            const knowledgeBoards = await fetchKnowledgeBoards();
            setKnowledgeBoards(knowledgeBoards);

            const account = await fetchAccount();
            setAccount(account);

            const rootFolders = await fetchFolders();
            setFolders(rootFolders as unknown as API.Folder[]);

            const dataBoardList = await fetchDataboards();
            setDataboards(dataBoardList || []);

            if (id) {
                const responseData: any = await fetchAIAssistant(id);
                const workflowFunctions =
                    responseData.workflow_function_call?.length === 0
                        ? []
                        : await fetchWorkflowFunctions(responseData.workflow_function_call);
                initialAgentType.current = responseData.agent_type || agentTypeValue.agent;
                setIsEnableStreaming(responseData.streaming);
                originDefaultFolderId.current = responseData?.default_folder_id || '';
                // Reset form with fetched data (without files)
                reset(
                    {
                        name: isDuplicate ? `${responseData.name}` : responseData.name,
                        description: responseData.description,
                        mode: responseData.mode,
                        model_id: responseData.model_id || '',
                        instructions: responseData.instructions,
                        channel: responseData.channel || '',
                        channel_id: isDuplicate ? '' : responseData.metadata.channel_id,
                        categories: (responseData.category ?? [])
                            .map(
                                (value: string) =>
                                    categoryOptions.find((option) => option.text === value)?.value,
                            )
                            .filter((v): v is number => v !== undefined),
                        show_thinking_process: responseData.show_thinking_process,
                        streaming: responseData.streaming || false,
                        model: responseData.model,
                        personality_and_role: responseData.personality_role,
                        core_task: responseData.core_task,
                        preload_information: responseData.preload_information || '',
                        tone_and_style: responseData.tone_and_style,
                        response_length: responseData.response_length,
                        list_of_banned_words: responseData.banned_words,
                        other_requirements: responseData.metadata.other_requirements || [],
                        files: [],
                        teams: responseData.metadata.team_ids?.length ? responseData.metadata.team_ids : 'all',
                        selected_board_id: responseData.knowledge_hubs?.[0] ?? '',
                        folder_ids: (responseData.folder_ids ?? []).filter((fid: string) =>
                            (rootFolders as unknown as API.Folder[]).some((f) => f._id === fid),
                        ),
                        default_folder_id: responseData.default_folder_id || '',
                        board_ids: (responseData.board_ids ?? []).filter((bid: string) =>
                            (dataBoardList || []).some((b: any) => b._id === bid),
                        ),
                        workflow_functions: workflowFunctions.map((workflowFunction) => ({
                            id: workflowFunction.id,
                            name: workflowFunction.name,
                            description: workflowFunction.settings?.ai?.function?.description || '',
                        })),
                        agent_type: responseData.agent_type || agentTypeValue.agent,
                        is_orchestrator: responseData.agent_type === agentTypeValue.teamLead,
                        sub_agents: responseData.sub_agents || [],
                        team_leads: responseData.team_leads || [],
                        use_memory: responseData.use_memory ?? true,
                        temperature: responseData.temperature || 0.1,
                        // New agents store `tool_servers` (array); older ones store a
                        // single `tool_server`. Normalize both to the array field.
                        tool_servers: Array.isArray(responseData.metadata?.tool_servers)
                            ? responseData.metadata.tool_servers
                            : responseData.metadata?.tool_server
                            ? [responseData.metadata.tool_server]
                            : [],
                        enable_echart: responseData.metadata?.enable_echart || false,
                        max_steps: responseData.metadata?.max_steps || 20,
                        vibe_code: responseData.vibe_code || false,
                        vibe_coding: responseData.metadata?.vibe_coding || DEFAULT_VIBE_CODING,
                        top_k_relevant_results: responseData.metadata?.top_k_relevant_results || 3,
                        top_k: responseData.metadata?.top_k || 40,
                        provider_id: responseData.provider_id || responseData.metadata?.provider_id || 'system',
                    },
                    { keepDefaultValues: false },
                );
                setAssistantId(responseData.assistant_id);
                setEditData(responseData);
            }
            await fetchCustomProviders();
        } catch (error) {
            console.error('Error fetching init data:', error);
        } finally {
            setLoading(false);
            setIsAgentSwitching(false);
        }
    };

    const fetchLLMModels = async () => {
        const fetchSeq = ++llmModelsFetchSeqRef.current;
        const currentProviderId = getValues('provider_id');

        // If provider isn't selected (or was removed), don't fall back to system.
        // Keep model list empty until user explicitly selects a provider.
        if (!currentProviderId) {
            if (llmModelsFetchSeqRef.current === fetchSeq) {
                setLlmModels([]);
            }
            return [];
        }

        // If System Provider, use the /models API and show loading to prevent selecting model while fetching
        if (currentProviderId === 'system') {
            setIsLoadingModels(true);
            try {
                const { data } = await apiFetch<{ data: Array<{ name: string; is_toolCall_available: boolean }> }>(
                    getAIAssistantLLMModels.api(),
                    getAIAssistantLLMModels.method,
                );

                // Ignore stale responses (e.g. user switched provider while request was in-flight)
                if (llmModelsFetchSeqRef.current !== fetchSeq || getValues('provider_id') !== currentProviderId) {
                    return [];
                }

                const llmModelData = (data?.data || []).map(item =>
                    item.name === 'Default'
                        ? { ...item, label: t('default') }
                        : { ...item, label: item.name },
                );

                setLlmModels(llmModelData || []);
                // Save to state for tool-call checking

                const llmModelOptions =
                    llmModelData?.map((item) => ({
                        text: item.label,
                        value: item.name,
                    })) ?? [];

                return llmModelOptions;
            } finally {
                if (llmModelsFetchSeqRef.current === fetchSeq) {
                    setIsLoadingModels(false);
                }
            }
        }

        // If Custom Provider, get models from selected provider in customProviders
        setIsLoadingModels(true);
        try {
            const selectedProvider = customProviders.find((p) => (p.provider_id || p._id) === currentProviderId);
            const models = selectedProvider?.models ?? [];

            // IMPORTANT:
            // `supports_*` in provider config describes provider capabilities (support), NOT a visibility filter.
            // For the model dropdown, we should only show models that are enabled (`is_shown === true`).
            const visibleModels = models.filter((m) => (m as any).is_shown === true);

            const llmModelOptions = visibleModels.map((model) => ({
                text: model.description ? `${model.name} (${model.description})` : model.name,
                value: model.name,
            }));

            // Ignore stale (provider switched while deriving models)
            if (llmModelsFetchSeqRef.current !== fetchSeq || getValues('provider_id') !== currentProviderId) {
                return [];
            }

            setLlmModels(
                visibleModels.map((m) => ({
                    name: m.name,
                    is_toolCall_available: (m as any).is_toolCall_available ?? false,
                    label: m.name === 'Default' ? t('default') : m.name,
                })),
            );

            return llmModelOptions;
        } finally {
            if (llmModelsFetchSeqRef.current === fetchSeq) {
                setIsLoadingModels(false);
            }
        }
    };

    const fetchCustomProviders = async () => {
        try {
            setIsLoadingProviders(true);
            const { data } = await apiFetch<
                Array<{
                    _id: string;
                    name: string;
                    type: string;
                    provider_id: string;
                    config?: any;
                    models?: Array<{
                        name: string;
                        provider: string;
                        description?: string;
                        provider_name?: string;
                        is_toolCall_available?: boolean;
                        is_vision_available?: boolean;
                        is_support_thinking?: boolean;
                        is_parallel_tool_calls_available?: boolean;
                        is_prompt_cache_available?: boolean;
                        is_shown?: boolean;
                        label?: string;
                    }>;
                }>
            >(getCustomProviders.api(), getCustomProviders.method);

            // Use API response as source of truth (don't merge with old local state)
            const apiProviders = Array.isArray(data) ? data : [];

            setCustomProviders(apiProviders as any);

            // Check if currently selected provider still exists
            const currentProviderId = getValues('provider_id');
            if (currentProviderId && currentProviderId !== 'system') {
                const providerStillExists = apiProviders.some(
                    (p) => (p.provider_id || p._id) === currentProviderId
                );
                if (!providerStillExists) {
                    // If selected provider was deleted/missing, don't auto-fallback to system.
                    // Clear provider/model so user must explicitly choose.
                    setValue('provider_id', '');
                    setValue('model_id', '');
                    setLlmModels([]);
                }
            }

            const options = [
                {
                    text: t('ai_agent_system_provider'),
                    value: 'system',
                },
                ...apiProviders.map((provider) => ({
                    text: provider.name,
                    value: provider.provider_id || provider._id,
                })),
            ];
            return options;
        } catch (error) {
            console.error('Error fetching custom providers:', error);
            // Return default option if API fails
            return [
                {
                    text: t('ai_agent_system_provider'),
                    value: 'system',
                },
            ];
        } finally {
            setIsLoadingProviders(false);
        }
    };

    const getProviderGroupLabel = (type: string | undefined): string => {
        switch (type) {
            case 'openai':
                return t('ai_agent_open_ai');
            case 'google':
                return t('ai_agent_google_ai');
            case 'ollama':
                return t('ai_agent_ollama');
            case 'amazon_bedrock':
            case 'bedrock':
                return t('ai_agent_amazon_bedrock');
            case 'custom':
                return t('ai_agent_custom_provider');
            case 'vllm':
                return t('ai_agent_vllm');
            default:
                return 'Others';
        }
    };

    const providerSelectOptions: ProviderSelectOption[] = useMemo(() => {
        const systemOption: ProviderSelectOption = {
            label: t('ai_agent_system_provider'),
            value: 'system',
            group: 'System',
            type: 'system',
        };

        const dynamicOptions: ProviderSelectOption[] = customProviders.map((provider) => ({
            label: provider.name,
            value: provider.provider_id || provider._id,
            group: getProviderGroupLabel(provider.type),
            type: provider.type,
        }));

        return [systemOption, ...dynamicOptions];
    }, [customProviders]);

    // Refresh providers when providersVersion changes
    useEffect(() => {
        if (providersVersion > 0) {
            fetchCustomProviders();
        }
    }, [providersVersion]);


    useEffect(() => {
        fetchLLMModels();
    }, [selectedProviderId, customProviders, t]);

    const isToolCallAvailable = () => {
        if (isAiAssistantVersion1) return false;
        const modelIsSelected = getValues('model_id');
        if (!modelIsSelected) {
            return true;
        }

        // Check llmModels first (populated when Behavior tab's FieldSelect has rendered)
        const modelFromLlm = llmModels?.find((item) => item.name === modelIsSelected);
        if (modelFromLlm !== undefined) {
            return modelFromLlm.is_toolCall_available;
        }

        // Fallback: when llmModels hasn't been populated yet (e.g. Behavior tab not
        // rendered on direct navigation), check customProviders directly.
        const currentProviderId = getValues('provider_id');
        if (currentProviderId && currentProviderId !== 'system') {
            const selectedProvider = customProviders.find(
                (p) => (p.provider_id || p._id) === currentProviderId,
            );
            const providerModel = selectedProvider?.models?.find((m) => m.name === modelIsSelected);
            if (providerModel) {
                return providerModel.is_toolCall_available ?? false;
            }
        }

        // Default: show capabilities (system provider or model not found yet)
        return true;
    };

    const fetchFilesForKnowledge = async () => {
        if (!id || isDuplicate || filesLoaded) return;

        try {
            setLoading(true);
            const responseData = editData;
            if (!responseData) return;

            const isAiAssistantVersion1 = responseData.model !== 'rag';
            const responseFiles = await fetchFiles(id, isAiAssistantVersion1);
            const filesData =
                responseFiles.map((file: any) => {
                    return {
                        fileId: file.file_id,
                        id: file.id,
                        url: file.url || '',
                        name: file?.filename || '',
                        status: 'ok' as const,
                    };
                }) || [];
            console.log({ filesData }, 'fetch file should show');
            setValue('files', filesData);
            setFilesLoaded(true);
        } catch (error) {
            console.error('Error fetching files:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFilesFolderDefault = async (isFirstUpload: boolean, folderIdUpdate?: string) => {
        if (!folderIdUpdate) return;
        if (isFirstUpload) {
            setValue('default_folder_id', folderIdUpdate, {
                shouldValidate: true,
                shouldDirty: true,
            });
            trigger('default_folder_id');
        }
        try {
            setLoading(true);
            const searchParamsFolder = new URLSearchParams();
            const { data } = await apiFetch<{ data: FolderContent }>(
                getKnowledgeHubFoldersContentById.api(folderIdUpdate),
                getKnowledgeHubFoldersContentById.method,
                searchParamsFolder,
            );
            setFileListUpload(data.data.files);
            setAgentFolderDefaultData(data.data.folder);
        } catch (error) {
            console.error('Error fetching files:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch files when Knowledge tab is accessed
    useEffect(() => {
        if (tab === AIAssistantManagementTab.Knowledge) {
            fetchFilesFolderDefault(false, folderDefaultId);
        }
    }, [tab]);

    useEffect(() => {
        fetchInitData(id, isDuplicate);
    }, [id]);

    const fetchFiles = async (assistant_id: string, isAiAssistantVersion1: boolean) => {
        const response = await apiFetch<RAGFile[]>(
            `/ai/v3/rag/files?assistant_id=${assistant_id}&${`is_rag=${!isAiAssistantVersion1}`}`,
            'GET',
        );
        return response.data;
    };

    const getFileContent = async (fileId: string) => {
        const response = await apiFetch<RAGFile[]>(`/ai/v3/rag/files/content/${fileId}`, 'GET');
        return response.data;
    };

    const fetchAIAssistant = async (id: string) => {
        const isBuiltin = id.startsWith('builtin-');
        const endpoint = isBuiltin ? getBuiltinAssistantById : getAIAssistantById;
        const response = await apiFetch<any>(endpoint.api(id), endpoint.method);
        // Builtin endpoint wraps payload in { data: {...} }; legacy v3 endpoint returns assistant directly.
        return isBuiltin ? response.data?.data : response.data;
    };

    const fetchKnowledgeBoards = async () => {
        const response = await apiFetch<{ data: API.Board[] }>(
            `${getBoards.api({
                limit: 0,
                skip: 0,
                sort: '-created_at',
                types: 'KnowledgeHub',
            })}`,
            getBoards.method,
        );
        return response.data.data;
    };

    const fetchDataboards = async () => {
        const response = await apiFetch<{ data: API.Board[] }>(
            `${getBoards.api({
                limit: 0,
                skip: 0,
                sort: '-created_at',
            })}`,
            getBoards.method,
        );
        return response.data.data;
    };

    const fetchFolders = async () => {
        try {
            const searchFolderParams = new URLSearchParams();
            searchFolderParams.append('q', '');
            const folderURL = getKnowledgeHubFoldersSearch.api('');
            const { data } = await apiFetch<{ data: Array<Folder> }>(folderURL, getKnowledgeHubFoldersSearch.method);

            const rootFolders = data.data.filter((item) => item.parent_folder_id === 'root');
            return rootFolders;
        } catch (error) {
            console.error('fetch folder error: ', error);
        }
    };

    const fetchAccount = async () => {
        const { data } = await apiFetch<API.Account>(getAccount.api, getAccount.method);
        return data;
    };

    const fetchWorkflowFunctions = async (workflowFunctionIds: string[]) => {
        try {
            const isUsingV2 = isUseCaseVersion2 || (!isEditMode && !isDuplicate);

            // V2 lists flows straight from ActivePieces, transformed to the expected structure
            if (isUsingV2) {
                const { data: flows } = await fetchAllApWorkflows({
                    sort: '-created_at',
                    haveAISettings: true,
                    tags: ['agent', 'capabilities'],
                    ids: workflowFunctionIds,
                });
                return flows.map((item) => ({
                    id: item.id,
                    name: item.displayName,
                    displayName: item.displayName,
                    description: item.metadata?.settings?.ai?.function?.description || '',
                    active: item.active === 'ENABLED',
                    createdAt: item.created,
                    updatedAt: item.updated,
                    tags: item.metadata?.tags || [],
                    settings: item.metadata?.settings,
                    metadata: item.metadata,
                }));
            }

            const { data } = await apiFetch<API.PaginatedResponse<any[]>>(
                getAllIPSWorkflow.api({
                    sort: '-created_at',
                    ids: workflowFunctionIds,
                }),
                getAllIPSWorkflow.method,
            );

            return data.data;
        } catch (error) {
            console.error(error);
            return [];
        }
    };

    const updateForm = useMutation({
        mutationFn: async (form: AIAssistantType) => {
            if (!editData) return;
            const formData = {
                ...form,
            };
            const payload = {
                name: formData.name,
                description: formData.description,
                mode: formData.mode,
                model: formData.model,
                model_id: formData.model_id,
                provider_id: formData.provider_id || 'system',
                instructions: formData.instructions,
                channel: formData.channel,
                category: formData.categories?.map((value) => categoryOptions.find((option) => option.value === value)?.text),
                show_thinking_process: formData.show_thinking_process,
                streaming: formData.streaming,
                personality_role: formData.personality_and_role,
                core_task: formData.core_task,
                preload_information: formData.preload_information,
                tone_and_style: formData.tone_and_style,
                response_length: formData.response_length,
                banned_words: formData.list_of_banned_words,
                metadata: {
                    other_requirements: formData.other_requirements?.map((value) => ({
                        ...value,
                        requirement: value.message,
                    })),
                    channel_id: formData.channel_id,
                    team_ids: formData.teams === 'all' ? [] : formData.teams,
                    ...buildToolServersMeta(formData),
                    enable_echart: formData.enable_echart || false,
                    vibe_coding: formData.vibe_coding || DEFAULT_VIBE_CODING,
                    top_k_relevant_results: formData.top_k_relevant_results,
                    top_k: formData.top_k,
                    max_steps: formData.max_steps,
                },
                vibe_code: formData.vibe_code || false,
                file_ids: formData.files?.filter((file) => file.status === 'ok').map((file) => file.fileId),
                workflow_name: `${mode[formData.mode]} | ${formData.name}`,
                credential_name: `${mode[formData.mode]} | ${formData.name}`,
                knowledge_hubs: formData.selected_board_id ? [formData.selected_board_id] : [],
                folder_ids: formData.folder_ids || [],
                default_folder_id: formData.default_folder_id,
                board_ids: formData.board_ids ?? [],
                workflow_function_call: isAiAssistantVersion1
                    ? null
                    : isToolCallAvailable()
                        ? formData.workflow_functions?.map((workflowFunction) => workflowFunction.id)
                        : [],
                sub_agents: formData.sub_agents?.map((item) => item.assistant_id),
                agent_type: formData.agent_type,
                team_leads: formData.team_leads,
                use_memory: formData.use_memory,
                temperature: formData.temperature,
            };
            await apiFetch(putAIAssistant.api(editData.id), putAIAssistant.method, payload);
        },
    });

    const createForm = useMutation({
        mutationFn: async (form: AIAssistantType) => {
            const formData = {
                ...form,
            };
            const payload = {
                name: formData.name,
                description: formData.description,
                mode: formData.mode,
                model_id: formData.model_id,
                provider_id: formData.provider_id || 'system',
                instructions: formData.instructions,
                channel: formData.channel,
                category: formData.categories?.map((value) => categoryOptions.find((option) => option.value === value)?.text),
                show_thinking_process: formData.show_thinking_process,
                streaming: formData.streaming,
                personality_role: formData.personality_and_role,
                core_task: formData.core_task,
                preload_information: formData.preload_information,
                tone_and_style: formData.tone_and_style,
                response_length: formData.response_length,
                banned_words: formData.list_of_banned_words,
                metadata: {
                    other_requirements: formData.other_requirements?.map((value) => ({
                        ...value,
                        requirement: value.message,
                    })),
                    channel_id: formData.channel_id,
                    team_ids: formData.teams === 'all' ? [] : formData.teams,
                    ...buildToolServersMeta(formData),
                    enable_echart: formData.enable_echart || false,
                    vibe_coding: formData.vibe_coding || DEFAULT_VIBE_CODING,
                    top_k_relevant_results: formData.top_k_relevant_results,
                    top_k: formData.top_k,
                    max_steps: formData.max_steps,
                },
                vibe_code: formData.vibe_code || false,
                file_ids: formData.files?.filter((file) => file.status === 'ok').map((file) => file.fileId),
                workflow_name: `${mode[formData.mode]}  | ${formData.name}`,
                credential_name: `${mode[formData.mode]} | ${formData.name}`,
                knowledge_hubs: formData.selected_board_id ? [formData.selected_board_id] : [],
                folder_ids: formData.folder_ids || [],
                default_folder_id: formData.default_folder_id,
                board_ids: formData.board_ids ?? [],
                workflow_function_call: isAiAssistantVersion1
                    ? null
                    :formData.workflow_functions?.map((workflowFunction) => workflowFunction.id),
                sub_agents: formData.sub_agents?.map((item) => item.assistant_id),
                agent_type: formData.agent_type,
                team_leads: formData.team_leads,
                use_memory: formData.use_memory,
                temperature: formData.temperature,
            };
            const { data } = await apiFetch<{ id: string }>(postAIAssistant.api(), postAIAssistant.method, payload);
            return data;
        },
    });

    const createCustomUseCase = useMutation({
        mutationFn: async (form: AIAssistantType) => {
            const formData = {
                ...form,
            };
            const payload = {
                usecase: {
                    title: formData.name,
                    short_description: formData.description,
                    demo_url: env.VITE_APP_CHAT_HOST,
                    supported_channels: [
                        {
                            title: t(`channel_${formData.channel}`),
                            icon: formData.channel,
                        },
                    ],
                    agent_type: formData.agent_type,
                },
                assistant: {
                    name: formData.name,
                    description: formData.description,
                    mode: formData.mode,
                    model_id: formData.model_id,
                    provider_id: formData.provider_id || 'system',
                    instructions: formData.instructions,
                    channel: formData.channel,
                    category: formData.categories?.map((value) => categoryOptions.find((option) => option.value === value)?.text),
                    show_thinking_process: formData.show_thinking_process,
                    streaming: formData.streaming,
                    personality_role: formData.personality_and_role,
                    core_task: formData.core_task,
                    preload_information: formData.preload_information,
                    tone_and_style: formData.tone_and_style,
                    response_length: formData.response_length,
                    banned_words: formData.list_of_banned_words,
                    metadata: {
                        other_requirements: formData.other_requirements?.map((value) => ({
                            ...value,
                            requirement: value.message,
                        })),
                        channel_id: formData.channel_id,
                        team_ids: formData.teams === 'all' ? [] : formData.teams,
                        ...buildToolServersMeta(formData),
                        enable_echart: formData.enable_echart || false,
                        vibe_coding: formData.vibe_coding || DEFAULT_VIBE_CODING,
                        top_k_relevant_results: formData.top_k_relevant_results,
                        top_k: formData.top_k,
                        max_steps: formData.max_steps,
                    },
                    vibe_code: formData.vibe_code || false,
                    file_ids: formData.files?.filter((file) => file.status === 'ok').map((file) => file.fileId),
                    workflow_name: `${mode[formData.mode]}  | ${formData.name}`,
                    credential_name: `${mode[formData.mode]} | ${formData.name}`,
                    knowledge_hubs: formData.selected_board_id ? [formData.selected_board_id] : [],
                    folder_ids: formData.folder_ids || [],
                    default_folder_id: formData.default_folder_id,
                    board_ids: formData.board_ids ?? [],
                    workflow_function_call: isAiAssistantVersion1
                        ? null
                        :formData.workflow_functions?.map((workflowFunction) => workflowFunction.id),
                    sub_agents: formData.sub_agents?.map((item) => item.assistant_id),
                    agent_type: formData.agent_type,
                    team_leads: formData.team_leads,
                    use_memory: formData.use_memory,
                    temperature: formData.temperature,
                    version: 2,
                },
            };
            const { data } = await apiFetch<{ data: { _id: string } }>(createCustomUseCaseAPI.api, createCustomUseCaseAPI.method, payload);
            return data.data;
        },
    });

    const updateCustomAIAgent = useMutation({
        mutationFn: async ({ form, AIAgentId }: { form: AIAssistantType; AIAgentId: string }) => {
            if (!editData) return;
            const formData = {
                ...form,
            };
            const payload = {
                usecase: {
                    title: formData.name,
                    short_description: formData.description,
                    supported_channels: [
                        {
                            title: t(`channel_${formData.channel}`),
                            icon: formData.channel,
                        },
                    ],
                    agent_type: formData.agent_type,
                },
                assistant: {
                    name: formData.name,
                    description: formData.description,
                    mode: formData.mode,
                    model: formData.model,
                    model_id: formData.model_id,
                    provider_id: formData.provider_id || 'system',
                    instructions: formData.instructions,
                    channel: formData.channel,
                    category: formData.categories?.map((value) => categoryOptions.find((option) => option.value === value)?.text),
                    show_thinking_process: formData.show_thinking_process,
                    streaming: formData.streaming,
                    personality_role: formData.personality_and_role,
                    core_task: formData.core_task,
                    preload_information: formData.preload_information,
                    tone_and_style: formData.tone_and_style,
                    response_length: formData.response_length,
                    banned_words: formData.list_of_banned_words,
                    metadata: {
                        other_requirements: formData.other_requirements?.map((value) => ({
                            ...value,
                            requirement: value.message,
                        })),
                        channel_id: formData.channel_id,
                        team_ids: formData.teams === 'all' ? [] : formData.teams,
                        ...buildToolServersMeta(formData),
                        enable_echart: formData.enable_echart || false,
                        vibe_coding: formData.vibe_coding || DEFAULT_VIBE_CODING,
                        top_k_relevant_results: formData.top_k_relevant_results,
                        top_k: formData.top_k,
                        max_steps: formData.max_steps,
                    },
                    vibe_code: formData.vibe_code || false,
                    file_ids: formData.files?.filter((file) => file.status === 'ok').map((file) => file.fileId),
                    workflow_name: `${mode[formData.mode]} | ${formData.name}`,
                    credential_name: `${mode[formData.mode]} | ${formData.name}`,
                    knowledge_hubs: formData.selected_board_id ? [formData.selected_board_id] : [],
                    folder_ids: formData.folder_ids || [],
                    default_folder_id: formData.default_folder_id,
                    board_ids: formData.board_ids ?? [],
                    workflow_function_call: isAiAssistantVersion1
                        ? null
                        :formData.workflow_functions?.map((workflowFunction) => workflowFunction.id),
                    sub_agents: formData.sub_agents?.map((item) => item.assistant_id),
                    agent_type: formData.agent_type,
                    team_leads: formData.team_leads,
                    use_memory: formData.use_memory,
                    temperature: formData.temperature,
                },
            };
            const { data } = await apiFetch<{ id: string }>(
                updateCustomUseCaseByIdAPI.api(AIAgentId),
                updateCustomUseCaseByIdAPI.method,
                payload,
            );
            return data;
        },
    });

    const updateDefaultAIAgent = useMutation({
        mutationFn: async ({ form, AIAgentId }: { form: AIAssistantType; AIAgentId: string }) => {
            if (!editData) return;
            const formData = {
                ...form,
            };
            const payload = {
                title: formData.name,
                description: formData.description,
            };
            const { data } = await apiFetch<{ id: string }>(updateUseCaseById.api(AIAgentId), updateUseCaseById.method, payload);
            return data;
        },
    });

    const updateAIAssistant = useMutation({
        mutationFn: async ({
            id,
            data,
        }: {
            id: string;
            data: API.OpenAIAssistant & { workflow_name: string; credential_name: string };
        }) => {
            return await apiFetch(updateAiAssistant.api(id), updateAiAssistant.method, data);
        },
    });

    const replaceAIAssistantChannel = useMutation({
        mutationFn: async ({
            data,
        }: {
            data: {
                name: string;
                workflow_id: string;
                channel_type: API.ChannelType;
                channel_id: string;
            };
        }) => {
            return await apiFetch<API.Channel>(replaceChannel.api(), replaceChannel.method, data);
        },
    });

    const replaceAndUpdateAIAssistantChannel = async (
        createdAIAssistant: API.OpenAIAssistant,
        channel: API.ChannelType,
        channelId: string,
    ) => {

        try {
            const { data } = await replaceAIAssistantChannel.mutateAsync({
                data: {
                    name: createdAIAssistant.name,
                    workflow_id: createdAIAssistant.metadata.workflow_id,
                    channel_type: channel as API.ChannelType,
                    channel_id: channelId,
                },
            });
            await updateAIAssistant.mutateAsync({
                id: createdAIAssistant.id,
                data: {
                    ...createdAIAssistant,
                    channel: channel as API.ChannelType,
                    metadata: {
                        ...createdAIAssistant.metadata,
                        channel_id: data.id,
                    },
                    workflow_name: `${mode[createdAIAssistant.mode]} | ${createdAIAssistant.name}`,
                    credential_name: `${mode[createdAIAssistant.mode]} | ${createdAIAssistant.name}`,
                },
            });
            router('/workflows/channels', {
                state: {
                    currentChannel: channel as API.ChannelType,
                },
            });
            notify({
                message: t('ai_assistant_management_set_as_default_chatbot_channel_replaced_success'),
                type: 'success',
            });
        } catch (error) {
            console.log(error);
            notify({
                message: t('ai_assistant_management_set_as_default_chatbot_channel_replaced_failed'),
                type: 'error',
            });
        }
    };

    const showCreateAIAssistantSuccessDialog = (createdAIAssistant: API.OpenAIAssistant) => {
        dialog({
            title: (
                <Typography variant="Heading2">
                    <span style={{ color: '#156DF2' }}>{createdAIAssistant.name}</span>
                    <span> {t('ai_assistant_management_set_as_default_chatbot_desc')}</span>
                </Typography>
            ),
            content: t('ai_assistant_management_set_as_default_chatbot_guide'),
            confirmText: t('yes'),
            hideCancelButton: true,
            hideAdditionalButton: false,
            additionalText: t('no'),
            backdropClosable: false,
            onConfirm: async () => {
                const isMissingChannel = createdAIAssistant.metadata.channel_id === '';
                if (isMissingChannel) {
                    dialogForm<{
                        channel: string;
                        channel_id: string;
                    }>({
                        title: t('ai_assistant_management_set_as_default_chatbot_missing_info'),
                        content: (methods: any) => (
                            <FormProvider {...methods}>
                                <AIAssistantChannelAdding methods={methods} />
                            </FormProvider>
                        ),
                        defaultValues: {
                            channel: createdAIAssistant.channel,
                        },
                        backdropClosable: false,
                        confirmText: t('create'),
                        actionsAlign: 'flex-start',
                        showUnsavedDialog: false,
                        showCloseButton: true,
                        hideCancelButton: true,
                        onClose: async () => {
                            onBack?.();
                        },
                        onConfirm: async (formData: { channel: string; channel_id: string }, methods: any) => {
                            const { channel, channel_id } = formData;
                            replaceAndUpdateAIAssistantChannel(createdAIAssistant, channel as API.ChannelType, channel_id);
                        },
                        confirmButtonProps: {
                            sx: {
                                minWidth: '160px',
                                height: '40px',
                            },
                        },
                        schema: z.object({
                            channel: z.string().superRefine((val, ctx) => {
                                if (val.trim().length === 0) {
                                    ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        message: t('validation_field_required'),
                                        fatal: true,
                                    });
                                    return z.NEVER;
                                }
                            }),
                            channel_id: z.string().superRefine((val, ctx) => {
                                if (val.trim().length === 0) {
                                    ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        message: t('validation_field_required'),
                                        fatal: true,
                                    });
                                    return z.NEVER;
                                }
                            }),
                        }),
                    });
                } else {
                    replaceAndUpdateAIAssistantChannel(createdAIAssistant, getValues('channel') as API.ChannelType, (getValues('channel_id') || ''));
                }
            },
            onAdditionalClick: async () => {
                const result = await new Promise<boolean | undefined>((resolve) => {
                    dialog({
                        title: '',
                        content: (
                            <Space direction="vertical" size={16}>
                                <iframe
                                    width="100%"
                                    height="530px"
                                    src="https://www.youtube.com/embed/Jwnzu2VuY8I"
                                    title=""
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-read; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </Space>
                        ),
                        backdropClosable: false,
                        confirmText: t('ai_assistant_management_tutorial_go_to_workflow'),
                        additionalText: t('ai_assistant_management_tutorial_skip'),
                        hideCancelButton: true,
                        hideAdditionalButton: false,
                        additionalButtonProps: {
                            sx: {
                                width: '105px',
                                borderColor: 'white',
                                color: 'white',
                            },
                            variant: 'outlined',
                        },
                        onAdditionalClick: async () => {
                            onBack?.();
                        },
                        onConfirm: () => {
                            router('/workflows/presets');
                        },
                        paperSx: {
                            maxWidth: '1200px',
                            width: '1200px',
                            height: '700px',
                            backgroundColor: 'transparent',
                            boxShadow: 'none !important',
                        },
                    });
                });
                return result as boolean;
            },
            confirmButtonProps: {
                sx: {
                    width: '105px',
                },
                variant: 'outlined',
            },
            additionalButtonProps: {
                sx: {
                    width: '105px',
                },
                variant: 'contained',
            },
        });
    };

    const exitForm = () => {
        if (isDirty) {
            dialog({
                title: `Are you sure you want to stop editing the AI ${isAIAgent ? 'Agent' : 'Assistant'}?`,
                content: ({ onClose }: { onClose?: () => void }) => (
                    <Space direction="vertical" size={12}>
                        <Typography>
                            Click "Save" to keep your changes, "Exit without saving" to return to the AI{' '}
                            {isAIAgent ? 'Agent' : 'Assistant'} menu without saving your changes, or "Cancel" to continue editing.
                        </Typography>
                        <Space justify="end" style={{ width: '100%' }}>
                            
                            <Button
                                sx={{
                                    width: '105px',
                                    height: '32px',
                                    padding: '0px',
                                }}
                                onClick={async () => {
                                    onClose?.();
                                    if (!(await trigger())) {
                                        dialog({
                                            title: t('journey_not_able_to_save_dialog_title'),
                                            content: t('journey_not_able_to_save_dialog_desc'),
                                            confirmText: t('back_to_edit'),
                                            cancelText: t('discard'),
                                            backdropClosable: false,
                                            onConfirm: async () => {
                                                return false;
                                            },
                                            onClose: async () => { },
                                        });
                                    } else {
                                        await handleSubmit(onSubmit)();
                                        onClose?.();
                                        onBack?.();
                                    }
                                }}
                                variant="contained"
                                text={t('save')}
                            />
                            <Button
                                sx={{
                                    height: '32px',
                                    padding: '0 10px',
                                }}
                                onClick={() => {
                                    if (!originDefaultFolderId.current && folderDefaultId) {
                                        removeAgentFolderDefault();
                                    }
                                    onClose?.();
                                    onBack?.();
                                }}
                                type="danger"
                                variant="outlined"
                                text={t('Exit without saving')}
                            />
                            <Button
                                sx={{
                                    width: '105px',
                                    height: '32px',
                                    padding: '0px',
                                }}
                                onClick={() => {
                                    onClose?.();
                                }}
                                variant="outlined"
                                text={t('cancel')}
                            />
                        </Space>
                    </Space>
                ),
                confirmText: 'Save',
                cancelText: 'Cancel',
                hideCancelButton: true,
                hideConfirmButton: true,
                onConfirm: async () => {
                    onBack?.();
                },
                onClose: async () => { },
            });
        } else {
            onBack?.();
        }
    };

    const onSubmit = useCallback(
        async (formData: AIAssistantType) => {
            try {
                setLoading(true);
                if (!isEditMode) {
                    if (isAIAgent) {
                        const createdUseCase = await createCustomUseCase.mutateAsync(formData);
                        if (createdUseCase) {
                            notify({
                                message: `AI Agent created successfully`,
                                type: 'success',
                            });
                        }
                        originDefaultFolderId.current = formData?.default_folder_id;
                        await onCreateSuccess?.(createdUseCase._id);
                        return;
                    } else {
                        const createdAIAssistant = await createForm.mutateAsync(formData);
                        originDefaultFolderId.current = formData?.default_folder_id;
                        showCreateAIAssistantSuccessDialog(createdAIAssistant as API.OpenAIAssistant);
                        await onCreateSuccess?.(createdAIAssistant.id);
                        return;
                    }
                } else {
                    if (isAIAgent) {
                        // Built-in detection must check `id` (assistant_id, e.g. "builtin-databoard-agent"),
                        // NOT `AIAgentId` (template _id, e.g. "uc_builtin_databoard_agent").
                        const isBuiltin = (id ?? '').startsWith('builtin-') || (AIAgentId ?? '').startsWith('uc_builtin_');

                        if (isBuiltin) {
                            const createdUseCase = await createCustomUseCase.mutateAsync(formData);
                            notify({
                                message: `AI Agent created successfully`,
                                type: 'success',
                            });
                            originDefaultFolderId.current = formData?.default_folder_id;
                            await onCreateSuccess?.(createdUseCase._id);
                            return;
                        }

                        if (isCustomAIAgent) {
                            await onUpdateCustomAIAgent(formData, AIAgentId ?? '');
                            await onUpdateSuccess?.(AIAgentId ?? '');
                        } else {
                            await updateForm.mutateAsync(formData);
                            await updateDefaultAIAgent.mutateAsync({ form: formData, AIAgentId: AIAgentId ?? '' });
                            notify({
                                message: `AI ${isAIAgent ? 'Agent' : 'Assistant'} updated successfully`,
                                type: 'success',
                            });
                            await onUpdateSuccess?.(AIAgentId ?? '');
                        }
                    } else {
                        await updateForm.mutateAsync(formData);
                        notify({
                            message: `AI ${isAIAgent ? 'Agent' : 'Assistant'} updated successfully`,
                            type: 'success',
                        });
                        await onUpdateSuccess?.(id ?? '');
                    }
                }
                setIsEnableStreaming(formData.streaming);
                originDefaultFolderId.current = formData?.default_folder_id;
                reset(formData);
            } catch (error) {
                console.error('Error:', error);
                const snackbarOption: OptionsObject<'alert'> & AlertVariantProps = {
                    key: `${new Date().getTime()}`,
                    anchorOrigin: {
                        horizontal: 'right',
                        vertical: 'top',
                    },
                    variant: 'alert',
                    type: 'error',
                    autoHideDuration: 3000,
                    snackBarId: `${new Date().getTime()}`,
                };

                enqueueSnackbar('Something went wrong, please try again.', snackbarOption);
            } finally {
                setLoading(false);
            }
        },
        [enqueueSnackbar, updateForm, updateDefaultAIAgent, updateCustomAIAgent, router, searchParams, editData],
    );

    const onRemoveAIAgent = () => {
        if (!AIAgentId) return;
        dialog({
            title: `${t('ai_assistant_management_delete')} ${getValues('name')}`,
            content: t('noti_warning_delete_item'),
            confirmText: t('yes'),
            confirmButtonProps: {
                type: 'danger',
            },
            actionsAlign: 'flex-end',
            onConfirm: async () => {
                try {
                    await apiFetch<{ message: string }>(
                        isUseCaseVersion2 ? deleteUseCaseByIdV2.api(AIAgentId) : deleteUseCaseById.api(AIAgentId),
                        isUseCaseVersion2 ? deleteUseCaseByIdV2.method : deleteUseCaseById.method,
                    );
                    onBack?.();
                    notify({
                        message: t('ai_agent_delete_success'),
                        type: 'success',
                    });
                } catch (error) {
                    console.error('Error:', error);
                    notify({
                        message: t('ai_agent_delete_fail'),
                        type: 'error',
                    });
                }
            },
            onClose: () => { },
        });
    };

    const onUpdateCustomAIAgent = useCallback(
        async (formData: AIAssistantType, AIAgentId: string) => {
            if (!AIAgentId) return;
            try {
                setLoading(true);
                await updateCustomAIAgent.mutateAsync({ form: formData, AIAgentId });
                notify({
                    message: t('ai_agent_custom_usecase_update_success', { name: formData.name }),
                    type: 'success',
                });
                originDefaultFolderId.current = formData?.default_folder_id;
                reset(formData);
                // onBack?.();
            } catch (error) {
                console.error('Error:', error);
                const snackbarOption: OptionsObject<'alert'> & AlertVariantProps = {
                    key: `${new Date().getTime()}`,
                    anchorOrigin: {
                        horizontal: 'right',
                        vertical: 'top',
                    },
                    variant: 'alert',
                    type: 'error',
                    autoHideDuration: 3000,
                    snackBarId: `${new Date().getTime()}`,
                };

                enqueueSnackbar(t('error_something_went_wrong'), snackbarOption);
            } finally {
                setLoading(false);
            }
        },
        [updateCustomAIAgent, notify, reset],
    );

    const uploadingFiles = useRef(new Set<string>());

    const handleUploadFile = useCallback(
        async (file: File) => {
            // Create a unique key for this file (name + size + lastModified)
            const fileKey = `${file.name}_${file.size}_${file.lastModified}`;

            // If this file is already being uploaded, return early
            if (uploadingFiles.current.has(fileKey)) {
                return Promise.resolve({ url: '', id: '', name: '' });
            }

            // Mark this file as being uploaded
            uploadingFiles.current.add(fileKey);

            try {
                const form = new FormData();
                form.append('file', file);
                form.append('is_rag', isAiAssistantVersion1 ? 'false' : 'true');
                form.append('enable_ocr', 'true');
                if (id) {
                    form.append('assistant_id', id);
                }
                const { data } = await apiFetch<{ id: string; filename: string }>('/ai/v3/rag/files', 'POST', form);
                return {
                    url: '',
                    id: data.id,
                    name: data.filename,
                };
            } finally {
                // Remove the file from the uploading set when done
                uploadingFiles.current.delete(fileKey);
            }
        },
        [isAiAssistantVersion1, id],
    );

    const onSelectWorkflowFunctions = () => {
        dialog({
            title: t('ai_assistant_management_behavior_setting_list_of_functions_title'),
            content: ({ onClose: onDialogClose }: { onClose?: () => void }) => (
                <WorkflowFunctionsSelection
                    workflowFunctions={getValues('workflow_functions') || []}
                    onClose={() => onDialogClose?.()}
                    onSelect={(workflowFunctions: { id: string | number; name: string; description: string }[]) => {
                        setValue('workflow_functions', workflowFunctions, {
                            shouldValidate: true,
                            shouldDirty: true,
                        });
                        onDialogClose?.();
                    }}
                    isUseCaseVersion2={isUseCaseVersion2}
                    isInCreateFlow={!isEditMode && !isDuplicate}
                />
            ),
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            paperSx: {
                maxWidth: '80%',
                width: '80%',
                height: '80%',
            },
        });
    };

    const openKnowledgeHub = () => {
        const selectedKnowledgeHubId = getValues('selected_board_id');
        dialog({
            title: t('menu_knowledgeHub'),
            content: ({ onClose: onDialogClose }: { onClose?: () => void }) => (
                <KnowledgeHubBoardSelection
                    knowledgeHubId={selectedKnowledgeHubId}
                    onClose={() => onDialogClose?.()}
                    onSelect={(boardId) => {
                        setValue('selected_board_id', boardId, {
                            shouldValidate: true,
                            shouldDirty: true,
                        });
                        onDialogClose?.();
                    }}
                />
            ),
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            paperSx: {
                maxWidth: '80%',
                width: '80%',
                height: '100%',
            },
        });
    };

    const openKnowledgeFolderSelection = (initialFolderId?: string, initialBoardId?: string) => {
        dialog({
            title: '',
            content: ({ onClose: onDialogClose }: { onClose?: () => void }) => (
                <FormProvider {...formMethods}>
                    <KnowledgeFolderSelection
                        initialFolderId={initialFolderId}
                        initialBoardId={initialBoardId}
                        initialKnowledgeTab={initialBoardId ? 'knowledge_board' : 'knowledge_drive'}
                        onClose={() => onDialogClose?.()}
                        onModify={(folderId) => {
                            const currentFolderIds = getValues('folder_ids') || [];
                            const next = currentFolderIds.includes(folderId)
                                ? currentFolderIds.filter((item) => item !== folderId)
                                : [...currentFolderIds, folderId];
                            setValue('folder_ids', next, { shouldValidate: true, shouldDirty: true });
                            trigger('folder_ids');
                        }}
                        onModifyBoard={(boardId) => {
                            const currentBoardIds = getValues('board_ids') || [];
                            const next = currentBoardIds.includes(boardId)
                                ? currentBoardIds.filter((item) => item !== boardId)
                                : [...currentBoardIds, boardId];
                            setValue('board_ids', next, { shouldValidate: true, shouldDirty: true });
                            trigger('board_ids');
                        }}
                    />
                </FormProvider>
            ),
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: false,
            paperSx: {
                maxWidth: '80%',
                width: '80%',
                height: '100%',
            },
        });
    };

    const openDataboardSelection = (initialBoardId?: string) => {
        dialog({
            title: '',
            content: ({ onClose: onDialogClose }: { onClose?: () => void }) => (
                <FormProvider {...formMethods}>
                    <DataboardSelection
                        initialBoardId={initialBoardId}
                        onClose={() => onDialogClose?.()}
                        onModify={(boardId) => {
                            const currentBoardIds = getValues('board_ids') || [];
                            const next = currentBoardIds.includes(boardId)
                                ? currentBoardIds.filter((item) => item !== boardId)
                                : [...currentBoardIds, boardId];
                            setValue('board_ids', next, { shouldValidate: true, shouldDirty: true });
                            trigger('board_ids');
                        }}
                    />
                </FormProvider>
            ),
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: false,
            paperSx: {
                maxWidth: '80%',
                width: '80%',
                height: '100%',
            },
        });
    };

    const getToolServerData = async (config: { url: string; path: string; auth_type: string; key: string }) => {
        let error = null;

        const fullUrl = `${config.url}${config.path.startsWith('/') ? '' : '/'}${config.path}`;

        const headers: Record<string, string> = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        };

        // Add authorization header based on auth_type
        if (config.auth_type === 'bearer' && config.key) {
            headers.authorization = `Bearer ${config.key}`;
        }
        // For session auth, credentials will be sent automatically

        const res = await fetch(fullUrl, {
            method: 'GET',
            headers,
            credentials: config.auth_type === 'session' ? 'include' : 'omit',
        })
            .then(async (res) => {
                // Check if URL ends with .yaml or .yml to determine format
                if (config.path.toLowerCase().endsWith('.yaml') || config.path.toLowerCase().endsWith('.yml')) {
                    if (!res.ok) throw await res.text();
                    const text = await res.text();
                    // For now, try to parse as JSON if YAML parser is not available
                    // Note: Install js-yaml package for proper YAML support
                    try {
                        return JSON.parse(text);
                    } catch {
                        throw new Error('YAML parsing requires js-yaml package. Please install it or provide JSON format.');
                    }
                } else {
                    if (!res.ok) throw await res.json();
                    return res.json();
                }
            })
            .catch((err) => {
                console.log(err);
                if (err && typeof err === 'object' && 'detail' in err) {
                    error = err.detail;
                } else {
                    error = err;
                }
                return null;
            });

        if (error) {
            throw error;
        }

        const data = {
            openapi: res,
            info: res?.info,
            specs: convertOpenApiToToolPayload(res),
        };

        console.log(data);
        return data;
    };

    const openVibeCodingSkillDialog = (toolKey: string) => {
        const currentVibeCoding = (getValues('vibe_coding') as any) || DEFAULT_VIBE_CODING;
        const currentTool = currentVibeCoding?.[toolKey] || {};
        dialogForm<{ description: string; enabled: boolean }>({
            title: `${t('ai_agent_vibe_code_skill_edit')} — ${toolKey}`,
            content: (methods: any) => (
                <FormProvider {...methods}>
                    <Space direction="vertical" align="start" style={{ width: '100%' }} size={16}>
                        <Controller
                            name="enabled"
                            control={methods.control}
                            render={({ field }) => (
                                <Space align="center" size={8}>
                                    <Switch
                                        checked={field.value || false}
                                        onChange={async (checked) => {
                                            field.onChange(checked);
                                        }}
                                        size="small"
                                    />
                                    <Typography variant="Body">{t('ai_agent_vibe_code_skill_enabled')}</Typography>
                                </Space>
                            )}
                        />
                        <Controller
                            name="description"
                            control={methods.control}
                            render={({ field, fieldState: { error } }) => (
                                <FieldText
                                    {...field}
                                    fullWidth
                                    multiline
                                    resizable
                                    minRows={10}
                                    maxRows={20}
                                    label={t('ai_agent_vibe_code_skill_description')}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                    </Space>
                </FormProvider>
            ),
            defaultValues: {
                description: currentTool.description || '',
                enabled: currentTool.disabled !== true,
            },
            backdropClosable: false,
            confirmText: t('save'),
            cancelText: t('cancel'),
            showCloseButton: true,
            paperSx: {
                maxWidth: '720px',
                width: '720px',
            },
            onClose: async () => { },
            onConfirm: async (formData) => {
                const prev = (getValues('vibe_coding') as any) || DEFAULT_VIBE_CODING;
                (setValue as any)(
                    'vibe_coding',
                    {
                        ...prev,
                        [toolKey]: {
                            disabled: !formData.enabled,
                            description: formData.description,
                        },
                    },
                    { shouldValidate: true, shouldDirty: true },
                );
                return true;
            },
        });
    };

    const openMCPConfigDialog = (editIndex?: number) => {
        // The config being edited (undefined when adding a new server). Both
        // prefill and the picker seed read from it.
        const editing =
            typeof editIndex === 'number'
                ? ((getValues('tool_servers') as ToolServerConfig[] | undefined) ?? [])[editIndex]
                : undefined;
        // Commit the dialog result into the tool_servers array: replace in place
        // when editing, append when adding.
        const commit = (cfg: ToolServerConfig) => {
            const current = (getValues('tool_servers') as ToolServerConfig[] | undefined) ?? [];
            const next =
                typeof editIndex === 'number'
                    ? current.map((c, i) => (i === editIndex ? cfg : c))
                    : [...current, cfg];
            (setValue as any)('tool_servers', next, { shouldValidate: true, shouldDirty: true });
        };
        dialogForm<{
            url?: string;
            path?: string;
            auth_type?: 'bearer' | 'session';
            key?: string;
            type?: 'openapi' | 'mcp';
        }>({
            title: t('ai_agent_mcp_config_add'),
            content: (methods: any) => {
                const MCPDialogEndpointPreview = () => {
                    const { control } = useFormContext();
                    const [url, path] = useWatch({ control, name: ['url', 'path'] });
                    const urlDisplay = String(url ?? '').replace(/\/+$/, '');
                    const pathDisplay = String(path ?? 'openapi.json').replace(/^\/+/, '');
                    return (
                        <Typography variant="Body" style={{ fontSize: '12px' }}>
                            Imbrace will make requests to "{urlDisplay}/{pathDisplay}"
                        </Typography>
                    );
                };

                const MCPDialogAuthRight = () => {
                    const { control } = useFormContext();
                    const authType = useWatch({ control, name: 'auth_type' });
                    if (authType === 'session') {
                        return (
                            <Typography variant="Body" style={{ color: '#666', fontStyle: 'italic', fontSize: '12px' }}>
                                Forwards system user session credentials to authenticate
                            </Typography>
                        );
                    }
                    return (
                        <Controller
                            name="key"
                            render={({ field, fieldState: { error } }) => (
                                <FieldText {...field} fullWidth placeholder="API Key" error={!!error} helperText={error?.message} />
                            )}
                        />
                    );
                };

                const MCPDialogPathInputs = () => {
                    const { control } = useFormContext();
                    const typeValue = useWatch({ control, name: 'type' });
                    if (typeValue === 'mcp') return null;
                    return (
                        <>
                            <Typography variant="Body" style={{ fontWeight: 300, fontSize: '25px', lineHeight: '37px' }}>
                                /
                            </Typography>
                            <div style={{ width: '120px' }}>
                                <Controller
                                    name="path"
                                    control={methods.control}
                                    render={({ field, fieldState: { error } }) => (
                                        <FieldText
                                            {...field}
                                            onChange={(e: any) => {
                                                field.onChange(e);
                                                // Spec path changed → same reason as the URL field:
                                                // drop the stale tool list so it is reloaded.
                                                methods.setValue('_tools_list', undefined);
                                            }}
                                            fullWidth
                                            placeholder="openapi.json Path"
                                            error={!!error}
                                            helperText={undefined}
                                        />
                                    )}
                                />
                            </div>
                        </>
                    );
                };

                const MCPDialogEndpointPreviewWrapper = () => {
                    const { control } = useFormContext();
                    const typeValue = useWatch({ control, name: 'type' });
                    return typeValue === 'mcp' ? null : <MCPDialogEndpointPreview />;
                };

                // Tool picker — choose which spec operations the agent may use.
                // State lives in FORM fields (these subcomponents are re-defined per
                // render, so useState would reset): `_tools_list` holds the loaded
                // spec tools, `enabled_tools` holds the whitelist that gets saved.
                // Destructive ops (x-destructive) are unchecked by default — ticking
                // one is the explicit opt-in the executor requires.
                interface PickerTool {
                    name: string;
                    description: string;
                    tag: string;
                    destructive: boolean;
                    /** x-write: state-changing but not destructive (create/update/send) */
                    write: boolean;
                }
                const MCPDialogToolPicker = () => {
                    const { control, setValue, getValues } = useFormContext();
                    const typeValue = useWatch({ control, name: 'type' });
                    const toolsList = useWatch({ control, name: '_tools_list' }) as PickerTool[] | undefined;
                    const selectedRaw = useWatch({ control, name: 'enabled_tools' }) as string[] | null | undefined;
                    const loading = useWatch({ control, name: '_tools_loading' }) as boolean | undefined;

                    const selected = Array.isArray(selectedRaw) ? selectedRaw : null;
                    const setSelected = (next: string[]) =>
                        setValue('enabled_tools', next, { shouldDirty: true });

                    const loadTools = async () => {
                        const values = getValues();
                        setValue('_tools_loading', true);
                        try {
                            const tools: PickerTool[] = [];
                            if (values.type === 'mcp') {
                                // MCP servers self-describe over the protocol — the browser
                                // can't speak it, so list via the server-side endpoint (same
                                // one View Tools uses). No destructive/write metadata exists
                                // in MCP, so every tool is presented as a plain entry.
                                const { data } = await apiFetch<any>('/ai/v3/tools/config/tools', 'POST', {
                                    url: values.url || '',
                                    path: '',
                                    auth_type: values.auth_type || 'bearer',
                                    key: values.key || '',
                                    type: 'mcp',
                                    enabled: true,
                                });
                                (Array.isArray(data) ? data : []).forEach((t: any) =>
                                    tools.push({
                                        name: t.name,
                                        description: t.description || '',
                                        tag: 'tools',
                                        destructive: false,
                                        write: false,
                                    }),
                                );
                            } else {
                                const data = await getToolServerData({
                                    url: values.url || '',
                                    path: values.path || 'openapi.json',
                                    auth_type: values.auth_type || 'bearer',
                                    key: values.key || '',
                                });
                                Object.entries((data?.openapi?.paths as Record<string, any>) ?? {}).forEach(([, methods]) =>
                                    Object.values(methods as Record<string, any>).forEach((op: any) => {
                                        if (op && typeof op === 'object' && op.operationId) {
                                            tools.push({
                                                name: op.operationId,
                                                description: op.summary || op.description || '',
                                                tag: op.tags?.[0] ?? 'other',
                                                destructive: op['x-destructive'] === true,
                                                write: op['x-write'] === true,
                                            });
                                        }
                                    }),
                                );
                            }
                            setValue('_tools_list', tools);
                            // Initial selection: keep the saved whitelist (drop ids no longer
                            // in the spec — the executor ignores them anyway); legacy/null →
                            // default to every safe tool, destructive left unticked.
                            const saved =
                                (getValues('enabled_tools') as string[] | null | undefined) ??
                                ((editing as any)?.enabled_tools as string[] | null | undefined);
                            const names = new Set(tools.map((t) => t.name));
                            const initial = Array.isArray(saved)
                                ? saved.filter((n) => names.has(n))
                                : tools.filter((t) => !t.destructive).map((t) => t.name);
                            setSelected(initial);
                        } catch (error) {
                            console.error('Tool list load error:', error);
                            notify({
                                message: 'Cannot load the tool list. Please check the URL, path, and authentication.',
                                type: 'error',
                            });
                        } finally {
                            setValue('_tools_loading', false);
                        }
                    };

                    if (!toolsList) {
                        return (
                            <Space direction="horizontal" style={{ width: '100%', gap: '8px', alignItems: 'center' }}>
                                <Button
                                    variant="outlined"
                                    text={loading ? 'Loading tools…' : 'Choose tools'}
                                    disabled={!!loading}
                                    onClick={loadTools}
                                />
                                <Typography variant="Body" style={{ color: '#666', fontSize: '12px' }}>
                                    Optional — without a selection the agent gets every safe tool; destructive tools stay off.
                                </Typography>
                            </Space>
                        );
                    }

                    const bySelected = new Set(selected ?? []);
                    const groups = toolsList.reduce<Record<string, PickerTool[]>>((acc, t) => {
                        (acc[t.tag] ??= []).push(t);
                        return acc;
                    }, {});
                    const toggle = (name: string) => {
                        const next = new Set(bySelected);
                        next.has(name) ? next.delete(name) : next.add(name);
                        setSelected([...next]);
                    };
                    const toggleGroup = (tools: PickerTool[]) => {
                        const next = new Set(bySelected);
                        const allOn = tools.every((t) => next.has(t.name));
                        // Group toggle only sweeps SAFE tools — destructive stays per-tool opt-in.
                        tools.forEach((t) => {
                            if (allOn) next.delete(t.name);
                            else if (!t.destructive) next.add(t.name);
                        });
                        setSelected([...next]);
                    };
                    const destructiveOn = (selected ?? []).filter(
                        (n) => toolsList.find((t) => t.name === n)?.destructive,
                    ).length;

                    const actionBtnSx = { minWidth: 0, padding: '2px 8px', whiteSpace: 'nowrap' as const, fontSize: 12 };
                    return (
                        <div style={{ width: '100%' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    width: '100%',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 6,
                                }}
                            >
                                <Typography variant="Body" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                                    Tools&nbsp;
                                    <span style={{ color: '#666', fontWeight: 400 }}>
                                        {selected?.length ?? 0}/{toolsList.length} selected
                                        {(() => {
                                            const w = (selected ?? []).filter(
                                                (n) => toolsList.find((t) => t.name === n)?.write,
                                            ).length;
                                            return w > 0 ? ` · ✎ ${w} write` : '';
                                        })()}
                                        {destructiveOn > 0 ? ` · ⚠️ ${destructiveOn} destructive` : ''}
                                    </span>
                                </Typography>
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                    <Button
                                        variant="text"
                                        text="Read-only"
                                        sx={actionBtnSx}
                                        onClick={() => setSelected(toolsList.filter((t) => !t.destructive && !t.write).map((t) => t.name))}
                                    />
                                    <Button
                                        variant="text"
                                        text="All"
                                        sx={actionBtnSx}
                                        onClick={() => setSelected(toolsList.map((t) => t.name))}
                                    />
                                    <Button
                                        variant="text"
                                        text="All safe"
                                        sx={actionBtnSx}
                                        onClick={() => setSelected(toolsList.filter((t) => !t.destructive).map((t) => t.name))}
                                    />
                                    <Button variant="text" text="None" sx={actionBtnSx} onClick={() => setSelected([])} />
                                    <Button variant="text" text="Reload" sx={actionBtnSx} disabled={!!loading} onClick={loadTools} />
                                </div>
                            </div>
                            <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '6px 10px' }}>
                                {Object.entries(groups).map(([tag, tools]) => {
                                    const onCount = tools.filter((t) => bySelected.has(t.name)).length;
                                    return (
                                        <div key={tag} style={{ marginBottom: 6 }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <Checkbox
                                                    size="small"
                                                    sx={{ p: 0.5 }}
                                                    checked={onCount === tools.length}
                                                    indeterminate={onCount > 0 && onCount < tools.length}
                                                    onChange={() => toggleGroup(tools)}
                                                />
                                                <Typography variant="Body" style={{ fontWeight: 600, fontSize: 13 }}>
                                                    {tag} ({onCount}/{tools.length})
                                                </Typography>
                                            </div>
                                            {/* Two-column grid — operation names are short, halves the scroll */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', paddingLeft: 20 }}>
                                                {tools.map((t) => (
                                                    <div key={t.name} style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                                                        <Checkbox
                                                            size="small"
                                                            sx={{ p: 0.5 }}
                                                            checked={bySelected.has(t.name)}
                                                            onChange={() => toggle(t.name)}
                                                        />
                                                        <Tooltip title={t.description} placement="top">
                                                            <Typography
                                                                variant="Body"
                                                                style={{
                                                                    fontSize: 12,
                                                                    color: t.destructive ? '#c62828' : t.write ? '#b26a00' : undefined,
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                }}
                                                            >
                                                                {t.destructive ? '⚠️ ' : t.write ? '✎ ' : ''}
                                                                {t.name}
                                                            </Typography>
                                                        </Tooltip>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                };

                return (
                    <FormProvider {...methods}>
                        <Space direction="vertical" align="start" style={{ width: '100%' }}>
                            {/* MCP Type */}
                            <Space direction="horizontal" style={{ width: '100%', gap: '16px', alignItems: 'flex-end' }}>
                                <div style={{ width: '200px' }}>
                                    <Controller
                                        name="type"
                                        control={methods.control}
                                        render={({ field }) => (
                                            <FieldSelect
                                                {...field}
                                                onChange={(e: any) => {
                                                    field.onChange(e);
                                                    // OpenAPI vs MCP use different discovery
                                                    // mechanisms — drop the stale tool list so it is
                                                    // reloaded for the newly selected type.
                                                    methods.setValue('_tools_list', undefined);
                                                }}
                                                label="MCP Type*"
                                                queryKey={['mcp_type']}
                                                request={async () => [
                                                    { value: 'openapi', text: 'OpenAPI' },
                                                    { value: 'mcp', text: 'Streamable HTTP' },
                                                ]}
                                                fullWidth
                                                formControlSx={{ width: '100%' }}
                                            />
                                        )}
                                    />
                                </div>
                            </Space>
                            {/* URL with Sync button */}
                            <Space direction="horizontal" style={{ width: '100%', gap: '8px' }} align="end">
                                <div style={{ flex: 1 }}>
                                    <Controller
                                        name="url"
                                        control={methods.control}
                                        render={({ field, fieldState: { error } }) => (
                                            <FieldText
                                                {...field}
                                                onChange={(e: any) => {
                                                    field.onChange(e);
                                                    // Base URL changed → the loaded tools belong to
                                                    // the previous spec. Drop them so the picker
                                                    // returns to "Choose tools" and the user reloads
                                                    // the new server's tools instead of stale ones.
                                                    methods.setValue('_tools_list', undefined);
                                                }}
                                                fullWidth
                                                label="URL*"
                                                placeholder="API Base URL"
                                                error={!!error}
                                                helperText={undefined}
                                            />
                                        )}
                                    />
                                </div>
                                <MCPDialogPathInputs />
                                <Tooltip title="Verify connection">
                                    <Button
                                        variant="outlined"
                                        text=""
                                        startIcon={<Icon name="sync" />}
                                        onClick={async () => {
                                            const values = methods.getValues();
                                            const payload = {
                                                url: values.url || '',
                                                path: values.type === 'mcp' ? '' : values.path || 'openapi.json',
                                                auth_type: values.auth_type || 'bearer',
                                                key: values.key || '',
                                                type: values.type || 'openapi',
                                                config: { enable: true },
                                            };
                                            try {
                                                const { data } = await apiFetch<any>(
                                                    verifyToolServer.api(),
                                                    verifyToolServer.method,
                                                    payload,
                                                );
                                                const ok =
                                                    !!data &&
                                                    (data?.status === true ||
                                                        data?.status === 'ok' ||
                                                        (typeof data === 'object' && 'openapi' in data) ||
                                                        Array.isArray((data as any)?.specs));
                                                if (ok) {
                                                    const tools =
                                                        (Array.isArray((data as any)?.specs) ? (data as any).specs.length : undefined) ??
                                                        (data as any)?.tool_count ??
                                                        (data as any)?.tools_count;
                                                    const sel = methods.getValues('enabled_tools') as string[] | null | undefined;
                                                    const enabledNote = Array.isArray(sel) ? ` ${sel.length} enabled for this agent.` : '';
                                                    notify({
                                                        message:
                                                            tools != null
                                                                ? `Connection verified! Found ${tools} tools.${enabledNote}`
                                                                : 'Connection verified!',
                                                        type: 'success',
                                                    });
                                                } else {
                                                    notify({
                                                        message:
                                                            data?.detail ||
                                                            data?.message ||
                                                            'Verification failed. Please check the URL, path, and authentication',
                                                        type: 'error',
                                                    });
                                                }
                                            } catch (error) {
                                                console.error('Tool server verification error:', error);
                                                notify({
                                                    message:
                                                        (error && typeof error === 'object' && 'detail' in (error as any)
                                                            ? (error as any).detail
                                                            : undefined) ||
                                                        'Verification failed. Please check the URL, path, and authentication',
                                                    type: 'error',
                                                });
                                            }
                                        }}
                                        sx={{ minWidth: '40px', height: '40px', padding: '8px' }}
                                    />
                                </Tooltip>
                            </Space>
                            <MCPDialogEndpointPreviewWrapper />
                            {/* Auth section */}
                            <Space direction="horizontal" style={{ width: '100%', gap: '16px', alignItems: 'flex-start' }}>
                                <Typography variant="Body" style={{ fontWeight: 500, paddingTop: '10px' }}>
                                    Auth
                                </Typography>
                                <div style={{ width: '120px' }}>
                                    <Controller
                                        name="auth_type"
                                        control={methods.control}
                                        render={({ field }) => (
                                            <FieldSelect
                                                {...field}
                                                queryKey={['auth_type']}
                                                request={async () => [
                                                    { value: 'bearer', text: 'Bearer' },
                                                    { value: 'session', text: 'Session' },
                                                ]}
                                                fullWidth
                                                formControlSx={{
                                                    width: '100%',
                                                    minWidth: '100%',
                                                    maxWidth: '100%',
                                                }}
                                            />
                                        )}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <MCPDialogAuthRight />
                                </div>
                            </Space>
                            {/* Tool picker (openapi only) */}
                            <MCPDialogToolPicker />
                        </Space>
                    </FormProvider>
                );
            },
            defaultValues: {
                url: editing?.url || '',
                path: editing?.path || 'openapi.json',
                auth_type: editing?.auth_type || 'bearer',
                key: editing?.key || '',
                type: (editing as any)?.type || 'openapi',
                // NOTE: enabled_tools is deliberately not a defaultValue (the dialog's
                // inferred form type rejects extras here). The picker seeds it from the
                // editing config and onConfirm falls back to the saved value.
            },
            backdropClosable: false,
            // Wide enough for the tool picker's two-column checklist
            paperSx: { width: '720px', maxWidth: '94vw' },
            confirmText: 'Save',
            cancelText: 'Cancel',
            showCloseButton: true,
            onClose: async () => { },
            onConfirm: async (formData) => {
                setLoading(true);
                try {
                    const normalized = {
                        url: formData.url || '',
                        path: formData.type === 'mcp' ? '' : formData.path || 'openapi.json',
                        auth_type: formData.auth_type || 'bearer',
                        key: formData.key || '',
                        type: (formData.type as 'openapi' | 'mcp') || 'openapi',
                    };
                    if (normalized.type === 'openapi') {
                        const toolServerData = await getToolServerData(normalized as any);
                        if (toolServerData && toolServerData.openapi) {
                            commit({
                                url: normalized.url,
                                path: normalized.path,
                                auth_type: normalized.auth_type,
                                key: normalized.key,
                                type: normalized.type,
                                enabled: true,
                                // Whitelist from the tool picker; falls back to the saved
                                // selection when the picker wasn't opened this session.
                                // null = legacy (executor loads safe tools, destructive off)
                                enabled_tools:
                                    (formData as any).enabled_tools ??
                                    (editing as any)?.enabled_tools ??
                                    null,
                            });
                            notify({
                                message: `Tool server connected successfully. Found ${toolServerData.specs?.length || 0} tools.`,
                                type: 'success',
                            });
                            return true;
                        } else {
                            notify({
                                message: 'Cannot connect to tool server or invalid OpenAPI spec',
                                type: 'error',
                            });
                            return false;
                        }
                    } else {
                        commit({
                            url: normalized.url,
                            path: '',
                            auth_type: normalized.auth_type,
                            key: normalized.key,
                            type: 'mcp',
                            enabled: true,
                            // MCP servers self-describe their tools — no picker/whitelist
                            enabled_tools: null,
                        });
                        notify({ message: 'Tool server saved successfully.', type: 'success' });
                        return true;
                    }
                } catch (error) {
                    console.error('Tool server connection error:', error);
                    notify({
                        message: `Cannot connect to tool server: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        type: 'error',
                    });
                    return false;
                } finally {
                    setLoading(false);
                }
            },
            schema: z.object({
                url: z.string().optional(),
                path: z.string().optional(),
                auth_type: z.enum(['bearer', 'session']).optional(),
                key: z.string().optional(),
                type: z.enum(['openapi', 'mcp']).optional(),
                // Whitelist from the tool picker — must be declared or zod strips it
                // from the submitted values. Picker-internal fields (_tools_*) are
                // render-only and intentionally not declared.
                enabled_tools: z.array(z.string()).nullable().optional(),
            }),
        });
    };

    const removeAgentFolderDefault = async () => {
        try {
            if (!folderDefaultId) return;
            const { data } = await apiFetch(
                deleteKnowledgeHubFolder.api(),
                deleteKnowledgeHubFolder.method,
                { ids: [folderDefaultId] },
                ImbraceClient,
            );
            if (data) {
                setValue('default_folder_id', '', {
                    shouldValidate: true,
                    shouldDirty: true,
                });
                trigger('default_folder_id');
            }
        } catch (error) {
            const err = error as AxiosError;
            console.error('Delete Folder Error: ', err.response);
        }
    };

    const deleteRecord = useMutation({
        mutationFn: async (params: { recordId: string | string[] }) => {
            await apiFetch(deleteKnowledgeHubFiles.api(), deleteKnowledgeHubFiles.method, { ids: [params.recordId] }, ImbraceClient);
            return true;
        },
        onSuccess: (data, variables) => {
            // if (fileListUpload.length === 1) {
            //     removeAgentFolderDefault();
            // }
            const filesDefaultUpdate = fileListUpload.filter((file) => file._id !== variables.recordId);
            setFileListUpload(filesDefaultUpdate);
        },
        onError: () => {
            return false;
        },
    });

    const removeFileOutOfFolder = async (fileId: string) => {
        try {
            await deleteRecord.mutateAsync({ recordId: fileId });
            notify({
                type: 'success',
                message: t('File deleted successfully'),
            });
            return true;
        } catch (error) {
            console.log(error);
            return false;
        }
    };

    const renderBasicTab = () => {
        return (
            <Spin isSpinning={loading}>
                <Space
                    justify="between"
                    align="start"
                    style={{
                        paddingTop: '16px',
                        paddingLeft: isAIAgent ? '0px' : '32px',
                        paddingRight: isAIAgent ? '0px' : '32px',
                        overflow: 'auto',
                    }}
                    direction={isAIAgent ? 'vertical' : 'horizontal'}
                >
                    <Space style={{ ...(isAIAgent ? { width: '100%' } : { flex: 1 }) }}>
                        <Space direction="vertical" justify="start" align="start" style={{ width: isAIAgent ? '100%' : '70%' }}>
                            <Typography style={{ fontSize: '20px', fontWeight: 600, ...(isAIAgent && { color: 'black' }) }}>
                                {t('ai_assistant_management_basic_info')}
                            </Typography>
                            <Typography variant="Body" style={{ color: '#828282' }}>
                                {t('ai_agent_basic_info_desc')}
                            </Typography>
                        </Space>
                    </Space>
                    <Space direction="vertical" style={{ ...(isAIAgent ? { width: '100%' } : { flex: 2 }), marginBottom: '200px' }}>
                        <Space
                            ref={leftRef}
                            direction={isAIAgent ? 'horizontal' : 'vertical'}
                            style={{ width: '100%', alignItems: 'start', marginTop: '20px' }}
                        >
                            <Controller
                                name="name"
                                control={control}
                                render={({ field, fieldState: { error } }) => {
                                    return (
                                        <Space direction="vertical" style={{ width: '100%' }} align="start" {...(i18n.language === 'en' && { className: styles.autoUpLine })}>
                                            <FieldText
                                                {...field}
                                                style={{ width: isAIAgent ? '100%' : '70%' }}
                                                fullWidth
                                                description={
                                                    <Typography variant="Body" style={{ color: '#828282' }}>
                                                        {t('ai_agent_agent_name_desc')}
                                                    </Typography>
                                                }
                                                label={`${t('ai_agent_agent_name', {
                                                    type: translateTextType.capitalize,
                                                })}*`}
                                                error={!!error}
                                                helperText={error?.message}
                                                placeholder={t('ai_agent_enter_agent_name')}
                                            />
                                        </Space>
                                    );
                                }}
                            />
                            <Controller
                                control={control}
                                name="mode"
                                defaultValue="standard"
                                render={({ field, fieldState: { error } }) => (
                                    <Space
                                        direction="vertical"
                                        style={{ width: '100%', marginTop: isAIAgent ? '0px' : '20px' }}
                                        align="start"
                                        {...(i18n.language === 'en' && { className: styles.autoUpLine })}
                                    >
                                        <FieldSelect
                                            containerClassName={!isAllowModify ? styles.viewOnly : ''}
                                            label={`${t('ai_agent_agent_mode')}*`}
                                            description={t('journey_ai-assistant_management_mode_desc', {
                                                type: translateTextType.normal,
                                            })}
                                            fullWidth
                                            request={async () => {
                                                return [
                                                    {
                                                        text: t('journey_ai-assistant_management_mode_standard', {
                                                            type: translateTextType.normal,
                                                        }),
                                                        description: t('journey_ai-assistant_management_mode_standard_desc'),
                                                        value: 'standard',
                                                    },
                                                    {
                                                        text: t('journey_ai-assistant_management_mode_advanced', {
                                                            type: translateTextType.normal,
                                                        }),
                                                        description: t('journey_ai-assistant_management_mode_advanced_desc'),
                                                        value: 'advanced',
                                                    },
                                                ];
                                            }}
                                            {...field}
                                            error={!!error}
                                            helperText={error?.message}
                                        />
                                    </Space>
                                )}
                            />
                        </Space>
                        <Controller
                            name="description"
                            control={control}
                            render={({ field, fieldState: { error } }) => (
                                <Space
                                    size={0}
                                    style={{ width: '100%', marginTop: '20px', ...(isAIAgent && { color: 'black' }) }}
                                    direction="vertical"
                                    align="start"
                                >
                                    <FieldText
                                        {...field}
                                        fullWidth
                                        multiline
                                        resizable
                                        expandable
                                        minRows={4}
                                        maxRows={10}
                                        rows={4}
                                        inputProps={{ maxLength: 512 }}
                                        error={!!error}
                                        helperText={error?.message}
                                        label={`${isAIAgent ? t('description') : t('ai_assistant_management_basic_info_assistant_description')
                                            }${isAIAgent ? '' : '*'}`}
                                        placeholder={t('ai_assistant_management_basic_info_assistant_description_placeholder')}
                                    />
                                </Space>
                            )}
                        />
                        {!isAiAssistantVersion1 && (
                            <Space direction="vertical" style={{ width: '100%', marginTop: '20px' }} align="start">
                                <Space
                                    direction="horizontal"
                                    justify="between"
                                    align="start"
                                    style={{ width: '100%', marginBottom: '8px' }}
                                >
                                    <Space direction="vertical" align="start">
                                        <Typography
                                            style={{
                                                fontSize: '14px',
                                                fontWeight: 700,
                                                color: 'rgba(51, 51, 51, 1)',
                                            }}
                                        >
                                            {t('ai_agent_llm_provider')}
                                        </Typography>
                                        <Typography variant="Body" style={{ color: '#828282', fontSize: '14px' }}>
                                            {t('ai_agent_llm_provider_desc')}
                                        </Typography>
                                    </Space>
                                </Space>

                                <Space direction="horizontal" style={{ width: '100%', gap: '16px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <Controller
                                            control={control}
                                            name="provider_id"
                                            render={({ field, fieldState: { error } }) => {
                                                const selectedOption =
                                                    providerSelectOptions.find((opt) => opt.value === field.value) ||
                                                    providerSelectOptions.find((opt) => opt.value === 'system');

                                                return (
                                                    <LLMProviderSelectField
                                                        value={field.value}
                                                        onChange={(newValue) => {
                                                            field.onChange(newValue);
                                                            // Reset model_id when provider changes
                                                            setValue('model_id', '');
                                                            // Clear current model list immediately to avoid showing stale models
                                                            setLlmModels([]);
                                                            // Trigger model list refresh
                                                            trigger('model_id');
                                                        }}
                                                        options={providerSelectOptions}
                                                        loading={isLoadingProviders}
                                                        disabled={isLoadingModels}
                                                        error={!!error}
                                                        helperText={error?.message}
                                                        containerClassName={!isAllowModify ? styles.viewOnly : ''}
                                                    />
                                                );
                                            }}
                                        />
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <Controller
                                            control={control}
                                            name="model_id"
                                            render={({ field, fieldState: { error } }) => (
                                                <FieldSelect
                                                    containerClassName={!isAllowModify ? styles.viewOnly : ''}
                                                    disabled={isLoadingModels}
                                                    fullWidth
                                                    label={
                                                        isAIAgent
                                                            ? t('journey_ai-agent_management_llm_model')
                                                            : t('journey_ai-assistant_management_llm_model')
                                                    }
                                                    queryKey={['model_id', selectedProviderId, llmModels]}
                                                    request={() => {
                                                        return llmModels.map((item) => {
                                                            return {
                                                                text: item.label,
                                                                value: item.name,
                                                            };
                                                        });
                                                    }}
                                                    {...field}
                                                    error={!!error}
                                                    helperText={error?.message}
                                                />
                                            )}
                                        />
                                    </div>
                                </Space>
                            </Space>
                        )}
                        {/* Select a Platform + Channel: removed */}
                        <Controller
                            name={'categories'}
                            control={control}
                            render={({ field: { onChange, value }, fieldState: { error } }) => {
                                return (
                                    <Space size={0} style={{ width: '100%', marginTop: '20px' }} direction="vertical" align="start">
                                        <FieldSelect
                                            containerClassName={!isAllowModify ? styles.viewOnly : ''}
                                            label={t('ai_assistant_management_basic_info_assistant_category')}
                                            fullWidth
                                            queryKey={['categories']}
                                            request={() => {
                                                return categoryOptions;
                                            }}
                                            value={value as (string | number)[]}
                                            onChange={(value?: (string | number)[]) => {
                                                if (value !== undefined) {
                                                    onChange(value);
                                                }
                                            }}
                                            customIcon={(open: boolean) =>
                                                !open && <Icon name="add" fontSize={20} style={{ color: 'var(--color-light-4)' }} />
                                            }
                                            placeholder={t('ai_assistant_management_basic_info_assistant_category')}
                                            multiple
                                            closeOnSelect={false}
                                            onReset={() => {
                                                onChange?.([]);
                                            }}
                                            displayType="chip"
                                            popoverProps={{
                                                anchorOrigin: {
                                                    vertical: 'bottom',
                                                    horizontal: 'left',
                                                },
                                                transformOrigin: {
                                                    vertical: 'top',
                                                    horizontal: 'left',
                                                },
                                            }}
                                        />
                                    </Space>
                                );
                            }}
                        />
                        <Space
                            direction="horizontal"
                            style={{ marginBottom: 8, textAlign: 'start', width: '100%', marginTop: '30px', gap: '0' }}
                        >
                            <Typography
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    color: 'rgba(51, 51, 51, 1)',
                                }}
                            >
                                {t('ai_agent_show_thinking_process')}
                            </Typography>
                            <IconGuideDetail className={styles.iconThinkingGuide} />
                            <Controller
                                name="show_thinking_process"
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        type="xs"
                                        {...field}
                                        checked={field.value}
                                        onChange={async (e) => {
                                            field.onChange(e);
                                            trigger('show_thinking_process');
                                        }}
                                    />
                                )}
                            />
                        </Space>
                    </Space>
                </Space>
            </Spin>
        );
    };
    const agentChildQuantity = subAgents?.filter((item) => !item.is_new)?.length;

    const openParent = async (assistantId: string) => {
        const templateList = await apiFetch<{ data: Array<UseCaseProps> }>(getTemplates.api, getTemplates.method);
        const orchestratorItem = templateList?.data?.data?.find((templateItem) => templateItem.assistant_id === assistantId);
        if (orchestratorItem) {
            window.open(`/ai-agent/${orchestratorItem._id}`, '_blank');
        }
    };

    const renderMultiAgent = () => {
        return (
            <Spin>
                <Space
                    justify="between"
                    align="start"
                    style={{
                        paddingTop: '16px',
                        overflow: 'auto',
                    }}
                    direction={'vertical'}
                >
                    <Space style={{ ...(isAIAgent ? { width: '100%' } : { flex: 1 }) }}>
                        <Space direction="vertical" justify="start" align="start" style={{ width: isAIAgent ? '100%' : '70%' }}>
                            <Typography style={{ fontSize: '20px', fontWeight: 600, ...(isAIAgent && { color: 'black' }) }}>
                                {t('ai_agent_multi_agent')}
                            </Typography>
                            <Typography variant="Body" style={{ color: '#828282' }}>
                                {t('ai_agent_orchestrator_modal_desc', {
                                    type: translateTextType.normal,
                                })}
                            </Typography>
                            {!isAgentSwitching && agentType === agentTypeValue.agent && (
                                <Typography
                                    style={{
                                        marginTop: '10px',
                                    }}
                                >
                                    {t('ai_agent_description_agent_prefix')} <span style={{ fontWeight: 800, color: '#156DF2' }}>{t('ai_agent_agent')}</span>, {t('ai_agent_description_agent_orchestration')}
                                    {teamLeads?.map((item, index) => (
                                        <span>
                                            {' '}
                                            {index > 0 && t('and')}{' '}
                                            <a
                                                style={{ fontWeight: 800, color: '#4F4F4F' }}
                                                onClick={() => {
                                                    openParent(item.assistant_id || '');
                                                }}
                                            >
                                                {' '}
                                                {item.name}
                                            </a>{' '}
                                        </span>
                                    ))}
                                </Typography>
                            )}
                            {!isAgentSwitching && agentType === agentTypeValue.teamLead && (
                                <Typography
                                    style={{
                                        marginTop: '10px',
                                    }}
                                >
                                    {t('ai_agent_description_agent_prefix')} <span style={{ fontWeight: 800, color: '#156DF2' }}>{t('ai_agent_orchestrator')}</span>, {t('ai_agent_description_orchestrator_coordinates')}{' '}
                                    <span style={{ fontWeight: 800, color: '#156DF2' }}>
                                        {(agentChildQuantity || 0) > 0 ? agentChildQuantity : 'N/A'}
                                    </span>{' '}
                                    {t('ai_agent_description_orchestrator_suffix')}
                                </Typography>
                            )}
                        </Space>
                    </Space>

                    <ReactFlowProvider>
                        {!isAgentSwitching &&
                            agentType === agentTypeValue.agent &&
                            teamLeads?.map((item, index) => (
                                <div
                                    style={{
                                        width: '100%',
                                        height: '315px',
                                        minHeight: 280,
                                        marginTop: 20,
                                        overflow: 'visible',
                                        marginBottom: 20,
                                    }}
                                >
                                    <ReactFlowProvider>
                                        <FlowChart assistantId={item.assistant_id} agentAssistant={assistantId} />
                                    </ReactFlowProvider>
                                </div>
                            ))}

                    </ReactFlowProvider>
                </Space>
            </Spin>
        );
    };

    const renderBehaviorTab = () => {
        return (
            <Spin isSpinning={loading}>
                <FormProvider {...formMethods}>
                    {isAllowModify ? (
                        <>
                            <Space
                                justify="between"
                                align="start"
                                style={{
                                    paddingTop: '16px',
                                    paddingBottom: '48px',
                                    paddingLeft: isAIAgent ? '0px' : '32px',
                                    paddingRight: isAIAgent ? '0px' : '32px',
                                }}
                                direction={isAIAgent ? 'vertical' : 'horizontal'}
                            >
                                <Space style={{ ...(isAIAgent ? { width: '100%' } : { flex: 1 }) }}>
                                    <Space direction="vertical" justify="start" align="start">
                                        <Typography style={{ fontSize: '20px', fontWeight: 600, ...(isAIAgent && { color: 'black' }) }}>
                                            {t('ai_assistant_management_behavior_setting')}
                                        </Typography>
                                        <Typography variant="Body" style={{ color: '#828282', width: isAIAgent ? '100%' : '70%' }}>
                                            {t('ai_agent_behavior_setting_desc')}
                                        </Typography>
                                    </Space>
                                </Space>
                                <Space direction="vertical" style={{ ...(isAIAgent ? { width: '100%' } : { flex: 2 }) }}>
                                    {isAiAssistantVersion1 ? (
                                        <>
                                            <Controller
                                                control={control}
                                                name="instructions"
                                                render={({ field, fieldState: { error } }) => (
                                                    <FieldText
                                                        label={`${t('journey_ai-assistant_management_instructions', {
                                                            type: translateTextType.capitalize,
                                                        })}*`}
                                                        fullWidth
                                                        multiline
                                                        resizable
                                                        expandable
                                                        minRows={18}
                                                        maxRows={18}
                                                        {...field}
                                                        error={!!error}
                                                        helperText={error?.message}
                                                    />
                                                )}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <Space direction="vertical" style={{ width: '100%', marginTop: '20px' }} align="start">
                                                <Controller
                                                    name="personality_and_role"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <FieldText
                                                            {...field}
                                                            fullWidth
                                                            multiline
                                                            minRows={isAIAgent ? 6 : 1}
                                                            maxRows={6}
                                                            label={t('ai_assistant_management_behavior_setting_personality')}
                                                            placeholder={t(
                                                                'ai_assistant_management_behavior_setting_personality_placeholder',
                                                            )}
                                                            resizable
                                                            expandable={isAIAgent}
                                                            description={
                                                                <Typography
                                                                    variant="Body"
                                                                    style={{ color: '#828282', whiteSpace: 'pre-line' }}
                                                                >
                                                                    {`${t('ai_assistant_management_behavior_setting_personality_desc', {
                                                                        type: translateTextType.normal,
                                                                    })}`}
                                                                </Typography>
                                                            }
                                                        />
                                                    )}
                                                />
                                            </Space>

                                            <Space direction="vertical" style={{ width: '100%', marginTop: '20px' }} align="start">
                                                <Controller
                                                    name="core_task"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <FieldText
                                                            {...field}
                                                            fullWidth
                                                            multiline
                                                            resizable
                                                            expandable={isAIAgent}
                                                            minRows={isAIAgent ? 10 : 1}
                                                            maxRows={10}
                                                            label={t('ai_assistant_management_behavior_setting_core_task')}
                                                            placeholder={t(
                                                                'ai_assistant_management_behavior_setting_core_task_placeholder',
                                                            )}
                                                            description={
                                                                <Typography
                                                                    variant="Body"
                                                                    style={{ color: '#828282', whiteSpace: 'pre-line' }}
                                                                >
                                                                    {t('ai_assistant_management_behavior_setting_core_task_desc')}
                                                                </Typography>
                                                            }
                                                        />
                                                    )}
                                                />
                                            </Space>
                                            <Space direction="vertical" style={{ width: '100%', marginTop: '20px' }} align="start">
                                                <Controller
                                                    name="preload_information"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <FieldText
                                                            {...field}
                                                            fullWidth
                                                            multiline
                                                            resizable
                                                            expandable={isAIAgent}
                                                            minRows={isAIAgent ? 6 : 1}
                                                            maxRows={6}
                                                            label={t('ai_agent_preload_information')}
                                                            placeholder={t('ai_agent_enter_preload_information')}
                                                        />
                                                    )}
                                                />
                                            </Space>
                                            <Space direction="vertical" style={{ width: '100%', marginTop: '20px' }} align="start">
                                                <Controller
                                                    name="tone_and_style"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <FieldText
                                                            {...field}
                                                            fullWidth
                                                            multiline
                                                            resizable
                                                            expandable={isAIAgent}
                                                            minRows={isAIAgent ? 6 : 1}
                                                            maxRows={6}
                                                            label={t('ai_assistant_management_behavior_setting_tone_and_style')}
                                                            placeholder={t(
                                                                'ai_assistant_management_behavior_setting_tone_and_style_placeholder',
                                                            )}
                                                            description={
                                                                <Typography
                                                                    variant="Body"
                                                                    style={{ color: '#828282', whiteSpace: 'pre-line' }}
                                                                >
                                                                    {t('ai_assistant_management_behavior_setting_tone_and_style_desc')}
                                                                </Typography>
                                                            }
                                                        />
                                                    )}
                                                />
                                            </Space>
                                            <div
                                                style={{
                                                    maxHeight: showMoreBehavior ? 'unset' : '0',
                                                    opacity: showMoreBehavior ? 1 : 0,
                                                    overflow: 'hidden',
                                                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    marginTop: showMoreBehavior ? '20px' : '0',
                                                    width: '100%',
                                                }}
                                            >
                                                <Space direction="vertical" style={{ width: '100%' }} align="start">
                                                    <Controller
                                                        name="response_length"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <FieldText
                                                                {...field}
                                                                fullWidth
                                                                multiline
                                                                resizable
                                                                expandable
                                                                minRows={1}
                                                                maxRows={2}
                                                                label={t('ai_assistant_management_behavior_setting_response_length')}
                                                                placeholder={t(
                                                                    'ai_assistant_management_behavior_setting_response_length_placeholder',
                                                                )}
                                                                description={
                                                                    <Typography
                                                                        variant="Body"
                                                                        style={{ color: '#828282', whiteSpace: 'pre-line' }}
                                                                    >
                                                                        {t('ai_assistant_management_behavior_setting_response_length_desc')}
                                                                    </Typography>
                                                                }
                                                            />
                                                        )}
                                                    />
                                                </Space>
                                                <Space direction="vertical" style={{ width: '100%', marginTop: '20px' }} align="start">
                                                    <Controller
                                                        name="list_of_banned_words"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <FieldText
                                                                {...field}
                                                                fullWidth
                                                                multiline
                                                                resizable
                                                                expandable={isAIAgent}
                                                                minRows={isAIAgent ? 6 : 1}
                                                                maxRows={6}
                                                                label={t('ai_assistant_management_behavior_setting_list_of_banned_words')}
                                                                placeholder={t(
                                                                    'ai_assistant_management_behavior_setting_list_of_banned_words_placeholder',
                                                                )}
                                                                description={
                                                                    <Typography
                                                                        variant="Body"
                                                                        style={{ color: '#828282', whiteSpace: 'pre-line' }}
                                                                    >
                                                                        {t(
                                                                            'ai_assistant_management_behavior_setting_list_of_banned_words_desc',
                                                                            {
                                                                                type: translateTextType.normal,
                                                                            },
                                                                        )}
                                                                    </Typography>
                                                                }
                                                            />
                                                        )}
                                                    />
                                                </Space>
                                                {account && (
                                                    <Space direction="vertical" style={{ width: '100%', marginTop: '20px' }} align="start">
                                                        <Controller
                                                            name="other_requirements"
                                                            control={control}
                                                            render={({ field: { value, onChange } }) => (
                                                                <Space direction="vertical" style={{ width: '100%' }} align="start">
                                                                    <Notes
                                                                        account={account}
                                                                        bordered
                                                                        style={{ padding: '0 12px' }}
                                                                        notes={(value as AIAssistantType['other_requirements']) || []}
                                                                        onChange={(notes) => {
                                                                            onChange(notes);
                                                                        }}
                                                                    />
                                                                </Space>
                                                            )}
                                                        />
                                                    </Space>
                                                )}
                                            </div>
                                            <Space direction="vertical" style={{ width: '100%' }} align="start">
                                                <Button
                                                    onClick={() => {
                                                        setShowMoreBehavior(!showMoreBehavior);
                                                    }}
                                                    variant="link"
                                                    size="xs"
                                                    startIcon={<Icon name={showMoreBehavior ? 'expandLess' : 'expandMore'} />}
                                                    text={
                                                        showMoreBehavior
                                                            ? t('ai_assistant_management_behavior_setting_showless')
                                                            : t('ai_assistant_management_behavior_setting_showmore')
                                                    }
                                                    sx={{ fontWeight: 400, marginTop: showMoreBehavior ? '20px' : '0' }}
                                                />
                                            </Space>
                                        </>
                                    )}
                                </Space>
                            </Space>
                            {/* Always show the Capabilities block (function calling + Skills),
                                even when the selected model has no tool-call support. */}
                            {(
                                <Space
                                    justify="between"
                                    align="start"
                                    style={{
                                        paddingTop: '16px',
                                        paddingBottom: '48px',
                                        paddingLeft: isAIAgent ? '0px' : '32px',
                                        paddingRight: isAIAgent ? '0px' : '32px',
                                    }}
                                    direction={isAIAgent ? 'vertical' : 'horizontal'}
                                >
                                    <Space style={{ ...(isAIAgent ? { width: '100%' } : { flex: 1 }) }}>
                                        <Space direction="vertical" justify="start" align="start">
                                            <Typography style={{ fontSize: '20px', fontWeight: 600, ...(isAIAgent && { color: 'black' }) }}>
                                                {t('ai_agent_capabilities')}
                                            </Typography>
                                            <Typography variant="Body" style={{ color: '#828282', width: isAIAgent ? '100%' : '70%' }}>
                                                {t('ai_assistant_management_behavior_setting_function_calling_desc', {
                                                    type: translateTextType.normal,
                                                })}
                                            </Typography>
                                        </Space>
                                    </Space>
                                    <Space direction="vertical" style={{ ...(isAIAgent ? { width: '100%' } : { flex: 2 }) }}>
                                        <Space style={{ width: '100%', marginBottom: '12px' }} align="center" justify="between">
                                            <Typography variant="BodyBold">
                                                {t('ai_assistant_management_behavior_setting_list_of_functions')}
                                            </Typography>
                                            <Button
                                                onClick={onSelectWorkflowFunctions}
                                                variant="link"
                                                size="xs"
                                                startIcon={<Icon name="add" />}
                                                text={t('ai_assistant_management_behavior_setting_list_of_functions_add')}
                                                sx={{
                                                    fontWeight: 400,
                                                }}
                                            />
                                        </Space>
                                        <Space direction="vertical" style={{ width: '100%' }} align="start">
                                            {getValues('workflow_functions')?.map((workflowFunction) => (
                                                <div className={styles.functionCallingBox}>
                                                    <Space
                                                        direction="vertical"
                                                        justify="center"
                                                        style={{
                                                            width: '100%',
                                                            height: '145px',
                                                            backgroundColor: '#FEF5E8',
                                                            borderRadius: '4px',
                                                            padding: '12px',
                                                            position: 'relative',
                                                            overflow: 'hidden',
                                                        }}
                                                        align="start"
                                                    >
                                                        <Typography style={{ marginBottom: '12px' }} variant="BodyBold">
                                                            {workflowFunction.name}
                                                        </Typography>
                                                        <Typography
                                                            variant="Body"
                                                            style={{
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 4,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                wordBreak: 'break-word',
                                                            }}
                                                        >
                                                            {workflowFunction.description}
                                                        </Typography>
                                                    </Space>
                                                    <Icon
                                                        onClick={() => {
                                                            const updatedWorkflowFunctions = getValues('workflow_functions')?.filter(
                                                                (item) => item.id !== workflowFunction.id,
                                                            );
                                                            setValue('workflow_functions', updatedWorkflowFunctions, {
                                                                shouldValidate: true,
                                                                shouldDirty: true,
                                                            });
                                                        }}
                                                        style={{ fontSize: 24, cursor: 'pointer' }}
                                                        color="#EE7D7D"
                                                        name="delete"
                                                    />
                                                </div>
                                            ))}
                                        </Space>

                                        {/* Vibe Coding Skills List */}
                                        {vibeCodeEnabled && (
                                            <Space direction="vertical" style={{ width: '100%' }} align="start">
                                                {Object.keys(vibeCoding || DEFAULT_VIBE_CODING)
                                                    .filter((key) => !VIBE_CODING_NON_TOOL_KEYS.includes(key))
                                                    .map((toolKey) => {
                                                        const tool =
                                                            ((vibeCoding || DEFAULT_VIBE_CODING) as any)[toolKey] || {};
                                                        const enabled = tool.disabled !== true;
                                                        return (
                                                            <div
                                                                key={toolKey}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '12px',
                                                                    width: '100%',
                                                                    marginBottom: '12px',
                                                                }}
                                                            >
                                                                <Space
                                                                    direction="vertical"
                                                                    justify="center"
                                                                    style={{
                                                                        flex: 1,
                                                                        minWidth: 0,
                                                                        height: '145px',
                                                                        backgroundColor: '#FEF5E8',
                                                                        borderRadius: '4px',
                                                                        padding: '12px',
                                                                        position: 'relative',
                                                                        overflow: 'hidden',
                                                                        opacity: enabled ? 1 : 0.6,
                                                                    }}
                                                                    align="start"
                                                                >
                                                                    <Space
                                                                        align="center"
                                                                        size={8}
                                                                        style={{ marginBottom: '12px' }}
                                                                    >
                                                                        <Typography variant="BodyBold">{toolKey}</Typography>
                                                                        <Chip
                                                                            label={
                                                                                enabled
                                                                                    ? t('ai_agent_vibe_code_skill_on')
                                                                                    : t('ai_agent_vibe_code_skill_off')
                                                                            }
                                                                            size="small"
                                                                            color={enabled ? 'success' : 'default'}
                                                                            sx={{ width: 'fit-content', flexShrink: 0 }}
                                                                        />
                                                                    </Space>
                                                                    <Typography
                                                                        variant="Body"
                                                                        style={{
                                                                            display: '-webkit-box',
                                                                            WebkitLineClamp: 4,
                                                                            WebkitBoxOrient: 'vertical',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            wordBreak: 'break-word',
                                                                        }}
                                                                    >
                                                                        {tool.description || ''}
                                                                    </Typography>
                                                                </Space>
                                                                <Button
                                                                    variant="outlined"
                                                                    text={t('edit')}
                                                                    onClick={() => openVibeCodingSkillDialog(toolKey)}
                                                                    sx={{ height: '32px', flexShrink: 0 }}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                            </Space>
                                        )}
                                    </Space>
                                </Space>
                            )}{' '}
                        </>
                    ) : (
                        <Space className={styles.noPermissionAccess}>
                            <span>{t('ai_agent_no_permission')}</span>
                        </Space>
                    )}
                </FormProvider>
            </Spin>
        );
    };

    const openKnowledgePage = () => {
        const path = generatePath('/knowledge-hub-all');
        window.open(`${window.location.origin}${path}`, '_blank');
    };

    const openDataboardPage = () => {
        const path = generatePath('/databoards');
        window.open(`${window.location.origin}${path}`, '_blank');
    };

    const openCrmPage = () => {
        const path = generatePath('/crm');
        window.open(`${window.location.origin}${path}`, '_blank');
    };

    const removeFolderItem = (folderId: string) => {
        const currentFolderIds = getValues('folder_ids') || [];
        const folderIdsUpdate = currentFolderIds.filter((item) => item !== folderId);
        setValue('folder_ids', folderIdsUpdate, { shouldValidate: true, shouldDirty: true });
        trigger('folder_ids');
    };

    const removeBoardItem = (boardId: string) => {
        const currentFolderIds = getValues('board_ids') || [];
        const folderIdsUpdate = currentFolderIds.filter((item) => item !== boardId);
        setValue('board_ids', folderIdsUpdate, { shouldValidate: true, shouldDirty: true });
        trigger('board_ids');
    };

    const navigateToAgentFolder = () => {
        if (!agentFolderDefaultData?._id) return;
        window.open(`/knowledge-hub-all/drive/${agentFolderDefaultData._id}`, '_blank');
    };

    const renderKnowledgeHubTab = () => {
        return (
            <Spin isSpinning={loading}>
                {isAllowModify ? (
                    <>
                        <Space
                            justify="between"
                            align="start"
                            style={{
                                paddingTop: '16px',
                                paddingBottom: '48px',
                                paddingLeft: isAIAgent ? '0px' : '32px',
                                paddingRight: isAIAgent ? '0px' : '32px',
                                width: '100%',
                            }}
                            direction={isAIAgent ? 'vertical' : 'horizontal'}
                        >
                            <Space style={{ ...(isAIAgent ? { width: '100%' } : { flex: 1 }), marginBottom: '25px' }}>
                                <Space direction="vertical" justify="start" align="start" style={{ gap: 'initial!important' }}>
                                    <Space direction="horizontal" justify="start">
                                        <Typography style={{ fontSize: '20px', fontWeight: 600, ...(isAIAgent && { color: 'black' }) }}>
                                            {t('ai_assistant_management_knowledge_support')}
                                        </Typography>
                                    </Space>
                                    <Typography
                                        variant="Body"
                                        style={{ color: '#828282', width: isAIAgent ? '100%' : '70%', marginTop: 5 }}
                                    >
                                        {t('ai_assistant_management_knowledge_support_main_title')}
                                    </Typography>
                                    <Typography
                                        variant="Body"
                                        style={{
                                            color: '#EE7D7D',
                                            width: isAIAgent ? '100%' : '70%',
                                            marginTop: isAIAgent ? '0px' : '20px',
                                        }}
                                    >
                                        {t('ai_assistant_management_knowledge_support_main_description')}
                                    </Typography>
                                </Space>
                            </Space>

                            {!isAiAssistantVersion1 && (
                                <KnowledgeHubV2Section
                                    t={t}
                                    isAIAgent={isAIAgent}
                                    translateTextType={translateTextType}
                                    folders={folders as any}
                                    folderSelection={folderSelection as any}
                                    onOpenKnowledgePage={openKnowledgePage}
                                    onOpenKnowledgeFolderSelection={() => openKnowledgeFolderSelection()}
                                    onRemoveFolderItem={removeFolderItem}
                                    onOpenFolderListModal={(folderId) => openKnowledgeFolderSelection(folderId)}
                                    databoards={databoards as any}
                                    boardSelection={boardSelection as any}
                                    onOpenDataboardPage={openDataboardPage}
                                    onOpenCrmPage={openCrmPage}
                                    onOpenDataboardSelection={() => openDataboardSelection()}
                                    onRemoveBoardItem={removeBoardItem}
                                    onOpenBoardListModal={(boardId) => openDataboardSelection(boardId)}
                                    folderDefaultId={folderDefaultId}
                                    agentName={agentName}
                                    onNavigateToAgentFolder={navigateToAgentFolder}
                                    fileListUpload={fileListUpload as any}
                                    onImportSuccess={(folderIdUpdate, isFirstUpload) => {
                                        fetchFilesFolderDefault(isFirstUpload, folderIdUpdate);
                                        notify({
                                            type: 'success',
                                            message: t('Import file successfully'),
                                        });
                                    }}
                                    onRemoveFileOutOfFolder={removeFileOutOfFolder}
                                />
                            )}
                        </Space>
                    </>
                ) : (
                    <Space className={styles.noPermissionAccess}>
                        <span>{t('ai_agent_no_permission')}</span>
                    </Space>
                )}{' '}
            </Spin>
        );
    };

    const renderAdvancedTab = () => {
        return (
            <>
                <Spin isSpinning={loading}>
                    <Space
                        justify="between"
                        align="start"
                        style={{
                            paddingTop: '16px',
                            paddingBottom: '48px',
                            paddingLeft: isAIAgent ? '0px' : '32px',
                            paddingRight: isAIAgent ? '0px' : '32px',
                        }}
                        direction={isAIAgent ? 'vertical' : 'horizontal'}
                    >
                        <Space style={{ ...(isAIAgent ? { width: '100%' } : { flex: 1 }) }}>
                            <Space direction="vertical" justify="start" align="start">
                                <Typography style={{ fontSize: '20px', fontWeight: 600, ...(isAIAgent && { color: 'black' }) }}>
                                    {t('ai_agent_advanced_settings')}
                                </Typography>
                                <Typography variant="Body" style={{ color: '#828282', width: isAIAgent ? '100%' : '70%' }}>
                                    {t('ai_agent_advanced_settings_desc')}
                                </Typography>
                            </Space>
                        </Space>
                        <Space direction="vertical" style={{ ...(isAIAgent ? { width: '100%' } : { flex: 2 }), marginBottom: '200px' }}>
                            {/* Temperature Field */}
                            <Controller
                                name="temperature"
                                control={control}
                                render={({ field, fieldState: { error } }) => (
                                    <Space size={0} direction="vertical" style={{ width: '100%', marginBottom: '24px' }} align="start">
                                        <Typography variant="BodyBold">{t('ai_agent_temperature')}</Typography>
                                        <Typography variant="Body" style={{ color: '#828282', marginBottom: '16px' }}>
                                            {t('ai_agent_temperature_desc')}
                                        </Typography>
                                        <Space direction="vertical" style={{ width: '100%' }} align="start">
                                            <input
                                                type="range"
                                                min="0.1"
                                                max="2"
                                                step="0.1"
                                                value={field.value || 0.1}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                                style={{
                                                    width: '170px',
                                                    height: '12px',
                                                    background: `linear-gradient(to right, #3399FC 0%, #3399FC ${(((field.value || 1.0) - 0.1) / (2 - 0.1)) * 100
                                                        }%, #E0E0E0 ${(((field.value || 1.0) - 0.1) / (2 - 0.1)) * 100}%, #E0E0E0 100%)`,
                                                    outline: 'none',
                                                    borderRadius: '6px',
                                                    appearance: 'none',
                                                    WebkitAppearance: 'none',
                                                    MozAppearance: 'none',
                                                    cursor: 'pointer',
                                                }}
                                            />
                                            <div style={{ width: '170px', textAlign: 'left' }}>
                                                <Typography variant="Body" style={{ color: '#4F4F4F', fontWeight: 400 }}>
                                                    {field.value || 0.1}
                                                </Typography>
                                            </div>
                                        </Space>
                                    </Space>
                                )}
                            />

                            {/* Chat History Memory Field */}
                            <Space direction="vertical" style={{ ...(isAIAgent ? { width: '100%' } : { flex: 2 }), marginBottom: '20px' }}>
                                <Controller
                                    name="use_memory"
                                    control={control}
                                    render={({ field }) => (
                                        <Space direction="vertical" style={{ width: '100%' }} align="start">
                                            <Typography variant="BodyBold">{t('ai_agent_chat_history_memory')}</Typography>
                                            <Space align="center">
                                                <Typography
                                                    variant="Body"
                                                    style={{ flex: 1, color: '#4F4F4F', fontWeight: 400, minWidth: '370px' }}
                                                >
                                                    {t('ai_agent_chat_history_memory_desc')}
                                                </Typography>
                                                <Switch
                                                    checked={field.value || false}
                                                    onChange={async (checked) => {
                                                        field.onChange(checked);
                                                    }}
                                                    size="small"
                                                />
                                            </Space>
                                        </Space>
                                    )}
                                />
                            </Space>
                            <Controller
                                name="streaming"
                                control={control}
                                render={({ field }) => (
                                    <Space direction="vertical" style={{ width: '100%' }} align="start">
                                        <Typography variant="BodyBold">{t('ai_agent_enable_streaming')}</Typography>
                                        <Space align="center">
                                            <Typography
                                                variant="Body"
                                                style={{ flex: 1, color: '#4F4F4F', fontWeight: 400, minWidth: '370px' }}
                                            >
                                                {t('ai_agent_enable_streaming_desc')}
                                            </Typography>
                                            <Switch
                                                checked={field.value || false}
                                                onChange={async (checked) => {
                                                    field.onChange(checked);
                                                }}
                                                size="small"
                                            />
                                        </Space>
                                    </Space>
                                )}
                            />

                            {/* Enable EChart Field */}
                            <Space direction="vertical" style={{ width: '100%', marginTop: '20px' }}>
                                <Controller
                                    name="enable_echart"
                                    control={control}
                                    render={({ field }) => (
                                        <Space direction="vertical" style={{ width: '100%' }} align="start">
                                            <Typography variant="BodyBold">{t('ai_agent_enable_echart')}</Typography>
                                            <Space align="center">
                                                <Typography
                                                    variant="Body"
                                                    style={{ flex: 1, color: '#4F4F4F', fontWeight: 400, minWidth: '370px' }}
                                                >
                                                    {t('ai_agent_enable_echart_desc')}
                                                </Typography>
                                                <Switch
                                                    checked={field.value || false}
                                                    onChange={async (checked) => {
                                                        field.onChange(checked);
                                                    }}
                                                    size="small"
                                                />
                                            </Space>
                                        </Space>
                                    )}
                                />
                            </Space>

                            {/* Enable Vibe Coding Field */}
                            <Space direction="vertical" style={{ width: '100%', marginTop: '20px' }}>
                                <Controller
                                    name="vibe_code"
                                    control={control}
                                    render={({ field }) => (
                                        <Space direction="vertical" style={{ width: '100%' }} align="start">
                                            <Typography variant="BodyBold">{t('ai_agent_vibe_code')}</Typography>
                                            <Space align="center">
                                                <Typography
                                                    variant="Body"
                                                    style={{ flex: 1, color: '#4F4F4F', fontWeight: 400, minWidth: '370px' }}
                                                >
                                                    {t('ai_agent_vibe_code_desc')}
                                                </Typography>
                                                <Switch
                                                    checked={field.value || false}
                                                    onChange={async (checked) => {
                                                        field.onChange(checked);
                                                    }}
                                                    size="small"
                                                />
                                            </Space>
                                        </Space>
                                    )}
                                />
                            </Space>

                            {/* Top K Relevant Results Field */}
                            <Controller
                                name="top_k_relevant_results"
                                control={control}
                                render={({ field }) => (
                                    <Space size={0} direction="vertical" style={{ width: '100%', marginTop: '24px' }} align="start">
                                        <Typography variant="BodyBold">{t('ai_agent_top_k_relevant_results')}</Typography>
                                        <Typography variant="Body" style={{ color: '#828282', marginBottom: '16px' }}>
                                            {t('ai_agent_top_k_relevant_results_desc')}
                                        </Typography>
                                        <Space direction="vertical" style={{ width: '100%' }} align="start">
                                            <input
                                                type="range"
                                                min="1"
                                                max="20"
                                                step="1"
                                                value={field.value || 3}
                                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                style={{
                                                    width: '170px',
                                                    height: '12px',
                                                    background: `linear-gradient(to right, #3399FC 0%, #3399FC ${(((field.value || 3) - 1) / (20 - 1)) * 100}%, #E0E0E0 ${(((field.value || 3) - 1) / (20 - 1)) * 100}%, #E0E0E0 100%)`,
                                                    outline: 'none',
                                                    borderRadius: '6px',
                                                    appearance: 'none',
                                                    WebkitAppearance: 'none',
                                                    MozAppearance: 'none',
                                                    cursor: 'pointer',
                                                }}
                                            />
                                            <div style={{ width: '170px', textAlign: 'left' }}>
                                                <Typography variant="Body" style={{ color: '#4F4F4F', fontWeight: 400 }}>
                                                    {field.value || 3}
                                                </Typography>
                                            </div>
                                        </Space>
                                    </Space>
                                )}
                            />

                            {/* Top K Field */}
                            <Controller
                                name="top_k"
                                control={control}
                                render={({ field }) => (
                                    <Space size={0} direction="vertical" style={{ width: '100%', marginTop: '24px' }} align="start">
                                        <Typography variant="BodyBold">{t('ai_agent_top_k')}</Typography>
                                        <Typography variant="Body" style={{ color: '#828282', marginBottom: '16px' }}>
                                            {t('ai_agent_top_k_desc')}
                                        </Typography>
                                        <Space direction="vertical" style={{ width: '100%' }} align="start">
                                            <input
                                                type="range"
                                                min="1"
                                                max="100"
                                                step="1"
                                                value={field.value || 40}
                                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                style={{
                                                    width: '170px',
                                                    height: '12px',
                                                    background: `linear-gradient(to right, #3399FC 0%, #3399FC ${(((field.value || 40) - 1) / (100 - 1)) * 100}%, #E0E0E0 ${(((field.value || 40) - 1) / (100 - 1)) * 100}%, #E0E0E0 100%)`,
                                                    outline: 'none',
                                                    borderRadius: '6px',
                                                    appearance: 'none',
                                                    WebkitAppearance: 'none',
                                                    MozAppearance: 'none',
                                                    cursor: 'pointer',
                                                }}
                                            />
                                            <div style={{ width: '170px', textAlign: 'left' }}>
                                                <Typography variant="Body" style={{ color: '#4F4F4F', fontWeight: 400 }}>
                                                    {field.value || 40}
                                                </Typography>
                                            </div>
                                        </Space>
                                    </Space>
                                )}
                            />

                            {/* Max Steps Field */}
                            <Controller
                                name="max_steps"
                                control={control}
                                render={({ field }) => (
                                    <Space size={0} direction="vertical" style={{ width: '100%', marginTop: '24px' }} align="start">
                                        <Typography variant="BodyBold">{t('ai_agent_max_steps')}</Typography>
                                        <Typography variant="Body" style={{ color: '#828282', marginBottom: '16px' }}>
                                            {t('ai_agent_max_steps_desc')}
                                        </Typography>
                                        <Space direction="vertical" style={{ width: '100%' }} align="start">
                                            <input
                                                type="range"
                                                min="1"
                                                max="50"
                                                step="1"
                                                value={field.value || 20}
                                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                style={{
                                                    width: '170px',
                                                    height: '12px',
                                                    background: `linear-gradient(to right, #3399FC 0%, #3399FC ${(((field.value || 20) - 1) / (50 - 1)) * 100}%, #E0E0E0 ${(((field.value || 20) - 1) / (50 - 1)) * 100}%, #E0E0E0 100%)`,
                                                    outline: 'none',
                                                    borderRadius: '6px',
                                                    appearance: 'none',
                                                    WebkitAppearance: 'none',
                                                    MozAppearance: 'none',
                                                    cursor: 'pointer',
                                                }}
                                            />
                                            <div style={{ width: '170px', textAlign: 'left' }}>
                                                <Typography variant="Body" style={{ color: '#4F4F4F', fontWeight: 400 }}>
                                                    {field.value || 20}
                                                </Typography>
                                            </div>
                                        </Space>
                                    </Space>
                                )}
                            />

                            {/* MCP Config Section */}
                            <Space direction="vertical" style={{ width: '100%', marginTop: '32px' }} align="start">
                                <Typography variant="BodyBold" style={{ marginBottom: '8px' }}>
                                    {t('ai_agent_mcp_config')}
                                </Typography>
                                <Typography variant="Body" style={{ color: '#828282', marginBottom: '16px' }}>
                                    {t('ai_agent_mcp_config_desc')}
                                </Typography>
                                <Controller
                                    name="tool_servers"
                                    control={control}
                                    render={({ field }) => {
                                        const servers = (Array.isArray(field.value)
                                            ? field.value
                                            : []) as ToolServerConfig[];
                                        return (
                                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                            {servers.length === 0 ? (
                                                <Space
                                                    direction="vertical"
                                                    align="center"
                                                    justify="center"
                                                    style={{
                                                        width: '100%',
                                                        padding: '32px 16px',
                                                        border: '1px dashed #E0E0E0',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#FAFAFA',
                                                    }}
                                                >
                                                    <Icon
                                                        name="settings"
                                                        fontSize={48}
                                                        style={{ color: '#BDBDBD', marginBottom: '12px' }}
                                                    />
                                                    <Typography variant="Body" style={{ color: '#828282', marginBottom: '16px' }}>
                                                        {t('ai_agent_mcp_config_empty')}
                                                    </Typography>
                                                    <Button
                                                        onClick={() => openMCPConfigDialog()}
                                                        variant="contained"
                                                        size="s"
                                                        startIcon={<Icon name="add" />}
                                                        text={t('ai_agent_mcp_config_add')}
                                                    />
                                                </Space>
                                            ) : (
                                                <>
                                                {servers.map((server, index) => (
                                                <Space
                                                    key={index}
                                                    direction="vertical"
                                                    style={{
                                                        width: '100%',
                                                        backgroundColor: '#F5F5F5',
                                                        borderRadius: '8px',
                                                        padding: '16px',
                                                    }}
                                                    align="start"
                                                >
                                                    <Space direction="horizontal" justify="between" style={{ width: '100%' }}>
                                                        <Space direction="vertical" align="start">
                                                            <Space
                                                                direction="horizontal"
                                                                align="center"
                                                                size={8}
                                                                style={{ flexWrap: 'wrap' }}
                                                            >
                                                                <Typography variant="Body" style={{ color: '#4F4F4F', fontWeight: 500 }}>
                                                                    URL: {server.url}
                                                                </Typography>
                                                                <Chip
                                                                    label={
                                                                        (server as any)?.type === 'mcp' ? 'HTTP Streamable' : 'OpenAPI'
                                                                    }
                                                                    variant="outlined"
                                                                    color="primary"
                                                                    size="small"
                                                                    sx={{ fontWeight: 600, textTransform: 'uppercase' }}
                                                                />
                                                            </Space>
                                                            <Space direction="horizontal" align="center" style={{ marginTop: '4px' }}>
                                                                <Typography variant="BodyBold" style={{ color: '#4F4F4F' }}>
                                                                    Enabled
                                                                </Typography>
                                                                <Switch
                                                                    checked={server.enabled !== false}
                                                                    size="small"
                                                                    onChange={async (checked) => {
                                                                        const next = servers.map((s, i) =>
                                                                            i === index
                                                                                ? { ...s, enabled: !!checked }
                                                                                : s,
                                                                        );
                                                                        (setValue as any)('tool_servers', next, {
                                                                            shouldValidate: true,
                                                                            shouldDirty: true,
                                                                        });
                                                                    }}
                                                                />
                                                            </Space>
                                                        </Space>
                                                        <Space direction="horizontal" size={8}>
                                                            <Button
                                                                onClick={async () => {
                                                                    try {
                                                                        setToolListLoading(true);
                                                                        const cfg = (server as any) || {};
                                                                        const payload = {
                                                                            url: cfg.url || '',
                                                                            path: (cfg.type === 'mcp' ? '' : cfg.path) || 'openapi.json',
                                                                            auth_type: cfg.auth_type || 'bearer',
                                                                            key: cfg.key || '',
                                                                            type: cfg.type || 'openapi',
                                                                            enabled: cfg.enabled !== false,
                                                                        };
                                                                        let tools: Array<{ name: string; description?: string }> = [];
                                                                        if (payload.type === 'openapi') {
                                                                            // Client-side fetch (same as the picker) and apply the
                                                                            // saved whitelist so the list shows what the agent
                                                                            // ACTUALLY gets: enabled_tools when set, otherwise every
                                                                            // safe tool (destructive needs explicit opt-in).
                                                                            const specData = await getToolServerData(payload as any);
                                                                            const all: Array<{ name: string; description?: string; destructive: boolean }> = [];
                                                                            Object.values((specData?.openapi?.paths as Record<string, any>) ?? {}).forEach(
                                                                                (methods) =>
                                                                                    Object.values(methods as Record<string, any>).forEach((op: any) => {
                                                                                        if (op && typeof op === 'object' && op.operationId) {
                                                                                            all.push({
                                                                                                name: op.operationId,
                                                                                                description: op.summary || op.description || '',
                                                                                                destructive: op['x-destructive'] === true,
                                                                                            });
                                                                                        }
                                                                                    }),
                                                                            );
                                                                            const wanted = cfg.enabled_tools as string[] | null | undefined;
                                                                            tools = (Array.isArray(wanted)
                                                                                ? all.filter((t) => wanted.includes(t.name))
                                                                                : all.filter((t) => !t.destructive)
                                                                            ).map((t) => ({
                                                                                name: t.destructive ? `⚠️ ${t.name}` : t.name,
                                                                                description: t.description,
                                                                            }));
                                                                        } else {
                                                                            const { data } = await apiFetch<any>(
                                                                                '/ai/v3/tools/config/tools',
                                                                                'POST',
                                                                                payload,
                                                                            );
                                                                            tools = Array.isArray(data) ? data : [];
                                                                        }
                                                                        dialog({
                                                                            title: 'Available Tools',
                                                                            content:
                                                                                tools.length === 0 ? (
                                                                                    <Space
                                                                                        align="center"
                                                                                        justify="center"
                                                                                        style={{ width: '100%', minHeight: '120px' }}
                                                                                    >
                                                                                        <Typography
                                                                                            variant="Body"
                                                                                            style={{ color: '#828282' }}
                                                                                        >
                                                                                            No tools found
                                                                                        </Typography>
                                                                                    </Space>
                                                                                ) : (
                                                                                    <div
                                                                                        style={{
                                                                                            width: '100%',
                                                                                            borderRadius: '8px',
                                                                                            border: '1px solid var(--color-light-3)',
                                                                                            overflow: 'hidden',
                                                                                        }}
                                                                                    >
                                                                                        <div
                                                                                            style={{
                                                                                                display: 'grid',
                                                                                                gridTemplateColumns: '2fr 3fr',
                                                                                                backgroundColor: '#FEE5C5',
                                                                                                color: 'var(--color-light-7)',
                                                                                                fontWeight: 600,
                                                                                                padding: '12px 16px',
                                                                                                columnGap: 16,
                                                                                            }}
                                                                                        >
                                                                                            <span>Tool Name</span>
                                                                                            <span>Description</span>
                                                                                        </div>
                                                                                        {tools.map((tool, idx) => (
                                                                                            <div
                                                                                                key={`${tool.name}-${idx}`}
                                                                                                style={{
                                                                                                    display: 'grid',
                                                                                                    gridTemplateColumns: '2fr 3fr',
                                                                                                    padding: '12px 16px',
                                                                                                    columnGap: 16,
                                                                                                    backgroundColor:
                                                                                                        idx % 2 !== 0
                                                                                                            ? '#F8F9FB'
                                                                                                            : '#FFFFFF',
                                                                                                }}
                                                                                            >
                                                                                                <Typography
                                                                                                    variant="BodyBold"
                                                                                                    style={{ color: '#4F4F4F' }}
                                                                                                >
                                                                                                    {tool.name}
                                                                                                </Typography>
                                                                                                <Typography
                                                                                                    variant="Body"
                                                                                                    style={{ color: '#4F4F4F' }}
                                                                                                >
                                                                                                    {tool.description || '-'}
                                                                                                </Typography>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ),
                                                                            hideConfirmButton: true,
                                                                            hideCancelButton: true,
                                                                            showCloseButton: true,
                                                                        });
                                                                    } catch (error) {
                                                                        console.error('Fetch tools error:', error);
                                                                        notify({
                                                                            message: 'Failed to load tools. Please check your config.',
                                                                            type: 'error',
                                                                        });
                                                                    } finally {
                                                                        setToolListLoading(false);
                                                                    }
                                                                }}
                                                                variant="text"
                                                                size="xs"
                                                                text={toolListLoading ? 'Loading...' : 'View Tools'}
                                                                disabled={toolListLoading}
                                                                startIcon={
                                                                    toolListLoading ? (
                                                                        <CircularProgress
                                                                            size={14}
                                                                            sx={{ color: 'currentColor !important' }}
                                                                        />
                                                                    ) : undefined
                                                                }
                                                            />
                                                            <Button
                                                                onClick={() => openMCPConfigDialog(index)}
                                                                variant="text"
                                                                size="xs"
                                                                startIcon={<Icon name="edit" />}
                                                                text="Edit"
                                                            />
                                                            <Button
                                                                onClick={() => {
                                                                    dialog({
                                                                        title: 'Remove MCP Config',
                                                                        content: 'Are you sure you want to remove this MCP configuration?',
                                                                        confirmText: 'Remove',
                                                                        confirmButtonProps: {
                                                                            type: 'danger',
                                                                        },
                                                                        onConfirm: async () => {
                                                                            (setValue as any)(
                                                                                'tool_servers',
                                                                                servers.filter((_, i) => i !== index),
                                                                                {
                                                                                    shouldValidate: true,
                                                                                    shouldDirty: true,
                                                                                },
                                                                            );
                                                                            notify({
                                                                                message: 'MCP configuration removed',
                                                                                type: 'success',
                                                                            });
                                                                        },
                                                                    });
                                                                }}
                                                                variant="text"
                                                                size="xs"
                                                                startIcon={<Icon name="delete" />}
                                                                text="Remove"
                                                                sx={{ color: '#EE7D7D' }}
                                                            />
                                                        </Space>
                                                    </Space>
                                                </Space>
                                                ))}
                                                <Button
                                                    onClick={() => openMCPConfigDialog()}
                                                    variant="outlined"
                                                    size="s"
                                                    startIcon={<Icon name="add" />}
                                                    text={t('ai_agent_mcp_config_add')}
                                                />
                                                </>
                                            )}
                                        </Space>
                                        );
                                    }}
                                />
                            </Space>
                        </Space>
                    </Space>
                </Spin>
            </>
        );
    };

    return {
        formMethods,
        renderBasicTab,
        renderMultiAgent,
        renderBehaviorTab,
        renderKnowledgeHubTab,
        renderAdvancedTab,
        onSubmit: handleSubmit(onSubmit),
        onRemoveAIAgent,
        setTab,
        isPending,
        loading,
        tab,
        dialog,
        dialogHolder,
        isEditMode,
        isDirty,
        isValid,
        handleSubmit,
        getValues,
        trigger,
        exitForm,
        openParent,
        onclose,
        isEnableStreaming,
        isAgentSwitching,

        setIsAgentSwitching,
        knowledgeBoards,
        databoards,
        folders,
        openKnowledgeFolderSelection,
        openDataboardSelection,
        editData,
    };
};
