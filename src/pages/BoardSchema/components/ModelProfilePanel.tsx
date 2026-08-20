import { Button } from '@imbrace/ui';
import { FormControl, MenuItem, Select, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Drawer from '@/components/Drawer';
import { useNotify } from '@/contexts/SnackbarContext';
import { useUpdateSchema } from '@/services/queries/schema';

import styles from '../BoardSchemaDetail.module.scss';
import type { DocumentSchema, SchemaCategory } from '../types';

const labelSx = { fontSize: 14, fontWeight: 800, mb: 1, color: 'var(--color-light-7)' };

const fieldSx = {
    '& .MuiInputBase-input': {
        fontSize: 14,
        fontWeight: 400,
        color: 'var(--color-light-7)',
    },
    '& .MuiInputBase-input::placeholder': {
        color: 'var(--color-secondary-1)',
        opacity: 1,
    },
};

const selectPlaceholderSx = (isEmpty: boolean) =>
    isEmpty
        ? {
              ...fieldSx,
              '& .MuiSelect-select': {
                  color: 'var(--color-secondary-1)',
                  fontSize: 14,
                  fontWeight: 400,
              },
          }
        : fieldSx;

const titleSx = {
    fontSize: 16,
    fontWeight: 800,
    color: 'var(--color-light-7)',
    textTransform: 'uppercase',
};
const saveBtnSx = { alignSelf: 'flex-start', minWidth: 120, fontSize: 14, fontWeight: 800 };
const drawerHeaderSx = {
    padding: '22px 30px 24px 35px !important',
    alignItems: 'flex-start !important',
};
const drawerContentSx = { padding: '0 !important', gap: '0 !important', overflowY: 'auto !important' };

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

interface ModelProfilePanelProps {
    open: boolean;
    schema: DocumentSchema | null;
    categories: SchemaCategory[];
    onClose: () => void;
}

const ModelProfilePanel = ({ open, schema, categories, onClose }: ModelProfilePanelProps) => {
    const { t } = useTranslation();
    const { notify } = useNotify();
    const updateMut = useUpdateSchema();

    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [subCategoryId, setSubCategoryId] = useState('');

    useEffect(() => {
        if (!open || !schema) return;
        const schemaCatId = schema.category_id ?? schema.category ?? '';
        const { parentId, subId } = findCategoryParent(schemaCatId, categories);
        setName(schema.name ?? '');
        setCategoryId(parentId);
        setSubCategoryId(subId);
    }, [open, schema, categories]);

    const selectedCategory = useMemo(
        () => categories.find((c) => c.id === categoryId) ?? null,
        [categories, categoryId],
    );
    const subCategories = selectedCategory?.subCategories ?? [];
    const hasSubCategories = subCategories.length > 0;

    const isValid = !!name.trim() && !!categoryId;

    const handleSave = async () => {
        if (!schema || !isValid) return;
        try {
            const finalCategory = subCategoryId || categoryId;
            await updateMut.mutateAsync({
                id: schema.id,
                body: { name: name.trim(), category: finalCategory },
            });
            notify({ type: 'success', message: t('schema_model_profile_saved', 'Schema updated successfully') });
            onClose();
        } catch {
            notify({ type: 'error', message: t('error_something_went_wrong') });
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            onBackdropClick={onClose}
            width="480px"
            className={styles.schemaSidePanel}
            headerSx={drawerHeaderSx}
            contentSx={drawerContentSx}
            title={
                <Typography component="span" sx={titleSx}>
                    {t('schema_model_profile', 'Model Profile')}
                </Typography>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 30px 16px 35px' }}>
                <FormControl fullWidth>
                    <Typography component="label" sx={labelSx}>
                        {t('schema_document_model_name', 'Document Model Name')}*
                    </Typography>
                    <TextField
                        size="small"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        sx={fieldSx}
                    />
                </FormControl>

                <FormControl fullWidth>
                    <Typography component="label" sx={labelSx}>
                        {t('schema_category', 'Category')}*
                    </Typography>
                    <Select
                        size="small"
                        value={categoryId}
                        displayEmpty
                        onChange={(e) => {
                            setCategoryId(e.target.value as string);
                            setSubCategoryId('');
                        }}
                        sx={selectPlaceholderSx(!categoryId)}
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
                        <Typography component="label" sx={labelSx}>
                            {t('schema_sub_category', 'Sub Category')}
                        </Typography>
                        <Select
                            size="small"
                            value={subCategoryId}
                            displayEmpty
                            onChange={(e) => setSubCategoryId(e.target.value as string)}
                            sx={selectPlaceholderSx(!subCategoryId)}
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

                <Button
                    variant="contained"
                    text={t('save')}
                    onClick={handleSave}
                    disabled={!isValid || updateMut.isPending}
                    loading={updateMut.isPending}
                    sx={{ ...saveBtnSx, marginTop: '26px' }}
                />
            </div>
        </Drawer>
    );
};

export default ModelProfilePanel;
