import { Button, FieldSelect, FieldText, Icon, Search, Space, Tabs, Typography, useDialog } from '@imbrace/ui';
import { useQueryClient } from '@tanstack/react-query';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { IconButton, Tooltip } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import databoardIcon from '@/assets/icons/ai_document_ai_databoard.svg';
import uploadIcon from '@/assets/icons/ai_document_ai_upload.svg';
import SchemaIcon from '@/assets/icons/board_schema/schema_icon.svg?react';
import { useNotify } from '@/contexts/SnackbarContext';
import { useSchemaNameConflict } from '@/pages/BoardSchema/hooks';
import type { SchemaCategory } from '@/pages/BoardSchema/types';
import { FieldTypeIcon, FieldTypesOptions } from '@/pages/Databoards/utils';
import { postBoardUpload, updateBoardById } from '@/services/api/crm';
import { getSchemaById, postSchemaExtractAttributes } from '@/services/api/schema';
import { ImbraceClient, ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { useBoards } from '@/services/queries/board';
import { useDataboardCategories } from '@/services/queries/databoardCategory';
import {
    useCreateSchema,
    useSchemaCategories,
    useSchemas,
    useUpdateSchema,
} from '@/services/queries/schema';
import { getApiErrorMessage } from '@/utils/apiError';

import {
    attributesToDocSchemaPayload,
    collectCategoryDescendantIds,
    createEmptyLinkedSchema,
    createLocalId,
    defaultDataBoardName,
    docSchemaAttributesToFields,
    emptyAttribute,
    flattenCategoryTree,
    getSampleDataForType,
    isBoardNameTaken,
} from '../documentAIUtils';
import type { LinkageView, LinkedSchema, SchemaAttribute, SchemaSubField } from '../type';
import type { DocumentAIFormType } from '../useDocumentAIFormHook';
import styles from './index.module.scss';

// Minimum `match_percent` from extract-attributes' `similar_schema` to surface the
// "Existing Model Detected" view. 0 = show whenever the backend returns a match; raise
// this (e.g. 70) to only prompt on strong matches.
const SCHEMA_MATCH_MIN_PERCENT = 0;

// Name of the default databoard category the backend auto-creates for boards provisioned
// from Document-AI schemas (data_board `DOC_AGENT_DEFAULT_CATEGORY`). Kept in sync so the
// "Edit Data Board" dialog can default-select it once it exists.
const DOC_AGENT_BOARD_CATEGORY = 'Doc Agent';

// Resolve a stored category id (which may be a top-level OR a sub-category id) back
// into its { parentId, subId } pair so the two-level selects can pre-fill correctly.
const findCategoryParent = (
    catId: string | undefined,
    categories: SchemaCategory[],
): { parentId: string; subId: string } => {
    if (!catId) return { parentId: '', subId: '' };
    for (const top of categories) {
        if (top.id === catId) return { parentId: top.id, subId: '' };
        const sub = (top.subCategories ?? []).find((s) => s.id === catId);
        if (sub) return { parentId: top.id, subId: sub.id };
    }
    return { parentId: '', subId: '' };
};

// Sentinel for the "Directly under <parent>" sub-category choice (persisted as the
// parent id, i.e. an empty sub id) — avoids FieldSelect's empty-string clearing quirk.
const DIRECT_UNDER = '__direct__';

// Category + Sub Category selects mirroring the /schemas "Model Profile" dialog: pick a
// top-level category, then (only when it has children) an optional sub-category. The
// persisted value is `subCategoryId || categoryId`.
const CategoryFields = ({
    categories,
    categoryId,
    subCategoryId,
    onCategoryChange,
    onSubCategoryChange,
}: {
    categories: SchemaCategory[];
    categoryId: string;
    subCategoryId: string;
    onCategoryChange: (id: string) => void;
    onSubCategoryChange: (id: string) => void;
}) => {
    const { t } = useTranslation();
    const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
    const subCategories = selectedCategory?.subCategories ?? [];
    const hasSubCategories = subCategories.length > 0;

    return (
        <>
            <div style={{ width: '100%' }}>
                <Typography variant="BodyBold" style={{ marginBottom: '6px' }}>
                    {`${t('ai_document_ai_category')}*`}
                </Typography>
                <FieldSelect
                    fullWidth
                    placeholder={t('ai_document_ai_select_category')}
                    queryKey={['doc_ai_cat_top', categories.length]}
                    request={async () => categories.map((c) => ({ text: c.name, value: c.id }))}
                    value={categoryId}
                    onChange={(val?: string) => {
                        onCategoryChange(val || '');
                        onSubCategoryChange('');
                    }}
                />
            </div>
            {hasSubCategories && (
                <div style={{ width: '100%' }}>
                    <Typography variant="BodyBold" style={{ marginBottom: '6px' }}>
                        {t('schema_sub_category', 'Sub Category')}
                    </Typography>
                    <FieldSelect
                        fullWidth
                        queryKey={['doc_ai_cat_sub', categoryId, subCategories.length]}
                        request={async () => [
                            {
                                text: t('schema_sub_category_direct_parent', 'Directly under {{name}}', {
                                    name: selectedCategory?.name ?? '',
                                }),
                                value: DIRECT_UNDER,
                            },
                            ...subCategories.map((s) => ({ text: s.name, value: s.id })),
                        ]}
                        value={subCategoryId || DIRECT_UNDER}
                        onChange={(val?: string) => onSubCategoryChange(val === DIRECT_UNDER ? '' : val || '')}
                    />
                </div>
            )}
        </>
    );
};

interface LinkageStepProps {
    formMethods: UseFormReturn<DocumentAIFormType>;
    isEditMode: boolean;
    linkageView: LinkageView;
    setLinkageView: (view: LinkageView) => void;
    // Confirm + unlink a linked schema (defers backend delete to Save). Owned by the
    // form hook so the sidebar "X" and this overview's trash icon behave identically.
    onRemoveSchema: (index: number) => void;
}

const LinkageStep = ({ formMethods, linkageView, setLinkageView, onRemoveSchema }: LinkageStepProps) => {
    const { t } = useTranslation();
    const { watch, setValue, getValues } = formMethods;
    const { notify } = useNotify();
    const queryClient = useQueryClient();
    const [{ dialog }, dialogHolder] = useDialog();

    const linkedSchemas = (watch('linked_schemas') as LinkedSchema[]) || [];

    // View state is owned by the form hook so the wizard footer can drive "back".
    const view = linkageView;
    const setView = setLinkageView;
    const [draftFields, setDraftFields] = useState<SchemaAttribute[]>([emptyAttribute()]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [draftSource, setDraftSource] = useState<LinkedSchema['source']>('manual');
    // An existing Document Model the backend matched to the uploaded sample. Holds the
    // fetched schema (for linking) + its canonical fields (for preview) + match %.
    const [detectedMatch, setDetectedMatch] = useState<{
        schema: any;
        matchPercent: number;
        fields: SchemaAttribute[];
    } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
    const [sampleCount, setSampleCount] = useState(0);
    // ----- /schemas data layer (shared react-query cache with the BoardSchema route) -----
    const categoriesQuery = useSchemaCategories({ type: 'schema' });
    // Data Board categories (`type:'databoard'`) — drives the "Edit Data Board" dialog's
    // Category select, mirroring the /databoards Board Profile dialog.
    const databoardCategoriesQuery = useDataboardCategories();
    const schemasQuery = useSchemas({ limit: 200 });
    const createMut = useCreateSchema();
    const updateMut = useUpdateSchema();

    const existingSchemas = schemasQuery.data ?? [];
    const isLoadingSchemas = schemasQuery.isFetching;

    // A linked model is "synced" when its persisted schema already feeds agents or Data
    // Boards — editing it then propagates in real-time, and changing a field's AI Logic
    // (type) would break the linked Data Board columns. A freshly-built or not-yet-linked
    // model has no such links, so it stays freely editable and shows no sync warning.
    const getSchemaSyncState = useCallback(
        (ls: LinkedSchema) => {
            const src = ls.schema_id
                ? existingSchemas.find((s: any) => (s._id || s.id) === ls.schema_id)
                : undefined;
            const agentCount = (src?.agent_ids ?? []).length;
            const boardCount = (src?.databoard_ids ?? []).length;
            return { agentCount, boardCount, isSynced: agentCount > 0 || boardCount > 0 };
        },
        [existingSchemas],
    );

    const schemaCategoryTree = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
    const databoardCategoryTree = useMemo(
        () => databoardCategoriesQuery.data ?? [],
        [databoardCategoriesQuery.data],
    );

    // All existing Data Boards in the org — used to flag a linked model whose board
    // name collides with an already-existing board (or another linked model here).
    const boardsQuery = useBoards({ includeAll: true });
    const existingBoards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data]);

    // Thin wrapper over the shared `isBoardNameTaken` rule, binding this view's board
    // list + linked models. Used for the overview warning and the dialog's Save block.
    const isDuplicateBoardName = useCallback(
        (name: string, opts: { excludeBoardId?: string; excludeIndex?: number } = {}): boolean =>
            isBoardNameTaken(name, { existingBoards, linkedSchemas, ...opts }),
        [existingBoards, linkedSchemas],
    );
    // Flattened categories for the Save Schema dropdown ("Parent / Child" paths).
    const schemaCategoryOptions = useMemo(
        () => flattenCategoryTree(categoriesQuery.data ?? []),
        [categoriesQuery.data],
    );

    const [listCategory, setListCategory] = useState<string>('all');
    const [listSearch, setListSearch] = useState('');
    // Inline edit on a linked card (overview): which index is expanded + working fields
    const [inlineEditIndex, setInlineEditIndex] = useState<number | null>(null);
    const [inlineEditFields, setInlineEditFields] = useState<SchemaAttribute[]>([]);
    // Snapshot of the fields as they were when inline edit opened — compared against the
    // live fields to detect real changes (the live copy carries an extra `lock_type` flag,
    // so we must diff against this baseline, not the original schema's stored fields).
    const [inlineEditBaseline, setInlineEditBaseline] = useState<string>('');
    const [isSavingSchema, setIsSavingSchema] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fieldTypeOptions = useMemo(
        () => FieldTypesOptions(t).map((o) => ({ text: o.text, value: o.value, icon: o.icon })),
        [t],
    );

    const commitSchemas = useCallback(
        // `dirty` defaults to true (marks the agent form unsaved → enables SAVE). Pass
        // false when the change was already persisted to the backend directly (e.g. editing
        // an existing board via the board API) so the agent SAVE button doesn't light up.
        (next: LinkedSchema[], opts?: { dirty?: boolean }) => {
            setValue('linked_schemas', next, { shouldDirty: opts?.dirty ?? true, shouldValidate: true });
        },
        [setValue],
    );

    // ---- file upload + auto-detection ----
    // Uses the Data Board upload (same endpoint as the /schemas auto-extract flow), which
    // returns an array of { name, url, key }. The file field is appended with an empty
    // name to match how the backend parses the multipart body.
    const uploadFile = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('', file);
        const { data } = await apiFetch<{ url: string }[]>(
            postBoardUpload.api,
            postBoardUpload.method,
            formData,
            ImbraceFileUpload,
        );
        return data?.[0]?.url || '';
    };

    const handleUploadSamples = async (files: File[]) => {
        if (!files.length) return;
        const vlmProvider = getValues('vlm_provider_id');
        const vlmModel = getValues('vlm_model');
        if (!vlmProvider || !vlmModel) {
            notify({ message: t('ai_document_ai_vlm_required'), type: 'error' });
            return;
        }
        try {
            setIsUploading(true);
            const urls: string[] = [];
            for (const file of files) {
                urls.push(await uploadFile(file));
            }
            const allUrls = [...uploadedUrls, ...urls];
            setUploadedUrls(allUrls);
            setSampleCount((c) => c + files.length);

            setIsUploading(false);
            setIsAnalyzing(true);
            // Same AI extraction the /schemas route uses: POST { file_urls } →
            // { attributes, similar_schema? }. Reuse the converter to map the detected
            // attributes into the form shape; clear field_id (freshly-detected).
            const { data } = await apiFetch<{
                attributes?: any[];
                similar_schema?: { schema_id?: string; schema_name?: string; match_percent?: number };
            }>(postSchemaExtractAttributes.api(), postSchemaExtractAttributes.method, {
                file_urls: allUrls,
                // Drive extraction with the agent's selected VLM (Image Analyze) provider/model.
                provider_id: vlmProvider,
                model_name: vlmModel,
            });
            const extracted = docSchemaAttributesToFields(data?.attributes || []).map((f) => ({
                ...f,
                field_id: '',
            }));
            const newFields: SchemaAttribute[] = extracted.length ? extracted : [emptyAttribute()];

            setDraftSource('auto');
            setEditingIndex(null);
            setDraftFields(newFields);

            // If the backend matched an existing Document Model, fetch it so we can preview
            // its canonical attributes and let the user link it directly.
            const similar = data?.similar_schema;
            let match: { schema: any; matchPercent: number; fields: SchemaAttribute[] } | null = null;
            if (similar?.schema_id && (similar.match_percent ?? 0) >= SCHEMA_MATCH_MIN_PERCENT) {
                try {
                    const res = await apiFetch<any>(getSchemaById.api(similar.schema_id), getSchemaById.method);
                    const schema = res?.data?.data ?? res?.data;
                    if (schema) {
                        match = {
                            schema,
                            matchPercent: similar.match_percent ?? 0,
                            fields: docSchemaAttributesToFields(schema.attributes || []),
                        };
                    }
                } catch {
                    match = null;
                }
            }
            setDetectedMatch(match);
            setView('detected');
        } catch (error) {
            notify({
                message: getApiErrorMessage(error) ?? t('error_something_went_wrong'),
                type: 'error',
            });
        } finally {
            setIsUploading(false);
            setIsAnalyzing(false);
        }
    };

    const onFilesPicked = (files: File[]) => {
        if (!files.length) return;
        if (sampleCount + files.length > 5) {
            notify({ message: t('ai_document_ai_upload_max'), type: 'warning' });
            return;
        }
        handleUploadSamples(files.slice(0, 5));
    };

    // ---- navigation ----
    const goChoose = () => {
        setEditingIndex(null);
        setDraftFields([emptyAttribute()]);
        setDetectedMatch(null);
        setUploadedUrls([]);
        setSampleCount(0);
        setView('choose');
    };

    const chooseMode = (mode: 'auto' | 'list' | 'manual') => {
        if (mode === 'auto') {
            setView('auto-upload');
        } else if (mode === 'list') {
            schemasQuery.refetch();
            setView('select-list');
        } else {
            setDraftSource('manual');
            setEditingIndex(null);
            setDraftFields([emptyAttribute()]);
            setView('editing');
        }
    };

    const enterInlineEdit = (index: number) => {
        const schema = linkedSchemas[index];
        if (!schema) return;
        // Mark the schema's current fields as pre-existing so their AI Logic (type)
        // is locked during inline edit — only newly-added attributes stay editable.
        const initial = schema.fields.length
            ? schema.fields.map((f) => ({ ...f, lock_type: true }))
            : [emptyAttribute()];
        setInlineEditFields(initial);
        setInlineEditBaseline(JSON.stringify(initial));
        setInlineEditIndex(index);
    };

    const confirmDiscardChanges = (onProceed: () => void) => {
        dialog({
            title: t('ai_document_ai_discard_changes_title'),
            content: t('ai_document_ai_discard_changes_desc'),
            confirmText: t('discard'),
            cancelText: t('cancel'),
            onConfirm: async () => {
                onProceed();
                return true;
            },
        });
    };

    const editSchema = (index: number) => {
        if (inlineEditIndex !== null && inlineEditIndex !== index) {
            const hasChanges = JSON.stringify(inlineEditFields) !== inlineEditBaseline;
            if (hasChanges) {
                confirmDiscardChanges(() => enterInlineEdit(index));
                return;
            }
        }
        enterInlineEdit(index);
    };

    const saveInlineEdit = async () => {
        if (inlineEditIndex === null) return;
        const validFields = inlineEditFields.filter((f) => f.field_name.trim() && f.type);
        if (!validFields.length) {
            notify({ message: t('ai_document_ai_schema_required'), type: 'error' });
            return;
        }
        const target = linkedSchemas[inlineEditIndex];
        // PUT replaces the full `attributes[]` per the API contract. Any linked model
        // backed by a persisted schema (manual OR selected from the list) is a real
        // Document Model, so editing it must update the schema on the backend.
        if (target?.schema_id) {
            try {
                setIsSavingSchema(true);
                await updateMut.mutateAsync({
                    id: target.schema_id,
                    body: { attributes: attributesToDocSchemaPayload(validFields) },
                });
            } catch (error) {
                notify({
                    message: getApiErrorMessage(error) ?? t('error_something_went_wrong'),
                    type: 'error',
                });
                setIsSavingSchema(false);
                return;
            } finally {
                setIsSavingSchema(false);
            }
        }
        const next = [...linkedSchemas];
        next[inlineEditIndex] = { ...next[inlineEditIndex], fields: validFields };
        // A persisted schema (schema_id) was just updated via the schema API, and the agent
        // payload doesn't carry attributes — so this edit is already saved; don't dirty the
        // agent form. An unpersisted schema (no schema_id) still needs the agent SAVE.
        commitSchemas(next, { dirty: !target?.schema_id });
        notify({ message: t('ai_document_ai_schema_saved'), type: 'success' });
        setInlineEditIndex(null);
        setInlineEditFields([]);
        setInlineEditBaseline('');
    };

    const cancelInlineEdit = () => {
        if (inlineEditIndex === null) return;
        const close = () => {
            setInlineEditIndex(null);
            setInlineEditFields([]);
            setInlineEditBaseline('');
        };
        // Only warn about discarding when the user actually changed something
        // (edited an existing field or added/removed an attribute). Diff against the
        // baseline captured on open, not the stored fields — the live copy adds lock_type.
        const hasChanges = JSON.stringify(inlineEditFields) !== inlineEditBaseline;
        if (hasChanges) {
            confirmDiscardChanges(close);
        } else {
            close();
        }
    };

    const linkExistingSchema = (schema: any) => {
        const schemaId: string = schema?._id || schema?.id || '';
        // Don't link the same Document Model twice — warn instead.
        if (schemaId && linkedSchemas.some((s) => s.schema_id === schemaId)) {
            notify({
                message: t('ai_document_ai_schema_already_linked', 'This model is already linked'),
                type: 'warning',
            });
            return;
        }
        const fields = docSchemaAttributesToFields(schema?.attributes || []);
        // Don't prefill board_id from the schema's databoard_ids — those belong to OTHER
        // agents that linked this schema. THIS agent has no board for it until it's saved
        // (provisioned). Leaving board_id empty keeps the overview showing "will be created"
        // and makes Save provision a fresh board for this agent.
        const linked = createEmptyLinkedSchema({
            schema_id: schemaId,
            model_name: schema?.name || '',
            board_id: '',
            // Suggested board name follows the "<model name> Records" convention; the user
            // can rename it later via the Edit Data Board dialog.
            data_board_name: defaultDataBoardName(schema?.name || ''),
            category: schema?.category_id || '',
            source: 'list',
            is_existing: false,
            fields,
        });
        commitSchemas([...linkedSchemas, linked]);
        setView('overview');
    };

    // ---- schema card stat helpers ----
    const getSchemaCategoryLabel = (s: any): string => {
        const id = s?.category_id;
        if (!id) return t('ai_document_ai_uncategorized', 'Others');
        return schemaCategoryOptions.find((o) => o.value === id)?.text || t('ai_document_ai_uncategorized', 'Others');
    };
    const getSchemaAttrCount = (s: any): number => (s?.attributes || []).length;
    const getSchemaAgentsInUse = (s: any): number => (s?.agent_ids || []).length;

    // ---- model preview modal (Select from List) ----
    const openModelPreviewModal = (schema: any) => {
        const fields = docSchemaAttributesToFields(schema?.attributes || []);
        dialog({
            title: '',
            hideCancelButton: true,
            hideConfirmButton: true,
            paperSx: {
                maxWidth: '880px',
                width: '880px',
                padding: '20px 24px 16px',
                // Collapse the empty title/header strip imbrace adds so the
                // content sits flush against the top padding.
                '& > :first-of-type': { padding: 0, minHeight: 0 },
            },
            content: ({ onClose }: { onClose?: () => void }) => (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '460px' }}>
                    <Typography className={styles.modalTitle}>
                        {`${t('ai_document_ai_model')}: `}
                        <b>{schema?.name}</b>
                    </Typography>
                    {renderSchemaTable(fields, () => {}, false)}
                    <div className={styles.actionsRow} style={{ marginTop: 'auto', paddingTop: '16px' }}>
                        <Button
                            type="primary"
                            text={t('ai_document_ai_confirm_and_link')}
                            onClick={() => {
                                linkExistingSchema(schema);
                                onClose?.();
                            }}
                            sx={{ textTransform: 'uppercase', minWidth: '180px', height: '40px', fontWeight: 700 }}
                        />
                        <Button variant="outlined" text={t('cancel')} onClick={() => onClose?.()} />
                    </div>
                </div>
            ),
        });
    };

    // ---- save schema modal ----
    const openSaveSchemaModal = (fields: SchemaAttribute[], source: LinkedSchema['source']) => {
        const validFields = fields.filter((f) => f.field_name.trim() && f.type);
        if (!validFields.length) {
            notify({ message: t('ai_document_ai_schema_required'), type: 'error' });
            return;
        }

        const SaveSchemaContent = ({ onClose }: { onClose?: () => void }) => {
            const isEditing = editingIndex !== null;
            const existing = isEditing ? linkedSchemas[editingIndex as number] : undefined;
            const initialCat = findCategoryParent(existing?.category, schemaCategoryTree);
            const [modelName, setModelName] = useState(existing?.model_name || '');
            const [categoryId, setCategoryId] = useState(initialCat.parentId);
            const [subCategoryId, setSubCategoryId] = useState(initialCat.subId);
            // Sub id wins when set; otherwise the top-level category id is the stored value.
            const category = subCategoryId || categoryId;

            const nameConflict = useSchemaNameConflict(modelName, { excludeId: existing?.schema_id });

            const canSave = !!modelName.trim() && !!categoryId && !isSavingSchema && !nameConflict;

            const handleSave = async () => {
                if (!canSave) return;
                const dataBoardName = existing?.data_board_name?.trim()
                    ? existing.data_board_name
                    : defaultDataBoardName(modelName);

                // Persist freshly-built schemas to backend via /api/schemas so they become
                // reusable templates. This covers both 'manual' (hand-built) and 'auto'
                // (attributes detected by extract-attributes with no matching existing model).
                // 'list' never reaches here — it links an existing schema via linkExistingSchema.
                let persistedSchemaId = existing?.schema_id;
                if (source === 'manual' || source === 'auto') {
                    try {
                        setIsSavingSchema(true);
                        const attributes = attributesToDocSchemaPayload(validFields);
                        if (isEditing && existing?.schema_id) {
                            await updateMut.mutateAsync({
                                id: existing.schema_id,
                                body: {
                                    name: modelName.trim(),
                                    category: category || null,
                                    attributes,
                                },
                            });
                        } else {
                            const created = await createMut.mutateAsync({
                                name: modelName.trim(),
                                category: category || null,
                                agents: [],
                                databoards: [],
                                attributes,
                            });
                            persistedSchemaId = created?._id || created?.id;
                        }
                    } catch (error) {
                        notify({
                            message: getApiErrorMessage(error) ?? t('error_something_went_wrong'),
                            type: 'error',
                        });
                        setIsSavingSchema(false);
                        return;
                    } finally {
                        setIsSavingSchema(false);
                    }
                }

                const schema: LinkedSchema = {
                    local_id: existing?.local_id || createLocalId(),
                    schema_id: persistedSchemaId,
                    model_name: modelName.trim(),
                    board_id: existing?.board_id || '',
                    data_board_name: dataBoardName,
                    category,
                    deployment_access: existing?.deployment_access || 'all_teams',
                    source,
                    is_existing: false,
                    fields: validFields,
                };
                const next = [...linkedSchemas];
                if (isEditing) next[editingIndex as number] = schema;
                else next.push(schema);
                commitSchemas(next);
                notify({ message: t('ai_document_ai_schema_saved'), type: 'success' });
                onClose?.();
                setView('overview');
            };

            return (
                <Space direction="vertical" style={{ width: '100%', gap: '16px' }} align="start">
                    <div style={{ width: '100%' }}>
                        <Typography variant="BodyBold" style={{ marginBottom: '6px' }}>
                            {`${t('ai_document_ai_document_model_name')}*`}
                        </Typography>
                        <FieldText fullWidth value={modelName} onChange={(e: any) => setModelName(e.target.value)} />
                        {nameConflict && (
                            <Typography
                                variant="Body"
                                style={{ color: 'var(--color-danger-1)', fontSize: 12, marginTop: 4 }}
                            >
                                {t('schema_name_duplicated', 'A schema named "{{name}}" already exists', {
                                    name: nameConflict.name,
                                })}
                            </Typography>
                        )}
                    </div>
                    <CategoryFields
                        categories={schemaCategoryTree}
                        categoryId={categoryId}
                        subCategoryId={subCategoryId}
                        onCategoryChange={setCategoryId}
                        onSubCategoryChange={setSubCategoryId}
                    />
                    <Space justify="end" style={{ width: '100%', marginTop: '32px' }}>
                        <Button
                            type="primary"
                            text={t('ai_document_ai_save_and_link')}
                            loading={isSavingSchema}
                            disabled={!canSave}
                            onClick={handleSave}
                            sx={{ textTransform: 'uppercase', minWidth: '180px', height: '40px', fontWeight: 700 }}
                        />
                    </Space>
                </Space>
            );
        };

        dialog({
            title: t('ai_document_ai_save_schema'),
            content: ({ onClose }: { onClose?: () => void }) => <SaveSchemaContent onClose={onClose} />,
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            paperSx: { maxWidth: '460px', width: '460px', padding: '24px 28px' },
        });
    };

    // ---- Edit Data Board dialog (board-only: Board Name + board Category)
    // Edits the Data Board that will be provisioned for this linked model. Category uses the
    // `type:'databoard'` categories (mirroring the /databoards Board Profile dialog). Nothing
    // persists here — the values are committed into the form and applied to the board when the
    // agent is saved (provisioned). Boards are provisioned with no team access restriction.
    const openEditDataBoardModal = (index: number) => {
        const existing = linkedSchemas[index];
        if (!existing) return;

        const EditDataBoardContent = ({ onClose }: { onClose?: () => void }) => {
            const hasCategories = databoardCategoryTree.length > 0;
            // The backend auto-creates a top-level "Doc Agent" databoard category as the
            // default home for provisioned boards. Once it exists it shows up here, so
            // default-select it (when the board has no explicit category yet) to match that
            // backend default; the user can still pick another. When no categories exist at
            // all (Doc Agent not provisioned yet) the field is shown disabled below.
            const docAgentCategory = databoardCategoryTree.find((c) => c.name === DOC_AGENT_BOARD_CATEGORY);
            const initialCat = existing.board_category_id
                ? findCategoryParent(existing.board_category_id, databoardCategoryTree)
                : { parentId: docAgentCategory?.id ?? '', subId: '' };
            const [dataBoardName, setDataBoardName] = useState(existing.data_board_name || '');
            const [categoryId, setCategoryId] = useState(initialCat.parentId);
            const [subCategoryId, setSubCategoryId] = useState(initialCat.subId);
            // Sub id wins when set; otherwise the top-level category id is the stored value.
            const boardCategory = subCategoryId || categoryId;

            // Warn (don't block) when the typed board name collides with an existing board
            // or another linked model. Excludes this model's own board/index.
            const nameDuplicate = isDuplicateBoardName(dataBoardName, {
                excludeBoardId: existing.board_id,
                excludeIndex: index,
            });

            // Block save on a duplicate board name (not just warn) so a collision can't be
            // committed into the form.
            const canSave = !!dataBoardName.trim() && !nameDuplicate && !isSavingSchema;

            const handleSave = async () => {
                if (!canSave) return;
                // Empty when no categories exist → backend falls back to the "Doc Agent" category.
                const nextCategory = hasCategories ? boardCategory : '';

                // When the board already exists (provisioned for this agent), persist the
                // settings to the board immediately via the board API. `category` maps to
                // category_id. New boards (no board_id) get these values when the agent is
                // saved (provisioned).
                if (existing.board_id) {
                    try {
                        setIsSavingSchema(true);
                        // Only send `category` when one is chosen — an empty value means "leave
                        // as-is" (don't clobber the board's current category with null).
                        const body: { name: string; category?: string } = {
                            name: dataBoardName.trim(),
                        };
                        if (nextCategory) body.category = nextCategory;
                        await apiFetch(
                            updateBoardById.api(existing.board_id),
                            updateBoardById.method,
                            body,
                            ImbraceClient,
                        );
                        queryClient.invalidateQueries({ queryKey: ['boards'] });
                    } catch (error) {
                        notify({
                            message: getApiErrorMessage(error) ?? t('error_something_went_wrong'),
                            type: 'error',
                        });
                        setIsSavingSchema(false);
                        return;
                    } finally {
                        setIsSavingSchema(false);
                    }
                }

                const next = [...linkedSchemas];
                next[index] = {
                    ...next[index],
                    data_board_name: dataBoardName.trim(),
                    board_category_id: nextCategory,
                };
                // An already-existing board was just persisted via the board API, so this
                // edit is already saved — don't dirty the agent form. A not-yet-provisioned
                // board (no board_id) still needs the agent SAVE to provision it → keep dirty.
                commitSchemas(next, { dirty: !existing.board_id });
                notify({ message: t('ai_document_ai_data_board_saved', 'Data Board saved'), type: 'success' });
                onClose?.();
            };

            return (
                <Space direction="vertical" style={{ width: '100%', gap: '16px' }} align="start">
                    <div style={{ width: '100%' }}>
                        <Typography variant="BodyBold" style={{ marginBottom: '6px' }}>
                            {`${t('ai_document_ai_board_name', 'Board Name')}*`}
                        </Typography>
                        <FieldText
                            fullWidth
                            value={dataBoardName}
                            onChange={(e: any) => setDataBoardName(e.target.value)}
                        />
                        {nameDuplicate && (
                            <Space align="center" style={{ gap: '6px', marginTop: '6px' }}>
                                <WarningAmberRoundedIcon style={{ fontSize: 16, color: '#FA9917' }} />
                                <Typography variant="Body" style={{ color: '#FA9917', fontSize: '12px' }}>
                                    {t('ai_document_ai_board_name_duplicate', 'A Data Board with this name already exists')}
                                </Typography>
                            </Space>
                        )}
                    </div>
                    {hasCategories ? (
                        <CategoryFields
                            categories={databoardCategoryTree}
                            categoryId={categoryId}
                            subCategoryId={subCategoryId}
                            onCategoryChange={setCategoryId}
                            onSubCategoryChange={setSubCategoryId}
                        />
                    ) : (
                        // No board categories yet → the board lands in the auto-created
                        // "Doc Agent" category. Shown disabled so the user understands the default.
                        <div style={{ width: '100%' }}>
                            <Typography variant="BodyBold" style={{ marginBottom: '6px' }}>
                                {`${t('ai_document_ai_category')}*`}
                            </Typography>
                            <FieldText
                                fullWidth
                                disabled
                                value={t('ai_document_ai_doc_agent_category', 'Doc Agent')}
                            />
                        </div>
                    )}
                    <Space justify="end" style={{ width: '100%', marginTop: '32px' }}>
                        <Button
                            type="primary"
                            text={t('ai_document_ai_save_and_link')}
                            loading={isSavingSchema}
                            disabled={!canSave}
                            onClick={handleSave}
                            sx={{ textTransform: 'uppercase', minWidth: '180px', height: '40px', fontWeight: 700 }}
                        />
                    </Space>
                </Space>
            );
        };

        dialog({
            title: t('ai_document_ai_edit_data_board', 'Edit Data Board'),
            content: ({ onClose }: { onClose?: () => void }) => <EditDataBoardContent onClose={onClose} />,
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            paperSx: { maxWidth: '460px', width: '460px', padding: '24px 28px' },
        });
    };

    // ---- TableInTable detail dialog ----
    // Rich editor (ported from the sandbox flow): edit the parent field's name +
    // description + the nested table structure, with an auto-generated Sample Data
    // preview on the right. Save writes back into the parent attribute row.
    const openTableInTableDialog = (
        rowIndex: number,
        fields: SchemaAttribute[],
        setFields: (f: SchemaAttribute[]) => void,
    ) => {
        const current = fields[rowIndex];
        const saveRef: { current: (() => void) | null } = { current: null };

        const TableInTableContent = () => {
            const [innerFieldName, setInnerFieldName] = useState(current?.field_name || '');
            const [innerDesc, setInnerDesc] = useState(current?.description || '');
            const [innerSubFields, setInnerSubFields] = useState<SchemaSubField[]>(
                current?.sub_fields?.length
                    ? current.sub_fields.map((s) => ({ ...s }))
                    : [{ field_id: '', field_name: '', type: '' }],
            );
            const innerFieldTypeOpts = useMemo(
                () => fieldTypeOptions.filter((o) => o.value !== 'TableInTable'),
                [],
            );
            const validSub = innerSubFields.filter((sf) => sf.field_name.trim() && sf.type);
            const sampleRows = useMemo(() => {
                const valid = innerSubFields.filter((sf) => sf.field_name.trim() && sf.type);
                if (!valid.length) return [];
                return Array.from({ length: 3 }, () => {
                    const row: Record<string, string> = {};
                    valid.forEach((sf) => {
                        row[sf.field_name] = getSampleDataForType(sf.type);
                    });
                    return row;
                });
            }, [innerSubFields]);

            // Expose the commit fn so the dialog's footer Save can call it.
            useEffect(() => {
                saveRef.current = () => {
                    const validSubFields = innerSubFields.filter((sf) => sf.field_name.trim());
                    const next = [...fields];
                    next[rowIndex] = {
                        ...next[rowIndex],
                        field_name: innerFieldName,
                        description: innerDesc,
                        sub_fields: validSubFields,
                        sample_data: validSubFields.length
                            ? `${sampleRows.length} Items — ${validSubFields.map((sf) => sf.field_name).join(', ')}`
                            : '',
                    };
                    setFields(next);
                };
            });

            return (
                <div style={{ display: 'flex', gap: '24px' }}>
                    {/* Left: field config */}
                    <div style={{ flex: 1, borderRight: '1px dashed #3399FC', paddingRight: '24px' }}>
                        <Typography variant="BodyBold" style={{ marginBottom: '8px' }}>
                            {t('ai_document_ai_field_name')}
                        </Typography>
                        <FieldText
                            fullWidth
                            value={innerFieldName}
                            onChange={(e: any) => setInnerFieldName(e.target.value)}
                        />

                        <Typography variant="BodyBold" style={{ marginTop: '16px', marginBottom: '8px' }}>
                            {t('ai_document_ai_field_type')}
                        </Typography>
                        <Space align="center" style={{ gap: '8px' }}>
                            {FieldTypeIcon('TableInTable' as any, { fontSize: 20, color: 'var(--color-light-5)' })}
                            <Typography variant="Body">{t('databoard_table_in_table')}</Typography>
                        </Space>

                        <Typography variant="BodyBold" style={{ marginTop: '16px', marginBottom: '8px' }}>
                            {t('ai_document_ai_field_description')}
                        </Typography>
                        <FieldText
                            fullWidth
                            multiline
                            rows={4}
                            value={innerDesc}
                            onChange={(e: any) => setInnerDesc(e.target.value)}
                        />

                        <Typography variant="BodyBold" style={{ marginTop: '24px', marginBottom: '12px' }}>
                            {t('ai_document_ai_table_structure', 'Table Structure')}
                        </Typography>
                        <div>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    backgroundColor: '#E8F0FE',
                                    minHeight: '40px',
                                    alignItems: 'center',
                                    borderRadius: '4px 4px 0 0',
                                }}
                            >
                                <Typography style={{ fontWeight: 600, fontSize: '13px', padding: '0 12px' }}>
                                    {t('ai_document_ai_field_name')}
                                </Typography>
                                <Typography style={{ fontWeight: 600, fontSize: '13px', padding: '0 8px' }}>
                                    {t('ai_document_ai_field_type')}
                                </Typography>
                            </div>
                            {innerSubFields.map((sf, si) => (
                                <div
                                    key={si}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        minHeight: '48px',
                                        alignItems: 'center',
                                        borderBottom: '1px dashed #E0E0E0',
                                    }}
                                >
                                    <div style={{ padding: '4px 8px' }}>
                                        <FieldText
                                            fullWidth
                                            size="small"
                                            value={sf.field_name}
                                            onChange={(e: any) => {
                                                const updated = [...innerSubFields];
                                                updated[si] = { ...updated[si], field_name: e.target.value };
                                                setInnerSubFields(updated);
                                            }}
                                        />
                                    </div>
                                    <Space style={{ padding: '4px 8px', gap: '4px' }} align="center">
                                        {sf.type && FieldTypeIcon(sf.type as any, { fontSize: 20, color: 'var(--color-light-5)' })}
                                        <FieldSelect
                                            fullWidth
                                            queryKey={['tit_sub_type', si]}
                                            request={async () => innerFieldTypeOpts.map((o) => ({ text: o.text, value: o.value }))}
                                            value={sf.type}
                                            onChange={(val?: string) => {
                                                const updated = [...innerSubFields];
                                                updated[si] = { ...updated[si], type: val || '' };
                                                setInnerSubFields(updated);
                                            }}
                                        />
                                    </Space>
                                </div>
                            ))}
                            <Button
                                variant="text"
                                text={`+ ${t('ai_document_ai_add_field', 'Add Field')}`}
                                onClick={() =>
                                    setInnerSubFields([...innerSubFields, { field_id: '', field_name: '', type: '' }])
                                }
                                sx={{ marginTop: '4px' }}
                            />
                        </div>
                    </div>

                    {/* Right: auto-generated sample data (read-only) */}
                    <div style={{ flex: 1 }}>
                        <Typography variant="BodyBold" style={{ marginBottom: '12px' }}>
                            {t('ai_document_ai_field_sample_data')}
                        </Typography>
                        {validSub.length > 0 && (
                            <div>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    {validSub.map((sf, si) => (
                                        <Typography key={si} variant="BodyBold" style={{ flex: 1, fontSize: '13px' }}>
                                            {sf.field_name}
                                        </Typography>
                                    ))}
                                </div>
                                {sampleRows.map((row, ri) => (
                                    <div key={ri} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        {validSub.map((sf, si) => (
                                            <FieldText key={si} size="small" fullWidth value={row[sf.field_name] || ''} disabled />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        };

        dialog({
            title: '',
            paperSx: { maxWidth: '80vw', width: '80vw', padding: '24px' },
            content: () => <TableInTableContent />,
            hideConfirmButton: false,
            hideCancelButton: true,
            showCloseButton: true,
            confirmText: t('save'),
            onConfirm: async () => {
                saveRef.current?.();
                return true;
            },
        });
    };

    // ---- editable schema table ----
    // `lockType` locks the AI Logic (type) ONLY for attributes that already existed
    // when the schema was opened for edit (flagged `lock_type`, or carrying a backend
    // `field_id`) — changing their type would break the synced Data Board columns.
    // Newly-added attributes carry neither marker, so their type stays editable.
    const renderSchemaTable = (
        fields: SchemaAttribute[],
        setFields: (f: SchemaAttribute[]) => void,
        editable: boolean,
        lockType = false,
    ) => {
        const updateRow = (index: number, patch: Partial<SchemaAttribute>) => {
            const next = [...fields];
            next[index] = { ...next[index], ...patch };
            setFields(next);
        };
        return (
            <div className={`${styles.table} ${editable ? styles.editable : styles.readonly}`}>
                <div className={styles.tableHead}>
                    <span />
                    <Typography variant="BodyBold">{t('ai_document_ai_attribute_name')}</Typography>
                    <Typography variant="BodyBold">{t('ai_document_ai_ai_logic')}</Typography>
                    <Typography variant="BodyBold">{t('ai_document_ai_extraction_prompt')}</Typography>
                    <Typography variant="BodyBold">{t('ai_document_ai_field_sample_data')}</Typography>
                </div>
                {fields.map((row, index) => {
                    const isTit = row.type === 'TableInTable';
                    // Existing fields of a Data-Board-synced model keep their AI Logic locked
                    // (changing the type would break the board columns). Newly-added rows have
                    // no marker, so they stay editable.
                    const typeLockedBySync = lockType && (!!row.lock_type || !!row.field_id);
                    const typeSelect = (
                        <FieldSelect
                            fullWidth
                            disabled={!editable || typeLockedBySync}
                            queryKey={['attr_type', index]}
                            request={async () => fieldTypeOptions}
                            value={row.type}
                            renderValue={(val) =>
                                val ? FieldTypeIcon(val as any, { fontSize: 22, color: 'var(--color-light-5)' }) : null
                            }
                            onChange={(val?: string) => {
                                if (val === 'TableInTable') {
                                    updateRow(index, { type: val, sample_data: '' });
                                    openTableInTableDialog(index, fields, setFields);
                                } else {
                                    updateRow(index, {
                                        type: val || '',
                                        sub_fields: [],
                                        sample_data: getSampleDataForType(val || ''),
                                    });
                                }
                            }}
                            popoverProps={{ slotProps: { paper: { sx: { minWidth: '220px' } } } }}
                        />
                    );
                    return (
                        <div className={styles.tableRow} key={index}>
                            <div className={styles.cell} style={{ display: 'flex', justifyContent: 'center' }}>
                                {editable && (
                                    <IconButton
                                        size="small"
                                        disabled={fields.length <= 1}
                                        onClick={() => setFields(fields.filter((_, i) => i !== index))}
                                        sx={{ color: '#EE7D7D' }}
                                    >
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </div>
                            <div className={styles.cell}>
                                <FieldText
                                    fullWidth
                                    size="small"
                                    disabled={!editable}
                                    value={row.field_name}
                                    onChange={(e: any) => updateRow(index, { field_name: e.target.value })}
                                />
                            </div>
                            <div className={styles.cell}>
                                {editable && typeLockedBySync ? (
                                    <Tooltip
                                        title={t(
                                            'ai_document_ai_type_locked_databoard',
                                            'AI Logic cannot be changed while this model is synced with a Data Board.',
                                        )}
                                        placement="top"
                                        arrow
                                    >
                                        {/* span wrapper: a disabled select doesn't fire hover events on its own */}
                                        <span style={{ display: 'block', width: '100%' }}>{typeSelect}</span>
                                    </Tooltip>
                                ) : (
                                    typeSelect
                                )}
                            </div>
                            <div className={styles.cell}>
                                <FieldText
                                    fullWidth
                                    size="small"
                                    disabled={!editable}
                                    value={row.description || ''}
                                    onChange={(e: any) => updateRow(index, { description: e.target.value })}
                                />
                            </div>
                            <div className={styles.cell}>
                                <FieldText fullWidth size="small" disabled value={row.sample_data || ''} />
                                {isTit && (
                                    <Typography
                                        variant="Body"
                                        style={{ color: '#156DF2', cursor: 'pointer', fontSize: '12px', marginTop: '4px' }}
                                        onClick={() => openTableInTableDialog(index, fields, setFields)}
                                    >
                                        {t('view_details')}
                                    </Typography>
                                )}
                            </div>
                        </div>
                    );
                })}
                {editable && (
                    <Typography
                        className={styles.addAttrLink}
                        onClick={() => setFields([...fields, emptyAttribute()])}
                    >
                        {`+ ${t('ai_document_ai_add_target_attribute')}`}
                    </Typography>
                )}
            </div>
        );
    };

    // ===== VIEWS =====
    const renderHeader = () => (
        <div className={styles.header}>
            <Typography className={styles.headerTitle}>{t('ai_document_ai_linkage_title')}</Typography>
            <Typography variant="Body" className={styles.headerDesc}>
                {t('ai_document_ai_linkage_desc')}
            </Typography>
        </div>
    );

    const renderChoose = () => (
        <>
            {renderHeader()}
            <div className={styles.modeCards}>
                <div className={styles.modeCard} onClick={() => chooseMode('auto')}>
                    <div className={styles.modeCardText}>
                        <Typography className={styles.modeCardTitle}>
                            {t('ai_document_ai_build_automatically')}
                        </Typography>
                        <Typography variant="Body" className={styles.modeCardDesc}>
                            {t('ai_document_ai_build_automatically_desc')}
                        </Typography>
                    </div>
                </div>
                <div className={styles.modeCard} onClick={() => chooseMode('list')}>
                    <div className={styles.modeCardText}>
                        <Typography className={styles.modeCardTitle}>
                            {t('ai_document_ai_select_from_list')}
                        </Typography>
                        <Typography variant="Body" className={styles.modeCardDesc}>
                            {t('ai_document_ai_select_from_list_desc')}
                        </Typography>
                    </div>
                </div>
                <div className={styles.modeCard} onClick={() => chooseMode('manual')}>
                    <div className={styles.modeCardText}>
                        <Typography className={styles.modeCardTitle}>
                            {t('ai_document_ai_build_manually')}
                        </Typography>
                        <Typography variant="Body" className={styles.modeCardDesc}>
                            {t('ai_document_ai_build_manually_desc')}
                        </Typography>
                    </div>
                </div>
            </div>
        </>
    );

    const renderAutoUpload = () => {
        const busy = isUploading || isAnalyzing;
        return (
            <>
                {renderHeader()}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        onFilesPicked(Array.from(e.target.files || []));
                        e.target.value = '';
                    }}
                />
                <div
                    className={`${styles.uploadZone} ${busy ? styles.busy : ''}`}
                    onClick={() => {
                        if (busy) return;
                        const vlmProvider = getValues('vlm_provider_id');
                        const vlmModel = getValues('vlm_model');
                        if (!vlmProvider || !vlmModel) {
                            notify({ message: t('ai_document_ai_vlm_required'), type: 'error' });
                            return;
                        }
                        fileInputRef.current?.click();
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (busy) return;
                        onFilesPicked(Array.from(e.dataTransfer.files));
                    }}
                >
                    {isUploading ? (
                        <Typography className={styles.uploadTitle}>{t('ai_document_ai_uploading')}</Typography>
                    ) : isAnalyzing ? (
                        <Typography className={styles.uploadTitle}>{t('ai_document_ai_analyzing')}</Typography>
                    ) : (
                        <>
                            <img src={uploadIcon} alt="upload" />
                            <Typography className={styles.uploadTitle}>{t('ai_document_ai_upload_title')}</Typography>
                            <Typography className={styles.uploadDesc}>{t('ai_document_ai_upload_desc')}</Typography>
                            <span
                                className={styles.goBack}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goChoose();
                                }}
                            >
                                {t('ai_document_ai_go_back')}
                            </span>
                        </>
                    )}
                </div>
            </>
        );
    };

    const renderDetected = () => {
        const match = detectedMatch;

        return (
            <>
                {renderHeader()}
                <div className={styles.schemaCard}>
                    {match ? (
                        <>
                            <div>
                                <span className={styles.detectedBadge}>{t('ai_document_ai_existing_model_detected')}</span>
                                <Typography className={styles.matchPct}>
                                    {`${match.matchPercent}% ${t('ai_document_ai_match')}`}
                                </Typography>
                            </div>
                            <Typography variant="Body" style={{ color: '#828282', margin: '8px 0' }}>
                                {t('ai_document_ai_existing_model_hint')}
                            </Typography>
                            <Typography variant="Body" style={{ margin: '4px 0 8px' }}>
                                {`${t('ai_document_ai_model_preview', 'Model Preview')}: `}
                                <b style={{ color: '#156df2' }}>{match.schema?.name}</b>
                            </Typography>
                            {renderSchemaTable(match.fields, () => {}, false)}
                            <div className={styles.actionsRow}>
                                <Button
                                    type="primary"
                                    text={t('ai_document_ai_link_existing_model')}
                                    onClick={() => linkExistingSchema(match.schema)}
                                />
                                <Button
                                    variant="outlined"
                                    text={t('ai_document_ai_duplicate_customize')}
                                    onClick={() => {
                                        setDraftSource('manual');
                                        setEditingIndex(null);
                                        setDraftFields(match.fields.map((f) => ({ ...f, field_id: '' })));
                                        setDetectedMatch(null);
                                        setView('editing');
                                    }}
                                />
                                <Button variant="outlined" text={t('cancel')} onClick={() => setView('auto-upload')} />
                            </div>
                        </>
                    ) : (
                        <>
                            <span className={styles.detectedBadge}>{t('ai_document_ai_detected_schema')}</span>
                            {renderSchemaTable(draftFields, setDraftFields, true)}
                            <div className={styles.actionsRow}>
                                <Button
                                    type="primary"
                                    text={t('confirm')}
                                    onClick={() => openSaveSchemaModal(draftFields, 'auto')}
                                />
                                <Button variant="outlined" text={t('cancel')} onClick={() => setView('auto-upload')} />
                            </div>
                        </>
                    )}
                </div>
            </>
        );
    };

    const renderSelectList = () => {
        // Top-level categories drive the tab strip; each tab matches schemas whose
        // category_id is anywhere in that node's subtree (per /api/schemas categoryId semantics).
        const topLevelNodes = schemaCategoryTree;
        const subtreeIdsByTop = new Map<string, Set<string>>();
        for (const node of topLevelNodes) {
            const id = node?.id || node?._id;
            if (!id) continue;
            subtreeIdsByTop.set(id, new Set(collectCategoryDescendantIds(node)));
        }

        const schemaMatchesTab = (s: any, tab: string) => {
            if (tab === 'all') return true;
            if (tab === '__uncategorized__') return !s?.category_id;
            const subtree = subtreeIdsByTop.get(tab);
            return subtree ? subtree.has(s?.category_id) : false;
        };
        const matchesSearch = (s: any) =>
            !listSearch.trim() || (s?.name || '').toLowerCase().includes(listSearch.trim().toLowerCase());

        // Hide models already linked on this agent (matched by persisted schema id).
        const linkedSchemaIds = new Set(linkedSchemas.map((l) => l.schema_id).filter(Boolean));
        const isAlreadyLinked = (s: any) => linkedSchemaIds.has(s?._id) || linkedSchemaIds.has(s?.id);
        const isSelectable = (s: any) => !isAlreadyLinked(s);

        const filteredSchemas = existingSchemas.filter(
            (s) => isSelectable(s) && schemaMatchesTab(s, listCategory) && matchesSearch(s),
        );
        const tabCount = (tab: string) =>
            existingSchemas.filter((s) => isSelectable(s) && schemaMatchesTab(s, tab)).length;
        const hasUncategorized = existingSchemas.some((s) => isSelectable(s) && !s?.category_id);

        const tabDescriptors: { value: string; label: string }[] = [
            { value: 'all', label: `${t('ai_document_ai_all')} (${tabCount('all')})` },
            ...topLevelNodes
                .map((n) => ({ id: n?.id || n?._id || '', name: n?.name || '' }))
                .filter((n) => !!n.id && tabCount(n.id) > 0)
                .map((n) => ({
                    value: n.id,
                    label: `${n.name} (${tabCount(n.id)})`,
                })),
            ...(hasUncategorized
                ? [{ value: '__uncategorized__', label: `${t('ai_document_ai_uncategorized', 'Others')} (${tabCount('__uncategorized__')})` }]
                : []),
        ];

        return (
            <>
                <div className={styles.header}>
                    <h2>{t('ai_document_ai_select_from_list')}</h2>
                </div>

                <div className={styles.listToolbar}>
                    <div className={styles.listTabs}>
                        <Tabs
                            currentTab={listCategory}
                            tabs={tabDescriptors.map((tab) => ({
                                value: tab.value,
                                label: tab.label,
                                onClick: () => setListCategory(tab.value),
                            }))}
                        />
                    </div>
                    <div className={styles.listSearch}>
                        <Search
                            value={listSearch}
                            placeholder={t('ai_document_ai_search_model')}
                            onSearch={(value: string) => setListSearch(value)}
                            onReset={() => setListSearch('')}
                        />
                    </div>
                </div>

                <div className={styles.modelGrid}>
                    {isLoadingSchemas ? (
                        <Typography variant="Body" className={styles.modelEmpty}>
                            {t('loading')}
                        </Typography>
                    ) : filteredSchemas.length ? (
                        filteredSchemas.map((schema) => (
                            <div
                                key={schema._id}
                                className={styles.modelCard}
                                role="button"
                                tabIndex={0}
                                onClick={() => openModelPreviewModal(schema)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className={styles.modelCardTop}>
                                    <div className={styles.modelCardHead}>
                                        <SchemaIcon style={{ width: 18, height: 18 }} />
                                        <Typography variant="BodyBold">{schema.name}</Typography>
                                    </div>
                                    <div className={styles.modelStats}>
                                        <div className={styles.modelStat}>
                                            <Typography className={styles.statNum}>{getSchemaAttrCount(schema)}</Typography>
                                            <Typography variant="Body" className={styles.statLabel}>
                                                {t('ai_document_ai_attributes')}
                                            </Typography>
                                        </div>
                                        <div className={styles.modelStat}>
                                            <Typography className={styles.statNum}>{getSchemaAgentsInUse(schema)}</Typography>
                                            <Typography variant="Body" className={styles.statLabel}>
                                                {t('ai_document_ai_agents_in_use')}
                                            </Typography>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.modelCardBottom}>
                                    <Typography variant="Body" className={styles.modelCategory}>
                                        {getSchemaCategoryLabel(schema)}
                                    </Typography>
                                    <div className={styles.modelCardFooter}>
                                        <Typography
                                            className={styles.modelSchemaLink}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openModelPreviewModal(schema);
                                            }}
                                        >
                                            {t('ai_document_ai_schema').toUpperCase()}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openModelPreviewModal(schema);
                                            }}
                                        >
                                            <MoreVertIcon fontSize="small" sx={{ color: '#9e9e9e' }} />
                                        </IconButton>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <Typography variant="Body" className={styles.modelEmpty}>
                            {t('ai_document_ai_no_existing_model')}
                        </Typography>
                    )}
                </div>
            </>
        );
    };

    const renderEditing = () => (
        <div className={styles.editingWrap}>
            {renderSchemaTable(draftFields, setDraftFields, true)}
            <div className={styles.actionsRow}>
                <Button
                    type="primary"
                    text={t('confirm')}
                    onClick={() => openSaveSchemaModal(draftFields, draftSource)}
                />
                <Button
                    variant="outlined"
                    text={t('cancel')}
                    onClick={() => setView(linkedSchemas.length ? 'overview' : 'choose')}
                />
            </div>
        </div>
    );

    const renderOverview = () => (
        <>
            {renderHeader()}
            {linkedSchemas.map((schema, index) => {
                const isInlineEditing = inlineEditIndex === index;

                if (isInlineEditing) {
                    const sync = getSchemaSyncState(schema);
                    return (
                        <div className={`${styles.linkedCard} ${styles.linkedCardEditing}`} key={schema.local_id}>
                            <div className={styles.linkedHead}>
                                <Typography className={styles.linkedTitle}>
                                    {`${t('ai_document_ai_linked_model')}: `}
                                    <b>{schema.model_name}</b>
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => onRemoveSchema(index)}
                                    sx={{ color: '#E53C3C' }}
                                >
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </div>
                            {/* Only warn about real-time propagation when the model is actually
                                synced with an agent or Data Board. */}
                            {sync.isSynced && (
                                <Typography variant="Body" className={styles.editWarning}>
                                    {t('ai_document_ai_edit_warning')}
                                </Typography>
                            )}
                            {/* Lock AI Logic (type) of existing fields only while a Data Board is
                                linked — otherwise the type stays editable. */}
                            {renderSchemaTable(inlineEditFields, setInlineEditFields, true, sync.boardCount > 0)}
                            <div className={styles.actionsRow}>
                                <Button
                                    type="primary"
                                    text={t('ai_document_ai_save_changes')}
                                    onClick={saveInlineEdit}
                                    disabled={
                                        JSON.stringify(inlineEditFields) === inlineEditBaseline || isSavingSchema
                                    }
                                />
                                <Button variant="outlined" text={t('cancel')} onClick={cancelInlineEdit} />
                            </div>
                        </div>
                    );
                }

                return (
                    <div className={styles.linkedCard} key={schema.local_id}>
                        <div className={styles.linkedHead}>
                            <Typography className={styles.linkedTitle}>
                                {`${t('ai_document_ai_linked_model')}: `}
                                <b>{schema.model_name}</b>
                            </Typography>
                            <div className={styles.headActions}>
                                <Button
                                    variant="outlined"
                                    text={t('ai_document_ai_edit_schema')}
                                    onClick={() => editSchema(index)}
                                    sx={{ width: '200px' }}
                                />
                                <IconButton
                                    size="small"
                                    onClick={() => onRemoveSchema(index)}
                                    sx={{ color: '#E53C3C' }}
                                >
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </div>
                        </div>
                        <Typography variant="Body" className={styles.linkedHint}>
                            {schema.board_id
                                ? t('ai_document_ai_data_board_created')
                                : t('ai_document_ai_data_board_will_create')}
                        </Typography>
                        <div className={styles.dataBoardRow}>
                            <img src={databoardIcon} alt="" style={{ width: 18, height: 18 }} />
                            <u>{schema.data_board_name}</u>
                            {isDuplicateBoardName(schema.data_board_name, {
                                excludeBoardId: schema.board_id,
                                excludeIndex: index,
                            }) && (
                                <Tooltip
                                    arrow
                                    title={t(
                                        'ai_document_ai_board_name_duplicate',
                                        'A Data Board with this name already exists',
                                    )}
                                >
                                    <WarningAmberRoundedIcon style={{ fontSize: 18, color: '#FA9917' }} />
                                </Tooltip>
                            )}
                            <IconButton size="small" onClick={() => openEditDataBoardModal(index)}>
                                <Icon name="edit" fontSize={14} style={{ color: '#828282' }} />
                            </IconButton>
                        </div>
                    </div>
                );
            })}
            <div className={styles.linkAnother} onClick={goChoose}>
                <span className={styles.linkAnotherPlus}>+</span>
                <Typography className={styles.linkAnotherLabel}>
                    {t('ai_document_ai_link_another_schema')}
                </Typography>
            </div>
        </>
    );

    return (
        <div className={styles.wrap}>
            {dialogHolder}
            {view === 'choose' && renderChoose()}
            {view === 'auto-upload' && renderAutoUpload()}
            {view === 'detected' && renderDetected()}
            {view === 'select-list' && renderSelectList()}
            {view === 'editing' && renderEditing()}
            {view === 'overview' && renderOverview()}
        </div>
    );
};

export default LinkageStep;
