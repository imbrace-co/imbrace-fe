import { FormControl, MenuItem, Select, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Dialog from '@/components/Dialog';
import { useNotify } from '@/contexts/SnackbarContext';
import { useCreateSchema, useUpdateSchema } from '@/services/queries/schema';
import { getApiErrorMessage } from '@/utils/apiError';

import { useSchemaNameConflict } from '../hooks';
import type { DocumentSchema, SchemaAttribute, SchemaCategory } from '../types';

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

interface ModelProfileDialogProps {
    open: boolean;
    /** Existing schema for edit mode. Omit for create mode. */
    schema?: DocumentSchema | null;
    categories: SchemaCategory[];
    onClose: () => void;
    /** Required for create mode: attributes to persist with the new schema. */
    draftAttributes?: SchemaAttribute[];
    /** Called after a successful create with the newly persisted schema and the chosen category id. */
    onCreated?: (schema: DocumentSchema, chosenCategoryId: string) => void;
    /** Create mode only: pre-select this category (may be a top-level or sub id). */
    defaultCategoryId?: string;
}

const ModelProfileDialog = ({
    open,
    schema,
    categories,
    onClose,
    draftAttributes,
    onCreated,
    defaultCategoryId,
}: ModelProfileDialogProps) => {
    const { t } = useTranslation();
    const { notify } = useNotify();
    const updateMut = useUpdateSchema();
    const createMut = useCreateSchema();

    const isEdit = !!schema;

    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [subCategoryId, setSubCategoryId] = useState('');

    useEffect(() => {
        if (!open) return;
        if (schema) {
            const schemaCatId = schema.category_id ?? schema.category ?? '';
            const { parentId, subId } = findCategoryParent(schemaCatId, categories);
            setName(schema.name ?? '');
            setCategoryId(parentId);
            setSubCategoryId(subId);
        } else {
            const { parentId, subId } = findCategoryParent(defaultCategoryId, categories);
            setName('');
            setCategoryId(parentId);
            setSubCategoryId(subId);
        }
    }, [open, schema, categories, defaultCategoryId]);

    const selectedCategory = useMemo(
        () => categories.find((c) => c.id === categoryId) ?? null,
        [categories, categoryId],
    );
    const subCategories = selectedCategory?.subCategories ?? [];
    const hasSubCategories = subCategories.length > 0;

    const nameConflict = useSchemaNameConflict(name, {
        excludeId: schema ? (schema._id ?? schema.id) : undefined,
        enabled: open,
    });

    const isValid = !!name.trim() && !!categoryId && !nameConflict;
    const isPending = isEdit ? updateMut.isPending : createMut.isPending;
    const finalCategory = subCategoryId || categoryId;

    // Edit mode (Model Profile): only allow Save when something actually changed.
    const initialProfile = useMemo(() => {
        if (!schema) return null;
        const schemaCatId = schema.category_id ?? schema.category ?? '';
        return {
            name: (schema.name ?? '').trim(),
            category: schemaCatId,
        };
    }, [schema]);

    const isDirty =
        !initialProfile ||
        initialProfile.name !== name.trim() ||
        initialProfile.category !== finalCategory;

    const handleSave = async () => {
        if (!isValid) return false;
        try {
            if (isEdit && schema) {
                await updateMut.mutateAsync({
                    id: schema.id,
                    body: { name: name.trim(), category: finalCategory },
                });
                notify({ type: 'success', message: t('schema_model_profile_saved', 'Schema updated successfully') });
                return true;
            }
            const created = await createMut.mutateAsync({
                name: name.trim(),
                category: finalCategory,
                agents: [],
                databoards: [],
                attributes: (draftAttributes ?? []).map(({ id: _id, ...rest }) => {
                    void _id;
                    return { ...rest, id: '' } as SchemaAttribute;
                }),
            });
            notify({ type: 'success', message: t('schema_created', 'Schema created successfully') });
            onCreated?.(created, finalCategory);
            return true;
        } catch (err) {
            // Surface the server-provided error (e.g. duplicate schema name) when available.
            notify({ type: 'error', message: getApiErrorMessage(err) ?? t('error_something_went_wrong') });
            return false;
        }
    };

    if (!open) return null;

    const fieldLabelSx = { fontSize: 14, fontWeight: 800, mb: 1, color: 'var(--color-light-7)' };
    const fieldSx = {
        '& .MuiInputBase-input': {
            fontSize: 14,
            fontWeight: 400,
            color: 'var(--color-light-7)',
        },
        '& .MuiSelect-select': {
            fontSize: 14,
            fontWeight: 400,
            color: 'var(--color-light-7)',
        },
    };

    return (
        <Dialog
            open={open}
            title={
                isEdit
                    ? t('schema_model_profile', 'Model Profile')
                    : t('schema_save_model', 'Save Model')
            }
            content={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>
                    <FormControl fullWidth>
                        <Typography component="label" sx={fieldLabelSx}>
                            {t('schema_document_model_name', 'Document Model Name')}
                            <span>*</span>
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('schema_document_model_name', 'Document Model Name')}
                            sx={fieldSx}
                            error={!!nameConflict}
                            helperText={
                                nameConflict
                                    ? t(
                                          'schema_name_duplicated',
                                          'A schema named "{{name}}" already exists',
                                          { name: nameConflict.name },
                                      )
                                    : undefined
                            }
                        />
                    </FormControl>

                    <FormControl fullWidth>
                        <Typography component="label" sx={fieldLabelSx}>
                            {t('schema_category', 'Category')}
                            <span>*</span>
                        </Typography>
                        <Select
                            fullWidth
                            size="small"
                            value={categoryId}
                            displayEmpty
                            onChange={(e) => {
                                setCategoryId(e.target.value as string);
                                setSubCategoryId('');
                            }}
                            sx={fieldSx}
                            MenuProps={{ sx: { '& .MuiMenuItem-root': { fontSize: 14 } } }}
                        >
                            <MenuItem value="" disabled>
                                {t('schema_select_category', 'Select a category')}
                            </MenuItem>
                            {categories.map((c) => (
                                <MenuItem key={c.id} value={c.id}>
                                    {c.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {hasSubCategories && (
                        <FormControl fullWidth>
                            <Typography component="label" sx={fieldLabelSx}>
                                {t('schema_sub_category', 'Sub Category')}
                            </Typography>
                            <Select
                                fullWidth
                                size="small"
                                value={subCategoryId}
                                displayEmpty
                                onChange={(e) => setSubCategoryId(e.target.value as string)}
                                sx={fieldSx}
                                MenuProps={{ sx: { '& .MuiMenuItem-root': { fontSize: 14 } } }}
                            >
                                <MenuItem value="">
                                    <em>
                                        {t('schema_sub_category_direct_parent', 'Directly under {{name}}', {
                                            name: selectedCategory?.name ?? '',
                                        })}
                                    </em>
                                </MenuItem>
                                {subCategories.map((s) => (
                                    <MenuItem key={s.id} value={s.id}>
                                        {s.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </div>
            }
            confirmText={t('save')}
            onConfirm={handleSave}
            onClose={onClose}
            hideCancelButton
            actionsAlign="flex-start"
            confirmButtonProps={{
                disabled: !isValid || (isEdit && !isDirty),
                loading: isPending,
                sx: { fontSize: 14, fontWeight: 800 },
            }}
            showCloseButton
        />
    );
};

export default ModelProfileDialog;
