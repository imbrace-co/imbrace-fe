import { FileItem, Folder, SOURCE_TYPE } from '@/pages/KnowledgeHub';
import { getKnowledgeHubFolderById, getKnowledgeHubFoldersSearch, postKnowledgeHubFolder } from '@/services/api/knowledgeHub';
import apiFetch from '@/services/axios/handler';
import { Button, FieldCheckbox, FieldSelect, FieldText, Space, useDialog } from '@imbrace/ui';
import React, { useCallback, useState, SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getCookie } from 'typescript-cookie';
import plusIcon from '@/assets/icons/ai_plus.svg';
import { Controller, useForm } from 'react-hook-form';
import { Box } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotify } from '@/contexts/SnackbarContext';
import styles from './index.module.scss';

interface SystemFolderModalProps {
    addNewFolderForImport: () => void;
    openImportFilesProcess: (folderId: string, selectedFiles: Array<FileItem>) => void;
    selectedFiles: Array<FileItem>;
    onClose: () => void;
}

const AddFolderForm = ({
    onClose,
    onFolderCreated,
    resetSubFolder,
}: {
    onClose: () => void;
    onFolderCreated: (id: string) => void;
    resetSubFolder: () => void;
}) => {
    const { t } = useTranslation();
    const { notify } = useNotify();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const folderDefault = {
        name: '',
        description: '',
        organization_id: getCookie('org_id'),
        parent_folder_id: 'root',
        source_type: 'upload',
        tags: [],
        auto_tagging: true,
    };

    const {
        control,
        handleSubmit,
        formState: { isDirty, isValid },
        reset,
    } = useForm<Folder>({
        defaultValues: folderDefault,
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
            return data.data;
        },
        onSuccess: async (data) => {
            // Invalidate and refetch the folder list
            await queryClient.invalidateQueries({ queryKey: ['folder'] });

            // Set the newly created folder as selected
            if (data && data._id) {
                onFolderCreated(data._id);
            }

            // Reset the form
            reset();
            resetSubFolder();
            notify({
                type: 'success',
                message: t('Folder created successfully'),
            });
            onClose();
        },
    });

    const onSubmit = async (formData: Folder) => {
        try {
            setLoading(true);
            await createFolder.mutateAsync(formData);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
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
            </Box>
            <Space style={{ marginTop: '5vh' }} direction="horizontal" justify="end">
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
                    onClick={() => onClose()}
                />
                <Button
                    sx={{
                        width: '160px',
                        borderRadius: '4px',
                    }}
                    disabled={loading || !isDirty || !isValid}
                    loading={loading}
                    variant="contained"
                    text={t('create')}
                    onClick={() => handleSubmit(onSubmit)()}
                />
            </Space>
        </Box>
    );
};

