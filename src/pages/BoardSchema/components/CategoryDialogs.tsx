import { TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Dialog from '@/components/Dialog';
import { useNotify } from '@/contexts/SnackbarContext';

import type { DocumentSchema, SchemaCategory } from '../types';
import {
    useCreateSchemaCategory,
    useDeleteSchema,
    useDeleteSchemaCategory,
    useUpdateSchemaCategory,
} from '@/services/queries/schema';

// ---------------- Rename ----------------

interface RenameProps {
    open: boolean;
    category: SchemaCategory | null;
    isSubCategory?: boolean;
    onClose: () => void;
}

export const RenameCategoryDialog = ({ open, category, isSubCategory, onClose }: RenameProps) => {
    const { t } = useTranslation();
    const { notify } = useNotify();
    const updateMut = useUpdateSchemaCategory();
    const [name, setName] = useState('');

    useEffect(() => {
        if (open) setName(category?.name ?? '');
    }, [open, category]);

    const handleConfirm = async () => {
        if (!category || !name.trim() || name.trim() === category.name) {
            onClose();
            return true;
        }
        try {
            await updateMut.mutateAsync({ id: category.id, body: { name: name.trim() } });
            notify({ type: 'success', message: t('schema_category_updated', 'Category updated successfully') });
            return true;
        } catch (err) {
            notify({ type: 'error', message: t('error_something_went_wrong') });
            return false;
        }
    };

    if (!open || !category) return null;

    return (
        <Dialog
            open={open}
            title={
                isSubCategory
                    ? t('schema_rename_sub_category', 'Rename Sub Category')
                    : t('schema_rename_category', 'Rename Category')
            }
            content={
                <TextField
                    autoFocus
                    fullWidth
                    size="small"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                        isSubCategory
                            ? t('schema_sub_category_name', 'Sub category name')
                            : t('schema_category_name', 'Category name')
                    }
                    sx={{ mt: 1 }}
                />
            }
            confirmText={t('save')}
            cancelText={t('cancel')}
            onConfirm={handleConfirm}
            onClose={onClose}
            confirmButtonProps={{
                disabled: !name.trim() || name.trim() === (category?.name ?? ''),
                loading: updateMut.isPending,
            }}
            showCloseButton
        />
    );
};

// ---------------- Delete ----------------

interface DeleteProps {
    open: boolean;
    category: SchemaCategory | null;
    isSubCategory?: boolean;
    parentId?: string;
    parentName?: string;
    onClose: () => void;
}

export const DeleteCategoryDialog = ({
    open,
    category,
    isSubCategory,
    parentId,
    parentName,
    onClose,
}: DeleteProps) => {
    const { t } = useTranslation();
    const { notify } = useNotify();
    const deleteMut = useDeleteSchemaCategory();

    const handleConfirm = async () => {
        if (!category) return true;
        try {
            await deleteMut.mutateAsync({ id: category.id, parentId });
            notify({ type: 'success', message: t('schema_category_deleted', 'Category deleted successfully') });
            return true;
        } catch (err) {
            notify({ type: 'error', message: t('error_something_went_wrong') });
            return false;
        }
    };

    if (!open || !category) return null;

    return (
        <Dialog
            open={open}
            title={
                isSubCategory
                    ? t('schema_delete_sub_category_title', 'Are you sure you want to delete this sub category?')
                    : t('schema_delete_category_title', 'Are you sure you want to delete this category?')
            }
            content={
                isSubCategory
                    ? t(
                          'schema_delete_sub_category_warning',
                          'Schemas under "{{name}}" will be moved to "{{parent}}". This action cannot be undone.',
                          { name: category.name, parent: parentName ?? '' },
                      )
                    : t(
                          'schema_delete_category_warning',
                          'Schemas under "{{name}}" will be moved to All. This action cannot be undone.',
                          { name: category.name },
                      )
            }
            confirmText={t('delete')}
            cancelText={t('cancel')}
            onConfirm={handleConfirm}
            onClose={onClose}
            confirmButtonProps={{ type: 'danger', loading: deleteMut.isPending }}
            showCloseButton
        />
    );
};

// ---------------- Create ----------------

interface CreateProps {
    open: boolean;
    parentId?: string;
    parentName?: string;
    onClose: () => void;
    onCreated?: (createdId: string) => void;
}

export const CreateCategoryDialog = ({ open, parentId, parentName, onClose, onCreated }: CreateProps) => {
    const { t } = useTranslation();
    const { notify } = useNotify();
    const createMut = useCreateSchemaCategory();
    const [name, setName] = useState('');

    useEffect(() => {
        if (open) setName('');
    }, [open]);

    const handleConfirm = async () => {
        if (!name.trim()) return false;
        try {
            const created = await createMut.mutateAsync({ name: name.trim(), parentId, type: 'schema' });
            notify({ type: 'success', message: t('schema_category_created', 'Category created successfully') });
            const createdId = (created as { id?: string; _id?: string })?.id ?? (created as { _id?: string })?._id;
            if (createdId) onCreated?.(createdId);
            return true;
        } catch (err) {
            notify({ type: 'error', message: t('error_something_went_wrong') });
            return false;
        }
    };

    if (!open) return null;

    return (
        <Dialog
            open={open}
            title={
                parentName
                    ? t('schema_add_sub_category_to', 'Add sub-category to {{name}}', { name: parentName })
                    : t('schema_create_new_category', 'Create new Category')
            }

            content={
                <TextField
                    autoFocus
                    fullWidth
                    size="small"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('schema_category_name', 'Category name')}
                    sx={{ mt: 1 }}
                />
            }
            confirmText={t('create')}
            cancelText={t('cancel')}
            onConfirm={handleConfirm}
            onClose={onClose}
            confirmButtonProps={{ disabled: !name.trim(), loading: createMut.isPending }}
            showCloseButton
        />
    );
};

// ---------------- Delete Schema ----------------

interface DeleteSchemaProps {
    open: boolean;
    schema: DocumentSchema | null;
    onClose: () => void;
}

export const DeleteSchemaDialog = ({ open, schema, onClose }: DeleteSchemaProps) => {
    const { t } = useTranslation();
    const { notify } = useNotify();
    const deleteMut = useDeleteSchema();

    const handleConfirm = async () => {
        if (!schema) return true;
        try {
            await deleteMut.mutateAsync(schema.id);
            notify({ type: 'success', message: t('schema_deleted', 'Schema deleted successfully') });
            return true;
        } catch (err) {
            notify({ type: 'error', message: t('error_something_went_wrong') });
            return false;
        }
    };

    if (!open || !schema) return null;

    return (
        <Dialog
            open={open}
            title={t('schema_delete_title', 'Are you sure you want to delete this schema?')}
            content={t(
                'schema_delete_warning',
                'Schema "{{name}}" will be permanently deleted. This action cannot be undone.',
                { name: schema.name },
            )}
            confirmText={t('delete')}
            cancelText={t('cancel')}
            onConfirm={handleConfirm}
            onClose={onClose}
            confirmButtonProps={{ type: 'danger', loading: deleteMut.isPending }}
            showCloseButton
        />
    );
};
