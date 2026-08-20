import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import type { Option, SelectRef } from '@imbrace/ui';
import { Button, Checkbox, FieldSelect, FieldText, Icon, IconButton, Space, Typography } from '@imbrace/ui';
import { Box, Divider } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { Transition } from 'history';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import SimpleBar from 'simplebar-react';

import { dialog } from '@/components/Dialog';
import useAccess from '@/hooks/useAccess';
import usePrompt from '@/hooks/usePrompt';
import SelectSchedule from '@/pages/Databoards/components/BoardAutomation/components/SelectSechedule';
import { useAppSelector } from '@/redux/store';
import { fetchAllApWorkflows } from '@/services/api/apWorkflow';
import apiFetch from '@/services/axios/handler';
import { getIsAllowModify } from '@/utils/CookiesHelper';
import { env } from '@/env';
import { getKnowledgeHubFolderById } from '@/services/api/knowledgeHub';
import { Folder } from '@/pages/KnowledgeHub';

interface FolderResponse {
    folder: Folder;
    subfolders: Array<Folder>;
}

type WorkflowProvider = 'n8n' | 'ap';

interface AutomationContentProps {
    currentBoard?: API.Board;
    currentContent: API.AutomationWorkflow | 'new' | undefined | 'delete';
    onSaveForm: () => Promise<void>;
    columnOptions: Option[];
    menuType: 'condition' | 'default';
    setMenuType: (value: 'condition' | 'default') => void;
    isCreateTypeExisted: boolean | undefined;
    isDeleteTypeExisted: boolean | undefined;
    knowledgeHub?: boolean;
    crm?: boolean;
    isDocumentAIRoute?: boolean;
    isDrive?: boolean;
}

