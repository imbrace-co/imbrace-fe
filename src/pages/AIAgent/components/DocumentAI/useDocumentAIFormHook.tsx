'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, FieldSelect, FieldText, Icon, Space, Spin, Switch, Typography, useDialog } from '@imbrace/ui';
import { useMutation } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import type { OptionsObject } from 'notistack';
import { enqueueSnackbar } from 'notistack';
import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useNotify } from '@/contexts/SnackbarContext';
import { env } from '@/env';
import DataboardSelection from '@/pages/AIAssistantManagement/components/DataboardSelection';
import KnowledgeFolderSelection from '@/pages/AIAssistantManagement/components/KnowledgeFolderSelection';
import type { FolderContent } from '@/pages/AIAssistantManagement/components/KnowledgeFolderSelection';
import KnowledgeHubV2Section from '@/pages/AIAssistantManagement/components/KnowledgeHubV2Section';
import LLMProviderSelectField from '@/pages/AIAssistantManagement/components/LLMProviderSelectField';
import WorkflowFunctionsSelection from '@/pages/AIAssistantManagement/components/WorkflowFunctionsSelection';
import { FieldTypesOptions } from '@/pages/Databoards/utils';
import type { Folder } from '@/pages/KnowledgeHub';
import type { AlertVariantProps } from '@/Router';
import { getAccount } from '@/services/api/account';
import { createCustomUseCase, deleteUseCaseByIdV2, updateCustomUseCaseById } from '@/services/api/ai';
import { getAIAssistantById, getAIAssistantLLMModels, getCustomProviders, putAIAssistant } from '@/services/api/ai-assistant';
import { getChannelList } from '@/services/api/channel';
import { getBoardById, getBoards } from '@/services/api/crm';
import {
    deleteKnowledgeHubFiles,
    deleteKnowledgeHubFolder,
    getKnowledgeHubFoldersContentById,
    getKnowledgeHubFoldersSearch,
} from '@/services/api/knowledgeHub';
import { getSchemaById } from '@/services/api/schema';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { useBoards } from '@/services/queries/board';
import { useDeleteSchema } from '@/services/queries/schema';
import { getIsAllowModify } from '@/utils/CookiesHelper';

import {
    boardFieldsToAttributes,
    createEmptyLinkedSchema,
    docSchemaAttributesToFields,
    isBoardNameTaken,
} from './documentAIUtils';
import LinkageStep from './LinkageStep';
import type DocumentAIItem from './type';
import type { LinkageView, LinkedSchema } from './type';

// Language options
const LANGUAGE_OPTIONS = [
    { text: 'English', value: 'English' },
    { text: 'Traditional Chinese', value: 'Traditional Chinese' },
    { text: 'Simplified Chinese', value: 'Simplified Chinese' },
];

const subFieldSchema = z.object({
    field_id: z.string().optional(),
    field_name: z.string(),
    type: z.string(),
});

const attributeSchema = z.object({
    field_id: z.string().optional(),
    field_name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    sample_data: z.string().optional(),
    sub_fields: z.array(subFieldSchema).optional(),
});

export const DocumentAISchema = (params: { t: TFunction }) => {
    const { t } = params;

    return z.object({
        name: z
            .string({ required_error: t('validation_field_required') })
            .min(1, t('validation_field_required'))
            .superRefine((val, ctx) => {
                if (val.trim().length === 0) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('validation_field_required'),
                        fatal: true,
                    });
                }
            }),
        vlm_provider_id: z.string().default('system'),
        vlm_model: z.string({ required_error: t('validation_field_required') }).min(1, t('validation_field_required')),
        llm_provider_id: z.string().default('system'),
        llm_model: z.string({ required_error: t('validation_field_required') }).min(1, t('validation_field_required')),
        description: z.string().optional(),
        role_and_core_task: z.string().optional(),
        source_languages: z.array(z.string()).min(1, t('validation_field_required')),
        handwriting_support: z.boolean().default(true),
        // Linked schemas are optional — agent can be created/updated without any
        linked_schemas: z.array(
            z.object({
                local_id: z.string(),
                schema_id: z.string().optional(),
                model_name: z.string(),
                board_id: z.string().optional(),
                data_board_name: z.string(),
                category: z.string().optional(),
                deployment_access: z.string(),
                board_category_id: z.string().optional(),
                source: z.enum(['auto', 'list', 'manual']),
                is_existing: z.boolean(),
                fields: z.array(attributeSchema),
            }),
        ),
        // Knowledge Support — all optional
        folder_ids: z.array(z.string()).optional(),
        board_ids: z.array(z.string()).optional(),
        default_folder_id: z.string().optional(),
        // Advanced settings
        time_offset: z.string().optional(),
        continue_on_failure: z.boolean().default(false),
        retry_time: z.number().min(0).max(10).default(2),
        // Kept in payload, not surfaced in UI
        max_token_limit: z.number().min(1).max(4096).default(45),
        temperature: z.number().min(0.1).max(2).default(0.1),
        workflow_functions: z
            .array(
                z.object({
                    name: z.string(),
                    description: z.string(),
                    id: z.union([z.string(), z.number()]),
                }),
            )
            .optional(),
    });
};

export type DocumentAIFormType = z.infer<ReturnType<typeof DocumentAISchema>>;

export enum DocumentAIManagementTab {
    Basics = 'basic',
    Linkage = 'linkage',
    Advanced = 'advanced',
    Knowledge = 'knowledge',
    Preview = 'preview',
}

export const DOCUMENT_AI_STEPS: DocumentAIManagementTab[] = [
    DocumentAIManagementTab.Basics,
    DocumentAIManagementTab.Linkage,
    DocumentAIManagementTab.Advanced,
    DocumentAIManagementTab.Knowledge,
    DocumentAIManagementTab.Preview,
];

