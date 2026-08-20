import { Button, FieldText, Icon, IconButton, Tooltip } from '@imbrace/ui';
import { CircularProgress, Menu, MenuItem, Select } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import ModelProfileIcon from '@/assets/icons/ai_schema_model_profile.svg?react';
import PromptExpandIcon from '@/assets/icons/ai_schema_promt_expand.svg?react';
import VersionIcon from '@/assets/icons/ai_schema_version.svg?react';
import SchemaAgentIcon from '@/assets/icons/schema_agent.svg?react';
import SchemaDataboardIcon from '@/assets/icons/schema_databoard.svg?react';
import Dialog from '@/components/Dialog';
import { useNotify } from '@/contexts/SnackbarContext';
import { FieldTypeIcon } from '@/pages/DataboardEnhance/utils';
import { FieldTypesOptions } from '@/pages/Databoards/utils';
import {
    schemaQueries,
    useSchemaCategories,
    useSchemaDetail,
    useUpdateSchema,
} from '@/services/queries/schema';

import styles from './BoardSchemaDetail.module.scss';
import AttributeModal, { type AttributeFormValue } from './components/AttributeModal';
import ModelProfilePanel from './components/ModelProfilePanel';
import VersionsPanel from './components/VersionsPanel';
import type { SchemaAttribute, SchemaFieldType } from './types';

type TabKey = 'schema' | 'linked';


// Same lock semantics as in BoardSchemaCreate: the schema's default attribute is view-only.
const isLockedAttr = (attr: SchemaAttribute) =>
    attr.id === 'locked_default_name' || attr.isDefault === true;

