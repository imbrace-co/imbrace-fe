import type { SelectRef } from '@imbrace/ui';
import { Icon, IconButton, Space, useDialog } from '@imbrace/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useCallback } from 'react';
import type { FieldValues, UseFormSetValue } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { dialog } from '@/components/Dialog';
import { deleteTemplateCategory, putTemplateCategory } from '@/services/api/messageTemplates';
import apiFetch from '@/services/axios/handler';

import type { CategoryPayload } from '../messageTemplateForm';
import CategoryForm from './categoryForm';

interface CategoryActionProps<T extends FieldValues> {
    category: API.TemplateCategory;
    categorySelectRef: React.RefObject<SelectRef>;
    onDelete: () => void;
    setValue: UseFormSetValue<T>;
}

const handleUpdateCategory = async (params: { categoryId: string; formData: { name: string; description: string } }) => {
    const { data } = await apiFetch<{
        data: API.TemplateCategory;
    }>(putTemplateCategory.api(params.categoryId), putTemplateCategory.method, {
        ...params.formData,
    });
    return data;
};

const handleDeleteCategory = async (categoryId: string) => {
    const { data } = await apiFetch(deleteTemplateCategory.api(categoryId), deleteTemplateCategory.method);
    return data;
};
const CategoryActions = <T extends FieldValues>(props: CategoryActionProps<T>) => {
    const { category, categorySelectRef, onDelete } = props;
    const { t } = useTranslation();
    const [{ dialogForm }, dialogHolder] = useDialog();
    const queryClient = useQueryClient();

    const updateCategory = useMutation({
        mutationFn: handleUpdateCategory,
    });

    const deleteCategory = useMutation({
        mutationFn: handleDeleteCategory,
    });

    const openUpdateCategory = useCallback(() => {
        const isEditMode = !!category._id; // Check if category has an ID
        dialogForm<CategoryPayload>({
            title: isEditMode ? t('templates_edit_category') : t('templates_new_category'),
            content: (formMethods) => <CategoryForm methods={formMethods} />,
            onConfirm: async (formData, { setError: setFormError }) => {
                try {
                    await updateCategory.mutateAsync({ categoryId: category._id, formData });
                    await queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
                    categorySelectRef.current?.refresh();

                    return true;
                } catch (err) {
                    const errorRes = err as AxiosError;
                    if (errorRes.response?.data?.error_code === 'category_already_exists') {
                        setFormError('name', {
                            type: 'custom',
                            message: t('template_category_name_duplicated'),
                        });
                    }
                    return false;
                }
            },
            onClose: () => {},
            defaultValues: {
                name: category.name,
                description: category.description,
            },
            hideCancelButton: true,
            confirmText: t('update'),
            actionsAlign: 'flex-start',
            confirmButtonProps: {
                size: 'default',
            },
            showCloseButton: true,
        });
    }, [dialogForm, t, category, categorySelectRef, updateCategory, queryClient]);

    return (
        <Space size={8}>
            {dialogHolder}
            <IconButton
                size={'xs'}
                variant="text"
                type="secondary"
                sx={{ padding: 0 }}
                onClick={() => {
                    openUpdateCategory();
                }}
            >
                <Icon name="edit" />
            </IconButton>
            <IconButton
                size={'xs'}
                variant="text"
                type="secondary"
                loading={deleteCategory.isPending}
                sx={{ padding: 0 }}
                onClick={async () => {
                    dialog({
                        title: t('message_template_category_delete_dialog_title'),
                        content: t('message_template_category_delete_dialog_content'),
                        onConfirm: async () => {
                            try {
                                await deleteCategory.mutateAsync(category._id);
                                onDelete();
                            } catch (error) {
                                console.log(error);
                            }
                        },
                        confirmText: t('delete'),
                        confirmButtonProps: {
                            type: 'danger',
                        },
                    });
                }}
            >
                <Icon name="delete" />
            </IconButton>
        </Space>
    );
};

export default CategoryActions;
