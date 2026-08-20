import { Button, Dropdown, EllipsisText, Icon, Space, Typography } from '@imbrace/ui';
import { Box, Chip, CircularProgress, List, ListItemButton, ListItemIcon, ListItemSecondaryAction, ListItemText } from '@mui/material';
import omit from 'lodash/omit';
import React, { useCallback, useMemo, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import SimpleBar from 'simplebar-react';

import { dialog } from '@/components/Dialog';
import type { BoardAutomationFormValue } from '@/pages/Databoards/components/BoardAutomation';
import { deleteBoardAutomation, updateBoardAutomation } from '@/services/api/boardAutomation';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { addLeadingZero } from '@/utils/NumberHelper';

interface AutomationListProps {
    boardName?: string;
    knowledgeHub?: boolean;
    isDocumentAIRoute?: boolean;
    isAutomationsLoaded: boolean;
    automationWorkflows?: API.AutomationWorkflow[];
    currentContent: API.AutomationWorkflow | 'new' | undefined | 'delete';
    setCurrentContent: React.Dispatch<API.AutomationWorkflow | 'new' | undefined | 'delete'>;
    onSaveForm: () => Promise<void>;
    refresh: () => void;
    isDrive?: boolean;
}

const AutomationList = (props: AutomationListProps) => {
    const {
        boardName,
        knowledgeHub,
        isDocumentAIRoute,
        isAutomationsLoaded,
        automationWorkflows,
        currentContent,
        setCurrentContent,
        onSaveForm,
        refresh,
        isDrive,
    } = props;
    const { t } = useTranslation();
    const listRef = useRef<HTMLUListElement>(null);

    const {
        getValues,
        watch,
        reset,
        trigger,
        formState: { isDirty, errors },
    } = useFormContext();

    const onUpdateBoardAutomation = useCallback(async (data: BoardAutomationFormValue, id: string) => {
        try {
            return await apiFetch<API.AutomationWorkflow>(updateBoardAutomation.api(id), updateBoardAutomation.method, data, ImbraceClient);
        } catch (error) {
            console.error('post board automation error: ', error);
            return error;
        }
    }, []);

    const onDeleteBoardAutomation = useCallback(async (id: string) => {
        try {
            return await apiFetch<API.AutomationWorkflow>(deleteBoardAutomation.api(id), deleteBoardAutomation.method, {}, ImbraceClient);
        } catch (error) {
            console.error('post board automation error: ', error);
            return error;
        }
    }, []);
    const resetToNewForm = useCallback(() => {
        setCurrentContent('new');
        const length = automationWorkflows ? addLeadingZero(automationWorkflows.length + 1) : 1;
        const name = `${t(isDocumentAIRoute ? 'databoard_model_automation_header' : 'board_automation_header', { name: boardName })} ${length}`;

        reset(
            {
                name,
                description: '',
                type: '',
                field_id: '',
                workflow_id: '',
            },
            {
                keepDirty: true,
                keepErrors: false,
                keepIsValid: false,
            },
        );
    }, [reset, automationWorkflows, boardName, setCurrentContent, t, knowledgeHub, isDocumentAIRoute]);

    const handleIsDirtyNotify = useCallback(
        async (item: API.AutomationWorkflow, action?: 'new') => {
            dialog({
                title: t('automation_prompt_title'),
                content: t('automation_prompt_content'),
                confirmText: t('automation_prompt_confirm'),
                cancelText: t('automation_prompt_cancel'),
                onConfirm: async () => {
                    await trigger();
                    if (Object.entries(errors).length > 0) {
                        dialog({
                            title: t('automation_error_prompt_header'),
                            content: t('automation_error_prompt_body'),
                            confirmText: t('automation_workflow_error_prompt_confirm'),
                            onConfirm: async () => {},
                            onClose: () => {},
                            hideCancelButton: true,
                        });
                        return;
                    }
                    await onSaveForm();
                    if (action && action === 'new') {
                        setCurrentContent('new');
                        resetToNewForm();
                        return;
                    }
                    setCurrentContent(item);
                    reset(item);
                },
                onClose: () => {
                    if (action && action === 'new') {
                        setCurrentContent('new');
                        resetToNewForm();
                        return;
                    }
                    setCurrentContent(item);
                    reset(item);
                },
            });
        },
        [t, errors, onSaveForm, reset, setCurrentContent, resetToNewForm, trigger],
    );

    const itemBackgroundState = useMemo(
        () => (item: API.AutomationWorkflow) => {
            if (typeof currentContent === 'object' && currentContent._id === item._id) {
                return 'var(--color-primary-2)';
            }
            if (item.is_paused) {
                return 'var(--color-light-2)';
            }
            return 'transparent';
        },
        [currentContent],
    );

    if (!isAutomationsLoaded && !currentContent) {
        return (
            <Box
                sx={{
                    minWidth: '400px',
                    width: '400px',
                    height: '100%',
                    borderRight: '1px solid #e0e0e0',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Space size={0} justify="center" align="center" style={{ width: '100%', height: '100%' }}>
                    <CircularProgress size={'25px'} />
                </Space>
            </Box>
        );
    }

    const currentFormType = watch('type');

    return (
        <Box
            sx={{
                minWidth: '400px',
                width: '400px',
                height: '100%',
                borderRight: '1px solid #e0e0e0',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    minHeight: '56px',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                }}
            >
                <Typography variant="SubHeading2" style={{ padding: '16px', color: 'var(--color-light-5)' }}>
                    {t(isDocumentAIRoute ? 'databoard_model_automation_header' : 'board_automation_header', { name: boardName })}
                </Typography>
            </Box>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <List
                    ref={listRef}
                    disablePadding
                    sx={{
                        width: '100%',
                        overflowY: 'hidden',
                    }}
                >
                    <SimpleBar autoHide style={{ height: '100%' }}>
                        {/* NEW FAKE RECORD */}
                        {currentContent === 'new' && (
                            <ListItemButton
                                data-index="0"
                                disableRipple
                                sx={{
                                    borderBottom: '1px solid var(--color-light-3)',

                                    minHeight: '47px',
                                    display: 'flex',
                                    gap: '12px',
                                    backgroundColor: 'var(--color-primary-2)',
                                    '&:hover': {
                                        backgroundColor: 'var(--color-secondary-2)',
                                    },
                                    '&:active': { backgroundColor: 'var(--color-primary-2)' },

                                    '&:hover, &:active, &:focus': {
                                        '& .MuiButtonBase-root': {
                                            visibility: 'visible',
                                        },
                                    },

                                    '&.Mui-disabled': {
                                        opacity: 1,
                                        backgroundColor: 'var(--color-light-2)',
                                        color: 'var(--color-light-4)',
                                    },
                                }}
                                onClick={() => {}}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        color: 'var(--color-light-7)',
                                    }}
                                >
                                    {currentFormType === '' ? (
                                        <Icon name="deviceHub" fontSize={24} style={{ color: 'var(--color-light-5)' }} />
                                    ) : currentFormType === 'scheduled' ? (
                                        <Icon name="timeTrigger" fontSize={24} style={{ color: 'var(--color-light-5)' }} />
                                    ) : (
                                        <Icon name="eventTrigger" fontSize={24} style={{ color: 'var(--color-light-5)' }} />
                                    )}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex' }}>
                                            <EllipsisText
                                                text={getValues('name')}
                                                element={
                                                    <Typography
                                                        variant="Body"
                                                        style={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            wordBreak: 'break-word',
                                                        }}
                                                    />
                                                }
                                            />
                                        </Box>
                                    }
                                    primaryTypographyProps={{
                                        sx: {
                                            width: '292px',
                                            color: 'var(--color-light-7)',
                                            fontSize: '14px',
                                            fontWeight: 400,
                                            lineHeight: '20.3px',
                                        },
                                    }}
                                />
                            </ListItemButton>
                        )}
                        {automationWorkflows?.length === 0 && currentContent !== 'new' && (
                            <Typography variant="Body" style={{ padding: '12px 16px', color: 'var(--color-light-5)' }}>
                                {t(isDocumentAIRoute ? 'databoard_model_automation_empty_list' : 'board_automation_empty_list')}
                            </Typography>
                        )}
                        {automationWorkflows && automationWorkflows.length > 0 && (
                            <>
                                {automationWorkflows?.map((item, index) => (
                                    <ListItemButton
                                        data-index={index}
                                        key={item._id}
                                        disableRipple
                                        sx={{
                                            minHeight: '47px',
                                            display: 'flex',
                                            gap: '12px',
                                            backgroundColor: itemBackgroundState(item),
                                            '&:hover': {
                                                backgroundColor: 'var(--color-secondary-2)',
                                            },
                                            '&:active': { backgroundColor: 'var(--color-primary-2)' },

                                            '&:hover, &:active, &:focus': {
                                                '& .MuiButtonBase-root': {
                                                    visibility: 'visible',
                                                },
                                            },

                                            '&.Mui-disabled': {
                                                opacity: 1,
                                                backgroundColor: 'var(--color-light-2)',
                                                color: 'var(--color-light-4)',
                                            },
                                        }}
                                        onClick={async () => {
                                            if (isDirty) {
                                                handleIsDirtyNotify(item);
                                                return;
                                            }
                                            setCurrentContent(item);
                                            reset(item);
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: 0,
                                                color: item.is_paused ? 'var(--color-light-4)' : 'var(--color-light-7)',
                                            }}
                                        >
                                            {item.type === 'scheduled' ? (
                                                <Icon
                                                    name="timeTrigger"
                                                    fontSize={24}
                                                    style={{ color: item.is_paused ? 'var(--color-light-4)' : 'var(--color-light-5)' }}
                                                />
                                            ) : (
                                                <Icon
                                                    name="eventTrigger"
                                                    fontSize={24}
                                                    style={{ color: item.is_paused ? 'var(--color-light-4)' : 'var(--color-light-5)' }}
                                                />
                                            )}
                                        </ListItemIcon>
                                        <ListItemText
                                            disableTypography
                                            primary={
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        width: '292px',
                                                        color: item.is_paused ? 'var(--color-light-4)' : 'var(--color-light-7)',
                                                        fontSize: '14px',
                                                        fontWeight: 400,
                                                        lineHeight: '20.3px',
                                                    }}
                                                >
                                                    <EllipsisText
                                                        text={item.name}
                                                        element={
                                                            <Typography
                                                                variant="Body"
                                                                style={{
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    wordBreak: 'break-word',
                                                                }}
                                                            />
                                                        }
                                                    />
                                                    {item.updateNeeded && (
                                                        <Chip
                                                            label={t('update_needed')}
                                                            variant="outlined"
                                                            sx={{
                                                                marginLeft: '12px',
                                                                color: 'var(--color-danger-1)',
                                                                border: '1px solid var(--color-danger-1)',
                                                                borderRadius: '4px',
                                                                height: '22px',
                                                                fontSize: '12px',
                                                                fontWeight: 400,
                                                                lineHeight: '12px',
                                                                '& .MuiChip-label': {
                                                                    padding: '2px 4px',
                                                                },
                                                            }}
                                                        />
                                                    )}
                                                    {item.is_paused && !item.updateNeeded && (
                                                        <Chip
                                                            label={t('paused')}
                                                            variant="outlined"
                                                            sx={{
                                                                marginLeft: '12px',
                                                                color: 'var(--color-light-5)',
                                                                border: '1px solid var(--color-light-5)',
                                                                borderRadius: '4px',
                                                                height: '22px',
                                                                fontSize: '12px',
                                                                fontWeight: 400,
                                                                lineHeight: '12px',
                                                                '& .MuiChip-label': {
                                                                    padding: '2px 4px',
                                                                },
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Box
                                                    sx={{
                                                        width: '292px',
                                                        marginTop: item.description ? '4px' : 0,
                                                        color: item.is_paused ? 'var(--color-light-4)' : 'var(--color-light-5)',
                                                        fontSize: '12px',
                                                        fontWeight: 400,
                                                        lineHeight: '15.6px',
                                                    }}
                                                >
                                                    {item.description && (
                                                        <EllipsisText
                                                            text={item.description}
                                                            element={
                                                                <Typography
                                                                    variant="Inherit"
                                                                    style={{
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        WebkitLineClamp: 2,
                                                                        display: '-webkit-box',
                                                                        WebkitBoxOrient: 'vertical',
                                                                    }}
                                                                />
                                                            }
                                                            whiteSpace="pre-wrap"
                                                        />
                                                    )}
                                                </Box>
                                            }
                                        />
                                        <ListItemSecondaryAction>
                                            <Box
                                                sx={{
                                                    '& > .MuiButtonBase-root': {
                                                        visibility: 'hidden',
                                                    },
                                                    '&:hover, &:active, &:focus': {
                                                        '& > .MuiButtonBase-root': {
                                                            visibility: 'visible',
                                                        },
                                                    },
                                                }}
                                            >
                                                <Dropdown
                                                    hideArrow
                                                    variant="text"
                                                    icon={<Icon name="moreVert" />}
                                                    options={[
                                                        {
                                                            text: item.is_paused ? t('activate') : t('pause'),
                                                            index: 'pause-board-automation',
                                                            textColor: 'var(--color-light-7)',
                                                        },
                                                        {
                                                            text: t('delete'),
                                                            index: 'delete-board-automation',
                                                            textColor: 'var(--color-danger-1)',
                                                        },
                                                    ]}
                                                    hideOnSelect
                                                    buttonSx={{
                                                        color: 'var(--color-light-5)',
                                                        marginLeft: '4px',
                                                        height: 'auto',
                                                        padding: 0,
                                                    }}
                                                    onSelect={async (event, selectedIndex) => {
                                                        event.stopPropagation();
                                                        if (selectedIndex === 'pause-board-automation') {
                                                            const result = automationWorkflows.find((el) => el._id === item._id);
                                                            if (!result) return;
                                                            const data = omit(result, ['_id', 'board_id']);
                                                            await onUpdateBoardAutomation(
                                                                {
                                                                    ...data,
                                                                    board_id: item.board_id,
                                                                    is_paused: !item.is_paused,
                                                                } as BoardAutomationFormValue,
                                                                item._id,
                                                            );
                                                            refresh();
                                                            return;
                                                        }
                                                        if (selectedIndex === 'delete-board-automation') {
                                                            if (localStorage.getItem('dont_asked_delete_crm_field_again') === 'true') {
                                                                await onDeleteBoardAutomation(item._id);
                                                                refresh();
                                                                // reset to empty illustration
                                                                if (automationWorkflows.length === 1) {
                                                                    // setCurrentContent(undefined);
                                                                    setCurrentContent('delete');
                                                                }
                                                                if (automationWorkflows.length > 1) {
                                                                    setCurrentContent(automationWorkflows[1]);
                                                                    reset(automationWorkflows[1]);
                                                                }
                                                                return;
                                                            }
                                                            dialog({
                                                                title: t(
                                                                    knowledgeHub
                                                                        ? 'automation_delete_modal_header'
                                                                        : 'automation_delete_modal_header',
                                                                ),
                                                                content: t('automation_delete_modal_body'),
                                                                showDontAskedAgain: true,
                                                                confirmButtonProps: {
                                                                    type: 'danger',
                                                                },
                                                                actionsAlign: 'flex-end',
                                                                onConfirm: async (dontAskedAgain) => {
                                                                    if (dontAskedAgain) {
                                                                        localStorage.setItem('dont_asked_delete_crm_field_again', 'true');
                                                                    }
                                                                    await onDeleteBoardAutomation(item._id);
                                                                    refresh();
                                                                    // reset to empty illustration
                                                                    if (automationWorkflows.length === 1) {
                                                                        console.log('刪除');
                                                                        // setCurrentContent(undefined);
                                                                        setCurrentContent('delete');
                                                                    }
                                                                    if (automationWorkflows.length > 1) {
                                                                        setCurrentContent(automationWorkflows[1]);
                                                                        reset(automationWorkflows[1]);
                                                                    }
                                                                },
                                                                onClose: () => {},
                                                            });
                                                        }
                                                    }}
                                                />
                                            </Box>
                                        </ListItemSecondaryAction>
                                    </ListItemButton>
                                ))}
                            </>
                        )}
                    </SimpleBar>
                </List>
                <Box
                    sx={{
                        flex: 1,
                        padding: '12px 16px',
                        bottom: 0,
                        height: '48px',
                        width: '100%',
                        backgroundColor: 'var(--color-light-1)',
                        borderTop: '1px solid var(--color-light-3)',
                    }}
                >
                    <Button
                        sx={{ fontSize: '14px', fontWeight: 800, textTransform: 'capitalize' }}
                        text={isDrive ? t('board_automation_create_new_drive') : t(isDocumentAIRoute ? 'databoard_model_automation_create_new' : 'board_automation_create_new')}
                        onClick={async () => {
                            if (isDirty && typeof currentContent === 'object') {
                                handleIsDirtyNotify(
                                    {
                                        ...currentContent,
                                        ...getValues(),
                                    },
                                    'new',
                                );
                                return;
                            }

                            if (isDirty) {
                                handleIsDirtyNotify(
                                    {
                                        name: '',
                                        description: '',
                                        type: 'scheduled',
                                        field_id: '',
                                        workflow_id: '',
                                        board_id: '',
                                        is_paused: false,
                                        trigger_frequency_value: 0,
                                        trigger_frequency_unit: '',
                                        trigger_day_of_week: 'sunday',
                                        start_datetime: '',
                                        trigger_month_and_day: '',
                                        trigger_time: '',
                                        _id: '',
                                        updateNeeded: false,
                                    },
                                    'new',
                                );
                                return;
                            }
                            resetToNewForm();
                        }}
                        size="xs"
                        variant="link"
                        startIcon={<Icon name="add" fontSize={20} />}
                    />
                </Box>
            </div>
        </Box>
    );
};
export default AutomationList;