const AutomationContent = (props: AutomationContentProps) => {
    const {
        currentBoard,
        currentContent,
        columnOptions,
        onSaveForm,
        menuType,
        setMenuType,
        isCreateTypeExisted,
        isDeleteTypeExisted,
        crm,
        knowledgeHub,
        isDocumentAIRoute,
        isDrive,
    } = props;
    const { t, i18n } = useTranslation();
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const organizationPartition = useAppSelector((state) => state.Account.partition);
    const navigate = useNavigate();
    const location = useLocation();
    const workflowNameRef = useRef<string>('');
    const typeRef = useRef<SelectRef>(null);
    const prevTypeRef = useRef<string>('');
    const hasFetchedWorkflowListRef = useRef(false);
    const basePath = useMemo(() => {
        if (knowledgeHub) {
            return isDrive ? 'knowledge-hub-all/drive' : 'knowledge-hub-all';
        }
        return crm ? 'crm' : isDocumentAIRoute ? 'document-ai' : 'databoards';
    }, [knowledgeHub, crm, isDrive, isDocumentAIRoute]);

    const [fullscreen, setOpenFullscreen] = useState<boolean>(false);
    const [workflowProviderById, setWorkflowProviderById] = useState<Record<string, WorkflowProvider>>({});
    const { features } = useAccess();
    const {
        control,
        watch,
        getValues,
        setValue,
        trigger,
        formState: { isDirty },
    } = useFormContext();
    const isAllowModifyBoard = getIsAllowModify();
    const [subfolders, setSubfolders] = useState<Folder[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(true);

    useEffect(() => {
        if (!isDrive || !currentBoard?._id) return;

        const fetchSubfolders = async () => {
            try {
                const url = getKnowledgeHubFolderById.api(currentBoard._id, true);
                const { data } = await apiFetch<{ data: FolderResponse }>(url, getKnowledgeHubFolderById.method);
                if (data?.data) {
                    const children = data.data.subfolders || [];
                    setSubfolders(children);

                    const currentFolderIds = getValues('folder_ids');
                    const allIds = [currentBoard?._id, ...children.map((f: Folder) => f._id || '')].filter(Boolean) as string[];

                    // If folder_ids is undefined or null (new automation or newly opened),
                    // and we have a currentContent that is an object with folder_ids, use those.
                    // Otherwise, if it's 'new', default to all IDs (including parent).
                    if (currentFolderIds === undefined || currentFolderIds === null) {
                        if (currentContent && typeof currentContent === 'object') {
                            const automationDetails = currentContent as any;
                            if (automationDetails.folder_ids) {
                                setValue('folder_ids', automationDetails.folder_ids, { shouldDirty: false });
                            } else if (currentContent === 'new') {
                                setValue('folder_ids', allIds, { shouldDirty: false });
                            }
                        } else if (currentContent === 'new') {
                            setValue('folder_ids', allIds, { shouldDirty: false });
                        }
                    }
                }
            } catch (error) {
                console.error('fetch subfolders error: ', error);
            }
        };

        fetchSubfolders();
    }, [isDrive, currentBoard?._id, setValue, getValues, currentContent]);

    const allSelectableIds = useMemo(() => {
        return [currentBoard?._id, ...subfolders.map((f) => f._id || '')].filter(Boolean) as string[];
    }, [subfolders, currentBoard?._id]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setValue('folder_ids', allSelectableIds, { shouldDirty: true });
        } else {
            setValue('folder_ids', [], { shouldDirty: true });
        }
    };

    const handleSelectSubfolder = (folderId: string, checked: boolean) => {
        const currentIds = (getValues('folder_ids') || []) as string[];
        if (checked) {
            setValue('folder_ids', [...currentIds, folderId], { shouldDirty: true });
        } else {
            setValue(
                'folder_ids',
                currentIds.filter((id: string) => id !== folderId),
                { shouldDirty: true },
            );
        }
    };

    const fetchWorkflowList = useCallback(async () => {
        try {
            const { data: apWorkflows } = await fetchAllApWorkflows({ tags: ['automation', 'board'] });

            const providers: Record<string, WorkflowProvider> = {};

            const ipsWorkflows = apWorkflows.map((workflow) => ({
                value: workflow.id,
                text: workflow.displayName,
                icon: <Icon name="deviceHub" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
            }));

            for (const workflow of apWorkflows) {
                providers[String(workflow.id)] = 'ap';
            }

            setWorkflowProviderById((prev) => ({ ...prev, ...providers }));

            return ipsWorkflows;
        } catch (error) {
            console.error('fetching workflow list error: ', error);
            return [];
        }
    }, []);

    // Ensure we know whether the selected workflow is n8n or AP, even before the select is opened.
    useEffect(() => {
        if (hasFetchedWorkflowListRef.current) return;
        hasFetchedWorkflowListRef.current = true;
        fetchWorkflowList().catch(() => {});
    }, [fetchWorkflowList]);

    const selectedWorkflowId = watch('workflow_id');
    const selectedWorkflowProvider = selectedWorkflowId ? workflowProviderById[String(selectedWorkflowId)] : undefined;
    const shouldShowWorkflowEditSection = !!selectedWorkflowId && selectedWorkflowId !== 'addNew';

    useEffect(() => {
        // If user switches to an AP workflow, make sure we close any open n8n fullscreen preview.
        if (selectedWorkflowProvider !== 'n8n' && fullscreen) {
            setOpenFullscreen(false);
        }
    }, [selectedWorkflowProvider, fullscreen]);

    useEffect(() => {
        if (!currentContent || currentContent === 'new') {
            setMenuType('default');
            return;
        }
        const contentType = (currentContent as API.AutomationWorkflow).type;
        if (['create', 'delete', 'update'].includes(contentType)) {
            setMenuType('condition');
        } else {
            setMenuType('default');
        }
    }, [currentContent, setMenuType]);

    const renderMenuOption: () => Promise<Option[]> = async () => {
        if (menuType === 'condition') {
            return [
                {
                    text: isDrive ? t('automation_field_type_create_drive') : t('automation_field_type_create'),
                    value: 'create',
                    icon: <Icon name="newRecord" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
                    disabled: isCreateTypeExisted,
                    tooltipText: isCreateTypeExisted ? t('automation_field_disabled') : undefined,
                    onClick: () => {
                        setMenuType('condition');
                        typeRef.current?.close();
                    },
                },
                {
                    text: isDrive ? t('automation_field_type_delete_drive') : t('automation_field_type_delete'),
                    value: 'delete',
                    icon: <Icon name="deleteRecord" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
                    disabled: isDeleteTypeExisted,
                    tooltipText: isDeleteTypeExisted ? t('automation_field_disabled') : undefined,
                    onClick: () => {
                        setMenuType('condition');
                        typeRef.current?.close();
                    },
                },
                {
                    text: isDrive ? t('automation_field_type_update_drive') : t('automation_field_type_update'),
                    value: 'update',
                    icon: <Icon name="updateField" fontSize={24} />,
                    onClick: () => {
                        setMenuType('condition');
                        typeRef.current?.close();
                    },
                },
            ];
        }
        return [
            {
                icon: <Icon name="eventTrigger" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
                iconAlignment: 'flex-start',
                text: isDrive ? t('automation_menu_condition_drive_text') : t('automation_menu_condition_text'),
                description: isDrive ? t('automation_menu_condition_drive_desc') : t('automation_menu_condition_desc'),
                value: 'condition',
                onClick: () => {
                    setMenuType('condition');
                },
            },
            {
                icon: <Icon name="timeTrigger" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
                iconAlignment: 'flex-start',
                text: t('automation_menu_schedule_text'),
                description: t('automation_menu_schedule_desc'),
                value: 'scheduled',
                onClick: () => {
                    setMenuType('default');
                    setValue('type', 'scheduled', { shouldDirty: true });
                    if (!getValues('trigger_frequency_value') && !getValues('trigger_frequency_unit')) {
                        setValue('trigger_frequency_value', 1);
                        setValue('trigger_frequency_unit', 'days');
                        setValue('trigger_time', new Date());

                        const now = new Date();
                        const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
                        setValue('start_datetime', nextHour);
                    }
                    typeRef.current?.close();
                },
            },
        ];
    };

    // Pre-fetch type options so FieldSelect can display value immediately without opening
    useQuery({
        queryKey: ['automation-type-options', menuType, i18n.language],
        queryFn: renderMenuOption,
    });

    const onSaveAndExitHandler = useCallback(
        async (tx?: Transition) => {
            return new Promise<boolean | void>((resolve) => {
                trigger().then((isValid) => {
                    if (!isValid) {
                        dialog({
                            title: t('automation_error_prompt_header'),
                            content: t('automation_error_prompt_body'),
                            confirmText: t('automation_workflow_error_prompt_confirm'),
                            onConfirm: async () => {},
                            onClose: () => {},
                            hideCancelButton: true,
                        });
                        resolve(false);
                        return;
                    }
                });

                onSaveForm().then(() => {
                    resolve(true);
                });
            });
        },
        [t, trigger, onSaveForm],
    );

    const onDiscardHandler = useCallback(() => {
        return new Promise<void>(async (resolve) => {
            resolve();
        });
    }, []);

    const promptObj = useMemo(
        () => ({
            title: t('automation_prompt_title'),
            content: t('automation_prompt_content'),
            confirmText: t('automation_prompt_confirm'),
            cancelText: t('automation_prompt_cancel'),
            saveExitFn: onSaveAndExitHandler,
            discardFn: onDiscardHandler,
        }),
        [onSaveAndExitHandler, onDiscardHandler, t],
    );

    usePrompt(promptObj, isDirty, undefined, (tx) => {
        if (features.workflows({ dataBoardsAutomationOperation: currentContent === 'new' ? 'create' : 'update' })) {
            return false;
        }
        return !tx.location.pathname.includes('/automations/workflow');
    });

    return (
        <Box sx={{ height: '100%' }}>
            <SimpleBar style={{ height: '100%' }} autoHide>
                <Space
                    direction="vertical"
                    size={24}
                    align="start"
                    style={{
                        padding: '0 32px  0 32px ',
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <Controller
                        name="name"
                        rules={{
                            required: {
                                value: true,
                                message: t('validation_automation_name_required'),
                            },
                            maxLength: {
                                value: 150,
                                message: t('validation_automation_name_maxlength'),
                            },
                            validate: (value) => !(value.trim() === '') || t('validation_automation_name_spaces'),
                        }}
                        control={control}
                        render={({ field, fieldState: { error } }) => {
                            return (
                                <FieldText
                                    fullWidth
                                    label={`${t('automation_field_name')}*`}
                                    error={!!error}
                                    helperText={error?.message}
                                    disabled={false}
                                    multiline
                                    formControlSx={{
                                        maxWidth: '496px',
                                        width: '100%',
                                        '& .MuiFormControl-root': {
                                            width: '100%',
                                        },
                                    }}
                                    {...field}
                                />
                            );
                        }}
                    />

                    <Controller
                        name="description"
                        rules={{
                            maxLength: {
                                value: 500,
                                message: t('validation_automation_description_maxlength'),
                            },
                        }}
                        control={control}
                        render={({ field, fieldState: { error } }) => {
                            return (
                                <FieldText
                                    fullWidth
                                    label={t('automation_field_description')}
                                    description={t('automation_field_description_caption')}
                                    error={!!error}
                                    helperText={error?.message}
                                    disabled={false}
                                    multiline
                                    formControlSx={{
                                        maxWidth: '496px',
                                        width: '100%',
                                        '& .MuiFormControl-root': {
                                            width: '100%',
                                        },
                                    }}
                                    {...field}
                                />
                            );
                        }}
                    />

                    <Divider flexItem />

                    <Controller
                        name="type"
                        control={control}
                        rules={{
                            required: {
                                value: !(currentContent === 'new' && !isDirty),
                                message: t('validation_automation_condition_required'),
                            },
                            validate: (value) =>
                                value !== 'condition' || t('validation_automation_condition_required'),
                        }}
                        render={({ field: { onChange, ...restField }, fieldState: { error } }) => {
                            return (
                                <FieldSelect
                                    fullWidth
                                    label={`${t('automation_field_type')}*`}
                                    description={t('automation_field_type_caption')}
                                    onChange={(val) => onChange(val)}
                                    error={!!error}
                                    closeOnSelect={false}
                                    helperText={error?.message}
                                    queryKey={['automation-type-options', menuType, i18n.language]}
                                    request={renderMenuOption}
                                    onOpen={() => {
                                        prevTypeRef.current = getValues('type');
                                        setMenuType('default');
                                    }}
                                    onClose={() => {
                                        const currentType = getValues('type');
                                        // If user clicked 'condition' but didn't pick a sub-type, revert to previous value
                                        if (currentType === 'condition' && ['create', 'delete', 'update'].includes(prevTypeRef.current)) {
                                            onChange(prevTypeRef.current);
                                            setMenuType('condition');
                                        } else if (['create', 'delete', 'update'].includes(currentType)) {
                                            setMenuType('condition');
                                        } else {
                                            setMenuType('default');
                                        }
                                    }}
                                    formControlSx={{
                                        maxWidth: '496px',
                                        width: '100%',
                                        '& .MuiFormControl-root': {
                                            width: '100%',
                                        },
                                    }}
                                    {...restField}
                                    ref={typeRef}
                                />
                            );
                        }}
                    />

                    {isDrive && watch('type') && watch('type') !== 'scheduled' && (
                        <Box sx={{ width: '100%', maxWidth: '496px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Typography variant="Caption" style={{ color: 'var(--color-light-7)', fontWeight: 800, fontSize: '14px' }}>
                                Target folders
                            </Typography>
                            <Box
                                sx={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                onClick={() => setIsCollapsed(!isCollapsed)}
                            >
                                <Checkbox
                                    checked={allSelectableIds.length > 0 && watch('folder_ids')?.length === allSelectableIds.length}
                                    indeterminate={watch('folder_ids')?.length > 0 && watch('folder_ids')?.length < allSelectableIds.length}
                                    disabled={allSelectableIds.length === 0}
                                    onChange={(checked) => handleSelectAll(checked)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <Typography variant="Body" style={{ color: subfolders.length === 0 ? 'var(--color-light-5)' : 'inherit' }}>
                                    Select all folders
                                </Typography>
                                <ArrowRightIcon
                                    style={{
                                        color: 'var(--color-primary-1)',
                                        fontSize: 24,
                                        transform: !isCollapsed ? 'rotate(90deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s',
                                        marginLeft: '20px',
                                    }}
                                />
                            </Box>

                            {!isCollapsed && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '12px' }}>
                                    <Space align="center" size={8} style={{ marginLeft: '10px' }}>
                                        <Checkbox
                                            checked={!!currentBoard?._id && watch('folder_ids')?.includes(currentBoard._id)}
                                            onChange={(checked) => handleSelectSubfolder(currentBoard?._id || '', checked)}
                                        />
                                        <Icon name="folder" fontSize={20} style={{ color: 'var(--color-primary-1)' }} />
                                        <Typography variant="Body">{currentBoard?.name || t('folder')}</Typography>
                                    </Space>
                                    <Box sx={{ marginLeft: '22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {subfolders.map((folder) => (
                                            <Space key={folder._id || folder.name} align="center" size={8} style={{ marginLeft: '10px' }}>
                                                <Checkbox
                                                    checked={watch('folder_ids')?.includes(folder._id || '')}
                                                    onChange={(checked) => handleSelectSubfolder(folder._id || '', checked)}
                                                />
                                                <Icon name="folder" fontSize={20} style={{ color: 'var(--color-primary-5)' }} />
                                                <Typography variant="Body">{folder.path || folder.name}</Typography>
                                            </Space>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}

                    {watch('type') === 'scheduled' && <SelectSchedule />}

                    {watch('type') === 'update' && !isDrive && (
                        <Controller
                            name="field_id"
                            control={control}
                            rules={{ required: watch('type') === 'update' && !isDrive ? t('validation_automation_field_required') : false }}
                            render={({ field: { onChange, value, ...restField }, fieldState: { error } }) => (
                                <FieldSelect
                                    fullWidth
                                    label={`${t('automation_field_trigger_field')}*`}
                                    description={t('automation_field_trigger_field_caption')}
                                    placeholder={t('click_to_select')}
                                    onChange={(val) => onChange(val)}
                                    value={value}
                                    error={!!error}
                                    helperText={error?.message}
                                    queryKey={['automation-column-options']}
                                    request={async () => columnOptions}
                                    formControlSx={{
                                        maxWidth: '496px',
                                        width: '100%',
                                        '& .MuiFormControl-root': {
                                            width: '100%',
                                        },
                                    }}
                                    {...restField}
                                />
                            )}
                        />
                    )}

                    <Controller
                        name="workflow_id"
                        control={control}
                        rules={{
                            required: {
                                value: !(currentContent === 'new' && !isDirty),
                                message: t('validation_automation_workflow_required'),
                            },
                        }}
                        render={({ field: { onChange, ...restField }, fieldState: { error } }) => {
                            return (
                                <FieldSelect
                                    fullWidth
                                    searchable
                                    label={`${t('automation_field_trigger_workflow')}*`}
                                    description={t('automation_field_trigger_workflow_caption')}
                                    placeholder={t('click_to_select')}
                                    error={!!error}
                                    helperText={error?.message}
                                    queryKey={['brd-automation-workflows']}
                                    request={fetchWorkflowList}
                                    containerStyle={{ height: '40px' }}
                                    onChange={(val) => {
                                        onChange(val);
                                    }}
                                    footer={() => {
                                        if (!isAllowModifyBoard) return;
                                        return (
                                            <IconButton
                                                size="default"
                                                variant="text"
                                                type="secondary"
                                                sx={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    gap: '12px',
                                                    justifyContent: 'flex-start',
                                                    textTransform: 'capitalize',
                                                    borderRadius: 0,
                                                }}
                                                onClick={() => {
                                                    navigate(`/${basePath}/${currentBoard?.id}/automations/workflow`, {
                                                        state: {
                                                            board: currentBoard,
                                                            content: currentContent,
                                                            workflowId: 'new',
                                                            type: 'board',
                                                            from: location.pathname,
                                                            form: getValues(),
                                                            dirtyState: isDirty,
                                                        },
                                                    });
                                                }}
                                            >
                                                <Icon name="add" fontSize={24} style={{ color: 'var(--color-primary-1)' }} />
                                                <Space size={4}>
                                                    <Typography style={{ color: 'var(--color-primary-1)' }}>
                                                        {isDrive
                                                            ? t('board_automation_create_new_drive')
                                                            : t(isDocumentAIRoute ? 'databoard_model_automation_create_new' : 'board_automation_create_new')}
                                                    </Typography>
                                                </Space>
                                            </IconButton>
                                        );
                                    }}
                                    formControlSx={{
                                        maxWidth: '496px',
                                        width: '100%',
                                        '& .MuiFormControl-root': {
                                            width: '100%',
                                        },
                                    }}
                                    {...restField}
                                />
                            );
                        }}
                    />
                </Space>
                {shouldShowWorkflowEditSection && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                        <Space size={12} justify="start" align="center" style={{ padding: '32px 32px 10px 32px', width: '100%' }}>
                            <Button
                                variant="link"
                                text={t('automation_workflow_edit')}
                                size="xs"
                                onClick={() => {
                                    navigate(`/${basePath}/${currentBoard?.id}/automations/workflow`, {
                                        state: {
                                            board: currentBoard,
                                            content: currentContent,
                                            workflowId: getValues('workflow_id'),
                                            type: 'board',
                                            from: location.pathname,
                                            form: { ...(typeof currentContent === 'object' ? currentContent : {}), ...getValues() },
                                            dirtyState: isDirty,
                                        },
                                    });
                                }}
                                sx={{
                                    fontSize: '12px',
                                    fontWeight: 400,
                                    gap: '4px',
                                }}
                                endIcon={<Icon name="chevronRight" fontSize={24} />}
                            />
                        </Space>
                        <iframe
                            src={`${env.VITE_APP_ACTIVEPIECES_DOMAIN}/flows/${watch('workflow_id')}?lang=${
                                i18n.language ?? 'en'
                            }&token=${localStorage.getItem('imbrace-access-token')}&organizationId=${organizationId}&preview=true`}
                            allow="clipboard-read; clipboard-write"
                            title="Workflow"
                            style={{
                                width: '100%',
                                height: '400px',
                                border: 0,
                                padding: 0,
                                margin: 0,
                            }}
                        />
                    </Box>
                )}
            </SimpleBar>
        </Box>
    );
};

export default AutomationContent;
