import type { useDialog } from '@imbrace/ui';
import { Button, Icon, Select, Space, Typography } from '@imbrace/ui';
import { useCallback, useMemo, useRef, useState  } from 'react';
import { useTranslation } from 'react-i18next';

import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import { deleteBoardSegmentation, getBoardSegmentation, postBoardSegmentation, putBoardSegmentation } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';

import { defaultFilter } from '../components/FilterContent';
import SegmentationModal from '../components/Segmentation';

interface UseSegmentationProps {
    currentBoard: API.Board | undefined;
    tableRef: React.RefObject<FlexibleTableRef<API.BoardItem>>;
    dialog: ReturnType<typeof useDialog>[0]['dialog'];
    getMemberOptionRequest: () => Promise<{ value: string; text: string }[]>;
}

const useSegmentation = ({ currentBoard, tableRef, dialog, getMemberOptionRequest }: UseSegmentationProps) => {
    const [selectedSegmentation, setSelectedSegmentation] = useState<API.Segmentation>();
    const refSegmentation = useRef<API.Segmentation[]>([]);
    const { t } = useTranslation();

    const applyFilters = useCallback((additionalFilters: API.Filters[]) => {
        const filters =
            additionalFilters
                ?.filter((filterValue) => {
                    if (filterValue.field_id) {
                        if (
                            filterValue?.operator !== 'is_empty' &&
                            filterValue?.operator !== 'is_not_empty' &&
                            filterValue?.operator !== 'is_checked' &&
                            filterValue?.operator !== 'is_not_checked'
                        ) {
                            if (filterValue.value === '') return false;
                            if (
                                Array.isArray(filterValue.value) &&
                                filterValue.value.some((v) => v === '' || v === null || v === undefined)
                            ) {
                                return false;
                            }
                        }
                        return true;
                    }
                    return false;
                })
                .map((filterValue) => ({
                    id: filterValue.field_id as string,
                    value: {
                        value: filterValue.value,
                        operator: filterValue.operator,
                        condition: filterValue.condition,
                    },
                })) ?? [];

        tableRef.current?.setColumnFilters(filters);
    }, []);

    const getSegmentation = useCallback(async () => {
        try {
            if (currentBoard?._id) {
                const { data } = await apiFetch<{ data: API.Segmentation[] }>(
                    getBoardSegmentation.api(currentBoard._id),
                    getBoardSegmentation.method,
                );
                // Backend currently returns `id` instead of `_id` — normalize so
                // downstream lookups by `_id` keep working.
                const list = (data.data || []).map((s: any) => ({ ...s, _id: s._id || s.id }));
                refSegmentation.current = list;
                return {
                    data: list,
                    options: list.map((segmentation) => ({
                        id: segmentation._id,
                        text: segmentation.name,
                        description: segmentation.description,
                    })),
                };
            }
            return { data: [], options: [] };
        } catch (error) {
            return { data: [], options: [] };
        }
    }, [currentBoard]);

    const createSegmentation = useCallback(
        async (formData: API.Segmentation) => {
            if (currentBoard?._id) {
                const { data } = await apiFetch<API.Segmentation>(
                    postBoardSegmentation.api(currentBoard._id),
                    postBoardSegmentation.method,
                    formData,
                );
                return data;
            }
            return false;
        },
        [currentBoard, applyFilters],
    );

    const editSegmentation = useCallback(
        async (formData: API.Segmentation) => {
            if (currentBoard?._id && formData._id) {
                const { data } = await apiFetch<API.Segmentation>(
                    putBoardSegmentation.api(currentBoard._id, formData._id),
                    putBoardSegmentation.method,
                    formData,
                );
                return data;
            }
            return false;
        },
        [currentBoard, applyFilters],
    );

    const onDeleteSegmentation = useCallback(
        async (segmentationId: string) => {
            try {
                if (currentBoard) {
                    const result = await apiFetch(
                        deleteBoardSegmentation.api(currentBoard._id, segmentationId),
                        deleteBoardSegmentation.method,
                    );
                    return result;
                }
            } catch (error) {
                console.log(error);
            }
        },
        [currentBoard],
    );

    const handleDeleteSegmentation = useCallback(() => {
        dialog({
            title: t('crm_segmentation_delete_confirm', { name: selectedSegmentation?.name }),
            content: t('segmentation_delete_desc'),
            onConfirm: async () => {
                if (selectedSegmentation?._id) {
                    const result = await onDeleteSegmentation(selectedSegmentation?._id);
                    if (result) {
                        tableRef.current?.resetFilterState();
                        setSelectedSegmentation(undefined);
                        return true;
                    }
                }
            },
            onClose: () => {},
            confirmButtonProps: {
                type: 'danger',
            },
        });
    }, [dialog, t, onDeleteSegmentation, selectedSegmentation?._id, selectedSegmentation?.name]);

    const createUpdateSegmentationDialog = useCallback(
        async (defaultValues: Partial<API.Segmentation>, isEdit = false) => {
            dialog({
                title: isEdit ? t('crm_edit_segmentation') : t('crm_create_segmentation'),
                paperSx: {
                    width: '100%',
                    maxWidth: '1000px',
                },
                content: ({ onClose }) => (
                    <SegmentationModal
                        isEdit={isEdit}
                        onClose={onClose ?? (() => {})}
                        onBack={() => {
                            onClose?.();
                            selectSegmentationDialog();
                        }}
                        onDelete={async () => {
                            await handleDeleteSegmentation();
                            onClose?.();
                        }}
                        defaultValues={{
                            _id: defaultValues?._id || '',
                            name: defaultValues?.name || '',
                            description: defaultValues?.description || '',
                            filters: defaultValues?.filters || [],
                        }}
                        fields={currentBoard?.fields}
                        request={getMemberOptionRequest}
                        onSubmit={async (formData) => {
                            if (isEdit) {
                                const result = await editSegmentation(formData);
                                if (result) {
                                    onClose?.();
                                    if (formData._id === result?._id) {
                                        applyFilters(formData.filters);
                                        setSelectedSegmentation(result);
                                    }
                                }
                            } else {
                                const result = await createSegmentation(formData);
                                if (result) {
                                    onClose?.();
                                    applyFilters(result.filters);
                                    setSelectedSegmentation(result);
                                }
                            }
                        }}
                    />
                ),
                hideCancelButton: true,
                hideConfirmButton: true,
            });
        },
        [t, createSegmentation, editSegmentation, currentBoard?.fields, handleDeleteSegmentation, getMemberOptionRequest],
    );

    const selectSegmentationDialog = useCallback(() => {
        dialog({
            title: t('crm_segmentation_title', { name: currentBoard?.name }),
            paperSx: {
                width: '80%',
                maxWidth: '800px',
            },
            content: ({ onClose }) => {
                const [localSelection, setLocalSelection] = useState<API.Segmentation | undefined>(selectedSegmentation);
                return (
                    <>
                        <Typography style={{ color: '#828282', marginBottom: '32px' }}>{t('crm_segmentation_description')}</Typography>
                        <Select
                            queryKey={['segmentation', { boardId: currentBoard?._id }]}
                            fullWidth
                            value={localSelection?._id}
                            onChange={(selectedId) => {
                                const segmentation = refSegmentation.current?.find((seg) => seg._id === selectedId);
                                if (segmentation) {
                                    let filters = segmentation.filters.filter(
                                        (filter) => currentBoard?.fields.findIndex((field) => field._id === filter.field_id) !== -1,
                                    );
                                    filters = filters.map((filter) => {
                                        const currentField = currentBoard?.fields.find((field) => field._id === filter.field_id);
                                        if (currentField?.type === 'Date' && typeof filter.value === 'string') {
                                            return {
                                                ...filter,
                                                value: ['exactly', filter.value],
                                            };
                                        }
                                        return filter;
                                    });
                                }
                                setLocalSelection(segmentation);
                            }}
                            closeOnSelect
                            request={async () => {
                                const result = await getSegmentation();
                                return result.options.map((option) => ({
                                    value: option.id,
                                    text: option.text,
                                }));
                            }}
                            emptyText={t('no_segmentation_options')}
                        />
                        <Space style={{ marginTop: 12 }}>
                            <Button
                                variant="link"
                                startIcon={<Icon name="add" />}
                                text={t('new_segmentation')}
                                onClick={() => {
                                    onClose?.();
                                    createUpdateSegmentationDialog({
                                        filters: [
                                            {
                                                operator: 'is',
                                                condition: 'and',
                                                field_id: currentBoard?.fields?.find(
                                                    (field) => defaultFilter[currentBoard.type] === field.default_field_name,
                                                )?._id,
                                            },
                                        ],
                                    });
                                }}
                            />
                        </Space>
                        <Space justify="end" style={{ marginTop: 32 }}>
                            {localSelection && (
                                <Button
                                    sx={{ width: '160px', height: '40px', borderRadius: '8px' }}
                                    variant="link"
                                    text={t('segmentation_edit_segment')}
                                    onClick={() => {
                                        onClose?.();
                                        if (localSelection) {
                                            createUpdateSegmentationDialog(localSelection, true);
                                        }
                                    }}
                                />
                            )}
                            <Button
                                sx={{ width: '160px', height: '40px', borderRadius: '8px' }}
                                variant="contained"
                                text={t('apply')}
                                onClick={() => {
                                    if (localSelection?.filters) {
                                        setSelectedSegmentation(localSelection);
                                        applyFilters(localSelection?.filters);
                                    }
                                    onClose?.();
                                }}
                            />
                        </Space>
                    </>
                );
            },
            hideConfirmButton: true,
            confirmText: t('apply'),
            confirmButtonProps: {
                sx: {
                    width: '160px',
                    height: '40px',
                    borderRadius: '8px',
                },
            },
            hideCancelButton: true,
            onConfirm: async () => {},
        });
    }, [dialog, currentBoard, selectedSegmentation, getSegmentation, createUpdateSegmentationDialog]);

    return useMemo(
        () => ({
            selectedSegmentation,
            setSelectedSegmentation,
            applyFilters,
            selectSegmentationDialog,
            createUpdateSegmentationDialog,
        }),
        [selectedSegmentation, setSelectedSegmentation, applyFilters, selectSegmentationDialog, createUpdateSegmentationDialog],
    );
};

export default useSegmentation;