const BoardSchemaDetail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { notify } = useNotify();
    const { id } = useParams<{ id: string }>();

    const { data: schema, isLoading, refetch } = useSchemaDetail(id);
    const categoriesQuery = useSchemaCategories({ type: 'schema' });
    const categories = categoriesQuery.data ?? [];

    const updateSchemaMut = useUpdateSchema();
    const queryClient = useQueryClient();

    const [tab, setTab] = useState<TabKey>('schema');
    const [profileOpen, setProfileOpen] = useState(false);
    const [versionsOpen, setVersionsOpen] = useState(false);

    const [editingAttr, setEditingAttr] = useState<SchemaAttribute | null>(null);
    const [kebabAnchor, setKebabAnchor] = useState<{ anchor: HTMLElement; attr: SchemaAttribute } | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Local-only buffers. Nothing hits the BE until the user clicks "Save changes".
    const [pendingEdits, setPendingEdits] = useState<Record<string, Partial<SchemaAttribute>>>({});
    const [pendingAdds, setPendingAdds] = useState<SchemaAttribute[]>([]);
    const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);

    const baseAttributes = useMemo(() => schema?.attributes ?? [], [schema?.attributes]);
    // Normalise enriched agents/databoards from API response (read shape has id+name).
    const linkedAgents = (schema?.agents ?? []) as { id: string; name: string; usecase_id?: string }[];
    const linkedBoards = (schema?.databoards ?? []) as { id: string; name: string }[];
    const hasLinkedBoards = linkedBoards.length > 0;

    const fieldTypeOptions = useMemo(
        () => FieldTypesOptions(t, true).filter((o) => o.value !== 'Priority'),
        [t],
    );

    // Visible list = (original attributes minus pending deletes) + pending adds.
    const attributes = useMemo(() => {
        const visible = baseAttributes.filter((a) => !pendingDeletes.includes(a.id));
        return [...visible, ...pendingAdds];
    }, [baseAttributes, pendingDeletes, pendingAdds]);

    const isDraft = useCallback(
        (attrId: string) => pendingAdds.some((a) => a.id === attrId),
        [pendingAdds],
    );

    const getCellValue = useCallback(
        <K extends keyof SchemaAttribute>(attr: SchemaAttribute, key: K): SchemaAttribute[K] => {
            // Drafts already carry their full state inline — no pendingEdits lookup needed.
            if (isDraft(attr.id)) return attr[key];
            const pending = pendingEdits[attr.id];
            if (pending && key in pending) return pending[key] as SchemaAttribute[K];
            return attr[key];
        },
        [pendingEdits, isDraft],
    );

    const updateCell = (attrId: string, patch: Partial<SchemaAttribute>) => {
        if (isDraft(attrId)) {
            setPendingAdds((prev) => prev.map((a) => (a.id === attrId ? { ...a, ...patch } : a)));
            return;
        }
        setPendingEdits((prev) => ({ ...prev, [attrId]: { ...(prev[attrId] ?? {}), ...patch } }));
    };

    const hasUnsaved =
        Object.keys(pendingEdits).length > 0 ||
        pendingAdds.length > 0 ||
        pendingDeletes.length > 0;

    const isSavingChanges = updateSchemaMut.isPending;

    const handleSaveChanges = async () => {
        if (!schema || !hasUnsaved) return;
        // Validate all visible attributes: name is required.
        const invalid = attributes.filter((a) => {
            if (isLockedAttr(a)) return false;
            const name = getCellValue(a, 'name');
            return !name?.trim();
        });
        if (invalid.length > 0) {
            notify({
                type: 'warning',
                message: t('schema_validation_required', 'Attribute name is required for all rows'),
            });
            return;
        }
        try {
            // Build the merged attributes array. PUT /schemas/:id replaces the whole list.
            const mergedAttributes = [
                ...baseAttributes
                    .filter((a) => !pendingDeletes.includes(a.id))
                    .map((a) => ({ ...a, ...(pendingEdits[a.id] ?? {}) })),
                ...pendingAdds.map(({ id: _draftId, ...rest }) => {
                    void _draftId;
                    // BE generates the real id for new attributes when `id` is missing.
                    return rest as SchemaAttribute;
                }),
            ];
            await updateSchemaMut.mutateAsync({
                id: schema.id,
                body: { attributes: mergedAttributes },
            });
            // Pre-populate the cache with the merged schema so the next render uses
            // the new attributes immediately instead of briefly flashing the stale list
            // until the invalidate-triggered refetch lands.
            queryClient.setQueryData<typeof schema>(
                schemaQueries.schemaDetail(schema.id).queryKey,
                (prev) => (prev ? { ...prev, attributes: mergedAttributes } : prev),
            );
            setPendingEdits({});
            setPendingAdds([]);
            setPendingDeletes([]);
            notify({ type: 'success', message: t('schema_changes_saved', 'Schema updated successfully') });
        } catch {
            notify({ type: 'error', message: t('error_something_went_wrong') });
        }
    };

    const handleAddInlineRow = () => {
        const newAttr: SchemaAttribute = {
            id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: '',
            type: 'ShortText',
            extractionPrompt: '',
            sampleData: '',
            hiddenOnRecord: false,
            hidden: false,
        };
        setPendingAdds((prev) => [...prev, newAttr]);
    };

    const handleSaveEditAttribute = (value: AttributeFormValue) => {
        if (!editingAttr) return;
        if (isDraft(editingAttr.id)) {
            setPendingAdds((prev) =>
                prev.map((a) => (a.id === editingAttr.id ? { ...a, ...value } : a)),
            );
            return;
        }
        setPendingEdits((prev) => ({
            ...prev,
            [editingAttr.id]: { ...(prev[editingAttr.id] ?? {}), ...value },
        }));
    };

    const handleDeleteAttribute = (attrId: string) => {
        if (isDraft(attrId)) {
            setPendingAdds((prev) => prev.filter((a) => a.id !== attrId));
            return;
        }
        setPendingDeletes((prev) => (prev.includes(attrId) ? prev : [...prev, attrId]));
        setPendingEdits((prev) => {
            if (!(attrId in prev)) return prev;
            const next = { ...prev };
            delete next[attrId];
            return next;
        });
    };

    if (isLoading) {
        return (
            <div className={styles.page}>
                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <CircularProgress size={56} />
                    <span style={{ color: 'var(--color-secondary-3)', fontSize: 14 }}>{t('loading')}</span>
                </div>
            </div>
        );
    }

    if (!schema) {
        return (
            <div className={styles.page}>
                <div className={styles.topBar}>
                    <h2 className={styles.topTitle}>{t('schema_page_title', 'Document Models')}</h2>
                </div>
                <div className={styles.body}>
                    <p>{t('schema_not_found', 'Schema not found')}</p>
                    <Button variant="text" text={t('back')} onClick={() => navigate('/document-models')} />
                </div>
            </div>
        );
    }

    const backToList = () => {
        const catId = schema.category_id ?? '';
        navigate(catId ? `/document-models?categoryId=${encodeURIComponent(catId)}` : '/document-models');
    };

    return (
        <div className={styles.page}>
            <div className={styles.topBar}>
                <h2 className={styles.topTitle}>{t('schema_page_title', 'Document Models')}</h2>
                <nav className={styles.breadcrumb} aria-label="breadcrumb">
                    <button type="button" onClick={backToList}>
                        {t('schema_models_index', 'Models index')}
                    </button>
                    <Icon name="chevronRight" style={{ fontSize: 14, color: 'var(--color-light-5)' }} />
                    <span className={styles.crumbCurrent}>{schema.name}</span>
                </nav>
            </div>

            <div className={styles.body}>
                <div className={styles.titleRow}>
                    <div className={styles.titleLeft}>
                        <h1 className={styles.schemaName}>{schema.name}</h1>
                    </div>
                    <div className={styles.titleRight}>
                        <button
                            type="button"
                            className={styles.headerAction}
                            onClick={() => setProfileOpen(true)}
                        >
                            <ModelProfileIcon className={styles.headerActionIcon} />
                            {t('schema_model_profile', 'Model Profile')}
                        </button>
                        <button
                            type="button"
                            className={styles.headerAction}
                            onClick={() => setVersionsOpen(true)}
                        >
                            <VersionIcon className={styles.headerActionIcon} />
                            {t('schema_versions', 'Versions')}
                        </button>
                    </div>
                </div>

                <div className={styles.tabs}>
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${tab === 'schema' ? styles.tabActive : ''}`}
                        onClick={() => setTab('schema')}
                    >
                        {t('schema_tab_schema', 'Schema')}
                    </button>
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${tab === 'linked' ? styles.tabActive : ''}`}
                        onClick={() => setTab('linked')}
                    >
                        {t('schema_tab_linked', 'Linked Agents & Data Destinations')}
                    </button>
                </div>

                <div className={styles.tabContent}>
                {tab === 'schema' ? (
                    <>
                        {linkedAgents.length > 0 && (
                            <div className={styles.syncedNotice}>
                                {t(
                                    'schema_synced_notice',
                                    'This schema is currently synced with {{agents}} Agents and {{boards}} Data Boards. Any changes will be applied in real-time.',
                                    { agents: linkedAgents.length, boards: linkedBoards.length },
                                )}
                            </div>
                        )}

                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th className={styles.colName}>{t('schema_col_name', 'Attribute Name')}</th>
                                        <th className={styles.colType}>{t('schema_col_ai_logic', 'AI Logic')}</th>
                                        <th>{t('schema_col_prompt', 'Extraction Prompt')}</th>
                                        <th className={styles.colKebab} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {attributes.map((attr) => {
                                        const name = getCellValue(attr, 'name');
                                        const type = getCellValue(attr, 'type');
                                        const prompt = getCellValue(attr, 'extractionPrompt');
                                        const locked = isLockedAttr(attr);
                                        // AI Logic (type) is locked for saved attributes only while the
                                        // schema is connected to a databoard — changing the type could
                                        // break the linked board's columns. With no databoard connected,
                                        // saved attributes stay editable; draft rows are always editable.
                                        const typeLocked = locked || (!isDraft(attr.id) && hasLinkedBoards);
                                        // Explain to the user why the AI Logic dropdown is locked.
                                        const typeLockReason = locked
                                            ? t('schema_type_locked_default', 'This is a default attribute — its AI Logic cannot be changed.')
                                            : t('schema_type_locked_databoard', 'AI Logic cannot be changed while this model is connected to a databoard.');
                                        const typeSelect = (
                                            <Select
                                                size="small"
                                                fullWidth
                                                value={type}
                                                disabled={typeLocked}
                                                sx={typeLocked ? {
                                                    backgroundColor: 'var(--color-light-2)',
                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'var(--color-light-3)',
                                                    },
                                                    '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'var(--color-light-3)',
                                                    },
                                                    '& .MuiSelect-select.Mui-disabled': {
                                                        backgroundColor: 'var(--color-light-2)',
                                                        WebkitTextFillColor: 'var(--color-light-7)',
                                                    },
                                                } : {}}
                                                onChange={(e) =>
                                                    updateCell(attr.id, { type: e.target.value as SchemaFieldType })
                                                }
                                                renderValue={(v) => {
                                                    const opt = fieldTypeOptions.find((o) => o.value === v);
                                                    return (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            {opt?.icon ?? FieldTypeIcon(v as API.FieldType, { fontSize: 24, style: { color: 'var(--color-light-5)' } })}
                                                            <span style={{ fontSize: 14, fontWeight: 400 }}>{opt?.text ?? v}</span>
                                                        </div>
                                                    );
                                                }}
                                            >
                                                {fieldTypeOptions.map((opt) => (
                                                    <MenuItem key={opt.value} value={opt.value}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            {opt.icon}
                                                            <span style={{ fontSize: 14, fontWeight: 400 }}>{opt.text}</span>
                                                        </div>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        );
                                        return (
                                            <tr key={attr.id}>
                                                <td>
                                                    <FieldText
                                                        fullWidth
                                                        value={name}
                                                        disabled={locked}
                                                        onChange={(e) =>
                                                            updateCell(attr.id, {
                                                                name: (e.target as HTMLInputElement).value,
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    {typeLocked ? (
                                                        <Tooltip title={typeLockReason} placement="top" arrow>
                                                            {/* span wrapper: a disabled Select doesn't fire hover events on its own */}
                                                            <span style={{ display: 'block', width: '100%' }}>
                                                                {typeSelect}
                                                            </span>
                                                        </Tooltip>
                                                    ) : (
                                                        typeSelect
                                                    )}
                                                </td>
                                                <td className={styles.promptCell}>
                                                    <div style={{ position: 'relative' }}>
                                                        <FieldText
                                                            fullWidth
                                                            multiline
                                                            minRows={1}
                                                            value={prompt}
                                                            disabled={locked}
                                                            onChange={(e) =>
                                                                updateCell(attr.id, {
                                                                    extractionPrompt: (e.target as HTMLInputElement).value,
                                                                })
                                                            }
                                                            sx={{ '& .MuiInputBase-input': { paddingRight: '34px' } }}
                                                        />
                                                        <PromptExpandIcon
                                                            className={styles.expandPromptBtn}
                                                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                                                            onClick={() =>
                                                                setEditingAttr({
                                                                    ...attr,
                                                                    ...(pendingEdits[attr.id] ?? {}),
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                </td>
                                                <td className={styles.colKebab}>
                                                    <IconButton
                                                        size="xs"
                                                        variant="text"
                                                        type="secondary"
                                                        onClick={(e) =>
                                                            setKebabAnchor({ anchor: e.currentTarget, attr })
                                                        }
                                                    >
                                                        <Icon name="moreVert" />
                                                    </IconButton>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <button type="button" className={styles.addAttrBtn} onClick={handleAddInlineRow}>
                            <Icon name="add" /> {t('schema_add_target_attribute', 'Add Target Attribute')}
                        </button>

                        <div className={styles.formFooter}>
                            <Button
                                variant="contained"
                                text={t('schema_save_changes', 'Save changes')}
                                onClick={handleSaveChanges}
                                disabled={!hasUnsaved || isSavingChanges}
                                loading={isSavingChanges}
                                sx={{ fontSize: 14, fontWeight: 800, color: 'var(--color-light-1)' }}
                            />
                            <Button
                                variant="outlined"
                                text={t('back')}
                                onClick={backToList}
                            />
                        </div>
                    </>
                ) : (
                    <div className={styles.linkedCardsRow}>
                        <div className={styles.linkedCard}>
                            <h3 className={styles.linkedTitle}>
                                {t('schema_linked_agents', 'Linked Agents')} ({linkedAgents.length})
                            </h3>
                            {linkedAgents.length === 0 ? (
                                <span className={styles.linkedEmpty}>—</span>
                            ) : (
                                <div className={styles.linkedList}>
                                    {linkedAgents.map((agent) => (
                                        <div
                                            key={agent.id}
                                            className={styles.linkedItem}
                                            onClick={() => window.open(`/ai-agent/${agent.usecase_id}`, '_blank')}
                                        >
                                            <SchemaAgentIcon style={{ width: 20, height: 20, flexShrink: 0 }} />
                                            {agent.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className={styles.linkedCard}>
                            <h3 className={styles.linkedTitle}>
                                {t('schema_connected_databoards', 'Connected Data Boards')} ({linkedBoards.length})
                            </h3>
                            {linkedBoards.length === 0 ? (
                                <span className={styles.linkedEmpty}>—</span>
                            ) : (
                                <div className={styles.linkedList}>
                                    {linkedBoards.map((board) => (
                                        <div
                                            key={board.id}
                                            className={styles.linkedItem}
                                            onClick={() => window.open(`/databoards/${board.id}`, '_blank')}
                                        >
                                            <SchemaDataboardIcon style={{ width: 20, height: 20, flexShrink: 0 }} />
                                            {board.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                </div>
            </div>

            <Menu
                open={!!kebabAnchor}
                anchorEl={kebabAnchor?.anchor ?? null}
                onClose={() => setKebabAnchor(null)}
            >
                <MenuItem
                    sx={{ fontSize: 14, fontWeight: 400, color: 'var(--color-light-7)' }}
                    onClick={() => {
                        if (!kebabAnchor) return;
                        setEditingAttr({
                            ...kebabAnchor.attr,
                            ...(pendingEdits[kebabAnchor.attr.id] ?? {}),
                        });
                        setKebabAnchor(null);
                    }}
                >
                    {kebabAnchor && isLockedAttr(kebabAnchor.attr)
                        ? t('schema_view_details', 'View Details')
                        : t('schema_edit_details', 'Edit Details')}
                </MenuItem>
                {kebabAnchor && !isLockedAttr(kebabAnchor.attr) && (
                    <MenuItem
                        sx={{ fontSize: 14, fontWeight: 400, color: 'var(--color-danger-1)' }}
                        onClick={() => {
                            if (!kebabAnchor) return;
                            const attrId = kebabAnchor.attr.id;
                            setKebabAnchor(null);
                            setConfirmDeleteId(attrId);
                        }}
                    >
                        {t('delete')}
                    </MenuItem>
                )}
            </Menu>

            <AttributeModal
                open={!!editingAttr}
                mode="edit"
                initial={editingAttr ?? undefined}
                readOnly={!!editingAttr && isLockedAttr(editingAttr)}
                disableTypeChange={!!editingAttr && !isDraft(editingAttr.id)}
                onClose={() => setEditingAttr(null)}
                onSave={handleSaveEditAttribute}
                onDelete={
                    editingAttr && !isLockedAttr(editingAttr)
                        ? () => setConfirmDeleteId(editingAttr.id)
                        : undefined
                }
            />

            {!!confirmDeleteId && (
                <Dialog
                    open
                    title={t('schema_confirm_delete_attr_title', 'Are you sure you want to delete this attribute?')}
                    content={t(
                        'schema_confirm_delete_attr',
                        'Attribute "{{name}}" will be permanently deleted. This action cannot be undone.',
                        { name: attributes.find((a) => a.id === confirmDeleteId)?.name ?? '' },
                    )}
                    confirmText={t('delete')}
                    cancelText={t('cancel')}
                    confirmButtonProps={{ type: 'danger' }}
                    showCloseButton
                    onConfirm={() => {
                        handleDeleteAttribute(confirmDeleteId);
                        setConfirmDeleteId(null);
                        setEditingAttr(null);
                    }}
                    onClose={() => setConfirmDeleteId(null)}
                />
            )}

            <ModelProfilePanel
                open={profileOpen}
                schema={schema}
                categories={categories}
                onClose={() => setProfileOpen(false)}
            />

            <VersionsPanel open={versionsOpen} schemaId={schema.id} onClose={() => setVersionsOpen(false)} />
        </div>
    );
};

export default BoardSchemaDetail;