const SystemFolderModal: React.FC<SystemFolderModalProps> = ({ addNewFolderForImport, openImportFilesProcess, selectedFiles, onClose }) => {
    const { t } = useTranslation();

    const [systemFolderSelected, setSystemFolderSelected] = useState<string>('');
    const [subFolderSelected, setSubFolderSelected] = useState<string>('');
    const [saveToSubFolder, setSaveToSubFolder] = useState<boolean>(false);

    const [{ dialogForm, dialog }, dialogsHolder] = useDialog();
    const { notify } = useNotify();
    const queryClient = useQueryClient();

    const fetchKnowledgeFolder = async () => {
        const searchParams = new URLSearchParams();
        searchParams.append('q', '');
        const folderURL = getKnowledgeHubFoldersSearch.api('');
        const { data } = await apiFetch<{ data: Array<Folder> }>(folderURL, getKnowledgeHubFoldersSearch.method);
        const rootFolderOptions =
            data?.data?.filter(
                (folder) => folder.parent_folder_id === 'root' && !(folder.source_type === SOURCE_TYPE.EXTERNAL && folder.is_sync_enabled),
            ) || [];
        setSystemFolderSelected(rootFolderOptions?.[0]?._id || '');
        const folderList = rootFolderOptions?.map((item) => {
            return {
                text: item.name,
                value: item._id,
            };
        });
        return folderList;
    };

    const onAddNewFolderProcess = () => {
        dialog({
            title: '',
            paperSx: {
                width: '80%',
                maxWidth: '550px',
                height: '700px',
                maxHeight: '90vh',
                '>div': {
                    padding: '0 1.5vw 2.5vw 1.5vw!important',
                },
                '>div:first-child': {
                    padding: '12px 12px 0!important',
                    marginBottom: '0!important',
                },
            },
            content: ({ onClose }) => {
                return (
                    <AddFolderForm
                        onClose={onClose || (() => {})}
                        onFolderCreated={(id) => setSystemFolderSelected(id)}
                        resetSubFolder={() => {
                            setSaveToSubFolder(false);
                            setSubFolderSelected('');
                        }}
                    />
                );
            },
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            actionsAlign: 'flex-start',
        });
    };

    const fetchSubFolderByFolderId = async (folderId: string) => {
        try {
            if (!folderId) return [];
            const { data } = await apiFetch<{ data: { folder: Folder; subfolders: Array<Folder> } }>(
                getKnowledgeHubFolderById.api(folderId, true),
                getKnowledgeHubFolderById.method,
            );

            if (data?.data) {
                const subFolders = data?.data?.subfolders?.map((item) => {
                    return {
                        text: item.path,
                        value: item._id,
                    };
                });
                return subFolders;
            }
            return [];
        } catch (error) {
            console.error('fetch folder error: ', error);
            return [];
        }
    };

    return (
        <Space direction="vertical" align="start" justify="start">
            <span style={{ fontSize: 16, marginBottom: '20px', fontWeight: 600 }}>
                {selectedFiles.length} {selectedFiles.length > 1 ? 'Files are' : 'File is'} selected
            </span>
            {dialogsHolder}
            <Space size={12} style={{ width: '100%' }}>
                <Space
                    size={12}
                    style={{ width: '100%', display: 'flex', fontSize: 14, justifyContent: 'space-between', marginBottom: '1vh' }}
                >
                    <label style={{ color: 'var(--color-light-7)', fontWeight: 800 }}>Save to</label>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        onClick={() => {
                            onAddNewFolderProcess();
                        }}
                        className={styles.addNewFolderLabel}
                    >
                        <img src={plusIcon} alt="Plus Icon" />

                        <span style={{ color: 'var(--color-primary-1)', marginLeft: '5px' }}>
                            {t('knowledge_external_create_new_folder')}
                        </span>
                    </div>
                </Space>
            </Space>
            <Space size={12} style={{ width: '100%' }}>
                <FieldSelect
                    searchable
                    fullWidth
                    queryKey={['folder']}
                    key={'parent-folder-select'}
                    value={systemFolderSelected}
                    onChange={(value) => {
                        if (value) {
                            setSystemFolderSelected(value);
                            setSubFolderSelected(''); // Reset subfolder when parent changes
                        }
                    }}
                    request={fetchKnowledgeFolder}
                    containerStyle={{ flex: 1 }}
                />
            </Space>
            <Space size={12} style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '12px' }}>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '8px',
                        width: '30%',
                        minWidth: '30%',
                    }}
                >
                    <FieldCheckbox
                        value={saveToSubFolder}
                        onChange={(checked) => {
                            setSaveToSubFolder(checked);
                            if (!checked) {
                                setSubFolderSelected(''); // Clear subfolder selection when unchecked
                            }
                        }}
                        formControlSx={{
                            width: 'auto',
                            minWidth: 'auto',
                            maxWidth: 'fit-content',
                        }}
                        sx={{
                            width: 'auto',
                            minWidth: 'auto',
                            maxWidth: 'fit-content',
                        }}
                    />
                    <label
                        style={{
                            color: 'var(--color-primary-1)',
                            fontWeight: 400,
                            fontSize: '14px',
                            cursor: 'pointer',
                            userSelect: 'none',
                        }}
                    >
                        {t('knowledge_external_save_to_sub_folder')}
                    </label>
                </div>
                <FieldSelect
                    searchable
                    fullWidth
                    disabled={!systemFolderSelected || !saveToSubFolder}
                    key={`sub-folder-${systemFolderSelected}`}
                    queryKey={['sub-folder', systemFolderSelected]}
                    value={subFolderSelected}
                    onChange={async (value) => {
                        if (value) {
                            setSubFolderSelected(value);
                        }
                    }}
                    request={() => fetchSubFolderByFolderId(systemFolderSelected)}
                    containerStyle={{ flex: 1 }}
                />
            </Space>
            <Space size={12} style={{ position: 'absolute', right: '2.5vw', bottom: '2.5vw' }}>
                <Button
                    sx={{
                        // width: '105px',
                        padding: '0px',
                        borderRadius: '4px',
                        width: '140px',
                    }}
                    onClick={() => {
                        onClose?.();
                    }}
                    type="primary"
                    variant="outlined"
                    text={t('back')}
                />
                <Button
                    sx={{
                        padding: '0px',
                        borderRadius: '4px',
                        width: '140px',
                    }}
                    onClick={() => {
                        // Use subfolder if checkbox is checked and subfolder is selected, otherwise use parent folder
                        const targetFolderId = saveToSubFolder && subFolderSelected ? subFolderSelected : systemFolderSelected;
                        openImportFilesProcess(targetFolderId, selectedFiles);
                        onClose?.();
                    }}
                    type="primary"
                    variant="contained"
                    text={t('import')}
                />
            </Space>
        </Space>
    );
};

export default SystemFolderModal;