export const useDocumentAIForm = ({
    id,
    useCaseId,
    demoUrl,
    onBack,
    onCreateSuccess,
    onUpdateSuccess,
}: {
    id?: string;
    useCaseId?: string;
    demoUrl?: string;
    onBack?: () => void;
    onCreateSuccess?: (returnedId: string) => void;
    onUpdateSuccess?: (returnedId: string) => void;
}) => {
    const [editData, setEditData] = useState<DocumentAIItem | undefined>(undefined);
    getIsAllowModify();
    const [account, setAccount] = useState<API.Account | null>(null);
    const { t } = useTranslation();
    const [isPending] = useTransition();
    const [tab, setTab] = useState(DocumentAIManagementTab.Basics);
    const [loading, setLoading] = useState(false);
    const [llmModels, setLlmModels] = useState<{ name: string; is_toolCall_available: boolean; label?: string }[]>([]);
    const [vlmModels, setVlmModels] = useState<{ name: string; is_toolCall_available: boolean; label?: string }[]>([]);
    const [customProviders, setCustomProviders] = useState<any[]>([]);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    const [isLoadingVlmModels, setIsLoadingVlmModels] = useState(false);
    const [isLoadingLlmModels, setIsLoadingLlmModels] = useState(false);
    // Knowledge Support resources (mirrors useAIAssistantFormHook)
    const [folders, setFolders] = useState<API.Folder[]>([]);
    const [databoards, setDataboards] = useState<API.Board[]>([]);
    const [fileListUpload, setFileListUpload] = useState<Array<API.DataBoardFile>>([]);
    const [agentFolderDefaultData, setAgentFolderDefaultData] = useState<Folder>();
    // The agent's auto-created "Uploaded Files" folder id as loaded from the server —
    // used to clean up a folder created in-session when exiting without saving.
    const originDefaultFolderId = useRef<string | undefined>(undefined);
    const [{ dialog }, dialogHolder] = useDialog();
    const { notify } = useNotify();
    const isEditMode = useMemo(() => !!editData, [editData]);

    const deleteSchemaMut = useDeleteSchema();
    // Existing Data Boards in the org — used to block submit when a linked model's board
    // name collides with an existing board (or another linked model).
    const boardsQuery = useBoards({ includeAll: true });
    // Manually-built Document Models the user removed from the linkage list. Their
    // backend deletion is DEFERRED until a successful Save — so closing the page
    // without saving leaves the schema intact (matches "nothing persists until Save").
    const pendingSchemaDeletesRef = useRef<string[]>([]);

    const formMethods = useForm<DocumentAIFormType>({
        mode: 'all',
        defaultValues: {
            name: '',
            vlm_provider_id: 'system',
            vlm_model: '',
            llm_provider_id: 'system',
            llm_model: '',
            description: '',
            role_and_core_task: '',
            source_languages: [],
            handwriting_support: true,
            linked_schemas: [],
            folder_ids: [],
            board_ids: [],
            default_folder_id: '',
            time_offset: 'UTC+08:00',
            continue_on_failure: false,
            retry_time: 2,
            max_token_limit: 45,
            temperature: 0.1,
            workflow_functions: [],
        },
        resolver: zodResolver(DocumentAISchema({ t })),
    });

    const {
        control,
        getValues,
        handleSubmit,
        trigger,
        setValue,
        watch,
        reset,
        formState: { isValid, isDirty },
    } = formMethods;

    const selectedVlmProviderId = watch('vlm_provider_id');
    const selectedLlmProviderId = watch('llm_provider_id');
    const selectedVlmModel = watch('vlm_model');
    const selectedLlmModel = watch('llm_model');
    const folderSelection = watch('folder_ids');
    const boardSelection = watch('board_ids');
    const folderDefaultId = watch('default_folder_id');
    const agentName = watch('name');

    // Linkage sub-view — lifted out of LinkageStep so the wizard footer "Back" can
    // return to the selected-schemas overview. Defaults to 'overview' the first time
    // linked schemas appear (e.g. when editing an existing agent loads them).
    const [linkageView, setLinkageView] = useState<LinkageView>('choose');
    const linkageViewInitRef = useRef(false);
    const watchedLinkedSchemas = watch('linked_schemas') as LinkedSchema[] | undefined;
    useEffect(() => {
        if (linkageViewInitRef.current) return;
        if (Array.isArray(watchedLinkedSchemas) && watchedLinkedSchemas.length > 0) {
            setLinkageView('overview');
            linkageViewInitRef.current = true;
        }
    }, [watchedLinkedSchemas]);

    // Single source of truth for unlinking a schema — shared by the sidebar "X"
    // (SetupProgress) and the overview trash icon (LinkageStep). Always confirms first,
    // unlinks from the form, and defers the backend delete of manual Document Models to Save.
    const removeLinkedSchema = useCallback(
        (index: number) => {
            const linked = (getValues('linked_schemas') as LinkedSchema[]) || [];
            const target = linked[index];
            if (!target) return;
            dialog({
                title: t('ai_document_ai_remove_schema_title'),
                content: t('ai_document_ai_remove_schema_desc'),
                confirmText: t('delete'),
                cancelText: t('cancel'),
                onConfirm: async () => {
                    if (target.source === 'manual' && target.schema_id) {
                        pendingSchemaDeletesRef.current.push(target.schema_id);
                    }
                    const next = linked.filter((_, i) => i !== index);
                    setValue('linked_schemas', next, { shouldDirty: true, shouldValidate: true });
                    if (!next.length) setLinkageView('choose');
                    return true;
                },
            });
        },
        [dialog, getValues, setValue, setLinkageView, t],
    );

    // ===== Providers / models =====
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

    const providerSelectOptions = useMemo(() => {
        const systemOption = { label: t('ai_agent_system_provider'), value: 'system', group: 'System', type: 'system' };
        const dynamicOptions = customProviders.map((provider) => ({
            label: provider.name,
            value: provider.provider_id || provider._id,
            group: getProviderGroupLabel(provider.type),
            type: provider.type,
        }));
        return [systemOption, ...dynamicOptions];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customProviders, t]);

    const fetchModelsForProvider = useCallback(
        async (
            providerId: string,
            setModels: (models: any[]) => void,
            setLoadingState: (loading: boolean) => void,
            modelFieldName?: 'vlm_model' | 'llm_model',
        ) => {
            try {
                setLoadingState(true);
                if (providerId === 'system') {
                    const { data } = await apiFetch<{
                        data: { name: string; is_toolCall_available: boolean; label?: string }[];
                    }>(getAIAssistantLLMModels.api(), getAIAssistantLLMModels.method);
                    const models = (data.data || []).map((item) =>
                        item.name === 'Default' ? { ...item, label: t('default') } : { ...item, label: item.name },
                    );
                    setModels(models);
                    if (modelFieldName && !getValues(modelFieldName)) {
                        const defaultModel = models.find((m) => m.name === 'Default');
                        if (defaultModel) {
                            setValue(modelFieldName, defaultModel.name, { shouldDirty: true });
                        }
                    }
                } else {
                    const provider = customProviders.find((p) => (p.provider_id || p._id) === providerId);
                    // Custom providers are loaded asynchronously. If they haven't arrived
                    // yet, bail out WITHOUT wiping the list — otherwise the model field's
                    // current value would drop out of the options and get cleared. The
                    // effect re-runs once `customProviders` resolves and repopulates.
                    if (!provider) return;
                    const models = (provider?.models ?? []).filter((m: any) => m.is_shown !== false);
                    setModels(
                        models.map((m: any) => ({
                            name: m.name,
                            is_toolCall_available: m.is_toolCall_available ?? false,
                            label: m.name,
                        })),
                    );
                }
            } catch (error) {
                console.error('Error fetching models:', error);
            } finally {
                setLoadingState(false);
            }
        },
        [customProviders, getValues, setValue, t],
    );

    useEffect(() => {
        fetchModelsForProvider(selectedVlmProviderId || 'system', setVlmModels, setIsLoadingVlmModels, 'vlm_model');
    }, [selectedVlmProviderId, fetchModelsForProvider]);

    useEffect(() => {
        fetchModelsForProvider(selectedLlmProviderId || 'system', setLlmModels, setIsLoadingLlmModels, 'llm_model');
    }, [selectedLlmProviderId, fetchModelsForProvider]);

    const fetchCustomProviders = async () => {
        try {
            setIsLoadingProviders(true);
            const { data } = await apiFetch<any[]>(getCustomProviders.api(), getCustomProviders.method);
            setCustomProviders(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching custom providers:', error);
        } finally {
            setIsLoadingProviders(false);
        }
    };

    const fetchAccount = async () => {
        const { data } = await apiFetch<API.Account>(getAccount.api, getAccount.method);
        return data;
    };

    const fetchDocumentAIById = async (targetId: string) => {
        const { data } = await apiFetch<any>(getAIAssistantById.api(targetId), getAIAssistantById.method);
        return data;
    };

    const fetchFolders = async (): Promise<Folder[]> => {
        try {
            const folderURL = getKnowledgeHubFoldersSearch.api('');
            const { data } = await apiFetch<{ data: Array<Folder> }>(folderURL, getKnowledgeHubFoldersSearch.method);
            return data.data.filter((item) => item.parent_folder_id === 'root');
        } catch (error) {
            console.error('fetch folder error: ', error);
            return [];
        }
    };

    const fetchDataboards = async () => {
        const response = await apiFetch<{ data: API.Board[] }>(
            getBoards.api({ limit: 0, skip: 0, sort: '-created_at' }),
            getBoards.method,
        );
        return response.data.data;
    };

    // ===== Init / edit data =====
    const fetchInitData = async (initId?: string) => {
        try {
            setLoading(true);
            const accountData = await fetchAccount();
            setAccount(accountData);
            await fetchCustomProviders();

            // Knowledge Support resources — needed in create mode too (the section
            // resolves selected ids to names from these lists).
            const rootFolders = await fetchFolders();
            setFolders(rootFolders as unknown as API.Folder[]);
            const dataBoardList = await fetchDataboards();
            setDataboards(dataBoardList || []);

            if (!initId) return;

            let responseData = await fetchDocumentAIById(initId);

            // Patch metadata.workflow_id + channel_id if missing
            if (!responseData?.metadata?.workflow_id && demoUrl) {
                try {
                    const url = new URL(demoUrl);
                    const channelIdFromUrl =
                        url.searchParams.get('channel_id') ??
                        url.searchParams.get('channel') ??
                        url.searchParams.get('channelId') ??
                        undefined;
                    if (channelIdFromUrl) {
                        const { data: chData } = await apiFetch<{ data: API.Channel[] }>(
                            getChannelList.api('web'),
                            getChannelList.method,
                        );
                        const matched = (chData?.data ?? []).find(
                            (c) =>
                                c._id === channelIdFromUrl ||
                                c.id === channelIdFromUrl ||
                                c.public_id === channelIdFromUrl,
                        );
                        if (matched?.workflow_id) {
                            const patched = {
                                ...responseData,
                                metadata: {
                                    ...(responseData.metadata || {}),
                                    channel_id: matched._id || matched.id,
                                    workflow_id: matched.workflow_id,
                                },
                            };
                            try {
                                await apiFetch(putAIAssistant.api(initId), putAIAssistant.method, patched);
                            } catch (patchErr) {
                                console.warn('[DocumentAI] Failed to patch assistant metadata', patchErr);
                            }
                            responseData = patched;
                        }
                    }
                } catch (e) {
                    console.warn('[DocumentAI] workflow_id lookup failed', e);
                }
            }

            const meta = responseData.metadata || {};
            const docAi = responseData.document_ai || {};

            const linkedSchemas: LinkedSchema[] = [];
            if (Array.isArray(docAi.schemas) && docAi.schemas.length) {
                // New shape: the embedded schema entries carry only schema_id +
                // data_board_name (+ board_id folded back at provision time).
                // Hydrate name / category / fields from the
                // canonical Document Model in data-board instead of a stale
                // denormalised copy. Fallback to the embedded blob for legacy
                // agents created before the slimmed-down payload.
                for (const s of docAi.schemas) {
                    const schemaId = s.schema_id || '';
                    // Use ONLY the agent-stored board_id (the per-agent pairing for this
                    // schema). Don't fall back to the schema's databoard_ids[0] — a schema
                    // shared across agents lists every agent's board there, so [0] could
                    // resolve to a different agent's board.
                    const boardId = s.board_id || '';
                    let schema: any = null;
                    let schemaNotFound = false;
                    if (schemaId) {
                        try {
                            const res = await apiFetch<any>(getSchemaById.api(schemaId), getSchemaById.method);
                            schema = res?.data?.data ?? res?.data ?? null;
                            if (!schema) schemaNotFound = true;
                        } catch (e: any) {
                            if (e?.response?.status === 404) schemaNotFound = true;
                            console.error('Error fetching schema:', e);
                        }
                    }
                    // A Document Model that no longer exists — or whose embedded copy
                    // carries no name — can't be shown or edited. Skip it so Linked
                    // Schemas / Models Linkage & Storage don't render empty rows; it
                    // also drops out of the payload on the next Save.
                    const resolvedModelName = schema?.name || s.model_name || s.name || '';
                    if (schemaNotFound || !resolvedModelName) continue;
                    // For an already-provisioned board, hydrate its name + category +
                    // deployment access from the BOARD itself — the Edit Data Board dialog
                    // persists those directly via the board API, so chat-ai's embedded copy
                    // can drift. Board access lives in `managers`, so derive team ids from it.
                    let board: any = null;
                    let boardNotFound = false;
                    if (boardId) {
                        try {
                            const bres = await apiFetch<any>(getBoardById.api(boardId), getBoardById.method);
                            board = bres?.data?.data ?? bres?.data ?? null;
                            if (!board) boardNotFound = true;
                        } catch (e: any) {
                            if (e?.response?.status === 404) boardNotFound = true;
                            console.error('Error fetching board:', e);
                        }
                    }
                    // The Data Board that stored this model's records was deleted (from
                    // /databoards or /crm) but the agent still references it. Drop the stale
                    // board_id so the linkage shows "will be created" instead of a dead link,
                    // and Save re-provisions a fresh board. A transient fetch error (not a 404)
                    // keeps the id — the board likely still exists.
                    const resolvedBoardId = boardNotFound ? '' : boardId;
                    linkedSchemas.push(
                        createEmptyLinkedSchema({
                            schema_id: schemaId,
                            model_name: resolvedModelName,
                            board_id: resolvedBoardId,
                            data_board_name: board?.name || s.data_board_name || '',
                            category: schema?.category_id || schema?.category || s.category || '',
                            // Board-level settings: prefer the live board, fall back to the
                            // embedded copy (e.g. board not yet provisioned / fetch failed).
                            board_category_id: board?.category_id || s.board_category_id || '',
                            source: 'list',
                            is_existing: true,
                            fields: docSchemaAttributesToFields(schema?.attributes || s.attributes || []),
                        }),
                    );
                }
            } else {
                // Legacy shape: reconstruct linked schemas from saved board ids.
                // Top-level board_ids only means "storage boards" for truly-legacy
                // agents (no document_ai.schemas array at all) — for new-shape agents
                // it carries the Knowledge Support board selection instead.
                const boardIds: string[] = Array.isArray(docAi.board_ids) && docAi.board_ids.length
                    ? docAi.board_ids
                    : docAi.board_id
                      ? [docAi.board_id]
                      : !Array.isArray(docAi.schemas) && Array.isArray(responseData.board_ids)
                        ? responseData.board_ids
                        : [];
                for (const boardId of boardIds) {
                    try {
                        const boardRes = await apiFetch<API.Board>(getBoardById.api(boardId), getBoardById.method);
                        const boardName = (boardRes.data as any)?.name || '';
                        const fields = boardFieldsToAttributes(boardRes.data?.fields || []);
                        linkedSchemas.push(
                            createEmptyLinkedSchema({
                                model_name: boardName,
                                board_id: boardId,
                                data_board_name: boardName,
                                source: 'list',
                                is_existing: true,
                                fields: fields.length ? fields : [],
                            }),
                        );
                    } catch (e) {
                        console.error('Error fetching board fields:', e);
                    }
                }
            }

            originDefaultFolderId.current = responseData?.default_folder_id || '';
            // Knowledge boards share the top-level board_ids field with legacy storage
            // boards — exclude the boards already linked as schema storage.
            const storageBoardIds = new Set(linkedSchemas.map((ls) => ls.board_id).filter(Boolean));

            const formData: DocumentAIFormType = {
                name: responseData.name || '',
                vlm_provider_id: docAi.vlm_provider_id || meta.vlm_provider_id || 'system',
                vlm_model: docAi.vlm_model || meta.vlm_model || '',
                llm_provider_id: responseData.provider_id || 'system',
                llm_model: responseData.model_id || '',
                description: responseData.description || '',
                role_and_core_task: responseData.core_task || '',
                source_languages: docAi.source_languages || [],
                handwriting_support: docAi.handwriting_support ?? true,
                linked_schemas: linkedSchemas,
                folder_ids: (responseData.folder_ids ?? []).filter((fid: string) =>
                    rootFolders.some((f) => f._id === fid),
                ),
                board_ids: (responseData.board_ids ?? []).filter(
                    (bid: string) => !storageBoardIds.has(bid) && (dataBoardList || []).some((b) => b._id === bid),
                ),
                default_folder_id: responseData.default_folder_id || '',
                time_offset: docAi.time_offset || 'UTC+08:00',
                continue_on_failure: docAi.continue_on_failure ?? false,
                retry_time: docAi.retry_time ?? 2,
                max_token_limit: meta.max_token_limit ?? 45,
                temperature: responseData.temperature ?? 0.1,
                workflow_functions: [],
            };

            reset(formData, { keepDefaultValues: false });
            setEditData({ ...responseData, document_ai_config_id: useCaseId || responseData._id });
        } catch (error: any) {
            console.error('[DocumentAI] Error fetching init data:', error?.response?.status, error?.response?.data, error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitData(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // ===== Knowledge Support (mirrors useAIAssistantFormHook) =====
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

    // Refresh the uploaded-files list whenever the Knowledge Support tab is opened
    useEffect(() => {
        if (tab === DocumentAIManagementTab.Knowledge) {
            fetchFilesFolderDefault(false, folderDefaultId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

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
                        onModify={(folderId: string) => {
                            const currentFolderIds = getValues('folder_ids') || [];
                            const next = currentFolderIds.includes(folderId)
                                ? currentFolderIds.filter((item) => item !== folderId)
                                : [...currentFolderIds, folderId];
                            setValue('folder_ids', next, { shouldValidate: true, shouldDirty: true });
                            trigger('folder_ids');
                        }}
                        onModifyBoard={(boardId: string) => {
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
                        onModify={(boardId: string) => {
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

    const openKnowledgePage = () => {
        window.open(`${window.location.origin}/knowledge-hub-all`, '_blank');
    };

    const openDataboardPage = () => {
        window.open(`${window.location.origin}/databoards`, '_blank');
    };

    const openCrmPage = () => {
        window.open(`${window.location.origin}/crm`, '_blank');
    };

    const removeFolderItem = (folderId: string) => {
        const currentFolderIds = getValues('folder_ids') || [];
        setValue('folder_ids', currentFolderIds.filter((item) => item !== folderId), {
            shouldValidate: true,
            shouldDirty: true,
        });
        trigger('folder_ids');
    };

    const removeBoardItem = (boardId: string) => {
        const currentBoardIds = getValues('board_ids') || [];
        setValue('board_ids', currentBoardIds.filter((item) => item !== boardId), {
            shouldValidate: true,
            shouldDirty: true,
        });
        trigger('board_ids');
    };

    const navigateToAgentFolder = () => {
        if (!agentFolderDefaultData?._id) return;
        window.open(`/knowledge-hub-all/drive/${agentFolderDefaultData._id}`, '_blank');
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
            console.error('Delete Folder Error: ', error);
        }
    };

    const deleteRecord = useMutation({
        mutationFn: async (params: { recordId: string }) => {
            await apiFetch(deleteKnowledgeHubFiles.api(), deleteKnowledgeHubFiles.method, { ids: [params.recordId] }, ImbraceClient);
            return true;
        },
        onSuccess: (_data, variables) => {
            setFileListUpload((prev) => prev.filter((file) => file._id !== variables.recordId));
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

    // ===== Workflow functions dialog =====
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
                    isUseCaseVersion2={true}
                    isInCreateFlow={!isEditMode}
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

    // ===== Payload builders =====
    const buildPayload = (form: DocumentAIFormType) => {
        // The Document Models the user linked/built. Sent so the backend wires up storage
        // itself — the client no longer creates Data Boards.
        const schemas = (form.linked_schemas || []).map((s) => ({
            schema_id: s.schema_id || '',
            data_board_name: s.data_board_name,
            // Send board_id for already-linked schemas so the backend skips
            // re-provisioning (no duplicate boards) and instead renames the
            // existing board to data_board_name. New schemas have no board_id
            // yet → a board gets provisioned for them.
            ...(s.board_id ? { board_id: s.board_id } : {}),
            // The board's own category. The backend applies this when provisioning/updating
            // the Data Board. Empty board_category_id → the backend falls back to the
            // "Doc Agent" category. Boards are provisioned with no team access restriction.
            board_category_id: s.board_category_id || '',
        }));
        return {
            usecase: {
                title: form.name,
                short_description: form.description,
                demo_url: env.VITE_APP_CHAT_HOST,
                agent_type: 'document_ai',
            },
            assistant: {
                name: form.name,
                description: form.description,
                mode: 'advanced',
                model_id: form.llm_model,
                provider_id: form.llm_provider_id || 'system',
                core_task: form.role_and_core_task,
                agent_type: 'document_ai',
                channel: 'web',
                temperature: form.temperature,
                workflow_function_call: form.workflow_functions?.map((wf) => wf.id) || [],
                workflow_name: `${t('ai_agent_advanced_assistant')} | ${form.name}`,
                credential_name: `${t('ai_agent_advanced_assistant')} | ${form.name}`,
                // Knowledge Support — top-level on the assistant, same shape as the
                // AI Assistant payload (NOT inside metadata).
                folder_ids: form.folder_ids || [],
                default_folder_id: form.default_folder_id || '',
                board_ids: form.board_ids || [],
                version: 2,
                document_ai: {
                    vlm_provider_id: form.vlm_provider_id || 'system',
                    vlm_model: form.vlm_model,
                    source_languages: form.source_languages,
                    handwriting_support: form.handwriting_support,
                    schemas,
                    time_offset: form.time_offset,
                    continue_on_failure: form.continue_on_failure,
                    retry_time: form.retry_time,
                },
                metadata: {
                    max_token_limit: form.max_token_limit,
                },
            },
        };
    };

    const createForm = useMutation({
        mutationFn: async (form: DocumentAIFormType) => {
            const payload = buildPayload(form);
            const { data } = await apiFetch<{ data: { _id: string } }>(
                createCustomUseCase.api,
                createCustomUseCase.method,
                payload,
            );
            return data.data;
        },
    });

    const updateForm = useMutation({
        mutationFn: async (form: DocumentAIFormType) => {
            if (!editData) return;
            const payload = buildPayload(form);
            await apiFetch(
                updateCustomUseCaseById.api(editData.document_ai_config_id),
                updateCustomUseCaseById.method,
                payload,
            );
        },
    });

    const deleteForm = useMutation({
        mutationFn: async (deleteId: string) => {
            await apiFetch(deleteUseCaseByIdV2.api(deleteId), deleteUseCaseByIdV2.method);
        },
    });

    // ===== Submit =====
    const onSubmit = useCallback(
        async (formData: DocumentAIFormType) => {
            try {
                setLoading(true);
                if (!isEditMode) {
                    const created = await createForm.mutateAsync(formData);
                    notify({ message: t('ai_document_ai_create_success'), type: 'success' });
                    reset(formData);
                    await onCreateSuccess?.(created._id);
                } else {
                    await updateForm.mutateAsync(formData);
                    notify({ message: t('ai_document_ai_update_success'), type: 'success' });
                    await fetchInitData(id);
                    await onUpdateSuccess?.(id ?? '');
                }
                // Agent saved — now flush the deferred Document Model deletions
                // (manual schemas the user unlinked during this session).
                if (pendingSchemaDeletesRef.current.length) {
                    const ids = pendingSchemaDeletesRef.current;
                    pendingSchemaDeletesRef.current = [];
                    await Promise.allSettled(ids.map((sid) => deleteSchemaMut.mutateAsync(sid)));
                }
            } catch (error: any) {
                if (error?._handled) return;
                console.error('Error:', error);
                const snackbarOption: OptionsObject<'alert'> & AlertVariantProps = {
                    key: `${new Date().getTime()}`,
                    anchorOrigin: { horizontal: 'right', vertical: 'top' },
                    variant: 'alert',
                    type: 'error',
                    autoHideDuration: 3000,
                    snackBarId: `${new Date().getTime()}`,
                };
                const errorMessage = error?.response?.data?.message || t('error_something_went_wrong');
                enqueueSnackbar(errorMessage, snackbarOption);
            } finally {
                setLoading(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isEditMode, createForm, updateForm, notify, t, reset, onCreateSuccess, onUpdateSuccess, id],
    );

    // Submit with per-tab validation (linked schemas are optional)
    const handleSubmitWithTabNavigation = useCallback(async () => {
        const basicValid = await trigger(['name', 'vlm_model', 'llm_model']);
        if (!basicValid) {
            setTab(DocumentAIManagementTab.Basics);
            return;
        }

        const advancedValid = await trigger(['source_languages']);
        if (!advancedValid) {
            setTab(DocumentAIManagementTab.Advanced);
            return;
        }

        // Block submit on a duplicate Data Board name — a linked model's board name must
        // not collide with an existing board or another linked model in this agent.
        const linked = (getValues('linked_schemas') as LinkedSchema[]) || [];
        const existingBoards = boardsQuery.data ?? [];
        const hasDuplicate = linked.some((s, i) =>
            isBoardNameTaken(s.data_board_name, {
                existingBoards,
                linkedSchemas: linked,
                excludeBoardId: s.board_id,
                excludeIndex: i,
            }),
        );
        if (hasDuplicate) {
            notify({ message: t('ai_document_ai_board_name_duplicate'), type: 'error' });
            setTab(DocumentAIManagementTab.Linkage);
            setLinkageView('overview');
            return;
        }

        return handleSubmit(onSubmit)();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger, handleSubmit, onSubmit, boardsQuery.data, getValues, notify, t]);

    // ===== Delete =====
    const onDelete = useCallback(async () => {
        if (!editData || !id) return;
        dialog({
            title: t('ai_document_ai_delete_title'),
            content: ({ onClose }: { onClose?: () => void }) => (
                <Space direction="vertical" size={12}>
                    <Typography>{t('ai_document_ai_delete_desc')}</Typography>
                    <Space justify="end" style={{ width: '100%' }}>
                        <Button
                            sx={{ width: '105px', height: '32px', padding: '0px' }}
                            onClick={() => onClose?.()}
                            variant="outlined"
                            text={t('cancel')}
                        />
                        <Button
                            sx={{ width: '105px', height: '32px', padding: '0px' }}
                            onClick={async () => {
                                try {
                                    setLoading(true);
                                    await deleteForm.mutateAsync(id);
                                    notify({ message: t('ai_document_ai_delete_success'), type: 'success' });
                                    onClose?.();
                                    onBack?.();
                                } catch (error: any) {
                                    const errorMessage =
                                        error?.response?.data?.message || t('error_something_went_wrong');
                                    enqueueSnackbar(errorMessage, {
                                        key: `${new Date().getTime()}`,
                                        anchorOrigin: { horizontal: 'right', vertical: 'top' },
                                        variant: 'alert',
                                        type: 'error',
                                        autoHideDuration: 3000,
                                        snackBarId: `${new Date().getTime()}`,
                                    } as OptionsObject<'alert'> & AlertVariantProps);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            type="danger"
                            variant="contained"
                            text={t('delete')}
                        />
                    </Space>
                </Space>
            ),
            hideCancelButton: true,
            hideConfirmButton: true,
            onConfirm: async () => {},
            onClose: async () => {},
        });
    }, [editData, id, deleteForm, notify, dialog, t, onBack]);

    // ===== Exit with unsaved changes =====
    const exitForm = () => {
        if (isDirty) {
            dialog({
                title: t('ai_document_ai_exit_unsaved_title'),
                content: ({ onClose }: { onClose?: () => void }) => (
                    <Space justify="end" style={{ width: '100%', gap: '12px', marginTop: '16px' }}>
                        <Button
                            sx={{ height: '32px', padding: '0px 16px' }}
                            onClick={async () => {
                                onClose?.();
                                if (!(await trigger())) {
                                    notify({ message: t('validation_field_required'), type: 'error' });
                                    return;
                                }
                                await handleSubmit(onSubmit)();
                                onBack?.();
                            }}
                            variant="contained"
                            text={t('save')}
                        />
                        <Button
                            sx={{ height: '32px', padding: '0px 16px' }}
                            onClick={() => {
                                // Drop the "Uploaded Files" folder auto-created this
                                // session — nothing persists until Save.
                                if (!originDefaultFolderId.current && folderDefaultId) {
                                    removeAgentFolderDefault();
                                }
                                onClose?.();
                                onBack?.();
                            }}
                            type="danger"
                            variant="outlined"
                            text={t('exit_without_saving')}
                        />
                        <Button
                            sx={{ height: '32px', padding: '0px 16px' }}
                            onClick={() => onClose?.()}
                            variant="outlined"
                            text={t('back')}
                        />
                    </Space>
                ),
                hideCancelButton: true,
                hideConfirmButton: true,
                onConfirm: async () => {},
                onClose: async () => {},
            });
        } else {
            onBack?.();
        }
    };

    // ===== Options =====
    // Keep the currently-selected model in the options even when the provider's model
    // list is still loading (or temporarily empty), so the FieldSelect never drops the
    // chosen value. The duplicate is avoided once the real labelled option arrives.
    const vlmModelOptions = useMemo(() => {
        const opts = vlmModels.map((item) => ({ text: item.label || item.name, value: item.name }));
        if (selectedVlmModel && !opts.some((o) => o.value === selectedVlmModel)) {
            opts.push({ text: selectedVlmModel, value: selectedVlmModel });
        }
        return opts;
    }, [vlmModels, selectedVlmModel]);
    const llmModelOptions = useMemo(() => {
        const opts = llmModels.map((item) => ({ text: item.label || item.name, value: item.name }));
        if (selectedLlmModel && !opts.some((o) => o.value === selectedLlmModel)) {
            opts.push({ text: selectedLlmModel, value: selectedLlmModel });
        }
        return opts;
    }, [llmModels, selectedLlmModel]);

    // ===== RENDER: Basic tab =====
    const renderBasicTab = () => (
        <Spin isSpinning={loading}>
            <Space
                justify="between"
                align="start"
                style={{ paddingTop: '32px', paddingLeft: '32px', paddingRight: '32px', paddingBottom: '24px', overflow: 'auto' }}
                direction="vertical"
            >
                <Space direction="vertical" justify="start" align="start" style={{ width: '100%' }}>
                    <Typography style={{ fontSize: '20px', fontWeight: 600 }}>
                        {t('ai_assistant_management_basic_info')}
                    </Typography>
                    <Typography variant="Body" style={{ color: '#828282' }}>
                        {t('ai_document_ai_basic_info_desc')}
                    </Typography>
                </Space>

                <Space direction="vertical" style={{ width: '100%', marginBottom: '0' }}>
                    {/* Agent Name */}
                    <Controller
                        name="name"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                            <Space direction="vertical" style={{ width: '100%' }} align="start">
                                <FieldText
                                    {...field}
                                    fullWidth
                                    label={`${t('ai_document_ai_agent_name')}*`}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            </Space>
                        )}
                    />

                    {/* VLM Provider + Model */}
                    <Space direction="vertical" style={{ width: '100%', marginTop: '20px' }} align="start">
                        <Typography variant="BodyBold">{`${t('ai_document_ai_vlm_provider')} *`}</Typography>
                        <Space style={{ width: '100%', gap: '20px' }} align="end">
                            <div style={{ flex: 1 }}>
                                <Controller
                                    name="vlm_provider_id"
                                    control={control}
                                    render={({ field }) => (
                                        <LLMProviderSelectField
                                            value={field.value}
                                            onChange={(newValue) => {
                                                field.onChange(newValue);
                                                setValue('vlm_model', '');
                                                setVlmModels([]);
                                            }}
                                            options={providerSelectOptions}
                                            loading={isLoadingProviders}
                                            disabled={isLoadingVlmModels}
                                        />
                                    )}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Controller
                                    name="vlm_model"
                                    control={control}
                                    render={({ field, fieldState: { error } }) => (
                                        <FieldSelect
                                            label={t('ai_document_ai_vlm_model')}
                                            fullWidth
                                            disabled={isLoadingVlmModels}
                                            queryKey={['vlm_model_options', selectedVlmProviderId, vlmModelOptions.length]}
                                            request={async () => vlmModelOptions}
                                            value={field.value}
                                            onChange={(val?: string) => field.onChange(val)}
                                            error={!!error}
                                            helperText={error?.message}
                                        />
                                    )}
                                />
                            </div>
                        </Space>
                    </Space>

                    {/* LLM Provider + Model */}
                    <Space direction="vertical" style={{ width: '100%', marginTop: '20px' }} align="start">
                        <Typography variant="BodyBold">{`${t('ai_document_ai_llm_provider')} *`}</Typography>
                        <Space style={{ width: '100%', gap: '20px' }} align="end">
                            <div style={{ flex: 1 }}>
                                <Controller
                                    name="llm_provider_id"
                                    control={control}
                                    render={({ field }) => (
                                        <LLMProviderSelectField
                                            value={field.value}
                                            onChange={(newValue) => {
                                                field.onChange(newValue);
                                                setValue('llm_model', '');
                                                setLlmModels([]);
                                            }}
                                            options={providerSelectOptions}
                                            loading={isLoadingProviders}
                                            disabled={isLoadingLlmModels}
                                        />
                                    )}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Controller
                                    name="llm_model"
                                    control={control}
                                    render={({ field, fieldState: { error } }) => (
                                        <FieldSelect
                                            label={t('ai_document_ai_llm_model')}
                                            fullWidth
                                            disabled={isLoadingLlmModels}
                                            queryKey={['llm_model_options', selectedLlmProviderId, llmModelOptions.length]}
                                            request={async () => llmModelOptions}
                                            value={field.value}
                                            onChange={(val?: string) => field.onChange(val)}
                                            error={!!error}
                                            helperText={error?.message}
                                        />
                                    )}
                                />
                            </div>
                        </Space>
                    </Space>

                    {/* Description */}
                    <Controller
                        name="description"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                            <Space size={0} style={{ width: '100%', marginTop: '20px' }} direction="vertical" align="start">
                                <FieldText
                                    {...field}
                                    fullWidth
                                    multiline
                                    rows={4}
                                    label={t('description')}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            </Space>
                        )}
                    />

                    {/* Role and Core Task */}
                    <Controller
                        name="role_and_core_task"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                            <Space size={0} style={{ width: '100%', marginTop: '20px' }} direction="vertical" align="start">
                                <FieldText
                                    {...field}
                                    fullWidth
                                    multiline
                                    rows={6}
                                    label={t('ai_document_ai_role_core_task')}
                                    placeholder={'# Role\nYou are an AI-powered CRM assistant with access to customer data and service records.\n# Tasks\nInterpret user queries about customers and transactions'}
                                    error={!!error}
                                    helperText={error?.message || t('ai_document_ai_role_core_task_tip')}
                                />
                            </Space>
                        )}
                    />
                </Space>
            </Space>
        </Spin>
    );

    // ===== RENDER: Models Linkage & Storage tab =====
    const renderLinkageTab = () => (
        <Spin isSpinning={loading}>
            <LinkageStep
                formMethods={formMethods}
                isEditMode={isEditMode}
                linkageView={linkageView}
                setLinkageView={setLinkageView}
                onRemoveSchema={removeLinkedSchema}
            />
        </Spin>
    );

    // ===== RENDER: Advanced tab =====
    const renderAdvancedTab = () => (
        <Spin isSpinning={loading}>
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 280px)' }}>
                {/* Scrollable settings */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <Space
                        justify="between"
                        align="start"
                        style={{ paddingTop: '32px', paddingLeft: '32px', paddingRight: '32px', paddingBottom: '24px' }}
                        direction="vertical"
                    >
                        <Space direction="vertical" justify="start" align="start" style={{ width: '100%' }}>
                            <Typography style={{ fontSize: '20px', fontWeight: 600 }}>
                                {t('ai_document_ai_advanced_settings')}
                            </Typography>
                            <Typography variant="Body" style={{ color: '#828282' }}>
                                {t('ai_agent_advanced_settings_desc')}
                            </Typography>
                        </Space>

                        <Space direction="vertical" style={{ width: '100%', marginBottom: '24px' }}>
                            {/* Source Language */}
                            <Controller
                                name="source_languages"
                                control={control}
                                render={({ field, fieldState: { error } }) => (
                                    <Space direction="vertical" style={{ width: '100%', marginBottom: '24px' }} align="start">
                                        <Typography variant="BodyBold">{`${t('ai_document_ai_source_language')}*`}</Typography>
                                        <Typography variant="Body" style={{ color: '#828282' }}>
                                            {t('ai_document_ai_source_language_desc')}
                                        </Typography>
                                        <div style={{ width: '50%', marginTop: '8px' }}>
                                            <FieldSelect
                                                fullWidth
                                                queryKey={['source_language_options']}
                                                request={async () => LANGUAGE_OPTIONS}
                                                value={field.value as (string | number)[]}
                                                onChange={(value?: (string | number)[]) => {
                                                    // imbrace Select mutates the value array in place on chip
                                                    // delete and passes the SAME reference back — copy it so
                                                    // RHF/React detect the change and the removed chip disappears.
                                                    if (value !== undefined) field.onChange([...value]);
                                                }}
                                                placeholder={t('ai_document_ai_source_language_placeholder')}
                                                multiple
                                                closeOnSelect={false}
                                                displayType="chip"
                                                onReset={() => field.onChange([])}
                                                error={!!error}
                                                helperText={error?.message}
                                            />
                                        </div>
                                    </Space>
                                )}
                            />

                            {/* Handwriting Support */}
                            <Controller
                                name="handwriting_support"
                                control={control}
                                render={({ field }) => (
                                    <Space style={{ width: '100%', marginBottom: '24px', alignItems: 'center', gap: '16px' }}>
                                        <Space direction="vertical" align="start" style={{ flex: 1 }}>
                                            <Typography variant="BodyBold">{t('ai_document_ai_handwriting_support')}</Typography>
                                            <Typography variant="Body" style={{ color: '#828282' }}>
                                                {t('ai_document_ai_handwriting_support_desc')}
                                            </Typography>
                                        </Space>
                                        <Switch
                                            checked={field.value}
                                            onChange={async (checked: boolean) => field.onChange(checked)}
                                        />
                                    </Space>
                                )}
                            />

                            {/* Time Offset */}
                            <Controller
                                name="time_offset"
                                control={control}
                                render={({ field }) => (
                                    <Space direction="vertical" style={{ width: '100%', marginBottom: '24px' }} align="start">
                                        <Typography variant="BodyBold">{t('ai_document_ai_time_offset')}</Typography>
                                        <div style={{ width: '280px' }}>
                                            <FieldSelect
                                                fullWidth
                                                queryKey={['time_offset_options']}
                                                request={async () =>
                                                    [
                                                        '-12:00', '-11:00', '-10:00', '-09:00', '-08:00', '-07:00',
                                                        '-06:00', '-05:00', '-04:00', '-03:00', '-02:00', '-01:00',
                                                        '+00:00', '+01:00', '+02:00', '+03:00', '+04:00', '+05:00',
                                                        '+05:30', '+06:00', '+07:00', '+08:00', '+09:00', '+10:00',
                                                        '+11:00', '+12:00',
                                                    ].map((o) => ({ text: `UTC${o}`, value: `UTC${o}` }))
                                                }
                                                value={field.value}
                                                onChange={(val?: string) => field.onChange(val)}
                                            />
                                        </div>
                                    </Space>
                                )}
                            />

                            {/* Continue on Failure */}
                            <Controller
                                name="continue_on_failure"
                                control={control}
                                render={({ field }) => (
                                    <Space direction="vertical" style={{ width: '100%', marginBottom: '24px' }} align="start">
                                        <Typography variant="BodyBold">{t('ai_document_ai_continue_on_failure')}</Typography>
                                        <Space align="center" style={{ width: '100%' }}>
                                            <Typography variant="Body" style={{ flex: 1, color: '#4F4F4F', fontWeight: 400 }}>
                                                {t('ai_document_ai_continue_on_failure_desc')}
                                            </Typography>
                                            <Switch
                                                checked={field.value || false}
                                                onChange={async (checked: boolean) => field.onChange(checked)}
                                                size="small"
                                            />
                                        </Space>
                                    </Space>
                                )}
                            />

                            {/* Retry Time */}
                            <Controller
                                name="retry_time"
                                control={control}
                                render={({ field }) => (
                                    <Space direction="vertical" style={{ width: '100%', marginBottom: '24px' }} align="start">
                                        <Typography variant="BodyBold">{t('ai_document_ai_retry_time')}</Typography>
                                        <div style={{ width: '280px' }}>
                                            <FieldSelect
                                                fullWidth
                                                queryKey={['retry_time_options']}
                                                request={async () =>
                                                    Array.from({ length: 11 }, (_, i) => ({
                                                        text: String(i),
                                                        value: String(i),
                                                    }))
                                                }
                                                value={String(field.value)}
                                                onChange={(val?: string) => field.onChange(Number(val))}
                                            />
                                        </div>
                                    </Space>
                                )}
                            />
                        </Space>
                    </Space>
                </div>

                {/* Skill (Optional) */}
                <div style={{ flexShrink: 0, borderTop: '1px solid #E0E0E0', height: '200px', overflowY: 'auto' }}>
                    <Space
                        justify="between"
                        align="start"
                        style={{ paddingTop: '12px', paddingBottom: '12px', paddingLeft: '32px', paddingRight: '32px' }}
                        direction="vertical"
                    >
                        <Space direction="vertical" justify="start" align="start" style={{ width: '100%' }}>
                            <Typography style={{ fontSize: '20px', fontWeight: 600 }}>
                                {`${t('ai_agent_capabilities')} (${t('optional')})`}
                            </Typography>
                            <Typography variant="Body" style={{ color: '#828282' }}>
                                {t('ai_assistant_management_behavior_setting_function_calling_desc', { type: '' })}
                            </Typography>
                        </Space>
                        <Space direction="vertical" style={{ width: '100%' }}>
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
                                    sx={{ fontWeight: 400 }}
                                />
                            </Space>
                            <Space direction="vertical" style={{ width: '100%' }} align="start">
                                {getValues('workflow_functions')?.map((workflowFunction) => (
                                    <div
                                        key={workflowFunction.id}
                                        style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px' }}
                                    >
                                        <Space
                                            direction="vertical"
                                            justify="center"
                                            style={{
                                                flex: 1,
                                                height: '145px',
                                                backgroundColor: '#FEF5E8',
                                                borderRadius: '4px',
                                                padding: '12px',
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
                                                const updated = getValues('workflow_functions')?.filter(
                                                    (item) => item.id !== workflowFunction.id,
                                                );
                                                setValue('workflow_functions', updated, {
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
                        </Space>
                    </Space>
                </div>
            </div>
        </Spin>
    );

    // ===== RENDER: Knowledge Support tab =====
    const renderKnowledgeTab = () => (
        <Spin isSpinning={loading}>
            <Space
                justify="between"
                align="start"
                style={{ paddingTop: '32px', paddingLeft: '32px', paddingRight: '32px', paddingBottom: '24px', overflow: 'auto' }}
                direction="vertical"
            >
                <Space
                    direction="vertical"
                    justify="start"
                    align="start"
                    style={{ width: '100%', marginBottom: '24px' }}
                >
                    <Typography style={{ fontSize: '20px', fontWeight: 600 }}>
                        {t('ai_assistant_management_knowledge_support')}
                    </Typography>
                    <Typography variant="Body" style={{ color: '#828282' }}>
                        {t(
                            'ai_document_ai_knowledge_support_desc',
                            'Select the supporting materials to train the agent and facilitate its performance.',
                        )}
                    </Typography>
                </Space>
                <KnowledgeHubV2Section
                    t={t}
                    isAIAgent={true}
                    translateTextType={{ normal: 'agent', capitalize: 'Agent' }}
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
            </Space>
        </Spin>
    );

    return {
        formMethods,
        renderBasicTab,
        renderLinkageTab,
        renderAdvancedTab,
        renderKnowledgeTab,
        onSubmit: handleSubmitWithTabNavigation,
        setTab,
        isPending,
        loading,
        tab,
        linkageView,
        setLinkageView,
        dialog,
        dialogHolder,
        isEditMode,
        isDirty,
        isValid,
        handleSubmit,
        getValues,
        trigger,
        exitForm,
        onDelete,
        removeLinkedSchema,
        editData,
        account,
        // expose field type options for child views if needed
        fieldTypeOptions: FieldTypesOptions(t),
    };
};
