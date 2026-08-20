import { Button, FieldSelect, Icon, IconButton, Search, Space, Typography, useDialog } from '@imbrace/ui';
import { Box } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import FlexibleTable from '@/components/FlexibleTable';
import type { Columns, FlexibleTableRef } from '@/components/FlexibleTable/types';
import PageLayout from '@/components/PageLayout';
import { getCustomProviders, deleteCustomProvider } from '@/services/api/ai-assistant';
import apiFetch from '@/services/axios/handler';
import { useNotify } from '@/contexts/SnackbarContext';

import AddProviderDialog from './LLMProviders/AddProviderDialog';
import ManageProviderDialog from './LLMProviders/ManageProviderDialog';
import styles from './index.module.scss';

const ALL_TYPES_VALUE = '__all__';

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

interface LLMProvider {
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

// Map provider type to display name
const getProviderTypeName = (type: string): string => {
    const typeMap: Record<string, string> = {
        openai: 'OpenAI',
        google: 'Google AI',
        bedrock: 'Amazon Bedrock',
        ollama: 'Ollama',
        custom: 'Custom Provider',
        vllm: 'vLLM',
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

const LLMProvider = () => {
    const { notify } = useNotify();
    const { t } = useTranslation();
    const [{ dialog }, dialogHolder] = useDialog();
    const [searchInput, setSearchInput] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');
    const [providerTypeFilter, setProviderTypeFilter] = useState<string>(ALL_TYPES_VALUE);
    const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});
    const tableRef = useRef<FlexibleTableRef<LLMProvider>>(null);

    const {
        data: providersRaw = [],
        isFetching: isFetchingProviders,
        refetch: refetchProviders,
        dataUpdatedAt: providersUpdatedAt,
    } = useQuery({
        queryKey: ['llmProviders', 'all'],
        queryFn: async () => {
            const { data } = await apiFetch<LLMProvider[]>(getCustomProviders.api(), getCustomProviders.method);
            return Array.isArray(data) ? data.filter((p) => p.is_shown !== false) : [];
        },
    });

    const providers = useMemo(
        () =>
            providersRaw.map((p) => ({
                ...p,
                id: p.id || p.provider_id || p._id,
            })),
        [providersRaw],
    );

    const providerTypeOptions = useMemo(() => {
        const types = Array.from(new Set(providers.map((p) => p.type).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        return [
            { text: t('llm_provider_all_providers'), value: ALL_TYPES_VALUE },
            ...types.map((type) => ({ text: getProviderTypeName(type), value: type })),
        ];
    }, [providers]);

    const filteredProviders = useMemo(() => {
        let next = providers;

        if (providerTypeFilter && providerTypeFilter !== ALL_TYPES_VALUE) {
            next = next.filter((p) => p.type === providerTypeFilter);
        }

        if (globalSearch) {
            const q = globalSearch.toLowerCase();
            next = next.filter((p) => p.name?.toLowerCase().includes(q) || p.type?.toLowerCase().includes(q));
        }

        return next;
    }, [providers, providerTypeFilter, globalSearch]);

    const onSearchDebounce = useMemo(
        () =>
            debounce((searchText: string) => {
                setGlobalSearch(searchText);
            }, 1000),
        [],
    );

    // cleanup debounce on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => () => onSearchDebounce.cancel(), [onSearchDebounce]);

    const handleSearch = useCallback((value: string) => {
        setSearchInput(value);
        onSearchDebounce(value);
    }, [onSearchDebounce]);

    const handleResetSearch = useCallback(() => {
        setSearchInput('');
        setGlobalSearch('');
    }, []);

    const handleEdit = useCallback((provider: LLMProvider) => {
        dialog({
            title: t('llm_provider_manage_title'),
            paperSx: {
                width: '80%',
                maxWidth: '920px',
                padding: '24px 32px 32px',
            },
            content: ({ onClose }) => (
                <ManageProviderDialog
                    provider={provider}
                    onClose={onClose}
                    onRefreshProviders={async () => {
                        await refetchProviders();
                    }}
                />
            ),
            hideConfirmButton: true,
            hideCancelButton: true,
            showCloseButton: true,
            actionsAlign: 'flex-end',
        });
    }, [dialog, refetchProviders]);

    const deleteProviderMutation = useMutation({
        mutationFn: async (providerId: string) => {
            await apiFetch(
                deleteCustomProvider.api(providerId),
                deleteCustomProvider.method
            );
        },
        onSuccess: () => {
            notify({
                type: 'success',
                message: t('llm_provider_deleted_success'),
            });
            refetchProviders();
        },
        onError: (error: any) => {
            const errorMessage =
                error?.response?.data?.detail ||
                error?.response?.data?.message ||
                t('llm_provider_delete_failed');
            notify({
                type: 'error',
                message: errorMessage,
            });
        },
    });

    const handleDelete = useCallback((provider: LLMProvider) => {
        dialog({
            title: t('llm_provider_delete_title', { name: provider.name }),
            content: (
                <Space direction="vertical" size={8} align="start">
                    <Typography variant="Body" style={{ color: '#EE7D7D' }}>
                        {t('llm_provider_delete_irreversible')}
                    </Typography>
                    <Typography variant="Body">
                        {t('llm_provider_delete_confirm')}
                    </Typography>
                </Space>
            ),
            confirmText: t('llm_provider_yes'),
            confirmButtonProps: {
                type: 'danger',
            },
            actionsAlign: 'flex-end',
            onConfirm: async () => {
                await deleteProviderMutation.mutateAsync(provider.id || provider._id);
                return true;
            },
            onClose: () => {},
        });
    }, [dialog, deleteProviderMutation]);

    const handleAddProvider = useCallback(() => {
        dialog({
            title: t('llm_provider_add_provider'),
            paperSx: {
                width: '80%',
                maxWidth: '920px',
                padding: '24px 32px 0px',
            },
            content: ({ onClose }) => (
                <AddProviderDialog
                    onClose={onClose}
                    onRefreshProviders={async () => {
                        await refetchProviders();
                    }}
                />
            ),
            hideConfirmButton: true,
            hideCancelButton: true,
            showCloseButton: true,
            actionsAlign: 'flex-end',
        });
    }, [dialog, refetchProviders]);

    const columns: Columns<LLMProvider> = useMemo(
        () => [
            {
                id: 'type',
                accessorKey: 'type',
                header: t('llm_provider_col_provider'),
                enableEditing: false,
                minSize: 180,
                maxSize: 500,
                cell: ({ row }) => (
                    <Typography variant="Body">
                        {getProviderTypeName(row.original.type)}
                    </Typography>
                ),
            },
            {
                id: 'name',
                accessorKey: 'name',
                header: t('name'),
                enableEditing: false,
                minSize: 200,
                maxSize: 300,
                cell: ({ row }) => (
                    <Typography variant="Body">{row.original.name}</Typography>
                ),
            },
            {
                id: 'models',
                accessorKey: 'models',
                header: t('llm_provider_col_models'),
                enableEditing: false,
                minSize: 250,
                enableSorting: false,
                meta: {
                    cellStyle: {
                        // Keep horizontal padding aligned with header/cells in other columns.
                        padding: '12px 16px',
                    },
                },
                cell: ({ row }) => {
                    const providerId = row.original.id || row.original.provider_id || row.original._id;
                    const models = row.original.models?.filter((m) => m.is_shown !== false) || [];
                    const isExpanded = !!expandedModels[providerId];

                    return (
                        <Box>
                            <Space size={6} align="center">
                                <Typography variant="Body">
                                    {models.length}
                                </Typography>
                                {models.length > 0 && (
                                    <IconButton
                                        variant="text"
                                        type="secondary"
                                        size="s"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedModels((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
                                        }}
                                    >
                                        <Icon name={isExpanded ? 'dropUp' : 'dropDown'} style={{ fontSize: 16 }} />
                                    </IconButton>
                                )}
                            </Space>
                            {isExpanded && models.length > 0 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: '20px' }}>
                                    {models.map((model) => (
                                        <Typography
                                            key={model.name}
                                            variant="Body"
                                            style={{ color: 'var(--color-light-6)', fontSize: 14 }}
                                        >
                                            {model.name}
                                        </Typography>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    );
                },
            },
            {
                id: 'operation',
                accessorKey: 'operation',
                enableEditing: false,
                header: () => null,
                maxSize: 124,
                enableSorting: false,
                meta: {
                    cellStyle: {
                        padding: '7px 0',
                    },
                },
                cell: ({ row, isHover, isRowSelected }) => (
                    <Space
                        size={12}
                        justify="end"
                        style={{
                            width: '100%',
                            opacity: isHover || isRowSelected ? 1 : 0,
                            pointerEvents: isHover || isRowSelected ? 'auto' : 'none',
                            transition: 'opacity 0.15s ease',
                        }}
                    >
                        <IconButton
                            variant="text"
                            type="secondary"
                            size="s"
                            onClick={() => handleEdit(row.original)}
                            sx={{ color: '#135DD5', '&:hover': { color: '#135DD5' } }}
                        >
                            <Icon name="edit" />
                        </IconButton>
                        <IconButton
                            variant="text"
                            type="danger"
                            size="s"
                            onClick={() => handleDelete(row.original)}
                            sx={{ color: '#EE7D7D', '&:hover': { color: '#EE7D7D' } }}
                        >
                            <Icon name="delete" />
                        </IconButton>
                    </Space>
                ),
            },
        ],
        [handleEdit, handleDelete, expandedModels, t]
    );

    const renderExtra = useCallback(() => {
        return (
            <Space size={12} style={{ marginTop: 16 }}>
                <FieldSelect
                    value={providerTypeFilter}
                    placeholder={t('llm_provider_filter_placeholder')}
                    queryKey={['llm_provider', 'provider_type_options', providerTypeOptions.length]}
                    request={async () => providerTypeOptions}
                    onChange={(value) => {
                        setProviderTypeFilter(value || ALL_TYPES_VALUE);
                    }}
                    containerStyle={{ width: 320 }}
                    popoverProps={{
                        // Important: this Select is rendered inside PageLayout sticky header; portal avoids being clipped.
                        disablePortal: false,
                    }}
                />
                <Search
                    value={searchInput}
                    placeholder={t('search')}
                    onSearch={handleSearch}
                    onReset={handleResetSearch}
                />
                <Button
                    text={t('llm_provider_add_provider')}
                    onClick={handleAddProvider}
                    sx={{ padding: '10px 32px' }}
                />
            </Space>
        );
    }, [providerTypeFilter, providerTypeOptions, searchInput, handleSearch, handleResetSearch, handleAddProvider, t]);

    return (
        <PageLayout title={t('llm_provider_page_title')} extra={renderExtra()}>
            {dialogHolder}
            <div className={styles.container}>
                <FlexibleTable<LLMProvider>
                    ref={tableRef}
                    showFilter={false}
                    // Hide pagination UI + keep it effectively disabled for this page
                    pagination={{ pageIndex: 0, pageSize: 10000 }}
                    paginationStyle={{ display: 'none' }}
                    // FlexibleTable caches `dataSource` using its own react-query keyed by `queryKey`.
                    // Include `providersUpdatedAt` so edits (name/config) refresh even when list length doesn't change.
                    queryKey={['llmProviders_local', providerTypeFilter, globalSearch, providersUpdatedAt]}
                    dataSource={filteredProviders}
                    columns={columns}
                    fullWidth
                    disableHoverEffect
                    // Keep UI aligned while the initial list is loading
                    {...(isFetchingProviders && {
                        containerStyle: { opacity: 0.7, pointerEvents: 'none' },
                    })}
                    emptyMessage={
                        <Typography style={{ fontSize: 16, lineHeight: '24px', fontWeight: 600 }}>
                            {t('llm_provider_empty')}
                        </Typography>
                    }
                />
            </div>
        </PageLayout>
    );
};

export default LLMProvider;

