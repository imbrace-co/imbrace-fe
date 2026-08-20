import { Button, FieldSelect, Icon, Space, Typography } from '@imbrace/ui';
import { strFromU8, unzipSync } from 'fflate';
import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '@/contexts/SnackbarContext';
import { installMarketPlaceTemplateFromJson } from '@/services/api/marketplace';
import { getAIAssistantLLMModels, getCustomProviders } from '@/services/api/ai-assistant';
import LLMProviderSelectField from '@/pages/AIAssistantManagement/components/LLMProviderSelectField';
import apiFetch from '@/services/axios/handler';

type ImportStep = 'select_zip' | 'detected';

const SYSTEM_PROVIDER_ID = 'system';

const isZipFile = (file: File) => {
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.zip')) return true;
    // Some browsers provide mime type, some don't.
    return file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
};

const findTxtEntryName = (entries: Record<string, Uint8Array>) => {
    const names = Object.keys(entries);
    return names.find((n) => n.toLowerCase().endsWith('.txt'));
};

const getProviderGroupLabel = (type: string | undefined, t: (k: string) => string): string => {
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

// Find the primary use_case resource so we can read its agent_type.
// Mirrors useExportAIAgentDialog: prefer team_lead, otherwise first use_case.
const findPrimaryUseCase = (template: any) => {
    const resources: any[] = template?.graph?.resources ?? [];
    const useCases = resources.filter((r) => r?.type === 'use_case');
    return useCases.find((r) => r?.data?.agent_type === 'team_lead') ?? useCases[0];
};

export const ImportAIAgentDialog = ({
    onClose,
    onInstalled,
}: {
    onClose?: () => void;
    onInstalled?: () => void | Promise<void>;
}) => {
    const { notify } = useNotify();
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<ImportStep>('select_zip');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    const [txtRaw, setTxtRaw] = useState<string | null>(null);
    const [parsedJson, setParsedJson] = useState<any | null>(null);

    const [customProviders, setCustomProviders] = useState<any[]>([]);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);

    const [llmProviderId, setLlmProviderId] = useState<string>(SYSTEM_PROVIDER_ID);
    const [llmModel, setLlmModel] = useState<string>('');
    const [vlmProviderId, setVlmProviderId] = useState<string>(SYSTEM_PROVIDER_ID);
    const [vlmModel, setVlmModel] = useState<string>('');

    const detectedName = useMemo(() => {
        const name = parsedJson?.data?.name;
        return typeof name === 'string' && name.trim().length > 0 ? name : undefined;
    }, [parsedJson]);

    const agentType = useMemo<string | undefined>(() => {
        const primary = findPrimaryUseCase(parsedJson?.data);
        return primary?.data?.agent_type;
    }, [parsedJson]);

    const isDocumentAI = agentType === 'document_ai';

    const providerSelectOptions = useMemo(() => {
        const systemOption = {
            label: t('ai_agent_system_provider'),
            value: SYSTEM_PROVIDER_ID,
            group: 'System',
            type: 'system',
        };
        const dynamicOptions = customProviders.map((provider) => ({
            label: provider.name,
            value: provider.provider_id || provider._id,
            group: getProviderGroupLabel(provider.type, t),
            type: provider.type,
        }));
        return [systemOption, ...dynamicOptions];
    }, [customProviders, t]);

    const fetchCustomProviders = useCallback(async () => {
        try {
            setIsLoadingProviders(true);
            const { data } = await apiFetch<any[]>(getCustomProviders.api(), getCustomProviders.method);
            setCustomProviders(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching custom providers:', error);
        } finally {
            setIsLoadingProviders(false);
        }
    }, []);

    useEffect(() => {
        if (step !== 'detected') return;
        fetchCustomProviders();
    }, [step, fetchCustomProviders]);

    const getModelOptions = useCallback(
        async (providerId: string): Promise<{ text: string; value: string }[]> => {
            let models: { name: string; label?: string }[] = [];
            if (providerId === SYSTEM_PROVIDER_ID) {
                const { data } = await apiFetch<{
                    data: { name: string; is_toolCall_available: boolean; label?: string }[];
                }>(getAIAssistantLLMModels.api(), getAIAssistantLLMModels.method);
                models = (data.data || []).map((item) =>
                    item.name === 'Default' ? { ...item, label: t('default') } : { ...item, label: item.name },
                );
            } else {
                const provider = customProviders.find((p) => (p.provider_id || p._id) === providerId);
                models = (provider?.models ?? [])
                    .filter((m: any) => m.is_shown !== false)
                    .map((m: any) => ({ name: m.name, label: m.name }));
            }
            return models.map((m) => ({ text: m.label || m.name, value: m.name }));
        },
        [customProviders, t],
    );

    const openFilePicker = useCallback(() => {
        inputRef.current?.click();
    }, []);

    const onFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!isZipFile(file)) {
            notify({ type: 'error', message: t('ai_agent_import_error_only_zip') });
            e.target.value = '';
            setSelectedFile(null);
            return;
        }

        setSelectedFile(file);
    }, [notify, t]);

    const parseZip = useCallback(async () => {
        if (!selectedFile) return;
        setIsParsing(true);
        try {
            const buf = await selectedFile.arrayBuffer();
            const entries = unzipSync(new Uint8Array(buf));
            const txtName = findTxtEntryName(entries);
            if (!txtName) {
                notify({ type: 'error', message: t('ai_agent_import_error_no_txt') });
                return;
            }

            const txt = strFromU8(entries[txtName]);
            setTxtRaw(txt);

            const parsed = JSON.parse(txt);
            setParsedJson(parsed);

            setStep('detected');
        } catch (error) {
            console.error('Failed to parse zip:', error);
            notify({ type: 'error', message: t('ai_agent_import_error_read_zip') });
        } finally {
            setIsParsing(false);
        }
    }, [notify, selectedFile, t]);

    const canInstall = useMemo(() => {
        if (!txtRaw || !parsedJson || isInstalling) return false;
        if (!llmModel) return false;
        if (isDocumentAI && !vlmModel) return false;
        return true;
    }, [txtRaw, parsedJson, isInstalling, llmModel, isDocumentAI, vlmModel]);

    const install = useCallback(async () => {
        if (!parsedJson) return;
        setIsInstalling(true);
        try {
            const payload: Record<string, any> = {
                template: parsedJson.data,
                is_disabled_id_generated: true,
                is_clone_board_items: true,
                provider_id: llmProviderId,
                model_id: llmModel,
            };
            if (isDocumentAI) {
                payload.vlm_provider_id = vlmProviderId;
                payload.vlm_model = vlmModel;
            }

            await apiFetch<any>(
                installMarketPlaceTemplateFromJson.api(),
                installMarketPlaceTemplateFromJson.method,
                payload,
            );
            notify({ type: 'success', message: t('ai_agent_import_success_installed') });
            await onInstalled?.();
            onClose?.();
        } catch (error) {
            console.error('Install failed:', error);
            notify({ type: 'error', message: t('ai_agent_import_error_install_failed') });
        } finally {
            setIsInstalling(false);
        }
    }, [
        notify,
        onClose,
        onInstalled,
        parsedJson,
        t,
        llmProviderId,
        llmModel,
        vlmProviderId,
        vlmModel,
        isDocumentAI,
    ]);

    if (step === 'detected') {
        return (
            <div
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                <Space direction="vertical" align="start" size={14} style={{ width: '100%' }}>
                    <Typography variant="Body" style={{ color: '#27AE60' }}>
                        {t('ai_agent_import_detected_label')}
                    </Typography>
                    <Typography variant="Heading2">{detectedName || '—'}</Typography>

                    {isDocumentAI && (
                        <Space direction="vertical" style={{ width: '100%', marginTop: 8 }} align="start">
                            <Typography variant="BodyBold">{`${t('ai_document_ai_vlm_provider')} *`}</Typography>
                            <Space style={{ width: '100%', gap: '20px' }} align="end">
                                <div style={{ flex: 1 }}>
                                    <LLMProviderSelectField
                                        value={vlmProviderId}
                                        onChange={(newValue) => {
                                            setVlmProviderId(newValue);
                                            setVlmModel('');
                                        }}
                                        options={providerSelectOptions}
                                        loading={isLoadingProviders}
                                        disabled={isLoadingProviders}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <FieldSelect
                                        label={t('ai_document_ai_vlm_model')}
                                        fullWidth
                                        enabled={!isLoadingProviders}
                                        queryKey={['import_vlm_model_options', vlmProviderId, customProviders.length]}
                                        request={async () => getModelOptions(vlmProviderId)}
                                        value={vlmModel}
                                        onChange={(val?: string) => setVlmModel(val || '')}
                                    />
                                </div>
                            </Space>
                        </Space>
                    )}

                    <Space direction="vertical" style={{ width: '100%', marginTop: isDocumentAI ? 8 : 16 }} align="start">
                        <Typography variant="BodyBold">{`${
                            isDocumentAI ? t('ai_document_ai_llm_provider') : t('ai_agent_connected_provider_type')
                        } *`}</Typography>
                        <Space style={{ width: '100%', gap: '20px' }} align="end">
                            <div style={{ flex: 1 }}>
                                <LLMProviderSelectField
                                    value={llmProviderId}
                                    onChange={(newValue) => {
                                        setLlmProviderId(newValue);
                                        setLlmModel('');
                                    }}
                                    options={providerSelectOptions}
                                    loading={isLoadingProviders}
                                    disabled={isLoadingProviders}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <FieldSelect
                                    label={t('ai_document_ai_llm_model')}
                                    fullWidth
                                    enabled={!isLoadingProviders}
                                    queryKey={['import_llm_model_options', llmProviderId, customProviders.length]}
                                    request={async () => getModelOptions(llmProviderId)}
                                    value={llmModel}
                                    onChange={(val?: string) => setLlmModel(val || '')}
                                />
                            </div>
                        </Space>
                    </Space>

                    <Space justify="start" align="center" style={{ width: '100%', marginTop: 8 }}>
                        <Button
                            variant="contained"
                            text={t('ai_agent_import_install_btn')}
                            loading={isInstalling}
                            disabled={!canInstall}
                            onClick={install}
                            sx={{ minWidth: '180px' }}
                        />
                    </Space>
                </Space>
            </div>
        );
    }

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            <Space direction="vertical" align="start" size={16} style={{ width: '100%' }}>
                <Space direction="vertical" align="start" size={6} style={{ width: '100%' }}>
                    <Typography variant="SubHeading2">{t('ai_agent_import_select_zip_title')}</Typography>
                    <Typography variant="Body" style={{ color: '#828282' }}>
                        {t('ai_agent_import_select_zip_desc')}
                    </Typography>
                </Space>

                <div>
                    <Button
                        variant="link"
                        size="s"
                        text={t('ai_agent_import_upload_file_link')}
                        startIcon={<Icon name="add" />}
                        sx={{ gap: '6px', paddingLeft: 0 }}
                        onClick={openFilePicker}
                    />
                    {selectedFile?.name && (
                        <Typography variant="Body" style={{ color: '#4F4F4F', marginTop: 8 }}>
                            {selectedFile.name}
                        </Typography>
                    )}
                </div>

                <Button
                    variant="contained"
                    text={t('ai_agent_import_upload_btn')}
                    loading={isParsing}
                    disabled={!selectedFile || isParsing}
                    onClick={parseZip}
                    sx={{ minWidth: '220px' }}
                />

                <input
                    ref={inputRef}
                    type="file"
                    accept=".zip,application/zip"
                    onChange={onFileChange}
                    style={{ display: 'none' }}
                />
            </Space>
        </div>
    );
};

export default ImportAIAgentDialog;
