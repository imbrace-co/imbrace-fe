import { Button, FieldText, Icon, IconButton } from '@imbrace/ui';
import { CircularProgress, Menu, MenuItem, Select } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import PromptExpandIcon from '@/assets/icons/ai_schema_promt_expand.svg?react';
import Dialog from '@/components/Dialog';
import { useNotify } from '@/contexts/SnackbarContext';
import { FieldTypeIcon } from '@/pages/DataboardEnhance/utils';
import { FieldTypesOptions } from '@/pages/Databoards/utils';
import { useExtractSchemaAttributes, useSchemaCategories } from '@/services/queries/schema';
import { getApiErrorMessage } from '@/utils/apiError';

import styles from './BoardSchemaDetail.module.scss';
import AttributeModal, { type AttributeFormValue } from './components/AttributeModal';
import ExtractModelDialog, { type ExtractSelection } from './components/ExtractModelDialog';
import ModelProfileDialog from './components/ModelProfileDialog';
import type { SchemaAttribute, SchemaFieldType } from './types';

type Step = 'choose' | 'upload' | 'edit';



const isLockedAttr = (attr: SchemaAttribute) => attr.isDefault === true;

const BoardSchemaCreate = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const presetCategoryId = searchParams.get('categoryId') ?? undefined;
    const { notify } = useNotify();

    const categoriesQuery = useSchemaCategories({ type: 'schema' });
    const categories = categoriesQuery.data ?? [];
    const extractMut = useExtractSchemaAttributes();

    const [step, setStep] = useState<Step>('choose');
    const [providerDialogOpen, setProviderDialogOpen] = useState(false);
    const [droppedFiles, setDroppedFiles] = useState<File[]>([]);

    const [attributes, setAttributes] = useState<SchemaAttribute[]>([]);

    const [editingAttr, setEditingAttr] = useState<SchemaAttribute | null>(null);
    const [kebabAnchor, setKebabAnchor] = useState<{ anchor: HTMLElement; attr: SchemaAttribute } | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [saveOpen, setSaveOpen] = useState(false);

    const fieldTypeOptions = useMemo(
        () => FieldTypesOptions(t, true).filter((o) => o.value !== 'Priority'),
        [t],
    );

    const goBack = () => navigate('/document-models');

    // Entry point for the auto-build flow: open the provider/model dialog. Any files dropped
    // on the card are forwarded so they aren't lost.
    const openProviderDialog = (files: File[] = []) => {
        setDroppedFiles(files);
        setProviderDialogOpen(true);
    };

    // Run extraction with the provider + model picked in the dialog. Generated rows arrive
    // without locally-unique draft ids — assign them so the table state keys work.
    const runExtract = async (files: File[], providerId: string, modelId: string) => {
        const next = files.slice(0, 5);
        if (!next.length) return;
        try {
            const generated = await extractMut.mutateAsync({ files: next, providerId, modelId });
            setAttributes(
                generated.length > 0
                    ? generated.map((attr, idx) => ({
                          ...attr,
                          id: attr.id || `draft_${Date.now()}_${idx}`,
                      }))
                    : [],
            );
            setStep('edit');
        } catch (err) {
            notify({ type: 'error', message: getApiErrorMessage(err) ?? t('error_something_went_wrong') });
        }
    };

    const handleConfirmExtract = (sel: ExtractSelection) => {
        setProviderDialogOpen(false);
        runExtract(sel.files, sel.providerId, sel.modelId);
    };

    const updateCell = useCallback(
        (attrId: string, patch: Partial<SchemaAttribute>) => {
            setAttributes((prev) => prev.map((a) => (a.id === attrId ? { ...a, ...patch } : a)));
        },
        [],
    );

    const makeBlankAttribute = (name = ''): SchemaAttribute => ({
        id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name,
        type: 'ShortText',
        extractionPrompt: '',
        sampleData: '',
        hiddenOnRecord: false,
        hidden: false,
    });

    const handleBuildManual = () => {
        setAttributes([makeBlankAttribute('Name')]);
        setStep('edit');
    };

    const handleAddInlineRow = () => {
        setAttributes((prev) => [...prev, makeBlankAttribute()]);
    };

    const handleSaveEditAttribute = (value: AttributeFormValue) => {
        if (!editingAttr) return;
        setAttributes((prev) => prev.map((a) => (a.id === editingAttr.id ? { ...a, ...value } : a)));
    };

    const handleDeleteAttribute = (attrId: string) => {
        // Keep at least one attribute in the list.
        setAttributes((prev) => (prev.length <= 1 ? prev : prev.filter((a) => a.id !== attrId)));
    };

    const draftAttributes = attributes.filter((a) => a.name.trim());

    const handleSaveModelClick = () => {
        const invalid = attributes.filter((a) => !isLockedAttr(a) && !a.name.trim());
        if (invalid.length > 0) {
            notify({ type: 'warning', message: t('schema_validation_required', 'Attribute name is required for all rows') });
            return;
        }
        setSaveOpen(true);
    };

    const renderTopBar = () => (
        <div className={styles.topBar}>
            <h2 className={styles.topTitle}>{t('schema_page_title', 'Document Models')}</h2>
            <nav className={styles.breadcrumb} aria-label="breadcrumb">
                <button type="button" onClick={goBack}>
                    {t('schema_models_index', 'Models index')}
                </button>
                <Icon name="chevronRight" style={{ fontSize: 14, color: 'var(--color-light-5)' }} />
                <span className={styles.crumbCurrent}>{t('schema_build_a_model', 'Build a model')}</span>
            </nav>
        </div>
    );

    return (
        <div className={styles.page}>
            {renderTopBar()}
            <div className={styles.body}>
                {step === 'choose' && (
                    <div className={styles.choiceGrid}>
                        <button
                            type="button"
                            className={styles.choiceCard}
                            onClick={() => setStep('upload')}
                        >
                            <h3 className={styles.choiceTitle}>
                                {t('schema_build_auto', 'Build Automatically')}
                            </h3>
                            <p className={styles.choiceDesc}>
                                {t('schema_build_auto_desc', 'Auto-detect schema from sample document')}
                            </p>
                        </button>
                        <button
                            type="button"
                            className={styles.choiceCard}
                            onClick={handleBuildManual}
                        >
                            <h3 className={styles.choiceTitle}>{t('schema_build_manual', 'Build Manually')}</h3>
                            <p className={styles.choiceDesc}>
                                {t('schema_build_manual_desc', 'Create schema from scratch')}
                            </p>
                        </button>
                    </div>
                )}

                {step === 'upload' && (
                    <div
                        className={styles.uploadCard}
                        style={extractMut.isPending ? { cursor: 'default' } : undefined}
                        onClick={!extractMut.isPending ? () => openProviderDialog() : undefined}
                        onDragOver={(e) => { if (!extractMut.isPending) { e.preventDefault(); e.stopPropagation(); } }}
                        onDrop={(e) => {
                            if (extractMut.isPending) return;
                            e.preventDefault();
                            e.stopPropagation();
                            const files = e.dataTransfer.files;
                            if (files?.length) openProviderDialog(Array.from(files));
                        }}
                    >
                        {/* File selection now happens inside the provider/model dialog. */}
                        <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {extractMut.isPending ? (
                                <CircularProgress size={28} />
                            ) : (
                                <Icon name="upload" style={{ fontSize: 28, color: 'var(--color-primary-1)' }} />
                            )}
                        </div>
                        <h3 className={styles.uploadTitle}>
                            {extractMut.isPending
                                ? t('schema_uploading_sample_file', 'Uploading Sample File')
                                : t('schema_upload_sample_file', 'Upload Sample File')}
                        </h3>
                        <p className={styles.uploadHint}>
                            {t(
                                'schema_upload_hint',
                                'AI will analyse structure to auto-generate a schema. PDF, JPG, PNG supported. (up to 5 file)',
                            )}
                        </p>
                        {!extractMut.isPending && (
                            <button
                                type="button"
                                className={styles.uploadGoBack}
                                onClick={(e) => { e.stopPropagation(); setStep('choose'); }}
                            >
                                {t('schema_go_back', 'Go Back')}
                            </button>
                        )}
                    </div>
                )}

                {step === 'edit' && (
                    <>
                        <div className={styles.tableWrap} style={{ marginTop: 24 }}>
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
                                        const locked = isLockedAttr(attr);
                                        return (
                                            <tr key={attr.id}>
                                                <td>
                                                    <FieldText
                                                        fullWidth
                                                        value={attr.name}
                                                        disabled={locked}
                                                        onChange={(e) =>
                                                            updateCell(attr.id, {
                                                                name: (e.target as HTMLInputElement).value,
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <Select
                                                        size="small"
                                                        fullWidth
                                                        value={attr.type}
                                                        disabled={isLockedAttr(attr)}
                                                        sx={isLockedAttr(attr) ? {
                                                            backgroundColor: 'var(--color-grey-3)',
                                                            '& .MuiSelect-select.Mui-disabled': {
                                                                backgroundColor: 'var(--color-grey-3)',
                                                                WebkitTextFillColor: 'var(--color-light-7)',
                                                            },
                                                        } : {}}
                                                        onChange={(e) =>
                                                            updateCell(attr.id, {
                                                                type: e.target.value as SchemaFieldType,
                                                            })
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
                                                </td>
                                                <td className={styles.promptCell}>
                                                    <div style={{ position: 'relative' }}>
                                                        <FieldText
                                                            fullWidth
                                                            multiline
                                                            minRows={1}
                                                            value={attr.extractionPrompt}
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
                                                            onClick={() => setEditingAttr(attr)}
                                                        />
                                                    </div>
                                                </td>
                                                <td className={styles.colKebab}>
                                                    <IconButton
                                                        size="xs"
                                                        variant="text"
                                                        type="secondary"
                                                        onClick={(e) =>
                                                            setKebabAnchor({
                                                                anchor: e.currentTarget,
                                                                attr,
                                                            })
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
                                text={t('schema_save_model', 'Save Model')}
                                onClick={handleSaveModelClick}
                                disabled={attributes.every((a) => !a.name.trim())}
                            />
                            <Button variant="outlined" text={t('cancel')} onClick={goBack} />
                        </div>
                    </>
                )}
            </div>

            <Menu
                open={!!kebabAnchor}
                anchorEl={kebabAnchor?.anchor ?? null}
                onClose={() => setKebabAnchor(null)}
            >
                <MenuItem
                    onClick={() => {
                        if (!kebabAnchor) return;
                        setEditingAttr(kebabAnchor.attr);
                        setKebabAnchor(null);
                    }}
                >
                    {kebabAnchor && isLockedAttr(kebabAnchor.attr)
                        ? t('schema_view_details', 'View Details')
                        : t('schema_edit_details', 'Edit Details')}
                </MenuItem>
                {kebabAnchor && !isLockedAttr(kebabAnchor.attr) && (
                    <MenuItem
                        sx={{ color: 'var(--color-danger-1)' }}
                        disabled={attributes.length <= 1}
                        onClick={() => {
                            if (!kebabAnchor || attributes.length <= 1) return;
                            const id = kebabAnchor.attr.id;
                            setKebabAnchor(null);
                            setConfirmDeleteId(id);
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
                onClose={() => setEditingAttr(null)}
                onSave={handleSaveEditAttribute}
                onDelete={
                    editingAttr && !isLockedAttr(editingAttr)
                        ? () => setConfirmDeleteId(editingAttr.id)
                        : undefined
                }
                deleteDisabled={attributes.length <= 1}
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

            <ModelProfileDialog
                open={saveOpen}
                categories={categories}
                draftAttributes={draftAttributes}
                defaultCategoryId={presetCategoryId}
                onClose={() => setSaveOpen(false)}
                onCreated={(created, chosenCategoryId) => {
                    setSaveOpen(false);
                    const fromCat =
                        chosenCategoryId ||
                        created.category_id ||
                        created.category ||
                        presetCategoryId ||
                        '';
                    navigate(`/document-models/${created.id}`, { state: { fromCat } });
                }}
            />

            <ExtractModelDialog
                open={providerDialogOpen}
                initialFiles={droppedFiles}
                onClose={() => setProviderDialogOpen(false)}
                onConfirm={handleConfirmExtract}
            />
        </div>
    );
};

export default BoardSchemaCreate;
