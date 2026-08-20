import { Button, FieldSelect, Space, Typography } from '@imbrace/ui';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Dialog from '@/components/Dialog';
import LLMProviderSelectField from '@/pages/AIAssistantManagement/components/LLMProviderSelectField';
import { getAIAssistantLLMModels, getCustomProviders } from '@/services/api/ai-assistant';
import apiFetch from '@/services/axios/handler';

const SYSTEM_PROVIDER_ID = 'system';
const MAX_FILES = 5;

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

export interface ExtractSelection {
    files: File[];
    providerId: string;
    modelId: string;
}

interface ExtractModelDialogProps {
    open: boolean;
    /** Files already chosen on the page (e.g. drag-and-drop) — pre-loads them so they aren't lost. */
    initialFiles?: File[];
    onClose: () => void;
    onConfirm: (selection: ExtractSelection) => void;
}

/**
 * Lets the user pick the Provider type + Model used to analyse the sample document,
 * then triggers the file selection. Mirrors the Import AI Agent dialog's provider/model UI.
 */
const ExtractModelDialog = ({ open, initialFiles, onClose, onConfirm }: ExtractModelDialogProps) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [customProviders, setCustomProviders] = useState<any[]>([]);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    const [providerId, setProviderId] = useState<string>(SYSTEM_PROVIDER_ID);
    const [modelId, setModelId] = useState<string>('');
    const [files, setFiles] = useState<File[]>([]);

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

    // Reset selection each time the dialog opens; pre-load any drag-and-drop files.
    useEffect(() => {
        if (!open) return;
        setProviderId(SYSTEM_PROVIDER_ID);
        setModelId('');
        setFiles((initialFiles ?? []).slice(0, MAX_FILES));
        fetchCustomProviders();
    }, [open, initialFiles, fetchCustomProviders]);

    const getModelOptions = useCallback(
        async (pid: string): Promise<{ text: string; value: string }[]> => {
            let models: { name: string; label?: string }[] = [];
            if (pid === SYSTEM_PROVIDER_ID) {
                const { data } = await apiFetch<{
                    data: { name: string; is_toolCall_available: boolean; label?: string }[];
                }>(getAIAssistantLLMModels.api(), getAIAssistantLLMModels.method);
                models = (data.data || []).map((item) =>
                    item.name === 'Default' ? { ...item, label: t('default') } : { ...item, label: item.name },
                );
            } else {
                const provider = customProviders.find((p) => (p.provider_id || p._id) === pid);
                models = (provider?.models ?? [])
                    .filter((m: any) => m.is_shown !== false)
                    .map((m: any) => ({ name: m.name, label: m.name }));
            }
            return models.map((m) => ({ text: m.label || m.name, value: m.name }));
        },
        [customProviders, t],
    );

    const onFilesPicked = (e: ChangeEvent<HTMLInputElement>) => {
        // Copy into a plain array BEFORE resetting value — `e.target.files` is a live list
        // that resetting `value` empties, which would otherwise drop the just-picked files.
        const picked = Array.from(e.target.files ?? []).slice(0, MAX_FILES);
        e.target.value = ''; // allow re-picking the same file
        if (!picked.length) return;
        onConfirm({ files: picked, providerId, modelId });
    };

    // With a model chosen: if files were dropped on the page, analyse them directly;
    // otherwise open the file picker (a direct user gesture keeps the picker un-blocked).
    const onPrimaryAction = () => {
        if (files.length) {
            onConfirm({ files, providerId, modelId });
            return;
        }
        fileInputRef.current?.click();
    };

    if (!open) return null;

    return (
        <Dialog
            open={open}
            title={t('schema_extract_select_model_title', 'Select Provider & Model')}
            showCloseButton
            hideCancelButton
            hideConfirmButton
            onClose={onClose}
            paperSx={{ width: 560 }}
            content={
                <Space direction="vertical" align="start" size={16} style={{ width: '100%', marginTop: 4 }}>
                    <Typography variant="Body" style={{ color: '#828282' }}>
                        {t(
                            'schema_extract_select_model_desc',
                            'Choose the provider and model used to analyse your sample file and auto-generate the schema.',
                        )}
                    </Typography>

                    <Space direction="vertical" style={{ width: '100%' }} align="start">
                        <Typography variant="BodyBold">{`${t('ai_agent_connected_provider_type')} *`}</Typography>
                        <Space style={{ width: '100%', gap: '20px' }} align="end">
                            <div style={{ flex: 1 }}>
                                <LLMProviderSelectField
                                    value={providerId}
                                    onChange={(newValue) => {
                                        setProviderId(newValue);
                                        setModelId('');
                                    }}
                                    options={providerSelectOptions}
                                    loading={isLoadingProviders}
                                    disabled={isLoadingProviders}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <FieldSelect
                                    label={t('schema_extract_model_label', 'Model')}
                                    fullWidth
                                    enabled={!isLoadingProviders}
                                    queryKey={['extract_model_options', providerId, customProviders.length]}
                                    request={async () => getModelOptions(providerId)}
                                    value={modelId}
                                    onChange={(val?: string) => setModelId(val || '')}
                                />
                            </div>
                        </Space>
                    </Space>

                    {files.length > 0 && (
                        <Typography variant="Body" style={{ color: '#4F4F4F' }}>
                            {files.map((f) => f.name).join(', ')}
                        </Typography>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,image/png,image/jpeg"
                        multiple
                        style={{ display: 'none' }}
                        onChange={onFilesPicked}
                    />
                    <Space direction="vertical" align="start" size={6} style={{ width: '100%', marginTop: 8 }}>
                        <Button
                            variant="contained"
                            text={
                                files.length
                                    ? t('schema_extract_analyze_btn', 'Analyse Sample File')
                                    : t('schema_upload_sample_file', 'Upload Sample File')
                            }
                            disabled={!modelId}
                            onClick={onPrimaryAction}
                            sx={{ minWidth: 200 }}
                        />
                        <Typography variant="Caption" style={{ color: '#828282' }}>
                            {t('schema_upload_hint_short', 'PDF, JPG, PNG supported. (up to 5 file)')}
                        </Typography>
                    </Space>
                </Space>
            }
        />
    );
};

export default ExtractModelDialog;
