import { Button, FieldText, Icon, Space, Switch, Tooltip, Typography, useDialog, useModal } from '@imbrace/ui';
import { Box, Chip as MuiChip, styled } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import type { OptionsObject } from 'notistack';
import { enqueueSnackbar } from 'notistack';
import type { MutableRefObject, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { NavigateFunction } from 'react-router-dom';

import IconGuideDetail from '@/assets/icons/icon_guide_detail.svg?react';
import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import { useNotify } from '@/contexts/SnackbarContext';
import FileImport from '@/pages/DataboardEnhance/components/FileImport';
import type { AlertVariantProps } from '@/Router';
import { generateAITags, getKnowledgeHubFolderById, postKnowledgeHubFolder, putKnowledgeHubFolderById } from '@/services/api/knowledgeHub';
import apiFetch from '@/services/axios/handler';

import type { Folder } from '../..';
import styles from './index.module.scss';
import TooltipWithHelpIcon from '@/components/TooltipWithHelpIcon';
import { getCookie } from 'typescript-cookie';

enum FolderSettingTab {
    General = 'general',
    ImportFolder = 'ImportFolder',
}
const Chip = styled(MuiChip, { shouldForwardProp: (propName) => propName !== 'selected' })(({ selected }: { selected?: boolean }) => ({
    height: 24,
    background: selected ? '#FA991733' : 'var(--color-primary-3)',
    position: 'relative',
    '& svg': {
        display: 'inline-block',
        fontSize: 24,
        marginLeft: '12px',
        color: 'var(--color-light-5)',
    },
}));

export interface FolderSettingProps {
    navigateRef?: MutableRefObject<NavigateFunction>;
    tableRef?: RefObject<FlexibleTableRef<API.BoardItem>>;
    isEditMode?: boolean;
    folderId?: string;
    onClose?: () => void;
    setCurrentTab?: (tab: string) => void;
    onDeleteBoard?: () => void;
    refetchKnowledgeList?: () => void;
}

export const FolderSetting = ({ onClose, refetchKnowledgeList, isEditMode = false, folderId }: FolderSettingProps) => {
    const { t } = useTranslation();
    const { notify } = useNotify();
    const folderDefault = {
        name: '',
        description: '',
        organization_id: getCookie('org_id'),
        parent_folder_id: 'root',
        source_type: 'upload',
        tags: [],
        auto_tagging: true,
    } as unknown as API.Folder;
    const [currentBoard, setCurrentBoard] = useState<API.Folder>(folderDefault);
    const [tab, setTab] = useState<FolderSettingTab>(FolderSettingTab.General);
    const [loading, setLoading] = useState(false);
    const [showAddTagInput, setShowAddTagInput] = useState(false);
    const [isGeneratingTags, setIsGeneratingTags] = useState(false);
    const [folderIdForImport, setFolderIdForImport] = useState<string>('');

    const tagInputRef = useRef<HTMLInputElement>(null);
    const [{ modal }, modalHolder] = useModal();
    const [{ dialogForm, dialog }, dialogsHolder] = useDialog();
    const {
        control,
        handleSubmit,
        formState: { isDirty, isValid },
        reset,
        watch,
        setValue,
        getValues,
    } = useForm<Folder>({
        defaultValues: currentBoard,
    });

    const folderTags = watch('tags');
    const enableAutoTagging = watch('auto_tagging');
    const folderName = watch('name');
    const folderDescription = watch('description');
    const isAllowGenerateAITags = enableAutoTagging && folderName && folderDescription;

    const fetchKnowledgeId = useCallback(async () => {
        try {
            const { data } = await apiFetch<{ data: { folder: Folder } }>(
                getKnowledgeHubFolderById.api(folderId || '', false),
                getKnowledgeHubFolderById.method,
            );
            const folder = data?.data?.folder;
            reset({ ...folder, tags: folder?.tags ?? [] });
        } catch (error) {
            console.error('fetch folder error: ', error);
        }
    }, [reset, folderId]);

    useEffect(() => {
        isEditMode && fetchKnowledgeId();
    }, [fetchKnowledgeId, isEditMode]);

    const showNotiNoTagMatching = () => {
        dialog({
            title: t('no_matching_tags_found'),
            content: (
                <div className={styles.tagGenerateEmpty}>
                    <span>{t('no_matching_tags_desc')}</span>
                    <span>{t('check_folder_name_desc')}</span>
                </div>
            ),
            cancelText: 'OK',
            actionsAlign: 'flex-end',
            onClose: () => {},
            hideConfirmButton: true,
            paperSx: {
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '380px',
                'div>div:last-child': {
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: '20px',
                },
                'div:first-child': {
                    padding: '0!important',
                },
                button: {
                    textTransform: 'capitalize',
                    '&:first-child': {
                        color: '#333',
                        borderColor: '#fa9917',
                    },
                },
            },
        });
    };

    const generateTags = async () => {
        setIsGeneratingTags(true);
        try {
            const { data } = await apiFetch<{ data: API.AIGenerateTags }>(generateAITags.api(), generateAITags.method, {
                folder_name: folderName,
                description: folderDescription,
            });
            const generatedTags = data?.data?.tags || [];
            const generateTagNoMatching = generatedTags.every((tag) => tag.trim() === '');
            if (generateTagNoMatching) {
                showNotiNoTagMatching();
                return;
            }
            const currentTags = getValues('tags') || [];
            const allTags = [...currentTags, ...generatedTags];
            const cleanedUniqueTags = [...new Set(allTags.filter((tag) => tag.trim() !== ''))];
            setValue('tags', cleanedUniqueTags, { shouldDirty: true });
        } catch (error) {
            console.error('generate AI Tags error: ', error);
        } finally {
            setIsGeneratingTags(false);
        }
    };

    function TagInput({ value = folderTags, onChange }: { value: Array<string>; onChange: (newTags: string[]) => void }) {
        const addNewTag = () => {
            if (tagInputRef.current && tagInputRef.current.value.trim() !== '') {
                if (!value.includes(tagInputRef.current.value.trim())) {
                    onChange([...value, tagInputRef.current.value.trim()]);
                }
                tagInputRef.current.value = '';
                setTimeout(() => {
                    tagInputRef.current?.focus();
                }, 0);
            }
        };
        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addNewTag();
            }
        };

        const handleRemoveTag = (index: number) => {
            const newTags = [...value];
            newTags.splice(index, 1);
            onChange(newTags);
        };

        return (
            <div className={styles.tagArea}>
                {value.map((tag, index) => (
                    <Chip
                        selected
                        key={index}
                        label={tag}
                        onDelete={() => {
                            handleRemoveTag(index);
                        }}
                        sx={{
                            '& .MuiChip-label': {
                                paddingRight: '24px',
                            },
                        }}
                        deleteIcon={
                            <Icon
                                name="close"
                                onMouseDown={(event) => event.stopPropagation()}
                                style={{
                                    margin: 0,
                                    fontSize: 12,
                                    color: '#FA9917CC',
                                    position: 'absolute',
                                    right: '8px',
                                }}
                            />
                        }
                    />
                ))}
                {showAddTagInput && (
                    <Space className={styles.tagInput}>
                        <input type="text" ref={tagInputRef} onKeyDown={handleKeyDown} placeholder={t('knowledge_enter_a_tag')} />
                        <button onClick={() => addNewTag()}>Add to Tag List</button>
                    </Space>
                )}
            </div>
        );
    }

    const renderGeneralInfo = () => {
        return (
            <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <span style={{ fontSize: 16, textTransform: 'uppercase', marginBottom: '10px', fontWeight: 800 }}>
                        {t('knowledge_folder_settings')}
                    </span>
                    <Controller
                        name="name"
                        control={control}
                        rules={{
                            required: t('validation_board_setting_name_required'),
                            validate: {
                                checkSpace: (val: string) => val.trim().length > 0 || t('validation_board_setting_name_required'),
                            },
                            maxLength: {
                                value: 150,
                                message: t('validation_board_setting_name_maxlength'),
                            },
                            minLength: {
                                value: 4,
                                message: t('validation_board_setting_name_minlength'),
                            },
                        }}
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                label={`${t('knowledge_folder_name')}  *`}
                                fullWidth
                                error={!!error}
                                helperText={error?.message}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="description"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                            <div className={styles.boardDesc}>
                                <FieldText label={t('description')} fullWidth error={!!error} helperText={error?.message} {...field} />
                            </div>
                        )}
                    />

                    <Controller
                        name="auto_tagging"
                        control={control}
                        render={({ field }) => (
                            <Space
                                direction="horizontal"
                                style={{ width: '100%', justifyContent: 'space-between', marginBottom: '-10px' }}
                                align="start"
                            >
                                <Space direction="horizontal">
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            fontSize: 14,
                                            fontWeight: 800,
                                            color: 'var(--color-light-7)',
                                        }}
                                    >
                                        {t('knowledge_tag_system')}
                                        <TooltipWithHelpIcon placement="top" title={t('knowledge_generate_tags_desc')} />
                                    </span>
                                </Space>
                                <Space direction="horizontal" style={{ justifyContent: 'end' }}>
                                    <Typography variant="Body" style={{ flex: 1, color: 'var(--color-primary-1)', fontWeight: 400 }}>
                                        {t('knowledge_enable_auto_tagging')}
                                    </Typography>
                                    <Switch
                                        sx={{ transform: 'scale(.8)' }}
                                        checked={field.value || false}
                                        onChange={async (checked) => {
                                            field.onChange(checked);
                                        }}
                                        size="small"
                                    />
                                </Space>
                            </Space>
                        )}
                    />

                    <Controller
                        control={control}
                        name="tags"
                        render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'end' }}>
                        <Button
                            className={`${styles.tagsButtonCommon} ${styles.tagButton}`}
                            size={'s'}
                            variant="outlined"
                            onClick={() => {
                                setShowAddTagInput(true);
                                setTimeout(() => {
                                    tagInputRef.current?.focus();
                                });
                            }}
                            text={t('knowledge_add_a_tag')}
                        />

                        <Button
                            className={`${styles.tagsButtonCommon} ${styles.tagButton}`}
                            size={'s'}
                            variant="outlined"
                            onClick={() => generateTags()}
                            disabled={!isAllowGenerateAITags}
                            loading={isGeneratingTags}
                            text={t('knowledge_generate_tags', { quantity: 5 })}
                        />
                    </Box>
                </Box>
            </>
        );
    };

    const renderImportArea = () => {
        return (
            <div style={{ marginBottom: '3vh' }}>
                <label className={styles.importFileTab}>{t('knowledge_import_files')}</label>
                <div style={{ marginTop: '3vh' }}>
                    <FileImport
                        folderId={folderIdForImport}
                        isHideCloseIcon={true}
                        fileImportHeight={438}
                        onImportSuccess={() => {
                            onClose?.();
                            refetchKnowledgeList?.();
                            notify({
                                type: 'success',
                                message: t('Import file successfully'),
                            });
                        }}
                    />
                </div>
            </div>
        );
    };

    const updateFolder = useMutation({
        mutationFn: async (params: Folder) => {
            const { data } = await apiFetch<API.Board>(
                putKnowledgeHubFolderById.api(params._id || ''),
                putKnowledgeHubFolderById.method,
                params,
            );
            return data;
        },
        onSuccess: async (data) => {
            notify({
                type: 'success',
                message: t('Folder updated successfully'),
            });
        },
    });

    const createFolder = useMutation({
        mutationFn: async (form: Folder) => {
            const formData = {
                ...form,
            };
            const payload = {
                ...formData,
            };
            const { data } = await apiFetch<{ data: Folder }>(postKnowledgeHubFolder.api(), postKnowledgeHubFolder.method, payload);
            setFolderIdForImport(data?.data?._id || '');
            return data.data;
        },
        onSuccess: async (data) => {
            notify({
                type: 'success',
                message: t('Folder created successfully'),
            });
        },
    });

    const onSubmit = useCallback(
        async (formData: Folder) => {
            try {
                setLoading(true);
                if (isEditMode) {
                    await updateFolder.mutateAsync(formData);
                    refetchKnowledgeList?.();
                    onClose?.();
                    return;
                } else {
                    await createFolder.mutateAsync(formData);
                    refetchKnowledgeList?.();
                    setTab(FolderSettingTab.ImportFolder);
                    return;
                }
            } catch (error) {
                console.error('Error:', error);
                const snackbarOption: OptionsObject<'alert'> & AlertVariantProps = {
                    key: `${new Date().getTime()}`,
                    anchorOrigin: {
                        horizontal: 'right',
                        vertical: 'top',
                    },
                    variant: 'alert',
                    type: 'error',
                    autoHideDuration: 3000,
                    snackBarId: `${new Date().getTime()}`,
                };

                enqueueSnackbar('Something went wrong, please try again.', snackbarOption);
            } finally {
                setLoading(false);
            }
        },
        [isEditMode, createFolder, updateFolder],
    );

    const ActionButtons = () => {
        if (tab === FolderSettingTab.General) {
            return (
                <>
                    <Button
                        sx={{
                            width: '160px',
                            border: '1px solid var(--color-danger-1)',
                            color: 'var(--color-danger-1)',
                            background: 'var(--color-light-1)!important',
                            borderRadius: '4px',
                        }}
                        variant="contained"
                        text={t('cancel')}
                        onClick={() => onClose?.()}
                    />
                    <Button
                        sx={{
                            width: '160px',
                            borderRadius: '4px',
                        }}
                        disabled={loading || !isDirty || !isValid}
                        loading={loading}
                        variant="contained"
                        text={isEditMode ? t('save') : t('create')}
                        onClick={() => handleSubmit(onSubmit)()}
                    />
                </>
            );
        } else {
            return (
                <Button
                    sx={{
                        width: '160px',
                    }}
                    variant="outlined"
                    text={t('skip')}
                    onClick={() => {
                        refetchKnowledgeList?.();
                        onClose?.();
                    }}
                />
            );
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            {modalHolder}
            {dialogsHolder}
            {tab === FolderSettingTab.General && renderGeneralInfo()}
            {tab === FolderSettingTab.ImportFolder && renderImportArea()}
            <Space style={{ marginTop: tab === FolderSettingTab.ImportFolder ? '1vh' : '5vh' }} direction="horizontal" justify="end">
                <ActionButtons />
            </Space>
        </Box>
    );
};
