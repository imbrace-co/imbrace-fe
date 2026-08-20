import { TextField } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Dialog from '@/components/Dialog';
import { useNotify } from '@/contexts/SnackbarContext';
import {
    useCreateDataboardCategory,
    useDeleteDataboardCategory,
    useUpdateDataboardCategory,
} from '@/services/queries/databoardCategory';

import type { SchemaCategory } from '../types';

type NameDialogState = {
    open: boolean;
    mode: 'create' | 'rename';
    isSub: boolean;
    parentId?: string;
    target?: SchemaCategory;
};

type DeleteDialogState = {
    open: boolean;
    isSub: boolean;
    parentId?: string;
    target?: SchemaCategory;
    onDeleted?: () => void;
};

/**
 * Create/rename/delete dialogs for Data Board categories and their sub-folders.
 * Backed by the same `/data-board/categories` store /schemas uses (type='databoard'):
 * sub-folders are categories created with a `parentId`. Deleting a category re-homes its
 * boards (to the parent, or uncategorised) — handled inside the delete mutation.
 */
export const useCategoryDialogs = () => {
    const { t } = useTranslation();
    const { notify } = useNotify();

    const createMut = useCreateDataboardCategory();
    const updateMut = useUpdateDataboardCategory();
    const deleteMut = useDeleteDataboardCategory();

    const [nameDialog, setNameDialog] = useState<NameDialogState>({ open: false, mode: 'create', isSub: false });
    const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ open: false, isSub: false });
    const [name, setName] = useState('');

    const saving = createMut.isPending || updateMut.isPending || deleteMut.isPending;

    // ---- Open helpers (same call signatures the page/SubFolderRow already use) ----
    const createCategory = () => {
        setName('');
        setNameDialog({ open: true, mode: 'create', isSub: false });
    };
    const renameCategory = (cat: SchemaCategory) => {
        setName(cat.name);
        setNameDialog({ open: true, mode: 'rename', isSub: false, target: cat });
    };
    const createSubFolder = (parentId: string) => {
        setName('');
        setNameDialog({ open: true, mode: 'create', isSub: true, parentId });
    };
    const renameSubFolder = (folder: SchemaCategory) => {
        setName(folder.name);
        setNameDialog({ open: true, mode: 'rename', isSub: true, target: folder });
    };
    const deleteCategory = (cat: SchemaCategory, onDeleted?: () => void) =>
        setDeleteDialog({ open: true, isSub: false, target: cat, onDeleted });
    const deleteSubFolder = (folder: SchemaCategory, parentId: string, onDeleted?: () => void) =>
        setDeleteDialog({ open: true, isSub: true, parentId, target: folder, onDeleted });

    const stableCreateCategory = useCallback(createCategory, []);
    const stableRenameCategory = useCallback(renameCategory, []);
    const stableDeleteCategory = useCallback(deleteCategory, []);
    const stableCreateSubFolder = useCallback(createSubFolder, []);
    const stableRenameSubFolder = useCallback(renameSubFolder, []);
    const stableDeleteSubFolder = useCallback(deleteSubFolder, []);

    return useMemo(() => {
        const closeName = () => setNameDialog((s) => ({ ...s, open: false }));
        const closeDelete = () => setDeleteDialog((s) => ({ ...s, open: false }));

        const handleNameConfirm = async () => {
            const trimmed = name.trim();
            if (!trimmed) return false;
            const { mode, parentId, target } = nameDialog;
            if (mode === 'rename' && target && trimmed === target.name) return true;
            try {
                if (mode === 'create') {
                    await createMut.mutateAsync({ name: trimmed, parentId });
                } else if (target) {
                    await updateMut.mutateAsync({ id: target.id, body: { name: trimmed } });
                }
                return true;
            } catch {
                notify({ type: 'error', message: t('error_something_went_wrong') });
                return false;
            }
        };

        const handleDeleteConfirm = async () => {
            const { target, parentId, onDeleted } = deleteDialog;
            if (!target) return true;
            try {
                await deleteMut.mutateAsync({ id: target.id, parentId });
                onDeleted?.();
                return true;
            } catch {
                notify({ type: 'error', message: t('error_something_went_wrong') });
                return false;
            }
        };

        const nameTitle = (() => {
            const { mode, isSub } = nameDialog;
            if (mode === 'create') {
                return isSub
                    ? t('databoard_create_sub_folder', 'Create sub folder')
                    : t('databoard_create_category', 'Create new Category');
            }
            return isSub
                ? t('databoard_rename_sub_folder', 'Rename sub folder')
                : t('databoard_rename_category', 'Rename category');
        })();

        const namePlaceholder = nameDialog.isSub
            ? t('databoard_sub_folder_name', 'Sub folder name')
            : t('databoard_category_name', 'Category name');

        const categoryDialogHolder = (
            <>
                <Dialog
                    open={nameDialog.open}
                    title={nameTitle}
                    content={
                        <TextField
                            autoFocus
                            fullWidth
                            size="small"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={namePlaceholder}
                            sx={{ mt: 1 }}
                        />
                    }
                    confirmText={nameDialog.mode === 'create' ? t('create') : t('save')}
                    cancelText={t('cancel')}
                    onConfirm={handleNameConfirm}
                    onClose={closeName}
                    confirmButtonProps={{ disabled: !name.trim(), loading: saving }}
                    showCloseButton
                />
                <Dialog
                    open={deleteDialog.open}
                    title={
                        deleteDialog.target
                            ? t('databoard_delete_category_title', 'Delete "{{name}}"?', { name: deleteDialog.target.name })
                            : ''
                    }
                    content={
                        deleteDialog.isSub
                            ? t(
                                  'databoard_delete_sub_folder_warning',
                                  'This sub folder will be removed. Boards inside it will be moved to the parent category.',
                              )
                            : t(
                                  'databoard_delete_category_warning',
                                  'This category will be removed. Boards in this category will be uncategorised.',
                              )
                    }
                    confirmText={t('delete')}
                    cancelText={t('cancel')}
                    onConfirm={handleDeleteConfirm}
                    onClose={closeDelete}
                    confirmButtonProps={{ type: 'danger', loading: saving }}
                    showCloseButton
                />
            </>
        );

        return {
            categoryDialogHolder,
            createCategory: stableCreateCategory,
            renameCategory: stableRenameCategory,
            deleteCategory: stableDeleteCategory,
            createSubFolder: stableCreateSubFolder,
            renameSubFolder: stableRenameSubFolder,
            deleteSubFolder: stableDeleteSubFolder,
        };
    }, [name, nameDialog, deleteDialog, saving, t, createMut, updateMut, deleteMut, notify, stableCreateCategory, stableRenameCategory, stableDeleteCategory, stableCreateSubFolder, stableRenameSubFolder, stableDeleteSubFolder]);
};
